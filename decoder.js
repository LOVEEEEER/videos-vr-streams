const fs = require('fs');
const path = require('path');
const JPEG = require('jpeg-js');
const ffmpeg = require('fluent-ffmpeg');

class GameViewDecoder {
  constructor(outputPath) {
    this.outputPath = outputPath;
    this.frameBuffer = Buffer.alloc(650000); // initial buffer size
    this.frameIdx = 0;
    this.inPicture = false;
    this.previous = 0;
    this.current = 0;
    this.streamLength = 0;
    this.tempDir = path.join(__dirname, 'temp_frames');

    // Create temporary directory for frames if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir);
    }
    this.frameCount = 0;
  }

  async processImageData(data) {
    const imageData = JPEG.decode(data, true);

    // Save each frame as a JPEG file
    const framePath = path.join(this.tempDir, `frame_${this.frameCount}.jpg`);
    fs.writeFileSync(framePath, JPEG.encode(imageData, 90).data);
    this.frameCount++;
  }

  async processMJPEGData(data) {
    this.parseStreamBuffer(data);
  }

  parseStreamBuffer(streamBuffer) {
    let idx = 0;
    this.streamLength = streamBuffer.length;

    while (idx < this.streamLength) {
      if (this.inPicture) {
        this.parsePicture(streamBuffer, idx);
      } else {
        this.searchPicture(streamBuffer, idx);
      }
      idx++;
    }
  }

  searchPicture(streamBuffer, idx) {
    while (idx < this.streamLength) {
      this.previous = this.current;
      this.current = streamBuffer[idx++];

      if (this.previous === 0xFF && this.current === 0xD8) {
        this.frameIdx = 2;
        this.frameBuffer[0] = 0xFF;
        this.frameBuffer[1] = 0xD8;
        this.inPicture = true;
        return;
      }
    }
  }

  parsePicture(streamBuffer, idx) {
    while (idx < this.streamLength) {
      this.previous = this.current;
      this.current = streamBuffer[idx++];

      if (this.frameIdx >= this.frameBuffer.length) {
        const newBuffer = Buffer.alloc(this.frameBuffer.length * 2);
        this.frameBuffer.copy(newBuffer);
        this.frameBuffer = newBuffer;
      }

      this.frameBuffer[this.frameIdx++] = this.current;

      if (this.previous === 0xFF && this.current === 0xD9) {
        this.processImageData(this.frameBuffer.slice(0, this.frameIdx));
        this.inPicture = false;
        return;
      }
    }
  }

  close() {
    // Create video from frames using ffmpeg
    ffmpeg()
      .input(path.join(this.tempDir, 'frame_%d.jpg'))
      .inputFPS(30) // Adjust frame rate as needed
      .output(this.outputPath)
      .on('end', () => {
        console.log('Video has been created successfully');
        // Clean up temporary frame files
        fs.rmdirSync(this.tempDir, { recursive: true });
      })
      .on('error', (err) => {
        console.error('Error creating video:', err);
      })
      .run();
  }
}

module.exports = GameViewDecoder;

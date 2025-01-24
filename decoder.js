const fs = require('fs');
const path = require('path');
const { createCanvas, Image } = require('canvas');
const JPEG = require('jpeg-js');
const { Transform } = require('stream');

class GameViewDecoder {
  constructor(options) {
    this.options = options;
    this.frameBuffer = Buffer.alloc(650000); // initial buffer size
    this.frameIdx = 0;
    this.inPicture = false;
    this.previous = 0;
    this.current = 0;
    this.streamLength = 0;
    this.canvas = createCanvas(1, 1);
    this.context = this.canvas.getContext('2d');
  }

  async processImageData(data) {
    const imageData = JPEG.decode(data, true);
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.context.putImageData(new ImageData(imageData.data, imageData.width, imageData.height), 0, 0);

    // Optionally save to a file
    const output = fs.createWriteStream(path.join(__dirname, 'output.jpg'));
    const stream = this.canvas.createJPEGStream();
    stream.pipe(output);
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
}

module.exports = GameViewDecoder;

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const zlib = require('zlib');

class VideoRecorder {
  constructor(roomName) {
    this.roomName = roomName;
    this.videoStream = new PassThrough();
    this.outputFilePath = path.join(__dirname, 'recordings', `${roomName}_${Date.now()}.mp4`);
    
    this.initializeFFmpeg();
  }

  initializeFFmpeg() {
    this.command = ffmpeg(this.videoStream)
      .inputFormat('mjpeg')
      .videoCodec('libx264')
      .outputOptions('-r 20')
      .size('1280x720')
      .on('start', () => console.log(`[${this.roomName}] Recording started`))
      .on('error', (err) => console.error(`[${this.roomName}] FFmpeg error:`, err))
      .on('end', () => console.log(`[${this.roomName}] Recording saved to ${this.outputFilePath}`))
      .save(this.outputFilePath);
  }

  processData(data) {
    try {
      const imageData = this.decodeFMMJPEG(data);
      this.videoStream.write(imageData);
    } catch (err) {
      console.error(`[${this.roomName}] Decoding error:`, err);
    }
  }

  decodeFMMJPEG(data) {
    // Пропускаем первые 15 байт метаданных FMMJPEG
    const isGzipped = data.readUInt8(12);
    let imageData = data.slice(15);

    if (isGzipped) {
      imageData = zlib.unzipSync(imageData);
    }

    return imageData;
  }

  stop() {
    this.videoStream.end();
  }
}

module.exports = VideoRecorder;

const fs = require('fs');
const path = require('path');
const { createCanvas, Image } = require('canvas');
const JPEG = require('jpeg-js');

class GameViewDecoder {
  constructor(outputPath) {
    this.outputPath = outputPath;
    this.canvas = createCanvas(1, 1);
    this.context = this.canvas.getContext('2d');
    this.videoStream = fs.createWriteStream(outputPath);
    this.label = 1001;
    this.dataID = 0;
    this.dataLength = 0;
    this.receivedLength = 0;
    this.dataByte = null;
    this.isGZipped = false;
    this.ColorReductionLevel = 0;
    this.isDesktopFrame = false;
  }

  async processImageData(data) {
    const imageData = JPEG.decode(data, true);
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.context.putImageData(new ImageData(imageData.data, imageData.width, imageData.height), 0, 0);

    // Save each frame to the video stream
    const stream = this.canvas.createJPEGStream();
    stream.pipe(this.videoStream, { end: false });
  }

  async Action_ProcessImageData(_byteData) {
    if (_byteData.length <= 14) return;

    const _label = _byteData.readUInt16LE(0);
    if (_label != this.label) return;

    const _dataID = _byteData.readUInt16LE(2);
    if (_dataID != this.dataID) this.receivedLength = 0;
    this.dataID = _dataID;

    const dataLength = _byteData.readInt32LE(4);
    const _offset = _byteData.readInt32LE(8);
    this.isGZipped = _byteData[12] === 1;
    this.ColorReductionLevel = _byteData[13];

    this.isDesktopFrame = _byteData[14] !== 0;
    const metaByteLength = this.isDesktopFrame ? 24 : 15;

    if (this.receivedLength === 0) this.dataByte = Buffer.alloc(dataLength);
    const chunkLength = _byteData.length - metaByteLength;
    if (_offset + chunkLength <= this.dataByte.length) {
      this.receivedLength += chunkLength;
      _byteData.copy(this.dataByte, _offset, metaByteLength);
    }

    if (this.receivedLength === dataLength) {
      await this.processImageData(this.dataByte);
    }
  }

  close() {
    this.videoStream.end();
  }
}

module.exports = GameViewDecoder;
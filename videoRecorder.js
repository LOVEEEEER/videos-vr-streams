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
      .outputOptions('-r 20') // Частота кадров (FPS)
      .size('1280x720')       // Разрешение видео (1280x720)
      .videoBitrate('2000k')  // Битрейт (опционально, для улучшения качества)
      .on('start', () => console.log(`[${this.roomName}] Recording started`))
      .on('error', (err) => console.error(`[${this.roomName}] FFmpeg error:`, err))
      .on('end', () => console.log(`[${this.roomName}] Recording saved to ${this.outputFilePath}`))
      .save(this.outputFilePath);
  }

  processData(data) {
    try {
      console.log(`[${this.roomName}] Received data length: ${data.length}`);
      console.log(`[${this.roomName}] First 20 bytes:`, data.slice(0, 20).toString('hex'));

      // Проверяем, что данных достаточно для обработки
      if (data.length < 15) {
        console.warn(`[${this.roomName}] Data is too short (${data.length} bytes), expected at least 15 bytes`);
        return;
      }

      const imageData = this.decodeFMMJPEG(data);
      this.videoStream.write(imageData);
    } catch (err) {
      console.error(`[${this.roomName}] Decoding error:`, err);
    }
  }

  decodeFMMJPEG(data) {
    // Проверяем, что данных достаточно для обработки
    if (data.length < 15) {
      throw new Error(`Data is too short (${data.length} bytes), expected at least 15 bytes`);
    }

    // Пропускаем первые 15 байт метаданных FMMJPEG
    const isGzipped = data.readUInt8(12);
    let imageData = data.slice(15);

    if (isGzipped) {
      try {
        // Проверяем, начинаются ли данные с GZip-заголовка (0x1F 0x8B)
        if (imageData[0] === 0x1F && imageData[1] === 0x8B) {
          imageData = zlib.unzipSync(imageData);
        } else {
          console.warn(`[${this.roomName}] Data is marked as GZipped but does not have a valid GZip header`);
        }
      } catch (err) {
        console.error(`[${this.roomName}] GZip decompression failed:`, err);
        // Возвращаем оригинальные данные, если распаковка не удалась
        return imageData;
      }
    }

    return imageData;
  }

  stop() {
    this.videoStream.end();
  }
}

module.exports = VideoRecorder;

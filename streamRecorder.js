const { spawn } = require('child_process');
const fs = require('fs');

class StreamRecorder {
  constructor(outputFile) {
    this.outputFile = outputFile;
    this.ffmpegProcess = null;
  }

  startRecording() {
    this.ffmpegProcess = spawn('ffmpeg', [
      '-f', 'rawvideo',      // Формат ввода - "сырой" поток
      '-pix_fmt', 'yuv420p', // Цветовое пространство
      '-s', '1280x720',      // Разрешение видео
      '-r', '30',            // Частота кадров
      '-i', '-',             // Входной поток из stdin
      '-c:v', 'libx264',     // Кодек
      '-preset', 'fast',     // Быстрая запись
      '-crf', '23',          // Качество (меньше = лучше)
      '-y', this.outputFile  // Выходной файл
    ]);

    this.ffmpegProcess.stderr.on('data', (data) => {
      console.error(`FFmpeg stderr: ${data}`);
    });

    this.ffmpegProcess.on('close', (code) => {
      console.log(`FFmpeg process exited with code ${code}`);
    });
  }

  write(data) {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.stdin.write(data);
    }
  }

  stopRecording() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.stdin.end();
      this.ffmpegProcess = null;
    }
  }
}

module.exports = StreamRecorder;

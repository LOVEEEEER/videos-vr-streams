const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

// Логирование в файл
const logFile = fs.createWriteStream('./stream-recorder.log', { flags: 'a' });

class StreamRecorder {
  constructor(outputFile) {
    this.outputFile = outputFile;
    this.command = null;
    this.isRecording = false;
    this.writeQueue = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}\n`;
    console.log(formattedMessage);
    logFile.write(formattedMessage);
  }

  startRecording() {
    if (this.isRecording) {
      this.log('Recording is already active. Skipping start.');
      return;
    }

    this.log(`Starting recording to ${this.outputFile}...`);
    this.command = ffmpeg()
      .input('pipe:0')
      .inputFormat('mjpeg')
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23'
      ])
      .save(this.outputFile)
      .on('start', () => {
        this.log(`Recording process started successfully for file: ${this.outputFile}`);
        this.isRecording = true;

        // Обработка данных из очереди
        this.processWriteQueue();
      })
      .on('progress', (progress) => {
        this.log(`Recording progress: ${progress.frames} frames captured.`);
      })
      .on('end', () => {
        this.log(`Recording stopped successfully for file: ${this.outputFile}`);
        this.resetState();
      })
      .on('error', (err) => {
        this.log(`Recording error: ${err.message}`);
        this.resetState();
      });

    // Проверяем, что поток stdin доступен
    this.command.on('spawn', () => {
      this.log('FFmpeg process spawned.');
      if (this.command.stdin) {
        this.processWriteQueue(); // Начинаем обрабатывать очередь, когда FFmpeg готов
      } else {
        this.log('FFmpeg stdin is not available.');
      }
    });

    this.log('FFmpeg process initialized for MJPEG input.');
  }
  write(data) {
    if (!this.isRecording) {
      this.log('Attempted to write data to FFmpeg while not recording. Data added to queue.');
      this.writeQueue.push(data);
      return;
    }

    if (!this.command || !this.command.stdin) {
      this.log('FFmpeg stdin is not ready or initialized. Data added to queue.');
      this.writeQueue.push(data);
      return;
    }

    // Проверяем, можем ли записать данные
    const canWrite = this.command.stdin.write(data);

    if (!canWrite) {
      this.log('Backpressure detected, waiting for drain event...');
      this.command.stdin.once('drain', () => {
        this.log('Drain event received, processing the write queue...');
        this.processWriteQueue();
      });
    }
  }

  processWriteQueue() {
    while (this.writeQueue.length > 0) {
      const data = this.writeQueue.shift();
      if (!this.command || !this.command.stdin) {
        this.log('FFmpeg stdin is not available. Stopping processing of queue.');
        return; // Если stdin не доступен, выходим из функции
      }

      const canWrite = this.command.stdin.write(data);

      if (!canWrite) {
        this.log('Backpressure detected, waiting for drain event...');
        this.command.stdin.once('drain', () => {
          this.log('Drain event received, processing the write queue...');
          this.processWriteQueue();
        });
        break;
      }
    }
  }

  stopRecording() {
    if (!this.isRecording) {
      this.log('Attempted to stop recording, but no recording is active.');
      return;
    }

    this.log('Stopping recording...');
    if (this.command && this.command.stdin) {
      this.command.stdin.end();
    }

    this.resetState();
  }

  resetState() {
    this.log('Resetting recorder state...');
    this.command = null;
    this.isRecording = false;
    this.writeQueue = [];
  }
}

module.exports = StreamRecorder;

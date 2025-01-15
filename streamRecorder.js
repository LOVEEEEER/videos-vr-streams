const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

class StreamRecorder {
    constructor(outputFile) {
        this.outputFile = outputFile;
        this.ffmpegProcess = null;
        this.init();
    }

    init() {
        console.log("Initializing FFmpeg process for MJPEG...");
        this.ffmpegProcess = ffmpeg({ source: 'pipe:0' }) // Указываем, что входной поток будет из stdin
            .inputFormat('mjpeg') // Указываем формат входного потока
            .output(this.outputFile)
            .audioCodec('aac') // Если необходимо, можно добавить аудио
            .videoCodec('libx264')
            .format('mp4') // Выходной формат
            .on('start', commandLine => {
                console.log('FFmpeg process started: ' + commandLine);
            })
            .on('error', err => {
                console.error('Error during FFmpeg processing: ' + err.message);
            })
            .on('end', () => {
                console.log('Recording finished successfully');
            })
            .run();

        // Проверка наличия stdin
        if (this.ffmpegProcess && this.ffmpegProcess.stdin) {
            console.log("FFmpeg stdin is available.");
        } else {
            console.error("FFmpeg process is not initialized or stdin is missing.");
        }
    }

    write(data) {
        if (this.ffmpegProcess && this.ffmpegProcess.stdin) {
            if (this.ffmpegProcess.stdin.writable) {
                console.log('Writing data to ffmpeg stdin');
                this.ffmpegProcess.stdin.write(data);
            } else {
                console.error('FFmpeg stdin is not writable');
            }
        } else {
            console.error('FFmpeg process is not initialized or stdin is missing');
        }
    }

    end() {
        if (this.ffmpegProcess) {
            this.ffmpegProcess.stdin.end();
            console.log('Ending recording...');
        }
    }
}

module.exports = StreamRecorder;


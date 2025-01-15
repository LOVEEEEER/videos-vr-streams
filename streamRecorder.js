const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

class StreamRecorder {
    constructor(outputFile) {
        this.outputFile = outputFile;
        this.ffmpegProcess = null;
        this.init();
    }

    init() {
        console.log("Initializing FFmpeg process for MJPEG...");

        // Запускаем ffmpeg процесс
        this.ffmpegProcess = spawn(ffmpegPath, [
            '-f', 'mjpeg',         // Указываем формат входного потока
            '-i', 'pipe:0',       // Входные данные из stdin
            '-c:v', 'libx264',    // Кодек видео
            '-preset', 'fast',     // Предустановка для кодирования
            '-crf', '23',          // Качество видео
            '-pix_fmt', 'yuv420p', // Формат пикселей
            '-movflags', 'faststart', // Оптимизация для веб-потока
            this.outputFile        // Выходной файл
        ]);

        this.ffmpegProcess.stdout.on('data', (data) => {
            console.log(`FFmpeg stdout: ${data}`);
        });

        this.ffmpegProcess.stderr.on('data', (data) => {
            console.error(`FFmpeg stderr: ${data}`);
        });

        this.ffmpegProcess.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
        });
    }

    write(data) {
        // Сериализуем объект в строку
        const dataString = typeof data === 'object' ? JSON.stringify(data) : data;

        // Сохраняем данные в файл data.txt
        fs.appendFile('data.txt', dataString + '\n', (err) => {
        if (err) {
            console.error('Error writing to data.txt:', err);
        } else {
            console.log('Data saved to data.txt');
        }
    });
        if (this.ffmpegProcess.stdin.writable) {
            console.log('Writing data to ffmpeg stdin');
            this.ffmpegProcess.stdin.write(data);
        } else {
            console.error('FFmpeg stdin is not writable');
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


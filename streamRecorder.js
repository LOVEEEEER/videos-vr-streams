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
        console.log("Initializing FFmpeg process...");
        this.ffmpegProcess = ffmpeg({ source: 'pipe:0' })
            .output(this.outputFile)
            .audioCodec('aac')
            .videoCodec('libx264')
            .format('mp4')
            .on('start', commandLine => {
                console.log('FFmpeg process started: ' + commandLine);
            })
            .on('error', err => {
                console.error('Error: ' + err.message);
            })
            .on('end', () => {
                console.log('Recording finished successfully');
            })
            .run();
    
        if (!this.ffmpegProcess) {
            console.error("FFmpeg process failed to initialize.");
        }
    }
    

    write(data) {
        if (this.ffmpegProcess && this.ffmpegProcess.stdin) {
            console.log('FFmpeg stdin writable:', this.ffmpegProcess.stdin.writable);
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

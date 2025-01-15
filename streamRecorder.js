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
    }

    write(data) {
      if (this.ffmpegProcess && this.ffmpegProcess.stdin.writable) {
        this.ffmpegProcess.stdin.write(data);
    } else {
        console.error('FFmpeg stdin is not writable');
    }
    }

    end() {
        if (this.ffmpegProcess) {
            this.ffmpegProcess.stdin.end();
        }
    }
}

module.exports = StreamRecorder;

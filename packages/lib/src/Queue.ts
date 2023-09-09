import { readFile } from 'fs/promises';
import { Streamer } from './Streamer.js';
import { getFramesPositions } from './utils.js';

const CHUNK_DURATION = 1;

export class Queue {
  files: string[] = [];
  currentFile = 0;
  timeout?: NodeJS.Timeout;
  readStreamDetacher?: () => void;

  constructor(private streamer: Streamer, private onEnd: () => void) { }

  stopQueue() {
    process.env.LOG_INFO === "true" && console.log('Called stop queue');

    if (this.readStreamDetacher) {
      this.readStreamDetacher();
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.currentFile = 0;
  }

  async startQueue() {
    if (this.currentFile === this.files.length) {
      this.currentFile = 0;
      this.onEnd();
      return;
    }

    const { parseBuffer } = await import('music-metadata');
    const currentPath = this.files[this.currentFile];

    try {
      const positions = await getFramesPositions(currentPath, CHUNK_DURATION);
      const buffer = await readFile(currentPath);
      const parsedData = await parseBuffer(buffer, undefined, {
        duration: true,
        includeChapters: true,
        skipCovers: true,
      });

      this.streamer.trackMeta = {
        artist: parsedData.common.artist || 'unknown',
        title: parsedData.common.title || 'unknown'
      };
      this.streamer.broadcast.scheduleChunks(buffer, positions, CHUNK_DURATION);
      this.timeout = setTimeout(() => {
        this.currentFile += 1;
        this.startQueue();
      }, (Number(parsedData.format.duration)) * 1000);

      process.env.LOG_INFO === "true" && console.log(`Play [${this.currentFile}/${this.files.length}] ${currentPath}`);
    } catch {
      this.timeout = setTimeout(() => {
        this.currentFile += 1;
        this.startQueue();
      }, 10);
    }
  }

  add(filePath: string) {
    this.files.push(filePath);
  }
}

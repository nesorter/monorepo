import { readFile } from 'fs/promises';
import { Streamer } from './Streamer.js';
import { getFramesPositions, sleep } from './utils.js';
import { parseBuffer } from 'music-metadata';

const CHUNK_DURATION = 1;
const CHUNK_OVERLAP_DURATION = 5;

export class Queue {
  files: string[] = [];
  currentFile = 0;
  timeout?: NodeJS.Timeout;

  constructor(private streamer: Streamer, private onEnd: () => void) { }

  stopQueue() {
    process.env.LOG_INFO === "true" && console.log('Called stop queue');

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

      process.env.LOG_INFO === "true" && console.log(`Play: [${this.currentFile}/${this.files.length}] ${parsedData.common.artist || 'unknown'} - ${parsedData.common.title || 'unknown'}\nPath: ${currentPath}`);

      for (let position of positions) {
        this.streamer.input.write(buffer.subarray(position.startByte, position.endByte));
        await sleep((CHUNK_DURATION * 1000) - CHUNK_OVERLAP_DURATION);
      }

      this.timeout = setTimeout(() => {
        this.currentFile += 1;
        this.startQueue();
      }, 10);
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

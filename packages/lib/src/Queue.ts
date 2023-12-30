import { readFile, writeFile, rm } from 'fs/promises';
import { Streamer } from './Streamer.js';
import { getFramesPositions, sleep } from './utils.js';
import { parseBuffer } from 'music-metadata';
import { nanoid } from 'nanoid';

const CHUNK_DURATION = 1000;
const CHUNK_OVERLAP_DURATION = 5;

export class Queue {
  files: string[] = [];
  currentFile = 0;
  stopSignal = false;

  constructor(
    private streamer: Streamer,
    private onEnd: () => void,
  ) {
    //
  }

  stopQueue() {
    process.env.LOG_INFO === 'true' && console.log('Queue: Called stop');
    this.stopSignal = true;
    this.currentFile = 0;
  }

  async playFile(filePath: string) {
    const positions = await getFramesPositions(filePath, CHUNK_DURATION / 1000);
    const buffer = await readFile(filePath);
    const parsedData = await parseBuffer(buffer, undefined, {
      duration: true,
      includeChapters: true,
    });

    const coverId = nanoid(16);
    this.streamer.allowedCoverId.push(`${coverId}.jpg`);
    this.streamer.trackMeta = {
      artist: parsedData.common.artist ?? 'unknown',
      cover: `/cover/${coverId}.jpg`,
      title: parsedData.common.title ?? 'unknown',
    };
    if (parsedData.common.picture?.at(0)) {
      console.log(`Queue: Write cover: /tmp/${coverId}.jpg`);
      await writeFile(`/tmp/${coverId}.jpg`, parsedData.common.picture[0].data);
    }

    if (process.env.LOG_INFO === 'true') {
      const { artist, title } = parsedData?.common || {};
      const track = `${artist ?? 'unknown'} - ${title ?? 'unknown'}`;

      console.log(`Queue: Play: [${this.currentFile}/${this.files.length}] ${track}\nPath: ${filePath}`);
    }

    for (const position of positions) {
      if (this.stopSignal) {
        break;
      }

      this.streamer.input.write(buffer.subarray(position.startByte, position.endByte));
      await sleep(CHUNK_DURATION - CHUNK_OVERLAP_DURATION);
    }

    if (parsedData.common.picture?.at(0)) {
      console.log(`Queue: Delete cover: /tmp/${coverId}.jpg`);
      await rm(`/tmp/${coverId}.jpg`);
    }
  }

  async replayQueue(queueDuration = -1) {
    this.stopSignal = false;
    this.currentFile = 0;
    return this.startQueue(queueDuration);
  }

  async startQueue(queueDuration = -1) {
    let reachedMaxDuration = false;

    if (queueDuration !== -1) {
      setTimeout(
        () => {
          console.log(`Queue: Reached max duration (${queueDuration} seconds)`);
          reachedMaxDuration = true;
          this.stopQueue();
        },
        queueDuration * 1000 - 50,
      );
    }

    for (const filePath of this.files) {
      if (this.stopSignal) {
        break;
      }

      await this.playFile(filePath);
      this.currentFile += 1;
    }

    console.log(`Queue: Reached ending`);
    if (!reachedMaxDuration) {
      this.onEnd();
    }
  }

  add(filePaths: string[]) {
    this.files = filePaths;
  }
}

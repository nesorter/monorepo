import stream from 'stream';
import { InFilePosition } from './utils.js';

export class BroadcastStream {
  scheduledChunks: { chunk: Buffer, duration: number }[] = [];
  chunkRunning: boolean = false;
  readable?: stream.PassThrough | stream.Readable;
  sinksTotal = 0;
  sinks: { id: number, plug: stream.PassThrough, shouldLog: boolean }[] = [];
  timeouts: Record<string, NodeJS.Timeout> = {};

  constructor() {
    setInterval(() => {
      if (this.chunkRunning) {
        return;
      }

      if (!this.scheduledChunks.length) {
        return;
      }

      this.chunkRunning = true;
      const chunk = this.scheduledChunks.shift();

      for (let sink of this.sinks) {
        sink.plug.write(chunk?.chunk);
      }

      setTimeout(() => {
        this.chunkRunning = false;
      }, (Number(chunk?.duration) * 1000) - 10);
    }, 100);
  }

  subscribe(bitrate: number, shouldLog = true) {
    const id = Date.now();
    const plug = new stream.PassThrough({
      readableHighWaterMark: bitrate,
      writableHighWaterMark: bitrate,
    });

    this.sinksTotal += 1;
    this.sinks.push({ id, plug, shouldLog });
    plug.on('unpipe', () => {
      this.sinks = this.sinks.filter(_ => _.id !== id);
    });

    return { id, plug };
  }

  async scheduleChunks(buffer: Buffer, positions: InFilePosition[], duration: number) {
    positions.forEach((value) => {
      const chunk = buffer.subarray(value.startByte, value.endByte);
      this.scheduledChunks.push({ chunk, duration });
    });
  }
}

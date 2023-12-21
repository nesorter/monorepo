import { BroadcastStream } from './BroadcastStream.js';
import express, { Express } from 'express';
import { PassThrough } from 'node:stream';

export class Streamer {
  app: Express;
  broadcast: BroadcastStream;
  input: PassThrough;

  sended = 0;
  trackMeta = {
    artist: 'unknown',
    title: 'unknown',
  };

  constructor(port: number, mountpoint: string) {
    this.input = new PassThrough({
      readableHighWaterMark: 1440 * 40,
      writableHighWaterMark: 1440 * 40,
    });
    this.broadcast = new BroadcastStream(this.input);
    this.app = express();
    this.app.listen(port);
    this.app.disable('x-powered-by');
    this.setupRouting(mountpoint);

    const { plug } = this.broadcast.subscribe(false, 0);
    plug.on('data', (chunk: Buffer) => {
      this.sended += chunk.length;
    });
  }

  setupRouting(mountpoint: string) {
    this.app.get('/trackinfo', (_req, res) => {
      res.json(this.trackMeta);
    });

    this.app.get(mountpoint, (req, res) => {
      const headers = {
        'Cache-Control': 'no-cache, no-store',
        Connection: 'keep-alive',
        'Content-Type': 'audio/mp3',
        Pragma: 'no-cache',
      };
      res.writeHead(200, headers);

      const { id, plug } = this.broadcast.subscribe();
      plug.on('data', (chunk: Buffer) => {
        res.write(chunk);
        this.sended += chunk.length;
        process.env.LOG_DEBUG === 'true' && console.log(`DEBUG: Streamer: Sended chunk (${chunk.length / 1000}kb) to client #${id}`);
      });

      process.env.LOG_INFO === 'true' && console.log(`Streamer: Event, Client #${id} connected`);
      req.socket.on('close', () => {
        process.env.LOG_INFO === 'true' && console.log(`Streamer: Event, Client #${id} disconnects`);
        plug.emit('unpipe');
      });
    });
  }
}

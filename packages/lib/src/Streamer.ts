import { BroadcastStream } from './BroadcastStream.js';
import express, { Express } from 'express';
import { PassThrough } from 'node:stream';

export class Streamer {
  app: Express;
  broadcast: BroadcastStream;
  input: PassThrough;
  port: number;
  mountpoint: string;

  sended = 0;
  trackMeta = {
    artist: 'unknown',
    cover: '/cover/404',
    title: 'unknown',
  };
  allowedCoverId = ['404'];

  constructor(port: number, mountpoint: string) {
    this.port = port;
    this.mountpoint = mountpoint;
    this.input = new PassThrough({
      readableHighWaterMark: 1440 * 40,
      writableHighWaterMark: 1440 * 40,
    });
    this.broadcast = new BroadcastStream(this.input);
    this.app = express();
    this.app.disable('x-powered-by');

    const { plug } = this.broadcast.subscribe(false, 0);
    plug.on('data', (chunk: Buffer) => {
      this.sended += chunk.length;
    });
  }

  listen() {
    this.setupRouting(this.mountpoint);
    this.app.listen(this.port);
  }

  setupRouting(mountpoint: string) {
    this.app.get('/trackinfo', (_req, res) => {
      res.json(this.trackMeta);
    });

    this.app.get(`/cover/:id`, (req, res) => {
      console.log(req.params.id);
      if (!this.allowedCoverId.includes(req.params.id)) {
        res.status(404).json({ message: 'Wrong id' });
        return;
      }

      res.sendFile(`/tmp/${req.params.id}`);
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

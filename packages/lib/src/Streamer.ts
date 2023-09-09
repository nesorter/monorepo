import { BroadcastStream } from './BroadcastStream.js';
import express, { Express } from 'express';

export class Streamer {
  app: Express;
  broadcast: BroadcastStream;
  bitrate = 0;
  sended = 0;
  trackMeta = {
    artist: 'unknown',
    title: 'unknown',
  };

  constructor(port: number, mountpoint: string) {
    this.broadcast = new BroadcastStream();
    this.app = express();
    this.app.listen(port);
    this.app.disable('x-powered-by');
    this.setupRouting(mountpoint);

    const { plug } = this.broadcast.subscribe(128000, false);
    plug.on('data', (chunk) => {
      this.sended += chunk.length;
    });
  }

  setupRouting(mountpoint: string) {
    this.app.get('/trackinfo', (_req, res) => {
      res.json(this.trackMeta);
    });

    this.app.get(mountpoint, (req, res) => {
      const headers = {
        "Content-Type": "audio/mp3",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
      };
      res.writeHead(200, headers);

      const { id, plug } = this.broadcast.subscribe(this.bitrate);
      plug.on('data', (chunk) => res.write(chunk));

      process.env.LOG_INFO === "true" && console.log(`Client #${id} connected`);
      req.socket.on('close', () => {
        process.env.LOG_INFO === "true" && console.log(`Client #${id} disconnects`);
        plug.emit('unpipe');
      });
    });
  }
}

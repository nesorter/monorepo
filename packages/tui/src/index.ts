import { Streamer, FileSystemScanner, Queue, shuffle, formatNumber } from '@nesorter/lib';
import EventEmitter from 'events';

export type Config = {
  server: {
    port: number;
    mount: string;
  };
  library: {
    root: string;
  };
  playlists: {
    name: string;
    path: string;
  }[];
  schedule: {
    type: string;
    playlists: string[];
  };
  logger: {
    debug: boolean;
    info: boolean;
  };
};

export const nesorter = async (config: Config) => {
  process.env.LOG_INFO = config.logger.info ? "true" : "false";
  process.env.LOG_DEBUG = config.logger.debug ? "true" : "false";

  const streamer = new Streamer(config.server.port, config.server.mount);

  let playlists = shuffle(config.playlists);

  let queue: Queue;
  let index = 0;
  const ev = new EventEmitter();
  const scheduleQueue = async () => {
    const playlist = playlists[index];
    const thisQueue = new Queue(streamer, () => ev.emit('end'));
    const scanner = new FileSystemScanner(playlist.path);
    const files = shuffle(await scanner.scan());

    ev.once('end', () => {
      index += 1;
      if (index === playlists.length) {
        playlists = shuffle(config.playlists);
        index = 0;
      }

      thisQueue.stopQueue();
      setTimeout(() => scheduleQueue(), 10);
    });

    for (let file of files) {
      thisQueue.add(file.fullPath);
    }

    await thisQueue.startQueue();
    queue = thisQueue;
  }

  scheduleQueue();

  setInterval(() => {
    console.log(
      `Sended: ${formatNumber(streamer.sended / 1024, 2)}kb, ${formatNumber(streamer.sended / (1024 * 1024), 2)}mb, ${formatNumber(streamer.sended / (1024 * 1024 * 1024), 2)}gb`
    );
  }, 60000);
}

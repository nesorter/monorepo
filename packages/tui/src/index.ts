import startOfDay from 'date-fns/startOfDay';
import getUnixTime from 'date-fns/getUnixTime';
import { secondsInDay } from 'date-fns';
import { Streamer, FileSystemScanner, Queue, shuffle, formatNumber, ScannedItem } from '@nesorter/lib';
import { EventEmitter } from 'stream';

export type Config = {
  server: {
    port: number;
    mount: string;
  };
  library: {
    root: string;
  };
  playlists: {
    id: string;
    path: string;
  }[];
  maxScheduledItems: number;
  schedule: (
    | {
        type: 'playlist';
        /* seconds from day start */
        startAt: number;
        /* seconds */
        duration: number;
        playlistId: string;
        shouldShuffle?: boolean;
      }
    | {
        type: 'sequence';
        /* seconds from day start */
        startAt: number;
        /* seconds */
        duration: number;
        sequence: {
          up: {
            duration: number;
            playlistId: string;
            shouldShuffle?: boolean;
          };
          down: {
            duration: number;
            playlistId: string;
            shouldShuffle?: boolean;
          };
        };
      }
  )[];
  logger: {
    debug: boolean;
    info: boolean;
  };
};

let startPoint = startOfDay(new Date());
const getSecondsFromStartOfDay = () => {
  let offset = getUnixTime(new Date()) - getUnixTime(startPoint);
  if (offset > secondsInDay) {
    startPoint = startOfDay(new Date());
    offset = 0;
  }

  return offset;
};

export const nesorter = async (config: Config) => {
  process.env.LOG_INFO = config.logger.info ? 'true' : 'false';
  process.env.LOG_DEBUG = config.logger.debug ? 'true' : 'false';

  const scanner = new FileSystemScanner(config.library.root);
  const streamer = new Streamer(config.server.port, config.server.mount);

  const playlistIds = config.playlists.map((_) => _.id);
  const playlists = Object.fromEntries(
    await Promise.all(
      config.playlists.map(async ({ id, path }) => {
        const content = await scanner.scan(path);
        return [id, content] as [string, ScannedItem[]];
      }),
    ),
  );

  // check that playlistIds in schedule are correct
  config.schedule.forEach((item, index) => {
    if (item.type === 'playlist') {
      if (!playlistIds.includes(item.playlistId)) {
        throw new Error(`Wrong playlistId for schedule #${index}, startAt: ${item.startAt}`);
      }

      return;
    }

    if (item.type === 'sequence') {
      if (!playlistIds.includes(item.sequence.down.playlistId)) {
        throw new Error(`Wrong playlistId for schedule #${index}, startAt: ${item.startAt}, sequence stage: down`);
      }

      if (!playlistIds.includes(item.sequence.up.playlistId)) {
        throw new Error(`Wrong playlistId for schedule #${index}, startAt: ${item.startAt}, sequence stage: up`);
      }

      return;
    }
  });

  // skip schedule items that in past, but find playlist that should play right now
  // and some calculations for correct offsets
  const secondsFromStartOfDay = getSecondsFromStartOfDay();
  let currentScheduleItemIndex = config.schedule.findIndex((item) => item.startAt <= secondsFromStartOfDay && item.startAt + item.duration > secondsFromStartOfDay);
  const scheduleIndexes = [] as number[];

  let counter = 0;
  while (counter < config.maxScheduledItems) {
    scheduleIndexes.push(currentScheduleItemIndex);

    currentScheduleItemIndex += 1;
    counter += 1;

    if (currentScheduleItemIndex === config.schedule.length) {
      currentScheduleItemIndex = 0;
    }
  }

  const startDelay = 500;
  let currentStartOffset = startDelay;
  let currentStopOffset = startDelay + (config.schedule[scheduleIndexes[0]].startAt + config.schedule[scheduleIndexes[0]].duration) - secondsFromStartOfDay;

  // start sheduling
  scheduleIndexes.forEach((scheduleIndex, index) => {
    const schedule = config.schedule[scheduleIndex];
    const eventEmitter = new EventEmitter();
    const queue = new Queue(streamer, () => eventEmitter.emit('end'));

    if (schedule.type === 'playlist') {
      let files = playlists[schedule.playlistId].map((_) => _.fullPath);
      if (schedule.shouldShuffle) {
        files = shuffle(files);
      }

      queue.add(files);
      setTimeout(() => queue.startQueue(currentStopOffset), currentStartOffset);
      setTimeout(() => queue.stopQueue(), currentStopOffset);

      eventEmitter.on('end', () => {
        if (schedule.shouldShuffle) {
          queue.add(shuffle(files));
        }

        queue.replayQueue(currentStopOffset).catch(console.error);
      });
    } else {
      // todo for sequences
    }

    const nextSchedule = scheduleIndexes[index + 1];
    if (nextSchedule) {
      currentStartOffset = startDelay + currentStopOffset;
      currentStopOffset = startDelay + schedule.duration;
    }
  });

  // logging network usage
  setInterval(() => {
    const kb = formatNumber(streamer.sended / 1024, 2);
    const mb = formatNumber(streamer.sended / (1024 * 1024), 2);
    const gb = formatNumber(streamer.sended / (1024 * 1024 * 1024), 2);

    console.log(`Sended: ${kb}kb, ${mb}mb, ${gb}gb`);
  }, 60000);
};

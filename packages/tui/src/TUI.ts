import { Streamer, FileSystemScanner, Queue, shuffle, formatNumber, ScannedItem } from '@nesorter/lib';
import { EventEmitter } from 'node:events';
import type { Config } from './type/Config';
import { getSecondsFromStartOfDay } from './utils/getSecondsFromStartOfDay.js';

export class TUI {
  public config: Config;
  public streamer: Streamer;

  private playlistIds: string[] = [];
  private playlists: Record<string, ScannedItem[]> = {};

  private startDelay = 500; // ms
  private currentStartOffset = 0;
  private currentStopOffset = 0;
  private scheduleIndexes: number[] = [];

  public static create(config: Config) {
    return new TUI(config);
  }

  constructor(config: Config) {
    // culhax bcoz @nesorter/lib design
    process.env.LOG_INFO = config.logger.info ? 'true' : 'false';
    process.env.LOG_DEBUG = config.logger.debug ? 'true' : 'false';

    this.config = config;
    this.streamer = new Streamer(config.server.port, config.server.mount);
    this.playlistIds = config.playlists.map((_) => _.id);

    this.validateConfig();
  }

  public async start() {
    // entry point
    await this.hotbootPlaylists();
    this.calculateSchedule();
    this.fillSchedule();
    this.enableLogging();
    this.streamer.listen();
  }

  private validateConfig() {
    // TODO: validate config by schema
    // TODO: validate playlist paths in config
    // TODO: validate schedule durations

    // check that playlistIds in schedules are correct
    this.config.schedule.forEach((item, index) => {
      if (item.type === 'playlist') {
        if (!this.playlistIds.includes(item.playlistId)) {
          throw new Error(`PL_VERIFY_ERR: Wrong playlistId for schedule #${index}, startAt: ${item.startAt}`);
        }

        return;
      }

      if (item.type === 'sequence') {
        if (!this.playlistIds.includes(item.sequence.down.playlistId)) {
          throw new Error(`PL_VERIFY_ERR: Wrong playlistId for schedule #${index}, startAt: ${item.startAt}, sequence stage: down`);
        }

        if (!this.playlistIds.includes(item.sequence.up.playlistId)) {
          throw new Error(`PL_VERIFY_ERR: Wrong playlistId for schedule #${index}, startAt: ${item.startAt}, sequence stage: up`);
        }

        return;
      }
    });
  }

  private enableLogging() {
    // logging network usage
    setInterval(() => {
      const kb = formatNumber(this.streamer.sended / 1024, 2);
      const mb = formatNumber(this.streamer.sended / (1024 * 1024), 2);
      const gb = formatNumber(this.streamer.sended / (1024 * 1024 * 1024), 2);

      console.log(`Sended: ${kb}kb, ${mb}mb, ${gb}gb`);
    }, 60000);
  }

  private async hotbootPlaylists() {
    // load files paths of playlists into memory
    const scanner = new FileSystemScanner(this.config.library.root);
    this.playlists = Object.fromEntries(
      await Promise.all(
        this.config.playlists.map(async ({ id, path }) => {
          const content = await scanner.scan(path);
          return [id, content] as [string, ScannedItem[]];
        }),
      ),
    );
  }

  private calculateSchedule() {
    // skip schedule items that in past, but find playlist that should play right now
    // and some calculations for correct offsets
    // than make "schedule for schedule"
    const secondsFromStartOfDay = getSecondsFromStartOfDay();
    let currentScheduleItemIndex = this.config.schedule.findIndex((item) => item.startAt <= secondsFromStartOfDay && item.startAt + item.duration > secondsFromStartOfDay);

    let counter = 0;
    while (counter < this.config.maxScheduledItems) {
      this.scheduleIndexes.push(currentScheduleItemIndex);

      currentScheduleItemIndex += 1;
      counter += 1;

      if (currentScheduleItemIndex === this.config.schedule.length) {
        currentScheduleItemIndex = 0;
      }
    }

    const initialScheduleItem = this.config.schedule[this.scheduleIndexes[0]];
    const startDelay = 500;
    this.currentStartOffset = startDelay;
    this.currentStopOffset = startDelay + (initialScheduleItem.startAt + initialScheduleItem.duration) - secondsFromStartOfDay;
  }

  private fillSchedule() {
    // put tasks about starting and stoping schedule items into built-in timers
    const eventEmitter = new EventEmitter();

    this.scheduleIndexes.forEach((scheduleIndex, index) => {
      const schedule = this.config.schedule[scheduleIndex];
      const queue = new Queue(this.streamer, () => eventEmitter.emit(`end-${index}`));

      if (schedule.type === 'playlist') {
        let files = this.playlists[schedule.playlistId].map((_) => _.fullPath);
        if (schedule.shouldShuffle) {
          files = shuffle(files);
        }

        queue.add(files);
        setTimeout(() => queue.startQueue(this.currentStopOffset), this.currentStartOffset);
        setTimeout(() => queue.stopQueue(), this.currentStopOffset);

        eventEmitter.on(`end-${index}`, () => {
          if (schedule.shouldShuffle) {
            queue.add(shuffle(files));
          }

          queue.replayQueue(this.currentStopOffset).catch(console.error);
        });
      } else {
        // todo for sequences
      }

      const nextSchedule = this.scheduleIndexes[index + 1];
      if (nextSchedule) {
        this.currentStartOffset = this.startDelay + this.currentStopOffset;
        this.currentStopOffset = this.startDelay + schedule.duration;
      }
    });
  }
}

import { Streamer, FileSystemScanner, Queue, shuffle, formatNumber, ScannedItem, Sequencer, getTrackDuration } from '@nesorter/lib';
import { EventEmitter } from 'node:events';
import { Config, ConfigSchema, PlOneOfSchemaType, PlSchemaType, SeqSchemaType } from './type/Config.js';
import { getSecondsFromStartOfDay } from './utils/getSecondsFromStartOfDay.js';
import { statSync } from 'node:fs';

export class TUI {
  public config: Config;
  public streamer: Streamer;

  private playlistIds: string[] = [];
  private playlists: Record<string, ScannedItem[]> = {};

  private startDelay = 500; // ms
  private currentStartOffset = 0;
  private currentStopOffset = 0;
  private scheduleIndexes: number[] = [];

  private durationsCache: Record<string, number> = {};

  public static create(config: Config) {
    return new TUI(config);
  }

  constructor(config: Config) {
    // culhax bcoz @nesorter/lib design
    process.env.LOG_INFO = config.logger.info ? 'true' : 'false';
    process.env.LOG_DEBUG = config.logger.debug ? 'true' : 'false';

    this.config = config;
    this.validateConfig();

    this.streamer = new Streamer(config.server.port, config.server.mount);
  }

  public async start() {
    // entry point
    await this.hotbootPlaylists();
    this.calculateSchedule();
    await this.fillSchedule();
    this.enableLogging();
    this.streamer.listen();
  }

  private validateConfig() {
    // validate config by schema
    const result = ConfigSchema.safeParse(this.config);
    if (!result.success) {
      throw new Error(`CONF_VERIFY_ERR: Wrong config: ${result.error.message}`);
    }

    // validate playlist paths in config
    this.config.playlists.forEach((item) => {
      try {
        statSync(item.path);
      } catch (e) {
        throw new Error(`PL_PATHS_VERIFY_ERR: ${(e as Error).message}`);
      }
    });

    // validate schedule durations
    this.config.schedule.forEach((item, index) => {
      this.config.schedule
        .filter((itemTo, indexTo) => indexTo > index && itemTo !== undefined)
        .forEach((itemTo, indexTo) => {
          if (item.startAt + item.duration > itemTo.startAt) {
            throw new Error(`SCHED_TIMINGS_VERIFY_ERR: schedules #${index} & #${indexTo} are overlapped`);
          }
        });
    });

    // check that playlistIds in schedules are correct
    this.playlistIds = this.config.playlists.map((_) => _.id);
    this.config.schedule.forEach((item, index) => {
      if (item.type === 'playlist') {
        if (!this.playlistIds.includes(item.playlistId)) {
          throw new Error(`PL_VERIFY_ERR: Wrong playlistId for schedule #${index}, startAt: ${item.startAt}`);
        }

        return;
      }

      if (item.type === 'playlists') {
        if (!item.playlistIds.every((plId) => this.playlistIds.includes(plId))) {
          throw new Error(`PL_VERIFY_ERR: Wrong playlistIds for schedule #${index}, startAt: ${item.startAt}`);
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
    const startDelay = 1;
    this.currentStartOffset = startDelay;
    this.currentStopOffset = startDelay + (initialScheduleItem.startAt + initialScheduleItem.duration) - secondsFromStartOfDay;
  }

  private async fillSchedule() {
    // put tasks about starting and stoping schedule items into built-in timers
    const eventEmitter = new EventEmitter();

    for (let index = 0; index < this.scheduleIndexes.length; index += 1) {
      const mStart = this.currentStartOffset;
      const mStop = this.currentStopOffset;
      const scheduleIndex = this.scheduleIndexes[index];
      const schedule = this.config.schedule[scheduleIndex];
      const queue = new Queue(this.streamer, () => eventEmitter.emit(`end-${index}`));

      const files = await this.getScheduleFiles(schedule);
      queue.add(files);

      setTimeout(() => {
        console.log(`TUI: Start sheduled ${index} [${schedule.type}], t=${mStart}`);
        queue.startQueue(this.currentStopOffset).catch(console.error);
      }, this.currentStartOffset * 1000);

      setTimeout(() => {
        console.log(`TUI: Stop sheduled ${index} [${schedule.type}], t=${mStop}`);
        queue.stopQueue();
      }, this.currentStopOffset * 1000);

      eventEmitter.on(`end-${index}`, () => {
        this.getScheduleFiles(schedule)
          .then((files) => {
            queue.add(files);
            queue.replayQueue(this.currentStopOffset).catch(console.error);
          })
          .catch(console.error);
      });

      const nextSchedule = this.scheduleIndexes[index + 1];
      if (nextSchedule !== undefined) {
        this.currentStartOffset = this.startDelay + this.currentStopOffset;
        this.currentStopOffset = this.startDelay + schedule.duration;
      }
    }
  }

  private async getScheduleFiles(schedule: SeqSchemaType | PlSchemaType | PlOneOfSchemaType) {
    if (schedule.type === 'sequence') {
      return await this.makeSequencedTrackList(schedule);
    }

    if (schedule.type === 'playlists') {
      let files = schedule.playlistIds.reduce((acc, cur) => {
        const plFiles = this.playlists[cur].map((_) => _.fullPath);
        return [...acc, ...plFiles];
      }, [] as string[]);

      if (schedule.shouldShuffle) {
        files = shuffle(files);
      }

      return files;
    }

    if (schedule.type === 'playlist') {
      let files = this.playlists[schedule.playlistId].map((_) => _.fullPath);
      if (schedule.shouldShuffle) {
        files = shuffle(files);
      }

      return files;
    }

    return [] as string[];
  }

  private async makeSequencedTrackList(schedule: SeqSchemaType) {
    const tracklist: string[] = [];
    const sequencer = new Sequencer({
      durationDown: schedule.sequence.down.duration * 1000,
      durationUp: schedule.sequence.up.duration * 1000,
      sequenceFunction: Math.sin,
    });

    let timeElapsed = 0;
    let upPlaylist = [...this.playlists[schedule.sequence.up.playlistId]];
    let downPlaylist = [...this.playlists[schedule.sequence.down.playlistId]];

    if (schedule.sequence.up.shouldShuffle) {
      upPlaylist = shuffle(upPlaylist);
    }

    if (schedule.sequence.down.shouldShuffle) {
      downPlaylist = shuffle(downPlaylist);
    }

    while (timeElapsed < schedule.duration * 1000) {
      if (upPlaylist.length === 0) {
        upPlaylist = [...this.playlists[schedule.sequence.up.playlistId]];
        if (schedule.sequence.up.shouldShuffle) {
          upPlaylist = shuffle(upPlaylist);
        }
      }

      if (downPlaylist.length === 0) {
        downPlaylist = [...this.playlists[schedule.sequence.down.playlistId]];
        if (schedule.sequence.down.shouldShuffle) {
          downPlaylist = shuffle(downPlaylist);
        }
      }

      const target = sequencer.choose(timeElapsed);
      const scannedItem = target === 'up' ? upPlaylist.shift() : downPlaylist.shift();
      const track = scannedItem?.fullPath || '';
      tracklist.push(track);

      if (!this.durationsCache[track]) {
        this.durationsCache[track] = await getTrackDuration(track);
      }

      timeElapsed += this.durationsCache[track];
    }

    return tracklist;
  }
}

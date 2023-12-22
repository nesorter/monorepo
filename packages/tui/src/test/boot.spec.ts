import { should } from 'chai';
import { TUI } from '../TUI.js';

describe('Startup fails', () => {
  it('should fail if playlists in schedule are wrong', () => {
    should().throw(() => {
      TUI.create({
        library: {
          root: './',
        },
        logger: {
          debug: false,
          info: false,
        },
        maxScheduledItems: 256,
        playlists: [],
        schedule: [
          {
            duration: 1,
            playlistId: 'test',
            startAt: 0,
            type: 'playlist',
          },
        ],
        server: {
          mount: '/',
          port: 3030,
        },
      });
    }, 'PL_VERIFY_ERR:');
  });

  it('should fail if config invalid', () => {
    should().throw(() => {
      // @ts-ignore cause here typecheck broke test
      TUI.create({
        library: {
          root: './',
        },
        logger: {
          debug: false,
          info: false,
        },
        maxScheduledItems: 256,
        playlists: [
          {
            id: 'test',
            path: './packages',
          },
        ],
        schedule: [
          {
            duration: 1,
            playlistId: 'test',
            startAt: 0,
            type: 'playlist',
          },
        ],
      });
    }, 'CONF_VERIFY_ERR:');
  });

  it('should fail if playlist paths doesnt existed', () => {
    should().throw(() => {
      TUI.create({
        library: {
          root: './',
        },
        logger: {
          debug: false,
          info: false,
        },
        maxScheduledItems: 256,
        playlists: [
          {
            id: 'test',
            path: './404_not_found',
          },
        ],
        schedule: [
          {
            duration: 1,
            playlistId: 'test',
            startAt: 0,
            type: 'playlist',
          },
        ],
        server: {
          mount: '/',
          port: 3030,
        },
      });
    }, 'PL_PATHS_VERIFY_ERR:');
  });

  it('should fail if schedules timings overlapped', () => {
    should().throw(() => {
      TUI.create({
        library: {
          root: './',
        },
        logger: {
          debug: false,
          info: false,
        },
        maxScheduledItems: 256,
        playlists: [
          {
            id: 'test',
            path: '/',
          },
        ],
        schedule: [
          {
            duration: 1000,
            playlistId: 'test',
            startAt: 0,
            type: 'playlist',
          },
          {
            duration: 1000,
            playlistId: 'test',
            startAt: 500,
            type: 'playlist',
          },
        ],
        server: {
          mount: '/',
          port: 3030,
        },
      });
    }, 'SCHED_TIMINGS_VERIFY_ERR:');
  });
});

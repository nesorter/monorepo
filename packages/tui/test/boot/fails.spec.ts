import { nesorter } from '../../src';

describe('boot fails', () => {
  it('should fails when wrong playlist ids in shedule.type = playlist', async () => {
    const instance = await nesorter({
      library: {
        root: './',
      },
      logger: {
        debug: false,
        info: false,
      },
      maxScheduledItems: 1,
      playlists: [],
      schedule: [
        {
          duration: 1,
          playlistId: 'test',
          shouldShuffle: false,
          startAt: 1,
          type: 'playlist',
        },
      ],
      server: {
        mount: '/test',
        port: 9000,
      },
    });
  });
});

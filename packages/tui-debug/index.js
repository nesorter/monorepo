import { TUI } from '@nesorter/tui';

TUI.create({
  server: {
    port: 3000,
    mount: '/listen',
  },
  logger: {
    debug: false,
    info: true,
  },
  library: {
    root: '/Users/kugichka/samples',
  },
  playlists: [
    {
      id: '1',
      path: '/Users/kugichka/samples/pl1'
    },
    {
      id: '2',
      path: '/Users/kugichka/samples/pl2'
    },
  ],
  maxScheduledItems: 256,
  schedule: [
    {
      type: 'playlist',
      startAt: 0, // 00:00
      duration: 86400 / 4, // 6 hours
      playlistId: '2',
      shouldShuffle: true,
    },
    {
      type: 'sequence',
      startAt: 86400 / 4, // 6:00
      duration: (86400 / 4), // 6 hours
      sequence: {
        up: {
          playlistId: '1',
          duration: 90
        },
        down: {
          playlistId: '2',
          duration: 90
        }
      }
    },
    {
      type: 'playlists',
      startAt: 86400 / 2, // 12:00
      duration: (86400 / 2), // 12 hours
      shouldShuffle: true,
      playlistIds: ['1', '2']
    }
  ],
}).start().then(() => {
  console.log('Event: server initialized');
});

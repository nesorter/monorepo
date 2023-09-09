export const config = {
  server: {
    port: 3000,
    mount: '/listen',
  },
  library: {
    root: '/Users/kugichka/Music/Electronics Random',
  },
  playlists: [
    {
      name: 'random #1',
      path: '/Users/kugichka/Music/Electronics Random/Random #1 > kugi\'s'
    },
    {
      name: 'random #2',
      path: '/Users/kugichka/Music/Electronics Random/Random #2 > kugi\'s'
    },
    {
      name: 'random #3',
      path: '/Users/kugichka/Music/Electronics Random/Random #3 > kugi\'s'
    },
    {
      name: 'random #4',
      path: '/Users/kugichka/Music/Electronics Random/Random #4 > kugi\'s'
    },
    {
      name: 'random #5',
      path: '/Users/kugichka/Music/Electronics Random/Random #5 > kugi\'s'
    },
    {
      name: 'random #6',
      path: '/Users/kugichka/Music/Electronics Random/Random #6 > kugi\'s'
    }
  ],
  schedule: {
    type: 'line',
    playlists: [
      'random #1', 'random #6', 'random #2', 'random #5', 'random #3', 'random #4'
    ],
  },
};

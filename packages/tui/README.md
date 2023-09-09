# nesorter
## Web radio with scheduling and "playlisting"

### Requirements
- `ffmpeg` installed on host and available in $PATH

### How to use
- Init Node.JS package/project
```bash
mkdir radio && \
cd radio && \
npm init -f
```

- Make sure your `package.json` contains `"type": "module"`

- Next, install this app
```bash
npm install @nesorter/tui@latest
```

- Next, create `index.js` and paste this code:
```js
import { nesorter } from '@nesorter/tui';

nesorter({
  server: {
    port: 3000,
    mount: '/listen',
  },
  logger: {
    debug: false,
    info: true,
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
}).then(() => {
  console.log('Event: server initialized');
});
```

- So, start app with:
```bash
node index.js
```

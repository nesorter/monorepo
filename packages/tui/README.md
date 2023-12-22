# nesorter
## Web radio with scheduling and "playlisting"

### Requirements
- `ffprobe` installed on host and available in $PATH

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
import { TUI } from '@nesorter/tui';

const config = {
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
      id: 'random #1',
      path: '/Users/kugichka/Music/Electronics Random/Random #1 > kugi\'s'
    },
    {
      id: 'random #2',
      path: '/Users/kugichka/Music/Electronics Random/Random #2 > kugi\'s'
    },
  ],
  maxScheduledItems: 256,
  schedule: [{
    type: 'playlist',
    startAt: 0, // 00:00
    duration: 86400, // 24 hours
    playlistId: 'random #1',
    shouldShuffle: true,
  }],
};

TUI.create(config).start().then(() => {
  console.log('Event: server initialized');
});
```

- So, start app with:
```bash
node index.js
```

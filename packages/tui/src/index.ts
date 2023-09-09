import { ConsoleManager, PageBuilder } from 'console-gui-tools';
import { Streamer, FileSystemScanner, Queue, shuffle } from '@nesorter/lib';
import { config } from './config.js';
import EventEmitter from 'events';

const streamer = new Streamer(config.server.port, config.server.mount);
const playlists = [
  ...shuffle(config.playlists),
  ...shuffle(config.playlists),
  ...shuffle(config.playlists),
  ...shuffle(config.playlists),
  ...shuffle(config.playlists),
  ...shuffle(config.playlists),
  ...shuffle(config.playlists),
  ...shuffle(config.playlists),
  ...shuffle(config.playlists),
  ...shuffle(config.playlists),
  ...shuffle(config.playlists),
];

let queue: Queue;
let index = 0;
const ev = new EventEmitter();
const scheduleQueue = async () => {
  const playlist = playlists[index];
  const thisQueue = new Queue(streamer, () => ev.emit('end'));
  const scanner = new FileSystemScanner(playlist.path);
  const files = shuffle(await scanner.scan());

  ev.on('end', () => {
    index += 1;
    if (index === playlists.length) {
      index = 0;
    }

    thisQueue.stopQueue();
    setTimeout(() => scheduleQueue(), 100);
  });

  for (let file of files) {
    await thisQueue.add(file.fullPath);
  }

  await thisQueue.startQueue();
  queue = thisQueue;
}

scheduleQueue();

let page = 'main';
let setPage = (nextpage: string) => {
  page = nextpage;
}

const GUI = new ConsoleManager({
  title: 'nesorter',
  logPageSize: 8,
  layoutOptions: {
    type: 'double',
    changeFocusKey: 'm',
    boxed: true,
    boxStyle: 'bold',
    boxColor: 'cyan',
    showTitle: true,
  }
});

GUI.on("exit", () => {
  process.exit();
});

const updateConsole = async () => {
  const mainPage = new PageBuilder();

  mainPage.addRow({
    text: `port = ${config.server.port}; mountpoint = ${config.server.mount}`,
    color: 'white'
  });

  mainPage.addSpacer();
  mainPage.addSpacer();

  mainPage.addRow({
    text: `Playlist: "${playlists[index].name}"`,
    color: 'white'
  });
  mainPage.addRow({
    text: `Queue, current index: ${queue?.currentFile} of ${queue?.files.length}`,
    color: 'white'
  });
  mainPage.addRow({
    text: `Queue, current song: ${queue?.files[queue?.currentFile]}`,
    color: 'white'
  });

  mainPage.addSpacer();
  mainPage.addSpacer();

  mainPage.addRow({
    text: `Clients count: ${streamer.broadcast.sinks.length - 1} [${streamer.broadcast.sinksTotal - 1} total]`,
    color: 'white'
  });
  mainPage.addRow({
    text: `Sended: ${streamer.sended / 1000}kb`,
    color: 'white'
  });

  mainPage.addSpacer();
  mainPage.addSpacer();

  mainPage.addRow({
    text: `Use h for help`,
    color: 'red'
  });

  const helpPage = new PageBuilder();
  helpPage.addRow({
    text: `Navigation:`,
    color: 'red'
  });
  helpPage.addRow({
    text: `  - key '1': main page`,
    color: 'white'
  });
  helpPage.addRow({
    text: `  - key 'h': help page`,
    color: 'white'
  });

  if (page === 'main') {
    GUI.setPage(mainPage, 0, 'main');
  }

  if (page === 'help') {
    GUI.setPage(helpPage, 0, 'help');
  }
}

GUI.on('keypressed', (key) => {
  switch (key.name) {
    case '1':
      setPage('main');
      break;

    case 'h':
      setPage('help');
      break;

    default:
      break;
  }
});

setInterval(() => updateConsole(), 500);

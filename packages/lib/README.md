# @nesorter/lib
### Standalone solution for audio streaming
Set of utils for audio streaming

### Usage example
```typescript
import { Streamer, FileSystemScanner, Queue } from '@nesorter/lib';

// with this options webradio should be available
// on 'http://localhost:3000/listen'
const streamer = new Streamer(3000, '/listen');

// sets root path for scanning audio library
const scanner = new FileSystemScanner('/home/user/music');

// create play queue
const queue = new Queue(streamer);

// compose all: scan-audio-lib -> add-to-queue -> start-queue
scanner.scan()
  .then((items) => items.map((item) => queue.add(item.fullPath)))
  .then(() => queue.startQueue());
```

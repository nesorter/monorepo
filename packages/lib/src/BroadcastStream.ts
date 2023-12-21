import stream from 'stream';

export class BroadcastStream {
  chunksTotal = 0;
  sinksTotal = 0;
  sinks: { id: number; plug: stream.PassThrough; shouldLog: boolean }[] = [];

  constructor(private readable: stream.PassThrough | stream.Readable) {
    this.readable.on('data', (chunk) => {
      this.chunksTotal += 1;

      for (const sink of this.sinks) {
        process.env.LOG_DEBUG === 'true' && sink.shouldLog && console.log(`DEBUG: Broadcast: Send chunk #${this.chunksTotal} to sink #${sink.id}`);
        sink.plug.write(chunk);
      }
    });
  }

  subscribe(shouldLog = true, id = Date.now()) {
    const plug = new stream.PassThrough({
      readableHighWaterMark: 1440 * 40,
      writableHighWaterMark: 1440 * 40,
    });

    plug.on('unpipe', () => {
      this.sinks = this.sinks.filter((_) => _.id !== id);
    });

    this.sinks.push({ id, plug, shouldLog });
    this.sinksTotal += 1;

    return { id, plug };
  }
}

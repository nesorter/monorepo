import stream from 'stream';

export class BroadcastStream {
  sinksTotal = 0;
  sinks: { id: number, plug: stream.PassThrough, shouldLog: boolean }[] = [];

  constructor(private readable: stream.PassThrough | stream.Readable) {
    let count = 0;

    this.readable.on('data', (chunk) => {
      count += 1;

      for (let sink of this.sinks) {
        process.env.LOG_DEBUG === "true" && sink.shouldLog && console.log(`DEBUG: Send chunk #${count} to sink #${sink.id}`);
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
      this.sinks = this.sinks.filter(_ => _.id !== id);
    });

    this.sinks.push({ id, plug, shouldLog });
    this.sinksTotal += 1;

    return { id, plug };
  }
}

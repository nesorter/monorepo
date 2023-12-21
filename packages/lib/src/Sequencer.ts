type Config = {
  durationUp: number;
  durationDown: number;
  sequenceFunction: (millisecond: number) => number;
};

export class Sequencer {
  durationUp: number;
  durationDown: number;
  sequenceFunction: (millisecond: number) => number;

  constructor({ durationDown, durationUp, sequenceFunction }: Config) {
    this.durationUp = durationUp;
    this.durationDown = durationDown;
    this.sequenceFunction = sequenceFunction;
  }

  choose(currentMilliseconds: number): 'up' | 'down' {
    const isCurrentUp = currentMilliseconds < this.durationUp;
    const currentDuration = isCurrentUp ? this.durationUp : this.durationDown;
    const currentOffset = isCurrentUp ? currentMilliseconds : currentMilliseconds - this.durationUp;
    const position = 180 / (currentDuration / currentOffset);
    const probability = this.sequenceFunction((position / 180) * Math.PI);

    if (Math.random() < probability) {
      return isCurrentUp ? 'down' : 'up';
    } else {
      return isCurrentUp ? 'up' : 'down';
    }
  }
}

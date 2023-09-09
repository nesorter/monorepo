import { exec, spawn } from 'child_process';

export type FFProbeFrame = {
  media_type?: 'video' | 'audio';
  stream_index?: number;
  key_frame?: number;
  pts?: number | string;
  pts_time?: number | string;
  pkt_dts?: number | string;
  pkt_dts_time?: number | string;
  best_effort_timestamp?: number | string;
  best_effort_timestamp_time?: number | string;
  pkt_duration?: number | string;
  pkt_duration_time?: number | string;
  duration?: number | string;
  duration_time?: number | string;
  pkt_pos?: number | string;
  pkt_size?: number;
  width?: number;
  height?: number;
  pix_fmt?: string;
  sample_aspect_ratio?: string;
  pict_type?: string;
  coded_picture_number?: number;
  display_picture_number?: number;
  interlaced_frame?: number;
  top_field_first?: number;
  repeat_pict?: number;
  color_range?: string;
  color_space?: string;
  color_primaries?: string;
  color_transfer?: string;
  chroma_location?: string;
  sample_fmt?: string;
  nb_samples?: number;
  channels?: number;
  channel_layout?: string;
};

export type InFilePosition = {
  second: number;
  startByte: number;
  endByte: number;
}

export const sanitizeFsPath = (path: string) => {
  const escapeTargets = [
    ` `, `'`, `>`, `<`, `"`, '(', ')', '&'
  ];

  return escapeTargets.reduce((acc, cur) => acc.replaceAll(cur, `\\${cur}`), path);
}

export const shuffle = <T>(array: T[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const execAsync = (command: string) => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
};

export const spawnAsync = (command: string): Promise<string> => {
  return new Promise((res, req) => {
    let result = '';
    let child = spawn(command, { shell: true });
    child.stdout.on('data', (data) => {
      result += data;
    });
    child.stdout.on('close', () => res(result));
    child.on('error', req);
  });
};

export const getFramesPositions = async (filePath: string, chunkDuration: number) => {
  const rawFrames = await spawnAsync(`ffprobe ${sanitizeFsPath(filePath)} -show_frames`);
  const chunks = rawFrames
    .replaceAll('\n', ' _ ')
    .replaceAll('[/FRAME]', '')
    .split('[FRAME]')
    .filter(_ => _.length)
    .map(_ => Object.fromEntries(_.split(' _ ')
      .filter(_ => _.length)
      .map(_ => {
        // @ts-ignore
        const [_origin, key, value] = /(.*)=(.*)/.exec(_);
        const valueIsNumber = !Number.isNaN(Number(value));
        return [key, valueIsNumber ? Number(value) : value];
      })) as FFProbeFrame
    )
    .filter(_ => _.media_type === 'audio');

  const positions: InFilePosition[] = [];

  let second = 0;
  let timeAccumulator = 0;
  let startByte = 0;
  for (let frame of chunks) {
    if (timeAccumulator === 0) {
      startByte = Number(frame.pkt_pos);
    }

    timeAccumulator += Number(frame.pkt_duration_time);

    if (timeAccumulator > chunkDuration) {
      positions.push({ second, startByte, endByte: Number(frame.pkt_pos) + Number(frame.pkt_size) });
      second += 1;
      timeAccumulator = 0;
    }
  }

  return positions;
};

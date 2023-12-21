export type Config = {
  server: {
    port: number;
    mount: string;
  };
  library: {
    root: string;
  };
  playlists: {
    id: string;
    path: string;
  }[];
  maxScheduledItems: number;
  schedule: (
    | {
        type: 'playlist';
        /* seconds from day start */
        startAt: number;
        /* seconds */
        duration: number;
        playlistId: string;
        shouldShuffle?: boolean;
      }
    | {
        type: 'sequence';
        /* seconds from day start */
        startAt: number;
        /* seconds */
        duration: number;
        sequence: {
          up: {
            duration: number;
            playlistId: string;
            shouldShuffle?: boolean;
          };
          down: {
            duration: number;
            playlistId: string;
            shouldShuffle?: boolean;
          };
        };
      }
  )[];
  logger: {
    debug: boolean;
    info: boolean;
  };
};

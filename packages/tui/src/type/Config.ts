import { z } from 'zod';

export const ConfigSchema = z.object({
  library: z.object({
    root: z.string(),
  }),
  logger: z.object({
    debug: z.boolean(),
    info: z.boolean(),
  }),
  maxScheduledItems: z.number(),
  playlists: z.array(
    z.object({
      id: z.string(),
      path: z.string(),
    }),
  ),
  schedule: z.array(
    z.discriminatedUnion('type', [
      z.object({
        duration: z.number(),
        playlistId: z.string(),
        shouldShuffle: z.boolean().optional(),
        startAt: z.number(),
        type: z.literal('playlist'),
      }),
      z.object({
        duration: z.number(),
        sequence: z.object({
          down: z.object({
            duration: z.number(),
            playlistId: z.string(),
            shouldShuffle: z.boolean().optional(),
          }),
          up: z.object({
            duration: z.number(),
            playlistId: z.string(),
            shouldShuffle: z.boolean().optional(),
          }),
        }),
        startAt: z.number(),
        type: z.literal('sequence'),
      }),
    ]),
  ),
  server: z.object({
    mount: z.string(),
    port: z.number(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

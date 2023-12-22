import { z } from 'zod';

const PlSchema = z.object({
  duration: z.number(),
  playlistId: z.string(),
  shouldShuffle: z.boolean().optional(),
  startAt: z.number(),
  type: z.literal('playlist'),
});

const SeqSchema = z.object({
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
});

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
  schedule: z.array(z.discriminatedUnion('type', [PlSchema, SeqSchema])),
  server: z.object({
    mount: z.string(),
    port: z.number(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
export type PlSchemaType = z.infer<typeof PlSchema>;
export type SeqSchemaType = z.infer<typeof SeqSchema>;

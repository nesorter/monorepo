import prism from 'prism-media';
import { Client, Constants, VoiceChannel } from 'discord.js';
import { GatewayIntentBits } from 'discord-api-types/v10';
import {
  NoSubscriberBehavior,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  joinVoiceChannel,
} from '@discordjs/voice';

const { Events } = Constants;

export type Config = {
  BOT_TOKEN: string;
  BOT_SELF_RENAME_TO_NAME: string;
  VOICE_CHAT_ID: string;
  STREAM_MOUNTPOINT: string;
  onTrackMetadataRequested: () => Promise<{ title: string, artist: string }>;
};

export const Bot = async (config: Config) => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
  });

  const audioPlayer = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
      maxMissedFrames: 5000,
    },
  });

  const audioResource = createAudioResource(
    new prism.FFmpeg({
      args: [
        '-analyzeduration', '0',
        '-loglevel', '0',
        '-i', config.STREAM_MOUNTPOINT,
        '-f', 'opus',
        '-ar', '48000',
        '-ac', '2',
      ],
    }),
    {
      inputType: StreamType.OggOpus,
      silencePaddingFrames: 0,
    },
  );

  async function connectToChannel(channel: VoiceChannel) {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      // @ts-ignore
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      return connection;
    } catch (error) {
      connection.destroy();
      throw error;
    }
  }

  client.on(Events.CLIENT_READY, () => {
    audioPlayer.play(audioResource);

    client.channels.fetch(config.VOICE_CHAT_ID)
      .then(async (channel) => {
        try {
          const connection = await connectToChannel(channel as VoiceChannel);
          connection.subscribe(audioPlayer);
        } catch (error) {
          console.error(error);
        }
      });
  });

  await client.login(config.BOT_TOKEN);
  await client.user?.setUsername(config.BOT_SELF_RENAME_TO_NAME);

  setInterval(() => {
    config.onTrackMetadataRequested().then((metas) => {
      client.user?.setPresence({
        status: 'online',
        afk: true,
        activities: [
          {
            name: `[${metas.artist} - ${metas.title}] @ [${config.STREAM_MOUNTPOINT}]`,
            type: 'PLAYING'
          },
        ],
      });
    });
  }, 5000);

  return { client, audioPlayer, audioResource };
};

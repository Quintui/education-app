import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

let client: ElevenLabsClient | undefined;
// Created on first use so a missing key fails the step, not the whole server.
const elevenlabs = () =>
  (client ??= new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY }));

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";
/** Eleven v4 follows audio tags like [curious] and [excited] for expressive delivery. */
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? "eleven_v4";
const MP3_BITRATE = 128_000;

/** MPEG-1 Layer III bitrates (kbps) and sample rates, indexed by the frame header bits. */
const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const SAMPLE_RATES = [44100, 48000, 32000];

function mp3FrameLength(data: Buffer, at: number) {
  const isMpeg1Layer3 = data[at] === 0xff && (data[at + 1] & 0xfe) === 0xfa;
  const bitrate = BITRATES[data[at + 2] >> 4] * 1000;
  const sampleRate = SAMPLE_RATES[(data[at + 2] >> 2) & 3];
  if (!isMpeg1Layer3 || !bitrate || !sampleRate) return 0;
  return Math.floor((144 * bitrate) / sampleRate) + ((data[at + 2] >> 1) & 1);
}

/**
 * Each clip starts with an ID3 tag and an MP3 "Info" frame that describe that clip alone.
 * Once the clips are joined into one narration, browsers seek with the first clip's header
 * and land seconds away from the right spot, so keep only the bare audio frames.
 */
export function bareMp3Frames(clip: Buffer) {
  let start = 0;
  if (clip.toString("latin1", 0, 3) === "ID3") {
    const size = (clip[6] << 21) | (clip[7] << 14) | (clip[8] << 7) | clip[9];
    start = 10 + size + (clip[5] & 0x10 ? 10 : 0);
  }
  const length = mp3FrameLength(clip, start);
  const firstFrame = clip.toString("latin1", start, start + length);
  if (length && (firstFrame.includes("Info") || firstFrame.includes("Xing"))) start += length;
  return clip.subarray(start);
}

export async function narrate(
  text: string,
  context: { previousText?: string; nextText?: string },
) {
  const res = await elevenlabs().textToSpeech.convertWithTimestamps(VOICE_ID, {
    text,
    modelId: MODEL_ID,
    outputFormat: "mp3_44100_128",
    // "Natural" stability: expressive enough for tags, steady enough for teaching.
    voiceSettings: { stability: 0.5, similarityBoost: 0.75 },
    // Neighbouring text keeps intonation continuous across scene boundaries.
    previousText: context.previousText,
    nextText: context.nextText,
  });

  const audio = bareMp3Frames(Buffer.from(res.audioBase64, "base64"));
  return {
    audio,
    // Constant bitrate, so byte length gives the exact playback length.
    duration: (audio.byteLength * 8) / MP3_BITRATE,
    charStartTimes: res.alignment?.characterStartTimesSeconds ?? [],
  };
}

export async function composeMusic(prompt: string, seconds: number) {
  const stream = await elevenlabs().music.compose({
    prompt,
    musicLengthMs: Math.round(Math.min(Math.max(seconds, 10), 300) * 1000),
    forceInstrumental: true,
  });
  return Buffer.from(await new Response(stream).arrayBuffer());
}

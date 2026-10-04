import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

let client: ElevenLabsClient | undefined;
// Created on first use so a missing key fails the step, not the whole server.
const elevenlabs = () =>
  (client ??= new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY }));

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";
const MP3_BITRATE = 128_000;

export async function narrate(
  text: string,
  context: { previousText?: string; nextText?: string },
) {
  const res = await elevenlabs().textToSpeech.convertWithTimestamps(VOICE_ID, {
    text,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    // Neighbouring text keeps intonation continuous across scene boundaries.
    previousText: context.previousText,
    nextText: context.nextText,
  });

  const audio = Buffer.from(res.audioBase64, "base64");
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

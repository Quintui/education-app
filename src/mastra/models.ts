import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const models = {
  /** Course and lesson planning, scene animation: this is where quality shows. */
  smart: openai(process.env.OPENAI_SMART_MODEL ?? "gpt-6.1-sol"),
  /** Knowledge check, notes, quiz, playground and Ask (gpt-6-luna is faster and cheaper). */
  fast: openai(process.env.OPENAI_FAST_MODEL ?? "gpt-6.1-sol"),
};

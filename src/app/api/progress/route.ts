import { z } from "zod";
import { UNDERSTANDING } from "@/mastra/db/schema";
import { getLesson, updateProgress } from "@/mastra/lib/store";

const bodySchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("watched"), lessonId: z.string() }),
  z.object({ event: z.literal("quiz"), lessonId: z.string(), correct: z.number().int(), total: z.number().int() }),
  z.object({ event: z.literal("understanding"), lessonId: z.string(), understanding: z.enum(UNDERSTANDING) }),
]);

/** Records what the learner did: finished the video, scored the quiz, how it landed. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Invalid progress event", { status: 400 });

  const event = parsed.data;
  const lesson = await getLesson(event.lessonId);
  if (!lesson) return new Response("Lesson not found", { status: 404 });

  if (event.event === "watched") await updateProgress(lesson, { watchedAt: new Date() });
  if (event.event === "quiz") await updateProgress(lesson, { quizCorrect: event.correct, quizTotal: event.total });
  if (event.event === "understanding") await updateProgress(lesson, { understanding: event.understanding });

  return new Response(null, { status: 204 });
}

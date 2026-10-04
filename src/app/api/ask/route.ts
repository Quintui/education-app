import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import { demoAskStream, isDemoMode } from "@/demo/streams";
import { mastra } from "@/mastra";
import { ASK_RESOURCE_ID, askThreadId } from "@/mastra/agents/ask-tutor";
import { buildAskContext } from "@/mastra/lib/ask";
import { getCourse, getLesson, lessonIdFor } from "@/mastra/lib/store";

const bodySchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  courseId: z.string(),
  nodeId: z.string(),
  time: z.number(),
});

/** Questions asked while a lesson is paused, answered with that moment as context. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const { messages, courseId, nodeId, time } = parsed.data;
  const [course, lesson] = await Promise.all([
    getCourse(courseId),
    getLesson(lessonIdFor(courseId, nodeId)),
  ]);
  if (!course || !lesson) return new Response("Lesson not found", { status: 404 });

  if (isDemoMode()) {
    return createUIMessageStreamResponse({ stream: demoAskStream({ lesson, time, messages }) });
  }

  const stream = await handleChatStream({
    mastra,
    agentId: "ask-tutor",
    version: "v7",
    params: {
      messages,
      system: buildAskContext(course, lesson, time),
      memory: { thread: askThreadId(lesson.id), resource: ASK_RESOURCE_ID },
    },
  });
  return createUIMessageStreamResponse({ stream });
}

import { handleWorkflowStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { demoLessonStream, isDemoMode } from "@/demo/streams";
import { mastra } from "@/mastra";

// Planning, narration and animation of a lesson takes a few minutes.
export const maxDuration = 800;

const bodySchema = z.object({ courseId: z.string(), nodeId: z.string() });

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Missing courseId or nodeId", { status: 400 });

  if (isDemoMode()) return createUIMessageStreamResponse({ stream: demoLessonStream(parsed.data) });

  const stream = await handleWorkflowStream({
    mastra,
    workflowId: "lessonWorkflow",
    version: "v7",
    params: { inputData: parsed.data },
  });
  return createUIMessageStreamResponse({ stream });
}

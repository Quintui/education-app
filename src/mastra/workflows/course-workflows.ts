import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { describeAnswers, withIds } from "../lib/course";
import { saveCourse, slugId } from "../lib/lesson-store";
import { forEachThrottled } from "../lib/stream";
import { DIAGNOSTIC_TASK } from "../prompts/course";
import {
  courseOutlineSchema,
  courseSchema,
  diagnosticAnswersSchema,
  diagnosticSchema,
  type CoursePart,
  type DiagnosticPart,
} from "../schemas";

const STREAM_INTERVAL_MS = 120;

// ── Knowledge check ──────────────────────────────────────────────────────

const writeCheck = createStep({
  id: "write-knowledge-check",
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: diagnosticSchema,
  execute: async ({ inputData, mastra, writer, runId }) => {
    const { topic } = inputData;
    const emit = (data: DiagnosticPart) =>
      writer.custom({ type: "data-diagnostic", id: runId, data });

    await emit({ topic, status: "writing", diagnostic: {} });

    const stream = await mastra
      .getAgent("tutor")
      .stream(`Topic: ${topic}\n\n${DIAGNOSTIC_TASK}`, {
        structuredOutput: { schema: diagnosticSchema },
      });

    // Questions appear one by one as the model writes them.
    await forEachThrottled(stream.objectStream, STREAM_INTERVAL_MS, (diagnostic) =>
      emit({ topic, status: "writing", diagnostic }),
    );

    const diagnostic = await stream.object;
    await emit({ topic, status: "ready", diagnostic });
    return diagnostic;
  },
});

export const diagnoseWorkflow = createWorkflow({
  id: "diagnose-workflow",
  description: "Writes a short knowledge check before building a course",
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: diagnosticSchema,
})
  .then(writeCheck)
  .commit();

// ── Course outline ───────────────────────────────────────────────────────

const draftCourse = createStep({
  id: "draft-course",
  inputSchema: diagnosticAnswersSchema,
  outputSchema: courseSchema,
  execute: async ({ inputData, mastra, writer, runId }) => {
    const emit = (data: CoursePart) => writer.custom({ type: "data-course", id: runId, data });

    await emit({ status: "drafting", outline: {} });

    const stream = await mastra.getAgent("coursePlanner").stream(describeAnswers(inputData), {
      structuredOutput: { schema: courseOutlineSchema },
    });

    // The learning path grows on screen while the model writes it.
    await forEachThrottled(stream.objectStream, STREAM_INTERVAL_MS, (outline) =>
      emit({ status: "drafting", outline }),
    );

    const outline = await stream.object;
    return withIds(outline, { id: slugId(outline.title), topic: inputData.topic });
  },
});

const saveCourseStep = createStep({
  id: "save-course",
  inputSchema: courseSchema,
  outputSchema: z.object({ courseId: z.string() }),
  execute: async ({ inputData, writer, runId }) => {
    await saveCourse(inputData);
    // Same part id as the drafts, so the UI swaps the draft for the final course in place.
    const data: CoursePart = { status: "ready", course: inputData };
    await writer.custom({ type: "data-course", id: runId, data });
    return { courseId: inputData.id };
  },
});

export const courseWorkflow = createWorkflow({
  id: "course-workflow",
  description: "Turns knowledge check answers into a personal learning path",
  inputSchema: diagnosticAnswersSchema,
  outputSchema: z.object({ courseId: z.string() }),
})
  .then(draftCourse)
  .then(saveCourseStep)
  .commit();

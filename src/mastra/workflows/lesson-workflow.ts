import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { composeMusic, narrate } from "../lib/elevenlabs";
import { buildLessonBrief } from "../lib/course";
import {
  getCourse,
  getCourseLessons,
  lessonIdFor,
  readLessonFile,
  saveLesson,
  writeLessonFile,
} from "../lib/lesson-store";
import { extractCode, parseNarration, resolveCues } from "../lib/narration";
import { NOTES_TASK, PLAYGROUND_TASK, QUIZ_TASK } from "../prompts/tutor";
import {
  lessonContextSchema,
  lessonPlanSchema,
  materialsSchema,
  narratedSceneSchema,
  notesSchema,
  quizSchema,
  sceneJobSchema,
  videoSceneSchema,
  videoSchema,
  type Lesson,
  type LessonContext,
  type LessonPlan,
  type MaterialProgress,
  type SceneProgress,
} from "../schemas";

type StepWriter = Parameters<
  NonNullable<Parameters<typeof createStep>[0]["execute"]>
>[0]["writer"];

function reportScene(
  writer: StepWriter,
  lessonId: string,
  scene: { id: string; title: string },
  status: SceneProgress["status"],
) {
  const data: SceneProgress = { sceneId: scene.id, title: scene.title, status };
  // Same id => the UI updates this scene's row in place instead of appending.
  return writer.custom({ type: "data-scene", id: `${lessonId}-${scene.id}`, data });
}

function reportMaterial(writer: StepWriter, lessonId: string, data: MaterialProgress) {
  return writer.custom({ type: "data-material", id: `${lessonId}-${data.kind}`, data });
}

/** A compact description of the lesson that the tutor works from. */
function lessonDigest(plan: LessonPlan) {
  const scenes = plan.scenes
    .map((s) => `- ${s.title}: ${parseNarration(s.narration).text}`)
    .join("\n");
  return `Lesson: ${plan.title} (${plan.level})\nCore intuition: ${plan.coreIntuition}\n\nNarration by scene:\n${scenes}`;
}

// ── 1. Plan ──────────────────────────────────────────────────────────────

const planLesson = createStep({
  id: "plan-lesson",
  inputSchema: z.object({ courseId: z.string(), nodeId: z.string() }),
  outputSchema: lessonContextSchema,
  execute: async ({ inputData, mastra }) => {
    const { courseId, nodeId } = inputData;
    const course = await getCourse(courseId);
    if (!course) throw new Error(`Course ${courseId} not found`);

    const brief = buildLessonBrief(course, nodeId, await getCourseLessons(course));
    const result = await mastra.getAgent("lessonPlanner").generate(brief, {
      structuredOutput: { schema: lessonPlanSchema },
    });

    const plan = result.object;
    plan.scenes = plan.scenes.map((scene, i) => ({ ...scene, id: `scene-${i + 1}` }));

    return {
      lessonId: lessonIdFor(courseId, nodeId),
      courseId,
      nodeId,
      brief,
      styleGuide: course.styleGuide,
      plan,
    };
  },
});

// ── 2a. Video: narrate + animate every scene, then assemble ──────────────

const narrateScene = createStep({
  id: "narrate-scene",
  inputSchema: sceneJobSchema,
  outputSchema: narratedSceneSchema,
  execute: async ({ inputData, writer }) => {
    const { lessonId, scene } = inputData;
    await reportScene(writer, lessonId, scene, "narrating");

    const { text, markers } = parseNarration(scene.narration);
    const { audio, duration, charStartTimes } = await narrate(text, {
      previousText: inputData.previousNarration,
      nextText: inputData.nextNarration,
    });
    await writeLessonFile(lessonId, `audio/${scene.id}.mp3`, audio);

    return { ...inputData, duration, cues: resolveCues(markers, charStartTimes) };
  },
});

function syntaxError(code: string) {
  try {
    // Compiles without running, so we catch broken output before it reaches the player.
    new Function("ctx", code);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const animateScene = createStep({
  id: "animate-scene",
  inputSchema: narratedSceneSchema,
  outputSchema: videoSceneSchema,
  execute: async ({ inputData, mastra, writer }) => {
    const { lessonId, lessonTitle, scene, duration, cues, styleGuide } = inputData;
    await reportScene(writer, lessonId, scene, "animating");

    const brief = `Lesson: ${lessonTitle}
Scene: ${scene.title}
Goal: ${scene.goal}
Narration (${duration.toFixed(1)}s spoken): "${parseNarration(scene.narration).text}"
Cue timings in seconds: ${JSON.stringify(cues)}
Visual brief: ${scene.visual}
Theme: ${JSON.stringify(styleGuide)}`;

    const animator = mastra.getAgent("sceneAnimator");
    const first = await animator.generate(brief);
    let code = extractCode(first.text, "js|javascript");

    const error = syntaxError(code);
    if (error) {
      const retry = await animator.generate([
        { role: "user", content: brief },
        { role: "assistant", content: first.text },
        {
          role: "user",
          content: `That code throws a SyntaxError: ${error}. Return the corrected function body.`,
        },
      ]);
      code = extractCode(retry.text, "js|javascript");
      // Still broken: ship an empty scene, the player shows a titled fallback.
      if (syntaxError(code)) code = "";
    }

    await writeLessonFile(lessonId, `scenes/${scene.id}.js`, code);
    await reportScene(writer, lessonId, scene, "ready");

    return {
      id: scene.id,
      title: scene.title,
      goal: scene.goal,
      narration: parseNarration(scene.narration).text,
      duration,
      cues,
    };
  },
});

const sceneWorkflow = createWorkflow({
  id: "scene-workflow",
  inputSchema: sceneJobSchema,
  outputSchema: videoSceneSchema,
})
  .then(narrateScene)
  .then(animateScene)
  .commit();

const assembleVideo = createStep({
  id: "assemble-video",
  inputSchema: z.array(videoSceneSchema),
  outputSchema: videoSchema,
  execute: async ({ inputData, getInitData }) => {
    const { lessonId, plan } = getInitData<LessonContext>();

    let start = 0;
    const scenes = inputData.map((scene) => {
      const placed = { ...scene, start };
      start += scene.duration;
      return placed;
    });

    // MP3 frames concatenate cleanly, so one narration file drives the whole timeline.
    const clips = await Promise.all(
      scenes.map((scene) => readLessonFile(lessonId, `audio/${scene.id}.mp3`)),
    );
    await writeLessonFile(
      lessonId,
      "narration.mp3",
      Buffer.concat(clips.filter((clip) => clip !== null)),
    );

    // Music is a nice-to-have: a failure here should not fail the lesson.
    const hasMusic = await composeMusic(plan.musicPrompt, start)
      .then((music) => writeLessonFile(lessonId, "music.mp3", music))
      .then(
        () => true,
        (error) => {
          console.warn("[assemble-video] music skipped:", error);
          return false;
        },
      );

    return { duration: start, hasMusic, scenes };
  },
});

const videoWorkflow = createWorkflow({
  id: "video-workflow",
  inputSchema: lessonContextSchema,
  outputSchema: videoSchema,
})
  .map(async ({ inputData }) => {
    const { lessonId, plan, styleGuide } = inputData;
    const spoken = plan.scenes.map((scene) => parseNarration(scene.narration).text);
    return plan.scenes.map((scene, i) => ({
      lessonId,
      lessonTitle: plan.title,
      styleGuide,
      scene,
      previousNarration: spoken[i - 1],
      nextNarration: spoken[i + 1],
    }));
  })
  .foreach(sceneWorkflow, { concurrency: 3 })
  .then(assembleVideo)
  .commit();

// ── 2b. Materials: notes, quiz and playground in parallel ────────────────

const writeNotes = createStep({
  id: "write-notes",
  inputSchema: lessonContextSchema,
  outputSchema: notesSchema,
  execute: async ({ inputData, mastra, writer }) => {
    await reportMaterial(writer, inputData.lessonId, { kind: "notes", status: "writing" });
    const result = await mastra
      .getAgent("tutor")
      .generate(`${lessonDigest(inputData.plan)}\n\n${NOTES_TASK}`, {
        structuredOutput: { schema: notesSchema },
      });
    await reportMaterial(writer, inputData.lessonId, { kind: "notes", status: "ready" });
    return result.object;
  },
});

const writeQuiz = createStep({
  id: "write-quiz",
  inputSchema: lessonContextSchema,
  outputSchema: quizSchema,
  execute: async ({ inputData, mastra, writer }) => {
    await reportMaterial(writer, inputData.lessonId, { kind: "quiz", status: "writing" });
    const result = await mastra
      .getAgent("tutor")
      .generate(`${lessonDigest(inputData.plan)}\n\n${QUIZ_TASK}`, {
        structuredOutput: { schema: quizSchema },
      });
    const questions = result.object.questions.filter(
      (q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length,
    );
    await reportMaterial(writer, inputData.lessonId, { kind: "quiz", status: "ready" });
    return { questions };
  },
});

const buildPlayground = createStep({
  id: "build-playground",
  inputSchema: lessonContextSchema,
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ inputData, mastra, writer }) => {
    const { lessonId, plan, styleGuide } = inputData;
    await reportMaterial(writer, lessonId, { kind: "playground", status: "writing" });
    const result = await mastra
      .getAgent("tutor")
      .generate(
        `${lessonDigest(plan)}\n\nStyle guide: ${JSON.stringify(styleGuide)}\n\n${PLAYGROUND_TASK}`,
      );
    const markup = extractCode(result.text, "html");
    if (markup) await writeLessonFile(lessonId, "playground.html", markup);
    await reportMaterial(writer, lessonId, { kind: "playground", status: "ready" });
    return { ok: Boolean(markup) };
  },
});

const materialsWorkflow = createWorkflow({
  id: "materials-workflow",
  inputSchema: lessonContextSchema,
  outputSchema: materialsSchema,
})
  .parallel([writeNotes, writeQuiz, buildPlayground])
  .map(async ({ inputData }) => ({
    notes: inputData["write-notes"],
    quiz: inputData["write-quiz"].questions,
    hasPlayground: inputData["build-playground"].ok,
  }))
  .commit();

// ── 3. Finalize ──────────────────────────────────────────────────────────

const finalizeLesson = createStep({
  id: "finalize-lesson",
  inputSchema: z.object({
    "video-workflow": videoSchema,
    "materials-workflow": materialsSchema,
  }),
  outputSchema: z.object({ lessonId: z.string(), title: z.string() }),
  execute: async ({ inputData, getStepResult, writer }) => {
    const { lessonId, courseId, nodeId, plan, styleGuide } = getStepResult(planLesson);
    const materials = inputData["materials-workflow"];

    const lesson: Lesson = {
      id: lessonId,
      courseId,
      nodeId,
      createdAt: new Date().toISOString(),
      title: plan.title,
      hook: plan.hook,
      level: plan.level,
      styleGuide,
      video: inputData["video-workflow"],
      ...materials,
    };

    await saveLesson(lesson);
    await writer.custom({ type: "data-lesson", id: lessonId, data: lesson });

    return { lessonId, title: plan.title };
  },
});

export const lessonWorkflow = createWorkflow({
  id: "lesson-workflow",
  description: "Builds one course lesson: animated, narrated explainer plus notes, quiz and playground",
  inputSchema: z.object({ courseId: z.string(), nodeId: z.string() }),
  outputSchema: z.object({ lessonId: z.string(), title: z.string() }),
})
  .then(planLesson)
  .parallel([videoWorkflow, materialsWorkflow])
  .then(finalizeLesson)
  .commit();

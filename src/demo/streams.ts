import { readFile } from "node:fs/promises";
import path from "node:path";
import { createUIMessageStream, type UIMessageStreamWriter } from "ai";
import { withIds } from "@/mastra/lib/course";
import {
  getCourse,
  lessonIdFor,
  saveCourse,
  saveLesson,
  slugId,
  writeLessonFile,
} from "@/mastra/lib/lesson-store";
import type {
  CourseOutline,
  CoursePart,
  DeepPartial,
  DiagnosticAnswers,
  DiagnosticPart,
  Lesson,
  LessonContext,
  MaterialProgress,
  SceneProgress,
} from "@/mastra/schemas";
import { DEMO_COURSE, DEMO_DIAGNOSTIC } from "./data";

/**
 * Without an OpenRouter key the app runs in demo mode: these streams replay
 * the exact data parts the real Mastra workflows emit, with realistic timing.
 */
export const isDemoMode = () => !process.env.OPENROUTER_API_KEY;

const FIXTURE_DIR = path.join(process.cwd(), "demo", "lesson");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = (ms: number) => ms * (0.75 + Math.random() * 0.5);

/** Progressive prefixes of a sentence, a few words at a time, like a model writing it. */
function* typeOut(text: string, wordsPerStep = 3) {
  const words = text.split(" ");
  for (let i = wordsPerStep; i < words.length; i += wordsPerStep) {
    yield words.slice(0, i).join(" ");
  }
  yield text;
}

type Writer = UIMessageStreamWriter;

async function typeInto(text: string, onUpdate: (partial: string) => void, delay = 45) {
  for (const partial of typeOut(text)) {
    onUpdate(partial);
    await sleep(delay);
  }
}

// ── Knowledge check ──────────────────────────────────────────────────────

export function demoDiagnosticStream(topic: string) {
  return createUIMessageStream({
    execute: async ({ writer }: { writer: Writer }) => {
      const id = crypto.randomUUID();
      const emit = (data: DiagnosticPart) => writer.write({ type: "data-diagnostic", id, data });

      emit({ topic, status: "writing", diagnostic: {} });
      await sleep(1200);

      const { intro, questions } = DEMO_DIAGNOSTIC;
      await typeInto(intro, (text) => emit({ topic, status: "writing", diagnostic: { intro: text } }));

      const written: DeepPartial<(typeof questions)[number]>[] = [];
      for (const q of questions) {
        await sleep(jitter(500));
        await typeInto(q.question, (text) =>
          emit({ topic, status: "writing", diagnostic: { intro, questions: [...written, { question: text }] } }),
        );
        for (let i = 1; i <= q.options.length; i++) {
          await sleep(jitter(160));
          emit({
            topic,
            status: "writing",
            diagnostic: { intro, questions: [...written, { question: q.question, options: q.options.slice(0, i) }] },
          });
        }
        written.push(q);
      }

      emit({ topic, status: "ready", diagnostic: DEMO_DIAGNOSTIC });
    },
  });
}

// ── Course outline ───────────────────────────────────────────────────────

/** Mark lessons as known based on how the learner actually answered. */
function personalize(answers: DiagnosticAnswers): CourseOutline {
  const knows = (index: number) => answers.answers[index]?.correct === true;
  const known = new Set([knows(0) && "Why things fall", knows(2) && "The balance inside a star"]);
  return {
    ...DEMO_COURSE,
    modules: DEMO_COURSE.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({ ...lesson, likelyKnown: known.has(lesson.title) })),
    })),
  };
}

export function demoCourseStream(answers: DiagnosticAnswers) {
  return createUIMessageStream({
    execute: async ({ writer }: { writer: Writer }) => {
      const id = crypto.randomUUID();
      const emit = (data: CoursePart) => writer.write({ type: "data-course", id, data });
      const outline = personalize(answers);

      emit({ status: "drafting", outline: {} });
      await sleep(1600);

      const draft: DeepPartial<CourseOutline> = {};
      const update = () => emit({ status: "drafting", outline: structuredClone(draft) });

      await typeInto(outline.learnerProfile, (text) => {
        draft.learnerProfile = text;
        update();
      });
      await sleep(400);
      await typeInto(outline.title, (text) => {
        draft.title = text;
        update();
      });
      await typeInto(outline.tagline, (text) => {
        draft.tagline = text;
        update();
      });
      draft.styleGuide = outline.styleGuide;
      draft.modules = [];
      update();

      for (const courseModule of outline.modules) {
        await sleep(jitter(500));
        const current: DeepPartial<CourseOutline["modules"][number]> = { lessons: [] };
        draft.modules.push(current);
        await typeInto(courseModule.title, (text) => {
          current.title = text;
          update();
        });
        current.summary = courseModule.summary;
        update();
        for (const lesson of courseModule.lessons) {
          await sleep(jitter(380));
          current.lessons!.push({ ...lesson });
          update();
        }
      }

      await sleep(600);
      const course = withIds(outline, { id: slugId(outline.title), topic: answers.topic });
      await saveCourse(course);
      emit({ status: "ready", course });
    },
  });
}

// ── Lesson ───────────────────────────────────────────────────────────────

type StepStatus = "running" | "success";

export function demoLessonStream({ courseId, nodeId }: { courseId: string; nodeId: string }) {
  return createUIMessageStream({
    execute: async ({ writer }: { writer: Writer }) => {
      const course = await getCourse(courseId);
      const node = course?.modules.flatMap((m) => m.lessons).find((l) => l.id === nodeId);
      if (!course || !node) throw new Error("Unknown course lesson");

      const template = JSON.parse(await readFile(path.join(FIXTURE_DIR, "template.json"), "utf8"));
      const scenes: Lesson["video"]["scenes"] = template.video.scenes;
      const lessonId = lessonIdFor(courseId, nodeId);

      // Mirrors the `data-workflow` snapshots that Mastra's handleWorkflowStream emits.
      const runId = crypto.randomUUID();
      const steps: Record<string, { status: StepStatus; output?: unknown }> = {};
      const snapshot = (status: "running" | "success") =>
        writer.write({
          type: "data-workflow",
          id: runId,
          data: { name: "lesson-workflow", status, steps: structuredClone(steps), output: null },
        });
      const scene = (data: SceneProgress) =>
        writer.write({ type: "data-scene", id: `${lessonId}-${data.sceneId}`, data });
      const material = (data: MaterialProgress) =>
        writer.write({ type: "data-material", id: `${lessonId}-${data.kind}`, data });

      steps["plan-lesson"] = { status: "running" };
      snapshot("running");
      await sleep(jitter(4000));

      const context: LessonContext = {
        lessonId,
        courseId,
        nodeId,
        brief: "",
        styleGuide: course.styleGuide,
        plan: {
          title: node.title,
          hook: node.goal,
          level: template.level,
          coreIntuition: "Mass curves space, and light simply follows the curve.",
          musicPrompt: "",
          scenes: scenes.map((s) => ({ id: s.id, title: s.title, goal: s.goal, narration: "", visual: "" })),
        },
      };
      steps["plan-lesson"] = { status: "success", output: context };
      steps["video-workflow"] = { status: "running" };
      steps["materials-workflow"] = { status: "running" };
      snapshot("running");

      const video = (async () => {
        // Three scenes at a time, like `.foreach(..., { concurrency: 3 })`.
        const queue = [...scenes];
        const worker = async () => {
          for (let s = queue.shift(); s; s = queue.shift()) {
            scene({ sceneId: s.id, title: s.title, status: "narrating" });
            await sleep(jitter(2600));
            scene({ sceneId: s.id, title: s.title, status: "animating" });
            await sleep(jitter(5200));
            scene({ sceneId: s.id, title: s.title, status: "ready" });
          }
        };
        await Promise.all([worker(), worker(), worker()]);
        await sleep(1200);
        steps["video-workflow"] = { status: "success" };
        snapshot("running");
      })();

      const materials = (async () => {
        await Promise.all(
          (
            [
              ["notes", 5000],
              ["quiz", 6500],
              ["playground", 9000],
            ] as const
          ).map(async ([kind, ms]) => {
            material({ kind, status: "writing" });
            await sleep(jitter(ms));
            material({ kind, status: "ready" });
          }),
        );
        steps["materials-workflow"] = { status: "success" };
        snapshot("running");
      })();

      await Promise.all([video, materials]);

      steps["finalize-lesson"] = { status: "running" };
      snapshot("running");

      const copy = async (file: string) =>
        writeLessonFile(lessonId, file, await readFile(path.join(FIXTURE_DIR, file)));
      await Promise.all([
        copy("narration.mp3"),
        copy("playground.html"),
        ...scenes.map((s) => copy(`scenes/${s.id}.js`)),
      ]);
      const lesson: Lesson = {
        ...template,
        id: lessonId,
        courseId,
        nodeId,
        createdAt: new Date().toISOString(),
        title: node.title,
        hook: node.goal,
        styleGuide: course.styleGuide,
      };
      await saveLesson(lesson);
      await sleep(900);

      writer.write({ type: "data-lesson", id: lessonId, data: lesson });
      steps["finalize-lesson"] = { status: "success" };
      snapshot("success");
    },
  });
}

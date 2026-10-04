import { z } from "zod";

export const styleGuideSchema = z.object({
  background: z.string().describe("Stage background, hex color"),
  surface: z.string().describe("Cards/panels on the stage, hex color"),
  ink: z.string().describe("Main text color, hex. Must contrast with background"),
  muted: z.string().describe("Secondary text and guide lines, hex color"),
  primary: z.string().describe("Main highlight color, hex"),
  secondary: z.string().describe("Second highlight color, hex"),
  accent: z.string().describe("Small pops of emphasis, hex"),
  motif: z
    .string()
    .describe("One recurring visual motif that ties all scenes together"),
});

export const scenePlanSchema = z.object({
  id: z.string(),
  title: z.string().describe("2-5 word chapter title"),
  goal: z.string().describe("The single idea the learner should get from this scene"),
  narration: z
    .string()
    .describe("Spoken narration with [[cue-name]] markers before the words where visuals change"),
  visual: z
    .string()
    .describe("What is on screen and how it moves, referencing cues by name"),
});

export const lessonPlanSchema = z.object({
  title: z.string(),
  hook: z.string().describe("One sentence that makes the learner curious"),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  coreIntuition: z.string().describe("The one mental model the whole lesson builds"),
  scenes: z.array(scenePlanSchema),
  musicPrompt: z.string().describe("Prompt for a calm instrumental background track"),
});

export const lessonContextSchema = z.object({
  lessonId: z.string(),
  courseId: z.string(),
  nodeId: z.string(),
  brief: z.string(),
  styleGuide: styleGuideSchema,
  plan: lessonPlanSchema,
});

export const sceneJobSchema = z.object({
  lessonId: z.string(),
  lessonTitle: z.string(),
  styleGuide: styleGuideSchema,
  scene: scenePlanSchema,
  previousNarration: z.string().optional(),
  nextNarration: z.string().optional(),
});

export const narratedSceneSchema = sceneJobSchema.extend({
  duration: z.number(),
  cues: z.record(z.string(), z.number()),
});

export const videoSceneSchema = z.object({
  id: z.string(),
  title: z.string(),
  goal: z.string(),
  /** Spoken text, kept so questions during the lesson know what was just said. */
  narration: z.string().default(""),
  duration: z.number(),
  cues: z.record(z.string(), z.number()),
});

export const videoSchema = z.object({
  duration: z.number(),
  hasMusic: z.boolean(),
  scenes: z.array(videoSceneSchema.extend({ start: z.number() })),
});

export const notesSchema = z.object({
  summary: z.string().describe("3-4 sentence plain-language summary"),
  keyIdeas: z
    .array(z.object({ title: z.string(), explanation: z.string() }))
    .describe("3-5 key ideas in the order the lesson builds them"),
  keyTerms: z
    .array(z.object({ term: z.string(), definition: z.string() }))
    .describe("3-8 terms with one-sentence definitions"),
  analogy: z.string().describe("One memorable everyday analogy"),
});

export const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).describe("Exactly 4 options"),
        correctIndex: z.number().describe("0-based index of the correct option"),
        explanation: z.string().describe("Why the answer is right, 1-2 sentences"),
      }),
    )
    .describe("4 questions that test understanding, not recall"),
});

export const materialsSchema = z.object({
  notes: notesSchema,
  quiz: quizSchema.shape.questions,
  hasPlayground: z.boolean(),
});

export const lessonSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  nodeId: z.string(),
  createdAt: z.string(),
  title: z.string(),
  hook: z.string(),
  level: lessonPlanSchema.shape.level,
  styleGuide: styleGuideSchema,
  video: videoSchema,
  notes: notesSchema,
  quiz: quizSchema.shape.questions,
  hasPlayground: z.boolean(),
});

export type StyleGuide = z.infer<typeof styleGuideSchema>;
export type LessonPlan = z.infer<typeof lessonPlanSchema>;
export type LessonContext = z.infer<typeof lessonContextSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type QuizQuestion = Lesson["quiz"][number];

// ── Knowledge check ──────────────────────────────────────────────────────

export const diagnosticSchema = z.object({
  intro: z.string().describe("One warm sentence on why you ask, max 20 words"),
  questions: z
    .array(
      z.object({
        question: z.string().describe("Short, concrete, max 16 words"),
        options: z.array(z.string()).describe("Exactly 3 short options, max 8 words each"),
        correctIndex: z.number().describe("0-based index of the correct option"),
      }),
    )
    .describe("4 questions, from everyday intuition to more advanced"),
});

export const LEARNER_LEVELS = ["new", "basics", "comfortable"] as const;

export const diagnosticAnswersSchema = z.object({
  topic: z.string(),
  level: z.enum(LEARNER_LEVELS),
  answers: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
      /** null when the learner was not sure. */
      correct: z.boolean().nullable(),
    }),
  ),
});

// ── Course ───────────────────────────────────────────────────────────────

/**
 * Knowledge as a tree: trunk lessons are the fundamental principles, branches the
 * main mechanisms that grow from them, leaves the details that hang on a branch.
 */
export const LESSON_DEPTHS = ["trunk", "branch", "leaf"] as const;
export const lessonDepthSchema = z.enum(LESSON_DEPTHS);

export const courseOutlineSchema = z.object({
  title: z.string().describe("Course title, max 6 words"),
  tagline: z.string().describe("One sentence promise of what the learner will understand"),
  learnerProfile: z
    .string()
    .describe("2 sentences: what this learner already understands and where the gaps are"),
  styleGuide: styleGuideSchema,
  modules: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string().describe("One sentence"),
        lessons: z
          .array(
            z.object({
              title: z.string().describe("max 6 words"),
              goal: z.string().describe("What the learner will understand after this lesson"),
              likelyKnown: z
                .boolean()
                .describe("true if the knowledge check shows the learner already knows this"),
              depth: lessonDepthSchema.describe(
                "trunk = fundamental principle, branch = main mechanism, leaf = detail or edge case",
              ),
              hangsOn: z
                .string()
                .describe("Exact title of the earlier lesson this one builds on most. Empty for trunk lessons"),
            }),
          )
          .describe("2-4 lessons, each going one step deeper"),
      }),
    )
    .describe("3-5 modules from foundations to depth"),
});

const courseLessonSchema = courseOutlineSchema.shape.modules.element.shape.lessons.element.extend({
  id: z.string(),
  depth: lessonDepthSchema.default("branch"),
  hangsOn: z.string().default(""),
  /** Id of the lesson this one hangs on. */
  parentId: z.string().optional(),
  /** Leaves can grow from a question the learner asked during a lesson. */
  question: z.string().optional(),
});

export const courseSchema = courseOutlineSchema.extend({
  id: z.string(),
  topic: z.string(),
  createdAt: z.string(),
  modules: z.array(
    courseOutlineSchema.shape.modules.element.extend({
      id: z.string(),
      lessons: z.array(courseLessonSchema),
    }),
  ),
});

export type Diagnostic = z.infer<typeof diagnosticSchema>;
export type DiagnosticAnswers = z.infer<typeof diagnosticAnswersSchema>;
export type LearnerLevel = DiagnosticAnswers["level"];
export type CourseOutline = z.infer<typeof courseOutlineSchema>;
export type Course = z.infer<typeof courseSchema>;
export type CourseLesson = Course["modules"][number]["lessons"][number];
export type LessonDepth = z.infer<typeof lessonDepthSchema>;

/** What the tutor suggests when a question deserves its own lesson. */
export const leafSuggestionSchema = z.object({
  title: z.string().describe("Short lesson title, max 6 words"),
  goal: z.string().describe("What the learner will understand after it"),
});
export type LeafSuggestion = z.infer<typeof leafSuggestionSchema>;

/** Recursively optional, the shape of structured output while it streams. */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

// ── Streamed data parts (the contract between workflows and UI) ──────────

/** `data-diagnostic` */
export type DiagnosticPart = {
  topic: string;
  status: "writing" | "ready";
  diagnostic: DeepPartial<Diagnostic>;
};

/** `data-course` */
export type CoursePart =
  | { status: "drafting"; outline: DeepPartial<CourseOutline> }
  | { status: "ready"; course: Course };

/** `data-scene` */
export type SceneProgress = {
  sceneId: string;
  title: string;
  status: "narrating" | "animating" | "ready";
};

/** `data-material` */
export type MaterialProgress = {
  kind: "notes" | "quiz" | "playground";
  status: "writing" | "ready";
};

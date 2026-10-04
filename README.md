# Lumen

Name any topic. A quick knowledge check finds where you are, a personal course maps out the path, and every
lesson becomes an animated, narrated explainer with notes, a quiz and a playground.

**Stack:** Next.js 16 · assistant-ui · shadcn/ui (Base UI) · Mastra workflows · OpenRouter · ElevenLabs · GSAP

## Setup

```bash
cp .env.example .env.local   # add OPENROUTER_API_KEY and ELEVENLABS_API_KEY (or leave empty for demo mode)
npm install
npm run dev                  # app on http://localhost:3000
npm run studio               # Mastra Studio on http://localhost:4111
```

## How it works

Three Mastra workflows, each streamed to the UI as typed data parts:

| Workflow | Input | Streams | Model |
| --- | --- | --- | --- |
| `diagnoseWorkflow` | topic | `data-diagnostic`: questions appear as they are written | fast |
| `courseWorkflow` | knowledge check answers | `data-course`: the learning path grows live, then the saved course | Opus |
| `lessonWorkflow` | `{ courseId, nodeId }` | `data-workflow`, `data-scene`, `data-material`, `data-lesson` | Opus + fast |

```
lessonWorkflow
plan-lesson (Opus, from a brief: learner profile, course map, what earlier lessons covered, what comes next)
├─ video-workflow
│   ├─ foreach scene (concurrency 3)
│   │   ├─ narrate-scene  (ElevenLabs with timestamps → cue times in seconds)
│   │   └─ animate-scene  (Opus writes GSAP code for the exact duration and cues)
│   └─ assemble-video     (concatenate narration, compose music)
├─ materials-workflow (parallel: notes, quiz, playground)
└─ finalize-lesson
```

- `src/app/api/course/route.ts` runs the knowledge check or, when the last message carries answers, the course workflow.
- `src/app/api/lesson/route.ts` builds a lesson; the course page starts it when a lesson is opened.
- `src/components/course/` renders every streamed state: knowledge check, course draft, course map, lesson builder.
- **Demo mode:** without `OPENROUTER_API_KEY`, `src/demo/streams.ts` replays the same data parts with realistic timing,
  so the full UI can be developed and recorded without spending credits. Demo lessons use the fixture in `demo/lesson/`.
- Courses and lessons are stored on disk in `.data/`. Swap `src/mastra/lib/lesson-store.ts` for a database and blob
  storage in production.

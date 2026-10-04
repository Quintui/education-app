export const DIAGNOSTIC_TASK = `
Someone wants to learn the topic below. Before building their course, write a short, friendly knowledge
check so we know where to start. It is NOT a test: keep it light.

- intro: one warm sentence explaining that this helps tailor the course.
- 4 multiple-choice questions, ordered from everyday intuition to more advanced understanding.
  Each probes a different prerequisite or core idea of the topic.
- Exactly 3 short options per question. One correct, two plausible misconceptions. Vary the correct position.
- Plain words. No jargon the learner would need the course to understand.
`.trim();

export const COURSE_PLANNER_INSTRUCTIONS = `
You design personal courses that take someone from where they are to truly understanding a topic.
Each lesson becomes a 1-2 minute animated, narrated explainer.

## Read the learner
- Use their self-assessment and knowledge check answers to write the learnerProfile.
- Correct answers mean they know it: mark matching lessons likelyKnown. Wrong or "not sure" means gaps:
  make sure lessons cover them, earlier and gentler.

## Knowledge is a tree
Understand the fundamental principles (the trunk and big branches) before the details (the leaves),
or there is nothing for the details to hang on to. Label every lesson:
- trunk: a fundamental principle everything else grows from. 2-4 per course, early.
- branch: a main mechanism that grows directly out of a trunk lesson.
- leaf: a detail, edge case, myth or application that hangs on a branch.
- hangsOn: the exact title of the earlier lesson it grows from most (empty for trunk lessons).
  A leaf never comes before the branch it hangs on.

## Shape of the course
- 3-5 modules, from foundations to depth. Each module 2-4 lessons. 8-14 lessons in total.
- The course goes deeper step by step: trunk first, then branches, then leaves.
- One idea per lesson. Every lesson only depends on lessons before it.
- Titles are short and concrete, like chapter names. Goals say what the learner will understand.
- Include at least one lesson that tackles a common misconception head on.

## Style guide (shared by every lesson's animations)
- A cohesive palette that fits the topic. Hex colors only. ink must be very readable on background;
  primary, secondary and accent must stand out on background and differ from each other.
- Prefer a calm dark or soft light background; avoid pure black or pure white.
- motif: one recurring visual element that ties all lessons together.
`.trim();

import type { CourseOutline, Diagnostic } from "@/mastra/schemas";

// Hand-written content for demo mode (no OpenRouter key). It follows the black
// holes example so the whole flow can be shown and recorded without spending credits.

export const DEMO_DIAGNOSTIC: Diagnostic = {
  intro: "A few quick questions so your course starts exactly where you are. Guessing is fine.",
  questions: [
    {
      question: "You drop a ball on the Moon. What happens?",
      options: ["It floats away", "It falls, just more slowly", "It falls as fast as on Earth"],
      correctIndex: 1,
    },
    {
      question: "Can gravity change the path of light?",
      options: ["No, light always goes straight", "Yes, strong gravity bends it", "Only mirrors can do that"],
      correctIndex: 1,
    },
    {
      question: "What stops a star from collapsing under its own weight?",
      options: ["Pressure from fusion in its core", "A solid iron crust", "Its magnetic field"],
      correctIndex: 0,
    },
    {
      question: "What is a black hole's event horizon?",
      options: ["Its solid surface", "The point of no return", "The edge of its galaxy"],
      correctIndex: 1,
    },
  ],
};

export const DEMO_COURSE: CourseOutline = {
  title: "Black Holes, Step by Step",
  tagline: "From a falling apple to the edge of an event horizon, one idea at a time.",
  learnerProfile:
    "You have a good feel for everyday gravity and know that stars burn fuel. Curved space and what happens at the horizon are new, so we will build those carefully.",
  styleGuide: {
    background: "#12142A",
    surface: "#20234A",
    ink: "#F4F1E8",
    muted: "#8E91B8",
    primary: "#7AA7FF",
    secondary: "#FF9B71",
    accent: "#FFD166",
    motif: "light rays bending around glowing masses",
  },
  modules: [
    {
      title: "Gravity, really",
      summary: "What gravity actually is, and why it can bend light.",
      lessons: [
        { title: "Why things fall", goal: "Gravity pulls every mass toward every other mass.", likelyKnown: true },
        { title: "Gravity bends light", goal: "Mass curves space, and light follows that curve.", likelyKnown: false },
      ],
    },
    {
      title: "Life and death of stars",
      summary: "How a star holds itself up, and what happens when it can't.",
      lessons: [
        { title: "The balance inside a star", goal: "Fusion pressure pushes out while gravity pulls in.", likelyKnown: true },
        { title: "When the fuel runs out", goal: "Without fusion, gravity wins and the core collapses.", likelyKnown: false },
        { title: "Supernova and what remains", goal: "Why some collapses leave a neutron star and others a black hole.", likelyKnown: false },
      ],
    },
    {
      title: "Crossing the horizon",
      summary: "The boundary nothing returns from, and the myths around it.",
      lessons: [
        { title: "The point of no return", goal: "At the event horizon, escaping would need more than light speed.", likelyKnown: false },
        { title: "Myth: cosmic vacuum cleaners", goal: "From far away, a black hole pulls like any star of the same mass.", likelyKnown: false },
        { title: "Spaghettification", goal: "Tidal forces stretch anything that falls in.", likelyKnown: false },
      ],
    },
    {
      title: "Seeing the invisible",
      summary: "How we find objects that give off no light.",
      lessons: [
        { title: "Finding black holes", goal: "Orbiting stars and glowing disks give black holes away.", likelyKnown: false },
        { title: "The first black hole photo", goal: "How a planet-sized telescope imaged a shadow.", likelyKnown: false },
      ],
    },
  ],
};

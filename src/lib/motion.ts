import type { Transition } from "motion/react";

/** One easing for the whole app: quick start, soft landing. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const springy: Transition = { type: "spring", stiffness: 380, damping: 30 };

/** Content arriving from the stream: rise, sharpen, settle. */
export const appear = {
  initial: { opacity: 0, y: 10, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.45, ease: EASE_OUT },
};

/** Smaller items in a list (options, lessons). */
export const appearSmall = {
  initial: { opacity: 0, y: 6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.3, ease: EASE_OUT },
};

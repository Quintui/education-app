"use client";

import { AnimatePresence, motion } from "motion/react";
import { ShimmerLabel } from "@/components/assistant-ui/elements/surfaces";
import { Spinner } from "@/components/ui/spinner";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A live status line: a spinner and shimmering text that cross-fades whenever
 * the label changes, so each new phase of the stream is noticeable.
 */
export function StreamStatus({ label, className }: { label: string; className?: string }) {
  return (
    <span role="status" className={cn("text-muted-foreground flex items-center gap-2 text-sm", className)}>
      <Spinner className="text-primary" />
      <span className="relative inline-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <ShimmerLabel>{label}</ShimmerLabel>
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

/** A blinking caret after text that is still being written. */
export function Caret({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return (
    <motion.span
      aria-hidden
      className="bg-primary ms-0.5 inline-block h-[1em] w-0.5 translate-y-[0.15em] rounded-full"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    />
  );
}

/** Little equalizer bars: "the voice is being recorded". */
export function Waveform({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-3 items-end gap-0.5", className)}>
      {[0, 1, 2, 3].map((bar) => (
        <motion.span
          key={bar}
          className="w-0.5 rounded-full bg-current"
          initial={{ height: "30%" }}
          animate={{ height: ["30%", "100%", "45%", "85%", "30%"] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: bar * 0.13, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

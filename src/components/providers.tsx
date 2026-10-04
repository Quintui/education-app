"use client";

import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Honour the OS "reduce motion" setting for every animation in the app.
    <MotionConfig reducedMotion="user">
      <TooltipProvider>{children}</TooltipProvider>
    </MotionConfig>
  );
}

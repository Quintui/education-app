"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRightIcon, SproutIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { appear } from "@/lib/motion";

/**
 * Details need something to hang on to: before building a lesson whose
 * foundation is not there yet, suggest that foundation first. A nudge, not a lock.
 */
export function HangsOnGate({
  parent,
  children,
}: {
  parent: { id: string; title: string };
  children: React.ReactNode;
}) {
  const [proceed, setProceed] = useState(false);
  if (proceed) return children;

  return (
    <motion.div {...appear}>
      <Card>
        <CardHeader className="gap-2">
          <Badge variant="secondary">
            <SproutIcon data-icon="inline-start" />
            Builds on another lesson
          </Badge>
          <CardTitle className="font-heading text-2xl tracking-tight text-balance">
            Start with “{parent.title}”
          </CardTitle>
          <CardDescription className="text-base text-pretty">
            This lesson hangs on it. Get the bigger idea first, and these details will have something to hang on to.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href={`?lesson=${parent.id}`} scroll={false} />}>
            Go to {parent.title}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button variant="ghost" onClick={() => setProceed(true)}>
            Build this one anyway
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

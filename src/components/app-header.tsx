import Link from "next/link";
import { FlaskConicalIcon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isDemoMode } from "@/demo/streams";

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-4 sm:px-6">
      <Link href="/" className="font-heading flex items-center gap-2 text-lg font-bold tracking-tight">
        <span className="bg-primary text-primary-foreground flex size-8 -rotate-6 items-center justify-center rounded-lg shadow-sm transition-transform hover:rotate-0">
          <SparklesIcon className="size-4" />
        </span>
        Lumen
      </Link>
      {isDemoMode() && (
        <Tooltip>
          <TooltipTrigger render={<Badge variant="outline" />}>
            <FlaskConicalIcon data-icon="inline-start" />
            Demo mode
          </TooltipTrigger>
          <TooltipContent>No OpenRouter key set, so responses are simulated.</TooltipContent>
        </Tooltip>
      )}
    </header>
  );
}

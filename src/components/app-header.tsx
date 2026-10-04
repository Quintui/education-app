import Link from "next/link";
import { FlaskConicalIcon, KeyRoundIcon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isDemoMode, missingKeys } from "@/lib/env";

export function AppHeader() {
  const missing = missingKeys();

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
          <TooltipContent>LUMEN_DEMO=1 is set, so responses are simulated.</TooltipContent>
        </Tooltip>
      )}
      {missing.length > 0 && (
        <Tooltip>
          <TooltipTrigger render={<Badge variant="destructive" />}>
            <KeyRoundIcon data-icon="inline-start" />
            Add API keys
          </TooltipTrigger>
          <TooltipContent className="max-w-72">
            Set {missing.join(" and ")} in .env.local, then restart the dev server.
          </TooltipContent>
        </Tooltip>
      )}
    </header>
  );
}

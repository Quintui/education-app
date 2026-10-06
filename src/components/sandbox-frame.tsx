"use client";

import { useEffect, useState, type ComponentProps } from "react";

type SandboxFrameProps = Omit<ComponentProps<"iframe">, "src" | "srcDoc" | "sandbox"> & { src: string };

/**
 * Runs AI-written HTML in a locked-down iframe (scripts only, no same-origin access).
 * The page is fetched and passed in as `srcDoc` rather than loaded by URL, because some
 * browsers and blockers refuse to navigate a sandboxed frame. The HTML carries its own CSP.
 */
export function SandboxFrame({ src, ...props }: SandboxFrameProps) {
  const [html, setHtml] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    fetch(src, { signal: controller.signal })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`${res.status} loading ${src}`))))
      .then(setHtml)
      .catch((error) => {
        if (!controller.signal.aborted) console.error(error);
      });
    return () => controller.abort();
  }, [src]);

  return <iframe {...props} sandbox="allow-scripts" srcDoc={html} />;
}

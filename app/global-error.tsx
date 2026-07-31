"use client";

import { useEffect } from "react";
import { Button } from "../components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-background px-4 text-center">
          <h2 className="text-2xl font-semibold text-text">Critical Error</h2>
          <p className="text-muted max-w-md">
            The application encountered a fatal error. Please refresh the page.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => reset()}>Try again</Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}

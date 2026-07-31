"use client";

import { useEffect } from "react";
import { Button } from "../components/ui/button";

export default function Error({
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
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-background px-4 text-center">
      <h2 className="text-2xl font-semibold text-text">Something went wrong!</h2>
      <p className="text-muted max-w-md">
        An unexpected error has occurred. Our team has been notified.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="secondary" onClick={() => window.location.href = "/"}>
          Go Home
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toUserMessage } from "@/lib/user-messages";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = toUserMessage(error, "generic");

  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg rounded-2xl border-destructive/30 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            We hit a snag
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" className="rounded-xl" onClick={() => reset()}>
            Try again
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => window.location.assign("/dashboard")}
          >
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

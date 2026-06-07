"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toUserMessage } from "@/lib/user-messages";
import { AlertTriangle } from "lucide-react";
import React from "react";

type Props = {
  children: React.ReactNode;
  title?: string;
};

type State = {
  hasError: boolean;
  message: string;
  resetKey: number;
};

export class UserErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "", resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      message: toUserMessage(error, "generic"),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[UserErrorBoundary]", error, info.componentStack);
  }

  private handleTryAgain = (): void => {
    this.setState((s) => ({
      hasError: false,
      message: "",
      resetKey: s.resetKey + 1,
    }));
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    const { hasError, message, resetKey } = this.state;

    return (
      <>
        {!hasError ? (
          <React.Fragment key={resetKey}>{this.props.children}</React.Fragment>
        ) : null}
        <Dialog open={hasError} onOpenChange={(open) => !open && this.handleTryAgain()}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {this.props.title ?? "Something went wrong"}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2 text-sm text-foreground">
                  <p>{message}</p>
                  <p className="text-muted-foreground">
                    Your data is safe. Try again or refresh if this keeps happening.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="rounded-xl" onClick={this.handleTryAgain}>
                Try again
              </Button>
              <Button type="button" className="rounded-xl" onClick={this.handleReload}>
                Refresh page
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}

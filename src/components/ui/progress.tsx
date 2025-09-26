"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ProgressProps extends React.ComponentProps<"div"> {
  value?: number;
  max?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const clamped = Math.max(0, Math.min(value, max));
    const percentage = (clamped / max) * 100;

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-muted",
          className
        )}
        role="progressbar"
        aria-valuenow={Number.isFinite(percentage) ? Math.round(percentage) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        {...props}
      >
        <div
          className="h-full w-full flex-1 bg-primary transition-all"
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

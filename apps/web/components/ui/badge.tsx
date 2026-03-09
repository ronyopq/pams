import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700",
        className,
      )}
      {...props}
    />
  );
}

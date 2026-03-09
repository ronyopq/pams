import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function TableWrapper({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-auto rounded-xl border bg-white", className)} {...props} />
  );
}

import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none ring-primary transition focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

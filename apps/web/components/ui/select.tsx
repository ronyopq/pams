import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-primary transition focus:ring-2",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

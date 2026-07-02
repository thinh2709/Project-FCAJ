import * as React from "react"
import { Spinner } from "./Spinner"
import { cn } from "@/lib/utils"

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string
}

export function LoadingState({
  text = "Loading...",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center p-8",
        className
      )}
      {...props}
    >
      <Spinner size="lg" />
      <p className="mt-4 text-sm text-muted-foreground animate-pulse">{text}</p>
    </div>
  )
}

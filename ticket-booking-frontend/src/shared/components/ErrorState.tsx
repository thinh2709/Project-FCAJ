import * as React from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load the data. Please try again later.",
  action,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center rounded-md border border-destructive/20 bg-destructive/10 p-8 text-center",
        className
      )}
      {...props}
    >
      <div className="flex mx-auto h-20 w-20 items-center justify-center rounded-full bg-destructive/20">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-destructive">{title}</h2>
      <p className="mb-8 mt-2 text-center text-sm font-normal leading-6 text-muted-foreground max-w-sm mx-auto">
        {description}
      </p>
      {action}
    </div>
  )
}

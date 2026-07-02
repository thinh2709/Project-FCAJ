import { Container } from "./Container"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, className, children, ...props }: PageHeaderProps) {
  return (
    <div className={cn("bg-muted/30 border-b py-8 md:py-12", className)} {...props}>
      <Container>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
            {description && (
              <p className="text-lg text-muted-foreground max-w-2xl">{description}</p>
            )}
          </div>
          {children && <div className="mt-4 md:mt-0">{children}</div>}
        </div>
      </Container>
    </div>
  )
}

import { Link, useRouter } from '@tanstack/react-router'
import { AlertCircleIcon, RotateCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RouteErrorFallbackProps {
  error: Error
  reset: () => void
}

export function RouteErrorFallback({ error, reset }: RouteErrorFallbackProps) {
  const router = useRouter()

  const handleRetry = () => {
    reset()
    router.invalidate()
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/40 px-8 py-10 text-center max-w-sm w-full">
        <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircleIcon className="size-5 text-destructive" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Something went wrong</h2>
          <p className="text-xs text-muted-foreground">
            {error.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleRetry}>
            <RotateCwIcon data-icon="inline-start" />
            Try Again
          </Button>
          <Button variant="outline" size="sm" render={<Link to="/dashboard" />}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

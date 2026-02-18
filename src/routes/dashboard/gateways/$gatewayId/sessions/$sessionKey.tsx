import { createFileRoute, Link } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeftIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  DollarSignIcon,
  UserIcon,
  BotIcon,
  WrenchIcon,
  InfoIcon,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute(
  '/dashboard/gateways/$gatewayId/sessions/$sessionKey',
)({
  component: SessionDetailPage,
  errorComponent: RouteErrorFallback,
})

function SessionDetailPage() {
  const { gatewayId, sessionKey } = Route.useParams()

  const { data: usage, isLoading: usageLoading } = useQuery(
    orpc.gateway.sessionUsage.queryOptions({
      input: { gatewayId, sessionKey },
    }),
  )

  const { data: chatHistory, isLoading: chatLoading } = useQuery(
    orpc.gateway.chatHistory.queryOptions({
      input: { gatewayId, sessionKey, limit: 200 },
    }),
  )

  const { data: usageLogs } = useQuery(
    orpc.gateway.sessionUsageLogs.queryOptions({
      input: { gatewayId, sessionKey, limit: 50 },
    }),
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-xs"
          render={
            <Link
              to="/dashboard/gateways/$gatewayId"
              params={{ gatewayId }}
            />
          }
        >
          <ArrowLeftIcon />
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Session Detail</h1>
        <Badge variant="outline" className="font-mono text-[0.625rem]">
          {sessionKey.slice(0, 16)}...
        </Badge>
      </div>

      {usageLoading ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card size="sm" className="bg-muted/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowDownIcon className="size-3 text-blue-500" />
                  <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
                    Tokens In
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-lg font-semibold tabular-nums">
                  {(usage?.tokensIn ?? 0).toLocaleString()}
                </span>
              </CardContent>
            </Card>

            <Card size="sm" className="bg-muted/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowUpIcon className="size-3 text-emerald-500" />
                  <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
                    Tokens Out
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-lg font-semibold tabular-nums">
                  {(usage?.tokensOut ?? 0).toLocaleString()}
                </span>
              </CardContent>
            </Card>

            <Card size="sm" className="bg-muted/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSignIcon className="size-3 text-muted-foreground" />
                  <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
                    Total Cost
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-lg font-semibold tabular-nums">
                  ${(usage?.cost ?? 0).toFixed(4)}
                </span>
              </CardContent>
            </Card>
          </div>

          {usage?.modelBreakdown && usage.modelBreakdown.length > 0 && (
            <div>
              <h2 className="text-xs font-medium mb-2">Model Breakdown</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Tokens In</TableHead>
                    <TableHead className="text-right">Tokens Out</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.modelBreakdown.map((entry) => (
                    <TableRow key={entry.model}>
                      <TableCell className="font-mono text-[0.625rem]">
                        {entry.model}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.tokensIn.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.tokensOut.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${entry.cost.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {usageLogs && usageLogs.length > 0 && (
            <div>
              <h2 className="text-xs font-medium mb-2">Usage Logs</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLogs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">
                        {typeof log.timestamp === 'number' && log.timestamp > 0
                          ? format(log.timestamp, 'HH:mm:ss')
                          : '--'}
                      </TableCell>
                      <TableCell>{log.role}</TableCell>
                      <TableCell className="font-mono text-[0.625rem]">
                        {log.model}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {log.tokensIn.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {log.tokensOut.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${log.cost.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <div>
        <h2 className="text-xs font-medium mb-2">Chat History</h2>
        {chatLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
        ) : !chatHistory?.length ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No messages in this session.
          </div>
        ) : (
          <ScrollArea className="h-[400px] rounded-md border bg-muted/20 p-3">
            <div className="flex flex-col gap-2">
              {chatHistory.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}

function roleIcon(role: string) {
  switch (role) {
    case 'user':
      return <UserIcon className="size-3" />
    case 'assistant':
      return <BotIcon className="size-3" />
    case 'tool':
      return <WrenchIcon className="size-3" />
    case 'system':
    default:
      return <InfoIcon className="size-3" />
  }
}

function ChatBubble({
  message,
}: {
  message: {
    role: 'user' | 'assistant' | 'system' | 'tool'
    content: string
    timestamp: number
    model?: string
  }
}) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system' || message.role === 'tool'

  return (
    <div
      className={cn(
        'flex gap-2',
        isUser && 'flex-row-reverse',
        isSystem && 'justify-center',
      )}
    >
      {!isSystem && (
        <div
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full mt-0.5',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {roleIcon(message.role)}
        </div>
      )}
      <div
        className={cn(
          'rounded-md px-3 py-2 text-xs max-w-[80%]',
          isUser && 'bg-primary/10 text-foreground',
          message.role === 'assistant' && 'bg-muted/60 text-foreground',
          isSystem && 'bg-muted/30 text-muted-foreground text-[0.625rem] italic max-w-full',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={cn(
            'flex items-center gap-2 mt-1 text-[0.5rem] text-muted-foreground',
            isUser && 'justify-end',
          )}
        >
          {typeof message.timestamp === 'number' && message.timestamp > 0 && (
            <span>
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </span>
          )}
          {message.model && (
            <span className="font-mono">{message.model}</span>
          )}
        </div>
      </div>
    </div>
  )
}

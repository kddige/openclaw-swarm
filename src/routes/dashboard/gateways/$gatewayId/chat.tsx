import { useState, useEffect, useRef, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { z } from 'zod/v4'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeftIcon,
  MessageSquareIcon,
  SendIcon,
  WrenchIcon,
  RotateCcwIcon,
  BotIcon,
  UserIcon,
  ArrowDownIcon,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import { extractText } from '@/lib/content'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/chat')({
  component: MaintenanceChatPage,
  errorComponent: RouteErrorFallback,
  validateSearch: z.object({
    sessionKey: z.string().default('fleet-maintenance'),
  }),
})

function formatChatTime(timestamp: string | number | undefined): string {
  if (!timestamp) return ''
  const date = new Date(
    typeof timestamp === 'number' ? timestamp * 1000 : timestamp,
  )
  if (isNaN(date.getTime())) return ''
  try {
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return ''
  }
}

function MaintenanceChatPage() {
  const { gatewayId } = Route.useParams()
  const { sessionKey } = Route.useSearch()
  const queryClient = useQueryClient()

  const [message, setMessage] = useState('')
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: gateway } = useQuery(
    orpc.gateway.get.queryOptions({ input: { id: gatewayId } }),
  )

  const { data: history, isLoading } = useQuery({
    ...orpc.gateway.chatHistory.queryOptions({
      input: { gatewayId, sessionKey },
    }),
    refetchInterval: 2000,
  })

  const resetMutation = useMutation({
    ...orpc.gateway.resetSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session reset — new conversation started')
      setShowNewSessionDialog(false)
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.chatHistory.queryOptions({
          input: { gatewayId, sessionKey },
        }).queryKey,
      })
    },
    onError: (err) => {
      toast.error('Failed to reset session', { description: String(err) })
    },
  })

  const sendMutation = useMutation({
    ...orpc.gateway.sendChatMessage.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.chatHistory.queryOptions({
          input: { gatewayId, sessionKey },
        }).queryKey,
      })
    },
    onError: (err) => {
      toast.error('Failed to send message', { description: String(err) })
    },
  })

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
    setAtBottom(true)
  }, [])

  useEffect(() => {
    if (atBottom) {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [history, atBottom])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(distFromBottom <= 50)
  }, [])

  const handleSend = useCallback(() => {
    const text = message.trim()
    if (!text || sendMutation.isPending) return
    setMessage('')
    sendMutation.mutate({ gatewayId, sessionKey, message: text })
  }, [message, sendMutation, gatewayId, sessionKey])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const messages = history ?? []

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b shrink-0">
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
        <MessageSquareIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold">Maintenance Chat</span>
        {gateway && (
          <>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {gateway.label}
            </span>
          </>
        )}
        <Badge variant="outline" className="font-mono text-[0.625rem] shrink-0">
          {sessionKey}
        </Badge>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setShowNewSessionDialog(true)}
        >
          <RotateCcwIcon className="size-3" />
          New Session
        </Button>
      </div>

      {/* Message area */}
      <div className="relative flex-1 min-h-0 mx-6 my-4">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto rounded-lg border bg-muted/20 p-4 flex flex-col gap-3"
        >
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <MessageSquareIcon className="size-8 opacity-20" />
              <div className="text-center">
                <p className="text-xs font-medium">No messages yet</p>
                <p className="text-[0.6875rem] mt-0.5">
                  Start a conversation with the agent.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              if (msg.role === 'tool') {
                return (
                  <div key={i} className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-[0.625rem] text-muted-foreground max-w-[80%]">
                      <WrenchIcon className="size-2.5 shrink-0" />
                      <span className="font-mono truncate">{extractText(msg.content)}</span>
                    </div>
                  </div>
                )
              }

              if (msg.role === 'system') {
                return (
                  <div key={i} className="flex justify-center">
                    <span className="text-[0.625rem] italic text-muted-foreground/60 px-2">
                      {extractText(msg.content)}
                    </span>
                  </div>
                )
              }

              const isUser = msg.role === 'user'

              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-end gap-2',
                    isUser ? 'justify-end' : 'justify-start',
                  )}
                >
                  {!isUser && (
                    <div className="size-6 rounded-full bg-muted border flex items-center justify-center shrink-0 mb-4">
                      <BotIcon className="size-3 text-muted-foreground" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'flex flex-col gap-0.5 max-w-[75%]',
                      isUser ? 'items-end' : 'items-start',
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words',
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground',
                      )}
                    >
                      {extractText(msg.content)}
                    </div>
                    <span className="text-[0.5625rem] text-muted-foreground tabular-nums px-1">
                      {formatChatTime(msg.timestamp)}
                    </span>
                  </div>
                  {isUser && (
                    <div className="size-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mb-4">
                      <UserIcon className="size-3 text-primary" />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Jump to bottom button */}
        {!atBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-3 right-4 flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-[0.625rem] font-medium text-muted-foreground shadow-lg hover:bg-muted transition-colors"
          >
            <ArrowDownIcon className="size-3" />
            Jump to bottom
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 px-6 pb-6 shrink-0">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message the agent… (Enter to send, Shift+Enter for newline)"
          className="min-h-[60px] max-h-[160px] text-xs resize-none"
          disabled={sendMutation.isPending}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
          className="shrink-0 h-[60px] px-4"
        >
          {sendMutation.isPending ? (
            <Spinner className="size-3.5" />
          ) : (
            <SendIcon className="size-3.5" />
          )}
        </Button>
      </div>

      {/* New Session Dialog */}
      <AlertDialog
        open={showNewSessionDialog}
        onOpenChange={setShowNewSessionDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the{' '}
              <code className="font-mono text-xs">{sessionKey}</code> session
              and clear the current conversation. The agent will start fresh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                resetMutation.mutate({ gatewayId, sessionKey, reason: 'new' })
              }
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending && <Spinner className="size-3" />}
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

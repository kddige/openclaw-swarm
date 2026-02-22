import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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

function formatChatTime(timestamp: string | number | undefined): string {
  if (!timestamp) return ''
  const ms =
    typeof timestamp === 'number'
      ? timestamp > 1e12
        ? timestamp // already milliseconds
        : timestamp * 1000 // seconds → milliseconds
      : Date.parse(timestamp)
  const date = new Date(ms)
  if (isNaN(date.getTime())) return ''
  try {
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return ''
  }
}

export function ChatPanel({
  gatewayId,
  sessionKey,
  limit = 100,
  className,
  style,
}: {
  gatewayId: string
  sessionKey: string
  limit?: number
  className?: string
  style?: React.CSSProperties
}) {
  const [message, setMessage] = useState('')
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: messages, isLoading } = useQuery(
    orpc.gateway.chatHistory.experimental_streamedOptions({
      input: { gatewayId, sessionKey, limit },
      queryFnOptions: { refetchMode: 'append' },
      initialData: [],
      select: (chunks) => {
        if (!chunks || chunks.length === 0) return []
        let base: (typeof chunks)[0]['messages'] = []
        let streamingMsg: (typeof chunks)[0]['messages'][0] | null = null
        for (const chunk of chunks) {
          if (chunk.state === 'history') {
            base = chunk.messages
            streamingMsg = null
          } else if (chunk.state === 'delta') {
            streamingMsg = chunk.messages[0] ?? null
          } else if (chunk.state === 'final') {
            if (chunk.messages[0]) base = [...base, chunk.messages[0]]
            streamingMsg = null
          }
        }
        return streamingMsg ? [...base, streamingMsg] : base
      },
    }),
  )

  const resetMutation = useMutation({
    ...orpc.gateway.resetSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session reset — new conversation started')
      setShowResetDialog(false)
    },
    onError: (err) => {
      toast.error('Failed to reset session', { description: String(err) })
    },
  })

  const sendMutation = useMutation({
    ...orpc.gateway.sendChatMessage.mutationOptions(),
    onError: (err) => {
      toast.error('Failed to send message', { description: String(err) })
    },
  })

  // Show typing indicator after sending until the first assistant response streams in
  const lastRole = messages.length > 0 ? messages[messages.length - 1]?.role : null
  const waitingForReply = sendMutation.isPending || (lastRole === 'user' && sendMutation.isSuccess)

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
  }, [messages, atBottom])

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

  return (
    <div className={cn('flex flex-col gap-3', className)} style={style}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquareIcon className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Chat</span>
          <code className="font-mono text-[0.625rem] text-muted-foreground bg-muted rounded px-1 py-0.5">
            {sessionKey}
          </code>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setShowResetDialog(true)}
        >
          <RotateCcwIcon className="size-3" />
          New Session
        </Button>
      </div>

      {/* Message area */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overflow-x-hidden rounded-lg border bg-muted/20 p-4 flex flex-col gap-3"
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
                <p className="text-[0.6875rem] mt-0.5">Start a conversation with the agent.</p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              if (msg.role === 'tool') {
                return (
                  <div key={i} className="flex justify-start min-w-0">
                    <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-[0.625rem] text-muted-foreground max-w-full min-w-0">
                      <WrenchIcon className="size-2.5 shrink-0" />
                      <span className="font-mono truncate">{extractText(msg.content)}</span>
                    </div>
                  </div>
                )
              }

              if (msg.role === 'system') {
                return (
                  <div key={i} className="flex justify-center min-w-0">
                    <span className="text-[0.625rem] italic text-muted-foreground/60 px-2 text-center break-words">
                      {extractText(msg.content)}
                    </span>
                  </div>
                )
              }

              const text = extractText(msg.content)
              if (!text) return null

              const isUser = msg.role === 'user'

              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-end gap-2 min-w-0',
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
                      'flex flex-col gap-0.5 min-w-0',
                      isUser ? 'items-end max-w-[75%]' : 'items-start max-w-[80%]',
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 text-xs leading-relaxed break-words overflow-wrap-anywhere',
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground',
                      )}
                    >
                      {text}
                    </div>
                    <span className="text-[0.5625rem] text-muted-foreground tabular-nums px-1 shrink-0">
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
          {waitingForReply && (
            <div className="flex items-end gap-2 min-w-0">
              <div className="size-6 rounded-full bg-muted border flex items-center justify-center shrink-0 mb-4">
                <BotIcon className="size-3 text-muted-foreground" />
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <div className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
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
      <div className="flex items-end gap-2 shrink-0">
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

      {/* Reset Session Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the <code className="font-mono text-xs">{sessionKey}</code> session and
              clear the current conversation. The agent will start fresh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetMutation.mutate({ gatewayId, sessionKey, reason: 'new' })}
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

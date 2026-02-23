import { useState } from 'react'
import { TerminalIcon, CopyIcon, CheckIcon } from 'lucide-react'

export function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center gap-2 rounded-md border bg-muted/60 px-3 py-2 text-left transition-colors hover:bg-muted"
    >
      <TerminalIcon className="size-3 text-muted-foreground shrink-0" />
      <code className="flex-1 font-mono text-[0.6875rem] text-foreground select-all">
        {command}
      </code>
      {copied ? (
        <CheckIcon className="size-3 text-emerald-500 shrink-0" />
      ) : (
        <CopyIcon className="size-3 text-muted-foreground shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  )
}

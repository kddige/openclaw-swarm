import { useState } from 'react'
import { Input } from '@/components/ui/input'
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

export type SessionActionDialog =
  | { type: 'none' }
  | { type: 'reset'; sessionKey: string }
  | { type: 'compact'; sessionKey: string }
  | { type: 'delete'; sessionKey: string }

interface SessionActionDialogsProps {
  dialog: SessionActionDialog
  onClose: () => void
  onReset: (sessionKey: string) => void
  onCompact: (sessionKey: string, maxLines?: number) => void
  onDelete: (sessionKey: string, deleteTranscript: boolean) => void
  resetPending?: boolean
  compactPending?: boolean
  deletePending?: boolean
}

export function SessionActionDialogs({
  dialog,
  onClose,
  onReset,
  onCompact,
  onDelete,
  resetPending,
  compactPending,
  deletePending,
}: SessionActionDialogsProps) {
  const [maxLines, setMaxLines] = useState('')
  const [deleteTranscript, setDeleteTranscript] = useState(false)

  return (
    <>
      {/* Reset Dialog */}
      <AlertDialog open={dialog.type === 'reset'} onOpenChange={(open) => !open && onClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the session state. The transcript may be preserved depending on
              gateway settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dialog.type === 'reset' && onReset(dialog.sessionKey)}
              disabled={resetPending}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compact Dialog */}
      <AlertDialog
        open={dialog.type === 'compact'}
        onOpenChange={(open) => {
          if (!open) {
            onClose()
            setMaxLines('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Compact Session</AlertDialogTitle>
            <AlertDialogDescription>
              Summarize and compress the session history to reduce token usage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Max lines (optional)</label>
            <Input
              type="number"
              placeholder="e.g. 100"
              value={maxLines}
              onChange={(e) => setMaxLines(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                dialog.type === 'compact' &&
                onCompact(dialog.sessionKey, maxLines ? Number(maxLines) : undefined)
              }
              disabled={compactPending}
            >
              Compact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={dialog.type === 'delete'}
        onOpenChange={(open) => {
          if (!open) {
            onClose()
            setDeleteTranscript(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this session. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={deleteTranscript}
              onChange={(e) => setDeleteTranscript(e.target.checked)}
              className="rounded"
            />
            Also delete transcript
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                dialog.type === 'delete' && onDelete(dialog.sessionKey, deleteTranscript)
              }
              disabled={deletePending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

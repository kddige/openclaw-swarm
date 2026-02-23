import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  ZapIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  PackageIcon,
  FolderIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'

interface SkillStatusEntry {
  name: string
  description?: string
  source: string
  bundled: boolean
  filePath?: string
  skillKey: string
  primaryEnv?: string
  emoji?: string
  always: boolean
  disabled: boolean
  blockedByAllowlist: boolean
  eligible: boolean
  missing?: { bins?: string[]; envs?: string[]; configs?: string[] }
  requirements?: { bins?: string[]; envs?: string[]; configs?: string[] }
}

interface SkillStatusResponse {
  workspaceDir?: string
  managedSkillsDir?: string
  skills?: SkillStatusEntry[]
}

export function SkillsSection({ gatewayId }: { gatewayId: string }) {
  const queryClient = useQueryClient()

  const skillsQueryKey = orpc.gateway.skillsStatus.queryOptions({ input: { gatewayId } }).queryKey

  const { data: rawStatus, isLoading, error } = useQuery(
    orpc.gateway.skillsStatus.queryOptions({ input: { gatewayId } }),
  )

  const status = rawStatus as SkillStatusResponse | undefined
  const skills = useMemo(() => status?.skills ?? [], [status])

  const toggleMutation = useMutation({
    ...orpc.gateway.updateSkill.mutationOptions(),
    onSuccess: () => {
      toast.success('Skill updated')
      queryClient.invalidateQueries({ queryKey: skillsQueryKey })
    },
    onError: (err) => toast.error('Failed to update skill', { description: String(err) }),
  })

  const grouped = useMemo(() => {
    const groups = new Map<string, SkillStatusEntry[]>()
    for (const skill of skills) {
      const key = skill.bundled ? 'Bundled' : skill.source === 'workspace' ? 'Workspace' : skill.source || 'Other'
      const list = groups.get(key) ?? []
      list.push(skill)
      groups.set(key, list)
    }
    for (const [, list] of groups) {
      list.sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    }
    return groups
  }, [skills])

  const sourceIcon = (source: string) => {
    if (source === 'Bundled') return <PackageIcon className="size-3 text-muted-foreground" />
    if (source === 'Workspace') return <FolderIcon className="size-3 text-muted-foreground" />
    return <ZapIcon className="size-3 text-muted-foreground" />
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">Skills not available.</div>
    )
  }

  if (!skills.length) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">No skills found.</div>
    )
  }

  const eligibleCount = skills.filter((s) => s.eligible).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-[0.625rem]">
          {eligibleCount} eligible
        </Badge>
        <Badge variant="outline" className="text-[0.625rem] text-muted-foreground">
          {skills.length} total
        </Badge>
        {status?.workspaceDir && (
          <span className="font-mono text-[0.5625rem] text-muted-foreground truncate">
            {status.workspaceDir}
          </span>
        )}
      </div>

      {Array.from(grouped.entries()).map(([source, sourceSkills]) => (
        <div key={source} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {sourceIcon(source)}
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
              {source}
            </span>
            <Badge variant="outline" className="text-[0.625rem]">
              {sourceSkills.length}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sourceSkills.map((skill) => (
              <Card
                key={skill.skillKey}
                size="sm"
                className={cn('bg-muted/40', !skill.eligible && 'opacity-60')}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {skill.emoji && <span className="text-sm shrink-0">{skill.emoji}</span>}
                      <div className="flex flex-col min-w-0">
                        <CardTitle className="truncate">{skill.name}</CardTitle>
                        <span className="font-mono text-[0.5625rem] text-muted-foreground truncate">
                          {skill.skillKey}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {skill.eligible ? (
                        <Badge
                          variant="outline"
                          className="text-[0.5625rem] text-emerald-600 dark:text-emerald-400 border-emerald-500/40 gap-0.5"
                        >
                          <CheckCircleIcon className="size-2.5" />
                          eligible
                        </Badge>
                      ) : skill.disabled ? (
                        <Badge variant="outline" className="text-[0.5625rem] text-muted-foreground">
                          disabled
                        </Badge>
                      ) : skill.blockedByAllowlist ? (
                        <Badge variant="outline" className="text-[0.5625rem] text-amber-600 dark:text-amber-400">
                          blocked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[0.5625rem] text-destructive gap-0.5">
                          <AlertTriangleIcon className="size-2.5" />
                          missing deps
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {skill.description && (
                    <p className="text-[0.625rem] text-muted-foreground line-clamp-2">
                      {skill.description}
                    </p>
                  )}

                  {skill.missing &&
                    ((skill.missing.bins?.length ?? 0) > 0 ||
                      (skill.missing.envs?.length ?? 0) > 0) && (
                      <div className="flex flex-wrap gap-1">
                        {skill.missing.bins?.map((bin) => (
                          <Badge key={bin} variant="destructive" className="text-[0.5625rem]">
                            {bin}
                          </Badge>
                        ))}
                        {skill.missing.envs?.map((env) => (
                          <Badge key={env} variant="destructive" className="text-[0.5625rem]">
                            {env}
                          </Badge>
                        ))}
                      </div>
                    )}

                  {!skill.always && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start h-6 text-[0.625rem]"
                      disabled={toggleMutation.isPending}
                      onClick={() =>
                        toggleMutation.mutate({
                          gatewayId,
                          skillKey: skill.skillKey,
                          enabled: skill.disabled,
                        })
                      }
                    >
                      {toggleMutation.isPending ? (
                        <Spinner className="size-2.5" />
                      ) : skill.disabled ? (
                        <ToggleRightIcon className="size-2.5" />
                      ) : (
                        <ToggleLeftIcon className="size-2.5" />
                      )}
                      {skill.disabled ? 'Enable' : 'Disable'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

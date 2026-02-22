/**
 * Shared gateway status + device activity helpers.
 *
 * Used by the dashboard overview, gateways list, gateway detail header,
 * and device cards.
 */

export function getGatewayStatus(status: string): {
  text: string
  dot: string
  textClass: string
} {
  switch (status) {
    case 'connected':
      return {
        text: 'Connected',
        dot: 'bg-emerald-500',
        textClass: 'text-emerald-600 dark:text-emerald-400',
      }
    case 'connecting':
      return {
        text: 'Connecting',
        dot: 'bg-amber-500 animate-pulse',
        textClass: 'text-amber-600 dark:text-amber-400',
      }
    case 'pairing':
      return {
        text: 'Pairing Required',
        dot: 'bg-amber-400 animate-pulse',
        textClass: 'text-amber-600 dark:text-amber-400',
      }
    case 'auth-failed':
      return {
        text: 'Auth Failed',
        dot: 'bg-destructive',
        textClass: 'text-destructive',
      }
    case 'disconnected':
    default:
      return {
        text: 'Offline',
        dot: 'bg-muted-foreground/50',
        textClass: 'text-muted-foreground',
      }
  }
}

export function getActivityStatus(lastInputSeconds?: number): {
  label: string
  color: string
} {
  if (lastInputSeconds === undefined || lastInputSeconds === null) {
    return { label: 'Unknown', color: 'bg-muted-foreground/50' }
  }
  if (lastInputSeconds < 60) {
    return { label: 'Active now', color: 'bg-emerald-500' }
  }
  if (lastInputSeconds < 300) {
    const mins = Math.floor(lastInputSeconds / 60)
    return { label: `Active ${mins}m ago`, color: 'bg-emerald-500' }
  }
  if (lastInputSeconds < 1800) {
    const mins = Math.floor(lastInputSeconds / 60)
    return { label: `Idle ${mins}m ago`, color: 'bg-amber-500' }
  }
  return { label: 'Away', color: 'bg-muted-foreground/50' }
}

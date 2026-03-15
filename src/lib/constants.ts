export const STATUS_COLORS: Record<string, string> = {
  planned: '#0064D2',
  progress: '#FF9900',
  done: '#00A651',
  delivered: '#000000',
  invoiced: '#8B5CF6',
}

const CLEANER_COLOR_PALETTE = [
  '#E91E90', // roze (Sveta)
  '#7C3AED', // paars
  '#0D9488', // teal
  '#EA580C', // oranje
  '#2563EB', // blauw
  '#16A34A', // groen
  '#DC2626', // rood
  '#4F46E5', // indigo
  '#D97706', // amber
  '#0891B2', // cyan
]

const CLEANER_NAME_COLORS: Record<string, string> = {
  sveta: '#E91E90',
}

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function getCleanerColor(name?: string | null): string {
  if (!name) return CLEANER_COLOR_PALETTE[0]
  const key = name.toLowerCase().trim()
  if (CLEANER_NAME_COLORS[key]) return CLEANER_NAME_COLORS[key]
  return CLEANER_COLOR_PALETTE[hashName(key) % CLEANER_COLOR_PALETTE.length]
}

export type NavSection = { section: string }
export type NavItem = { id: string; icon: string; translationKey: string; addAction: string | null }
export type NavEntry = NavSection | NavItem

export function isNavItem(entry: NavEntry): entry is NavItem {
  return 'id' in entry
}

export const NAV_ADMIN: NavEntry[] = [
  { section: 'overview' },
  { id: 'dashboard', icon: 'Home', translationKey: 'home', addAction: 'newJob' },
  { id: 'calendar', icon: 'Calendar', translationKey: 'planning', addAction: 'newJob' },
  { section: 'mgmt' },
  { id: 'jobs', icon: 'ClipboardList', translationKey: 'jobs', addAction: 'newJob' },
  { id: 'properties', icon: 'Building2', translationKey: 'props', addAction: 'newProp' },
  { id: 'partners', icon: 'Handshake', translationKey: 'partners', addAction: 'newPartner' },
  { id: 'cleaners', icon: 'Users', translationKey: 'cleaners', addAction: 'newCleaner' },
  { section: 'finances' },
  { id: 'financial', icon: 'BarChart3', translationKey: 'fin', addAction: null },
  { id: 'settings', icon: 'Settings', translationKey: 'settings', addAction: null },
]

export const NAV_CLEANER: NavEntry[] = [
  { section: 'myWork' },
  { id: 'my-jobs', icon: 'Home', translationKey: 'myJobs', addAction: null },
  { id: 'my-earnings', icon: 'BarChart3', translationKey: 'myEarn', addAction: null },
  { id: 'settings', icon: 'Settings', translationKey: 'settings', addAction: null },
]

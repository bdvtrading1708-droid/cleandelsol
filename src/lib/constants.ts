export const STATUS_COLORS: Record<string, string> = {
  planned: '#0064D2',
  progress: '#FF9900',
  done: '#00A651',
  delivered: '#000000',
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

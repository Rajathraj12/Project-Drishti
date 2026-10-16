import matrix from './matrix.json'

export const ROLES = [
  'ADMIN',
  'GOVERNMENT_OFFICER',
  'FIELD_OFFICER',
  'IMPLEMENTING_AGENCY',
  'CITIZEN',
] as const

export type Role = (typeof ROLES)[number]
export type Capability = keyof typeof matrix.capabilities

export function isRole(value: string | null | undefined): value is Role {
  return !!value && (ROLES as readonly string[]).includes(value)
}

export function normalizeRole(value: string | null | undefined): Role | null {
  if (!value) return null
  if (isRole(value)) return value
  const compact = value.trim().toUpperCase().replace(/[\s-]+/g, '_')
  return isRole(compact) ? compact : null
}

function pathToRegex(path: string): RegExp {
  const pattern = path
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:[a-zA-Z_]+/g, '[^/]+')
  return new RegExp(`^${pattern}/?$`)
}

const compiledRoutes = [...matrix.routes]
  .sort((a, b) => b.path.length - a.path.length)
  .map((rule) => ({
    ...rule,
    regex: pathToRegex(rule.path),
  }))

export function rolesForPath(pathname: string): Role[] | null {
  const path = pathname.split('?')[0]
  const match = compiledRoutes.find((rule) => rule.regex.test(path))
  return match ? (match.roles as Role[]) : null
}

export function canAccessPath(role: string | null | undefined, pathname: string): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  const allowed = rolesForPath(pathname)
  if (!allowed) return false
  return allowed.includes(normalized)
}

export function hasCapability(role: string | null | undefined, capability: Capability): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  const allowed = matrix.capabilities[capability] as string[]
  return allowed.includes(normalized)
}

export function landingPath(role: string | null | undefined): string {
  const normalized = normalizeRole(role)
  if (!normalized) return '/login'
  return (matrix.landings as Record<string, string>)[normalized] || '/dashboard'
}

export const NAV_ITEMS: { label: string; path: string }[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Projects', path: '/projects' },
  { label: 'Map View', path: '/map' },
  { label: 'Corrective Actions', path: '/actions' },
  { label: 'Inspections', path: '/inspections' },
  { label: 'Evidence', path: '/evidence' },
  { label: 'Contractors', path: '/contractors' },
  { label: 'Reports', path: '/reports' },
  { label: 'Risk Analysis', path: '/risk-analysis' },
  { label: 'Citizen Report', path: '/report' },
  { label: 'Admin', path: '/admin' },
]

export function visibleNavItems(role: string | null | undefined) {
  return NAV_ITEMS.filter((item) => canAccessPath(role, item.path))
}

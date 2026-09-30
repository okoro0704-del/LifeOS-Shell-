/** Consumption does not require identity. Authority does. */
export const TRUST_STATES = ['GUEST', 'IDENTIFIED', 'STEP_UP_VERIFIED'] as const;
export type TrustState = typeof TRUST_STATES[number];
export type SpaceCapabilityAccess = 'PUBLIC' | 'IDENTITY_REQUIRED' | 'STEP_UP_REQUIRED';

export const SPACE_CAPABILITY_ACCESS = {
  'space.media': 'PUBLIC', 'space.tv': 'PUBLIC', 'space.radio': 'PUBLIC',
  'space.digipedia.public': 'PUBLIC', 'space.news.public': 'PUBLIC',
  'space.personal.sync': 'IDENTITY_REQUIRED', 'space.private.data': 'IDENTITY_REQUIRED',
  'space.wallet.withdraw': 'STEP_UP_REQUIRED', 'space.studio.publish': 'IDENTITY_REQUIRED',
} as const satisfies Record<string, SpaceCapabilityAccess>;

export function trustStateFor(trustId?: string | null, stepUp = false): TrustState {
  return stepUp ? 'STEP_UP_VERIFIED' : trustId ? 'IDENTIFIED' : 'GUEST';
}

export function canConsumePublicCapability(access: SpaceCapabilityAccess): boolean { return access === 'PUBLIC'; }

/** Product trust names. STEP_UP_REQUIRED is the existing authority class. */
export type ProductTrustLevel = 'PUBLIC' | 'IDENTITY_REQUIRED' | 'AUTHORITY_REQUIRED';

export const PUBLIC_LIFEOS_ENTRY = '/app/personal/post';
const TRUST_RETURN_KEY = 'lifeos.trust.return';

const AUTHORITY_PREFIXES = ['/app/wallet', '/app/shared/identity', '/app/shared/security'];
const IDENTITY_PREFIXES = [
  '/app/profile',
  '/app/messages',
  '/app/notifications',
  '/app/connections',
  '/app/plans',
  '/app/saved',
  '/app/activity',
  '/app/business',
  '/app/shared',
  '/app/shell',
  '/app/serviceos/track',
];

export function productTrustLevel(access: SpaceCapabilityAccess): ProductTrustLevel {
  return access === 'STEP_UP_REQUIRED' ? 'AUTHORITY_REQUIRED' : access;
}

/** Public consumption stays open. Identity and authority are path-scoped. */
export function trustLevelForPath(pathname: string): ProductTrustLevel {
  const path = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  if (AUTHORITY_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return 'AUTHORITY_REQUIRED';
  }
  if (IDENTITY_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return 'IDENTITY_REQUIRED';
  }
  return 'PUBLIC';
}

export function rememberTrustReturn(path: string) {
  if (!path.startsWith('/app') || path.startsWith('//')) return;
  try {
    sessionStorage.setItem(TRUST_RETURN_KEY, path);
  } catch {
    /* private mode */
  }
}

export function consumeTrustReturn(): string | null {
  try {
    const value = sessionStorage.getItem(TRUST_RETURN_KEY);
    sessionStorage.removeItem(TRUST_RETURN_KEY);
    if (!value || !value.startsWith('/app') || value.startsWith('//')) return null;
    return value;
  } catch {
    return null;
  }
}

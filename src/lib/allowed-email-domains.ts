export const ALLOWED_EMAIL_DOMAINS = ['qudox.io', 'test1234.com'] as const

export function isAllowedEmailDomain(email: string): boolean {
  const cleanEmail = email.trim().toLowerCase()
  return ALLOWED_EMAIL_DOMAINS.some((domain) => cleanEmail.endsWith(`@${domain}`))
}

export function allowedEmailDomainsLabel(): string {
  return ALLOWED_EMAIL_DOMAINS.map((domain) => `@${domain}`).join(' o ')
}

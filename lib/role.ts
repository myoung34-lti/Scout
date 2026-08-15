import type { Role } from '@prisma/client'

export const ROLE_LABELS: Record<Role, string> = {
  RECRUITER: 'Recruiter',
}

export const ALL_ROLES = ['RECRUITER'] as const satisfies readonly Role[]

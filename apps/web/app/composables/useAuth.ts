export const useAuthUser = () =>
  useState<{
    id: number
    username: string
    email: string
    avatar_dir: string
    role: 'user' | 'unconfirmed' | 'artist' | 'manager' | 'admin' | 'editor' | 'suspended' | 'banned'
    permissions?: string[]
    email_verified_at?: string | null
    two_factor_method?: 'none' | 'email' | 'totp'
    totp_enabled_at?: string | null
    suspended_until?: string | null
  } | null>('authUser', () => null)
export const useAuthUser = () =>
  useState<{
    id: number
    username: string
    email: string
    avatar_dir: string
    email_verified_at?: string | null
    two_factor_method?: 'none' | 'email' | 'totp'
    totp_enabled_at?: string | null
  } | null>('authUser', () => null)
export const useAuthUser = () =>
  useState<{ id: number; username: string; email: string; avatar_dir: string } | null>('authUser', () => null)
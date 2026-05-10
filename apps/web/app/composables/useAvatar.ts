type AvatarMap = Record<string, string>

type AvatarItem = {
  name: string
  url: string
}

const avatarModules = import.meta.glob('../assets/images/avatars/*.{png,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as AvatarMap

const avatars = Object.entries(avatarModules)
  .map<AvatarItem | null>(([path, url]) => {
    const name = path.split('/').pop()
    return name ? { name, url } : null
  })
  .filter((item): item is AvatarItem => item !== null)

const avatarUrls = Object.fromEntries(avatars.map((avatar) => [avatar.name, avatar.url]))

export const defaultAvatarUrl =
  avatarUrls['default.png'] ?? avatars[0]?.url ?? ''

export function getAvatarUrl(name?: string | null) {
  if (!name) {
    return defaultAvatarUrl
  }
  return avatarUrls[name] ?? defaultAvatarUrl
}

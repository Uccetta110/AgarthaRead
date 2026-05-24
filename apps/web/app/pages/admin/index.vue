<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

type PrivilegedRole = 'admin' | 'manager'

type AdminUserRow = {
  id: number
  email: string
  username: string
  full_name: string
  role: 'user' | 'unconfirmed' | 'artist' | 'manager' | 'admin' | 'editor' | 'suspended' | 'banned'
  country_code: string
  birth_date: string | null
  avatar: string | null
  bio: string | null
  email_verified_at: string | null
  suspended_until: string | null
  created_at: string
  preferences: {
    account_public: number
    lists_public_by_default: number
  }
}

type UsersApiResponse = {
  ok: true
  items: AdminUserRow[]
  page: number
  pageSize: number
  hasMore: boolean
  actor: {
    id: number
    role: PrivilegedRole
  }
}

type SessionResponse = {
  ok: true
  user: {
    id: number
    username: string
    email: string
    avatar_dir: string
    role: PrivilegedRole | 'user' | 'unconfirmed' | 'artist' | 'editor' | 'suspended' | 'banned'
    permissions?: string[]
  }
}

type UserUpdateBody = {
  fullName?: string
  username?: string
  bio?: string | null
  role?: AdminUserRow['role']
  suspendedUntil?: string | null
  emailVerifiedAt?: string | null
  countryCode?: string
  avatarDir?: string
  birthDate?: string
}

type UserCreateBody = {
  email: string
  username: string
  password: string
  fullName: string
  role?: AdminUserRow['role']
  countryCode?: string
  birthDate?: string
  avatarDir?: string
  bio?: string | null
  emailVerifiedAt?: string | null
  suspendedUntil?: string | null
  twoFactorMethod?: 'none' | 'email' | 'totp'
}

type CatalogItemDetail = {
  id: number
  type: string
  source: string
  ageRatingMin: number
  releaseDate: string | null
  publisherId: number | null
  price: string | number
  currency: string
  isbn: string | null
  title: string
  description: string | null
  languageCode: string
  coverUrl: string | null
}

type CatalogItemDetailResponse = {
  ok: true
  item: CatalogItemDetail
}

const authUser = useAuthUser()
const { data: sessionData } = await useFetch<SessionResponse>('/api/auth/me', {
  method: 'POST',
  credentials: 'include',
})

const currentRole = computed(() => sessionData.value?.user.role ?? authUser.value?.role ?? null)
const currentPermissions = computed(() => sessionData.value?.user.permissions ?? authUser.value?.permissions ?? [])

function hasPermission(code: string) {
  return currentRole.value === 'admin' || currentPermissions.value.includes(code)
}

const canAccess = computed(() => currentRole.value === 'admin' || ['AA', 'VU', 'MU', 'EU', 'MI', 'EI', 'EC'].some((code) => hasPermission(code)))
const canViewUsers = computed(() => currentRole.value === 'admin' || hasPermission('AA') || hasPermission('VU') || hasPermission('MU'))
const canEditUsers = computed(() => currentRole.value === 'admin' || hasPermission('MU'))
const canEditItems = computed(() => currentRole.value === 'admin' || hasPermission('MI'))
const canCreateUsers = computed(() => currentRole.value === 'admin')
const canDeleteUsers = computed(() => currentRole.value === 'admin' || hasPermission('EU'))
const canDeleteItems = computed(() => currentRole.value === 'admin' || hasPermission('EI'))
const canDeleteComments = computed(() => currentRole.value === 'admin' || hasPermission('EC'))

const userFilters = reactive({
  q: '',
  role: '',
  page: 1,
  limit: 20,
})

const userRows = ref<AdminUserRow[]>([])
const usersLoading = ref(false)
const usersError = ref('')
const usersHasMore = ref(false)
const usersActorRole = ref<PrivilegedRole | null>(null)

const selectedUserId = ref('')
const selectedUserLookupId = ref('')
const selectedUserMessage = ref('')
const selectedUserError = ref('')
const userSaving = ref(false)
const userDeleting = ref(false)

const userForm = reactive({
  fullName: '',
  username: '',
  bio: '',
  role: 'user' as AdminUserRow['role'],
  suspendedUntil: '',
  emailVerifiedAt: '',
  countryCode: 'IT',
  avatarDir: '',
  birthDate: '',
})

const itemIdToDelete = ref('')
const commentItemId = ref('')
const commentIdToDelete = ref('')
const itemActionMessage = ref('')
const itemActionError = ref('')
const itemActionLoading = ref(false)
const commentActionMessage = ref('')
const commentActionError = ref('')
const commentActionLoading = ref(false)

const createUserMessage = ref('')
const createUserError = ref('')
const createUserLoading = ref(false)
const createUserForm = reactive({
  email: '',
  username: '',
  password: '',
  fullName: '',
  role: 'user' as AdminUserRow['role'],
  countryCode: 'IT',
  birthDate: '',
  avatarDir: '1.png',
  bio: '',
  emailVerifiedAt: true,
  suspendedUntil: '',
  twoFactorMethod: 'none' as 'none' | 'email' | 'totp',
})

const selectedItemId = ref('')
const selectedItemMessage = ref('')
const selectedItemError = ref('')
const itemLookupLoading = ref(false)
const itemSaving = ref(false)
const itemForm = reactive({
  title: '',
  description: '',
  coverUrl: '',
  ageRatingMin: 0,
  languageCode: 'it',
  releaseDate: '',
  publisherId: '',
  price: '0.00',
  currency: 'EUR',
  isbn: '',
})

const roleOptions: Array<{ value: AdminUserRow['role']; label: string }> = [
  { value: 'user', label: 'User' },
  { value: 'unconfirmed', label: 'Da confermare' },
  { value: 'artist', label: 'Artista' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'suspended', label: 'Sospeso' },
  { value: 'banned', label: 'Bannato' },
]

useHead({
  title: 'Moderazione - AgarthaRead',
})

function formatDateTime(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateInputValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function buildSuspensionDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatDateInputValue(date.toISOString())
}

function populateUserForm(user: AdminUserRow) {
  selectedUserId.value = String(user.id)
  selectedUserLookupId.value = String(user.id)
  selectedUserMessage.value = ''
  selectedUserError.value = ''
  userForm.fullName = user.full_name || ''
  userForm.username = user.username || ''
  userForm.bio = user.bio || ''
  userForm.role = user.role
  userForm.suspendedUntil = formatDateInputValue(user.suspended_until)
  userForm.emailVerifiedAt = formatDateInputValue(user.email_verified_at)
  userForm.countryCode = user.country_code || 'IT'
  userForm.avatarDir = user.avatar || ''
  userForm.birthDate = user.birth_date || ''
}

function clearSelectedUserForm() {
  selectedUserId.value = ''
  selectedUserLookupId.value = ''
  selectedUserMessage.value = ''
  selectedUserError.value = ''
  userForm.fullName = ''
  userForm.username = ''
  userForm.bio = ''
  userForm.role = 'user'
  userForm.suspendedUntil = ''
  userForm.emailVerifiedAt = ''
  userForm.countryCode = 'IT'
  userForm.avatarDir = ''
  userForm.birthDate = ''
}

function populateItemForm(item: CatalogItemDetail) {
  selectedItemId.value = String(item.id)
  selectedItemMessage.value = ''
  selectedItemError.value = ''
  itemForm.title = item.title || ''
  itemForm.description = item.description || ''
  itemForm.coverUrl = item.coverUrl || ''
  itemForm.ageRatingMin = item.ageRatingMin || 0
  itemForm.languageCode = item.languageCode || 'it'
  itemForm.releaseDate = item.releaseDate || ''
  itemForm.publisherId = item.publisherId ? String(item.publisherId) : ''
  itemForm.price = String(item.price ?? '0.00')
  itemForm.currency = item.currency || 'EUR'
  itemForm.isbn = item.isbn || ''
}

async function loadUserById() {
  const id = Number(selectedUserLookupId.value)
  if (!Number.isFinite(id) || id <= 0) {
    selectedUserError.value = 'Inserisci un ID utente valido'
    return
  }

  selectedUserMessage.value = ''
  selectedUserError.value = ''

  try {
    const response = await $fetch<{ ok: true; user: AdminUserRow }>(`/api/users/${id}`, {
      method: 'GET',
      credentials: 'include',
    })
    populateUserForm(response.user)
    selectedUserMessage.value = 'Utente caricato.'
  } catch (err: any) {
    selectedUserError.value = err?.data?.statusMessage || 'Impossibile caricare l\'utente'
  }
}

async function loadItemById() {
  const id = Number(selectedItemId.value)
  if (!Number.isFinite(id) || id <= 0) {
    selectedItemError.value = 'Inserisci un ID item valido'
    return
  }

  itemLookupLoading.value = true
  selectedItemMessage.value = ''
  selectedItemError.value = ''

  try {
    const response = await $fetch<CatalogItemDetailResponse>(`/api/catalog/${id}`, {
      method: 'GET',
      credentials: 'include',
    })
    populateItemForm(response.item)
    selectedItemMessage.value = 'Item caricato.'
  } catch (err: any) {
    selectedItemError.value = err?.data?.statusMessage || 'Impossibile caricare l\'item'
  } finally {
    itemLookupLoading.value = false
  }
}

async function loadUsers() {
  if (!canViewUsers.value) {
    userRows.value = []
    usersError.value = 'La tua utenza non ha accesso all\'elenco utenti.'
    return
  }

  usersLoading.value = true
  usersError.value = ''

  try {
    const response = await $fetch<UsersApiResponse>('/api/users', {
      method: 'GET',
      credentials: 'include',
      query: {
        q: userFilters.q || undefined,
        role: userFilters.role || undefined,
        page: userFilters.page,
        limit: userFilters.limit,
      },
    })

    userRows.value = response.items || []
    usersHasMore.value = Boolean(response.hasMore)
    usersActorRole.value = response.actor.role
  } catch (err: any) {
    userRows.value = []
    usersHasMore.value = false
    usersError.value = err?.data?.statusMessage || 'Impossibile caricare gli utenti'
  } finally {
    usersLoading.value = false
  }
}

async function saveUser() {
  if (!canEditUsers.value) {
    selectedUserError.value = 'Non hai i permessi per modificare utenti.'
    return
  }

  selectedUserMessage.value = ''
  selectedUserError.value = ''

  const id = Number(selectedUserId.value)
  if (!Number.isFinite(id) || id <= 0) {
    selectedUserError.value = 'Inserisci un ID utente valido'
    return
  }

  userSaving.value = true
  try {
    const body: UserUpdateBody = {
      fullName: userForm.fullName.trim() || undefined,
      username: userForm.username.trim() || undefined,
      bio: userForm.bio.trim() || null,
      role: currentRole.value === 'admin' ? userForm.role : undefined,
      suspendedUntil: userForm.suspendedUntil || null,
      emailVerifiedAt: userForm.emailVerifiedAt || null,
      countryCode: userForm.countryCode.trim().slice(0, 2).toUpperCase() || 'IT',
      avatarDir: userForm.avatarDir.trim() || undefined,
      birthDate: userForm.birthDate || undefined,
    }

    await $fetch(`/api/users/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      body,
    })

    selectedUserMessage.value = 'Utente aggiornato.'
    await loadUsers()
  } catch (err: any) {
    selectedUserError.value = err?.data?.statusMessage || 'Aggiornamento non riuscito'
  } finally {
    userSaving.value = false
  }
}

async function deleteUser() {
  if (!canDeleteUsers.value) {
    selectedUserError.value = 'Non hai i permessi per eliminare utenti.'
    return
  }

  const id = Number(selectedUserId.value)
  if (!Number.isFinite(id) || id <= 0) {
    selectedUserError.value = 'Inserisci un ID utente valido'
    return
  }

  if (!window.confirm(`Eliminare l'utente #${id}?`)) return

  userDeleting.value = true
  selectedUserError.value = ''
  selectedUserMessage.value = ''

  try {
    await $fetch(`/api/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    selectedUserMessage.value = 'Utente eliminato.'
    clearSelectedUserForm()
    await loadUsers()
  } catch (err: any) {
    selectedUserError.value = err?.data?.statusMessage || 'Eliminazione non riuscita'
  } finally {
    userDeleting.value = false
  }
}

async function suspendForDays(days: number) {
  userForm.role = 'suspended'
  userForm.suspendedUntil = buildSuspensionDate(days)
  await saveUser()
}

async function banUser() {
  userForm.role = 'banned'
  userForm.suspendedUntil = ''
  await saveUser()
}

async function restoreUser() {
  const selectedUser = userRows.value.find((user) => user.id === Number(selectedUserId.value))
  userForm.role = selectedUser?.email_verified_at ? 'user' : 'unconfirmed'
  userForm.suspendedUntil = ''
  await saveUser()
}

async function deleteCatalogItem() {
  if (!canDeleteItems.value) {
    itemActionError.value = 'Non hai i permessi per eliminare item.'
    return
  }

  itemActionMessage.value = ''
  itemActionError.value = ''
  const id = Number(itemIdToDelete.value)
  if (!Number.isFinite(id) || id <= 0) {
    itemActionError.value = 'ID item non valido'
    return
  }

  if (!window.confirm(`Eliminare l'item #${id}?`)) return

  itemActionLoading.value = true
  try {
    await $fetch(`/api/catalog/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    itemActionMessage.value = 'Item eliminato.'
    itemIdToDelete.value = ''
  } catch (err: any) {
    itemActionError.value = err?.data?.statusMessage || 'Eliminazione item non riuscita'
  } finally {
    itemActionLoading.value = false
  }
}

async function saveItem() {
  if (!canEditItems.value) {
    selectedItemError.value = 'Non hai i permessi per modificare item.'
    return
  }

  const id = Number(selectedItemId.value)
  if (!Number.isFinite(id) || id <= 0) {
    selectedItemError.value = 'Inserisci un ID item valido'
    return
  }

  itemSaving.value = true
  selectedItemMessage.value = ''
  selectedItemError.value = ''

  try {
    await $fetch(`/api/catalog/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        title: itemForm.title,
        description: itemForm.description,
        coverUrl: itemForm.coverUrl || null,
        ageRatingMin: Number(itemForm.ageRatingMin),
        languageCode: itemForm.languageCode,
        releaseDate: itemForm.releaseDate || null,
        publisherId: itemForm.publisherId ? Number(itemForm.publisherId) : null,
        price: itemForm.price,
        currency: itemForm.currency,
        isbn: itemForm.isbn || null,
      },
    })
    selectedItemMessage.value = 'Item aggiornato.'
  } catch (err: any) {
    selectedItemError.value = err?.data?.statusMessage || 'Aggiornamento item non riuscito'
  } finally {
    itemSaving.value = false
  }
}

function clearCreateUserForm() {
  createUserForm.email = ''
  createUserForm.username = ''
  createUserForm.password = ''
  createUserForm.fullName = ''
  createUserForm.role = 'user'
  createUserForm.countryCode = 'IT'
  createUserForm.birthDate = ''
  createUserForm.avatarDir = '1.png'
  createUserForm.bio = ''
  createUserForm.emailVerifiedAt = true
  createUserForm.suspendedUntil = ''
  createUserForm.twoFactorMethod = 'none'
}

async function createAdminUser() {
  if (!canCreateUsers.value) {
    createUserError.value = 'Non hai i permessi per creare utenti.'
    return
  }

  createUserMessage.value = ''
  createUserError.value = ''

  if (!createUserForm.email || !createUserForm.username || !createUserForm.password || !createUserForm.fullName || !createUserForm.birthDate) {
    createUserError.value = 'Compila i campi obbligatori.'
    return
  }

  createUserLoading.value = true
  try {
    const response = await $fetch<{ ok: true; user: AdminUserRow }>('/api/admin/users', {
      method: 'POST',
      credentials: 'include',
      body: {
        email: createUserForm.email.trim(),
        username: createUserForm.username.trim(),
        password: createUserForm.password,
        fullName: createUserForm.fullName.trim(),
        role: createUserForm.role,
        countryCode: createUserForm.countryCode.trim().slice(0, 2).toUpperCase() || 'IT',
        birthDate: createUserForm.birthDate,
        avatarDir: createUserForm.avatarDir.trim() || '1.png',
        bio: createUserForm.bio.trim() || null,
        emailVerifiedAt: createUserForm.emailVerifiedAt ? new Date().toISOString() : null,
        suspendedUntil: createUserForm.suspendedUntil || null,
        twoFactorMethod: createUserForm.twoFactorMethod,
      },
    })

    createUserMessage.value = `Utente creato: #${response.user.id}`
    clearCreateUserForm()
    await loadUsers()
  } catch (err: any) {
    createUserError.value = err?.data?.statusMessage || 'Creazione utente non riuscita'
  } finally {
    createUserLoading.value = false
  }
}

async function deleteComment() {
  if (!canDeleteComments.value) {
    commentActionError.value = 'Non hai i permessi per eliminare commenti.'
    return
  }

  commentActionMessage.value = ''
  commentActionError.value = ''
  const itemId = Number(commentItemId.value)
  const id = Number(commentIdToDelete.value)
  if (!Number.isFinite(itemId) || itemId <= 0) {
    commentActionError.value = 'ID item non valido'
    return
  }

  if (!Number.isFinite(id) || id <= 0) {
    commentActionError.value = 'ID commento non valido'
    return
  }

  if (!window.confirm(`Eliminare il commento #${id} dall'item #${itemId}?`)) return

  commentActionLoading.value = true
  try {
    await $fetch(`/api/catalog/${itemId}/comments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    commentActionMessage.value = 'Commento eliminato.'
    commentItemId.value = ''
    commentIdToDelete.value = ''
  } catch (err: any) {
    commentActionError.value = err?.data?.statusMessage || 'Eliminazione commento non riuscita'
  } finally {
    commentActionLoading.value = false
  }
}

watch(
  () => [userFilters.q, userFilters.role, userFilters.page, userFilters.limit],
  () => {
    void loadUsers()
  },
  { immediate: true },
)
</script>

<template>
  <section class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.15),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.12),_transparent_25%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] dark:text-slate-100">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div class="mb-8 grid gap-4 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
        <div>
          <p class="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Area moderazione</p>
          <h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Console admin / manager</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Gestisci utenti, stati account, item catalogo e commenti da un unico pannello.
            Le azioni restano soggette ai permessi backend assegnati al tuo account.
          </p>
        </div>

        <div class="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-slate-500 dark:text-slate-400">Account attivo</span>
            <span
              class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              :class="authUser?.role === 'admin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'"
            >
              {{ authUser?.role ?? 'guest' }}
            </span>
          </div>
          <p class="text-sm text-slate-600 dark:text-slate-300">
            <span v-if="authUser?.role === 'admin'">Accesso completo alle operazioni di moderazione.</span>
            <span v-else>Accesso manager con validazione lato server sui permessi granulari.</span>
          </p>
        </div>
      </div>

      <div v-if="!canAccess" class="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100">
        Non hai i privilegi necessari per accedere a questa area.
      </div>

      <div v-else class="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div v-if="canViewUsers" class="space-y-6">
          <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 class="text-xl font-semibold">Directory utenti</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">Cerca un utente, apri la scheda e applica sospensioni o banni.</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <input v-model="userFilters.q" type="search" placeholder="Cerca username, nome o email" class="min-w-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                <select v-model="userFilters.role" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <option value="">Tutti i ruoli</option>
                  <option v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
            </div>

            <div v-if="usersError" class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              {{ usersError }}
            </div>

            <div v-else-if="usersLoading" class="mt-4 text-sm text-slate-500 dark:text-slate-400">Caricamento utenti...</div>

            <div v-else class="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table class="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                <thead class="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th class="px-4 py-3">ID</th>
                    <th class="px-4 py-3">Utente</th>
                    <th class="px-4 py-3">Ruolo</th>
                    <th class="px-4 py-3">Stato</th>
                    <th class="px-4 py-3">Azioni</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                  <tr v-for="row in userRows" :key="row.id" class="align-top">
                    <td class="px-4 py-4 font-medium">#{{ row.id }}</td>
                    <td class="px-4 py-4">
                      <div class="font-medium">{{ row.username }}</div>
                      <div class="text-xs text-slate-500 dark:text-slate-400">{{ row.email }}</div>
                      <div class="text-xs text-slate-500 dark:text-slate-400">{{ row.full_name }}</div>
                    </td>
                    <td class="px-4 py-4">
                      <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" :class="row.role === 'banned' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : row.role === 'suspended' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200'">
                        {{ row.role }}
                      </span>
                    </td>
                    <td class="px-4 py-4 text-xs text-slate-600 dark:text-slate-300">
                      <div>Privato: {{ row.preferences.account_public ? 'no' : 'sì' }}</div>
                      <div>Liste private default: {{ row.preferences.lists_public_by_default ? 'no' : 'sì' }}</div>
                      <div>Sospeso fino: {{ formatDateTime(row.suspended_until) }}</div>
                    </td>
                    <td class="px-4 py-4">
                      <div class="flex flex-wrap gap-2">
                        <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" @click="populateUserForm(row)">Apri</button>
                        <button v-if="canEditUsers" type="button" class="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40" @click="() => { populateUserForm(row); userForm.role = 'suspended'; userForm.suspendedUntil = buildSuspensionDate(7); }">Sospendi 7g</button>
                        <button v-if="canDeleteUsers" type="button" class="rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40" @click="() => { populateUserForm(row); userForm.role = 'banned'; userForm.suspendedUntil = ''; }">Banna</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
              <div>Pagina {{ userFilters.page }} · {{ userRows.length }} utenti mostrati</div>
              <div class="flex gap-2">
                <button type="button" class="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200" :disabled="userFilters.page <= 1 || usersLoading" @click="userFilters.page = Math.max(1, userFilters.page - 1)">Precedente</button>
                <button type="button" class="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200" :disabled="!usersHasMore || usersLoading" @click="userFilters.page += 1">Successiva</button>
              </div>
            </div>
          </section>

          <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 class="text-xl font-semibold">Scheda utente</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">Modifica ruolo, stato e dati base dell'utente selezionato.</p>
              </div>
              <div class="text-sm text-slate-500 dark:text-slate-400">ID selezionato: <span class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedUserId || 'nessuno' }}</span></div>
            </div>

            <div v-if="canEditUsers" class="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Carica utente per ID</span>
                <input v-model="selectedUserLookupId" type="number" min="1" placeholder="ID utente" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <div class="flex items-end">
                <button type="button" class="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" :disabled="selectedUserLookupId === ''" @click="loadUserById">Carica</button>
              </div>
            </div>

            <div v-if="canEditUsers" class="mt-5 grid gap-4 sm:grid-cols-2">
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Nome completo</span>
                <input v-model="userForm.fullName" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Username</span>
                <input v-model="userForm.username" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Email verificata il</span>
                <input v-model="userForm.emailVerifiedAt" type="datetime-local" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm sm:col-span-2">
                <span class="font-medium text-slate-600 dark:text-slate-300">Biografia</span>
                <textarea v-model="userForm.bio" rows="4" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"></textarea>
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Ruolo</span>
                <select v-model="userForm.role" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <option v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Suspended until</span>
                <input v-model="userForm.suspendedUntil" type="datetime-local" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Country code</span>
                <input v-model="userForm.countryCode" type="text" maxlength="2" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Avatar dir</span>
                <input v-model="userForm.avatarDir" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Birth date</span>
                <input v-model="userForm.birthDate" type="date" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
            </div>

            <div v-if="canEditUsers || canDeleteUsers" class="mt-5 flex flex-wrap gap-3">
              <button type="button" class="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" :disabled="userSaving" @click="saveUser">{{ userSaving ? 'Salvataggio...' : 'Salva utente' }}</button>
              <button v-if="canEditUsers" type="button" class="rounded-full border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40" @click="suspendForDays(7)">Sospendi 7 giorni</button>
              <button v-if="canEditUsers" type="button" class="rounded-full border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40" @click="suspendForDays(30)">Sospendi 30 giorni</button>
              <button v-if="canEditUsers" type="button" class="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" @click="restoreUser">Ripristina</button>
              <button v-if="canEditUsers" type="button" class="rounded-full border border-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40" @click="banUser">Banna</button>
              <button v-if="canDeleteUsers" type="button" class="rounded-full border border-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40" :disabled="userDeleting" @click="deleteUser">{{ userDeleting ? 'Eliminazione...' : 'Elimina utente' }}</button>
            </div>

            <div v-else class="mt-5 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Non hai permessi di modifica su utenti. Questa scheda è in sola lettura.
            </div>

            <p v-if="selectedUserMessage" class="mt-4 text-sm text-emerald-700 dark:text-emerald-300">{{ selectedUserMessage }}</p>
            <p v-if="selectedUserError" class="mt-4 text-sm text-rose-700 dark:text-rose-300">{{ selectedUserError }}</p>
          </section>
        </div>

        <div class="space-y-6">
          <section v-if="canDeleteItems || canDeleteComments" class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
            <h2 class="text-xl font-semibold">Azioni rapide</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Elimina item catalogo e commenti usando il loro ID.</p>

            <div v-if="canDeleteItems" class="mt-4 space-y-4">
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Item ID</span>
                <input v-model="itemIdToDelete" type="number" min="1" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <button type="button" class="w-full rounded-full border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40" :disabled="itemActionLoading" @click="deleteCatalogItem">{{ itemActionLoading ? 'Eliminazione item...' : 'Elimina item' }}</button>
              <p v-if="itemActionMessage" class="text-sm text-emerald-700 dark:text-emerald-300">{{ itemActionMessage }}</p>
              <p v-if="itemActionError" class="text-sm text-rose-700 dark:text-rose-300">{{ itemActionError }}</p>
            </div>

            <div v-if="canDeleteComments" class="mt-6 space-y-4">
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Item ID del commento</span>
                <input v-model="commentItemId" type="number" min="1" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Comment ID</span>
                <input v-model="commentIdToDelete" type="number" min="1" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <button type="button" class="w-full rounded-full border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40" :disabled="commentActionLoading" @click="deleteComment">{{ commentActionLoading ? 'Eliminazione commento...' : 'Elimina commento' }}</button>
              <p v-if="commentActionMessage" class="text-sm text-emerald-700 dark:text-emerald-300">{{ commentActionMessage }}</p>
              <p v-if="commentActionError" class="text-sm text-rose-700 dark:text-rose-300">{{ commentActionError }}</p>
            </div>

            <div v-if="!canDeleteItems && !canDeleteComments" class="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Nessuna azione rapida disponibile per il tuo profilo.
            </div>
          </section>

          <section v-if="canEditItems" class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 class="text-xl font-semibold">Editor item</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">Carica un item per ID e aggiorna i campi editoriali consentiti dal permesso MI.</p>
              </div>
              <div class="text-sm text-slate-500 dark:text-slate-400">ID selezionato: <span class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedItemId || 'nessuno' }}</span></div>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Carica item per ID</span>
                <input v-model="selectedItemId" type="number" min="1" placeholder="ID item" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <div class="flex items-end">
                <button type="button" class="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" :disabled="itemLookupLoading" @click="loadItemById">{{ itemLookupLoading ? 'Caricamento...' : 'Carica item' }}</button>
              </div>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <label class="space-y-2 text-sm sm:col-span-2">
                <span class="font-medium text-slate-600 dark:text-slate-300">Titolo</span>
                <input v-model="itemForm.title" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm sm:col-span-2">
                <span class="font-medium text-slate-600 dark:text-slate-300">Descrizione</span>
                <textarea v-model="itemForm.description" rows="4" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"></textarea>
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Cover URL</span>
                <input v-model="itemForm.coverUrl" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Lingua</span>
                <input v-model="itemForm.languageCode" type="text" maxlength="8" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Release date</span>
                <input v-model="itemForm.releaseDate" type="date" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Age rating min</span>
                <input v-model="itemForm.ageRatingMin" type="number" min="0" max="18" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Publisher ID</span>
                <input v-model="itemForm.publisherId" type="number" min="1" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Price</span>
                <input v-model="itemForm.price" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Currency</span>
                <input v-model="itemForm.currency" type="text" maxlength="3" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm sm:col-span-2">
                <span class="font-medium text-slate-600 dark:text-slate-300">ISBN</span>
                <input v-model="itemForm.isbn" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
            </div>

            <div class="mt-5 flex flex-wrap gap-3">
              <button type="button" class="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" :disabled="itemSaving" @click="saveItem">{{ itemSaving ? 'Salvataggio...' : 'Salva item' }}</button>
            </div>

            <p v-if="selectedItemMessage" class="mt-4 text-sm text-emerald-700 dark:text-emerald-300">{{ selectedItemMessage }}</p>
            <p v-if="selectedItemError" class="mt-4 text-sm text-rose-700 dark:text-rose-300">{{ selectedItemError }}</p>
          </section>

          <section v-if="canCreateUsers" class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 class="text-xl font-semibold">Crea utente</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">Solo admin: inserisci ogni attributo e conferma subito l'email.</p>
              </div>
              <div class="text-sm text-slate-500 dark:text-slate-400">RUOLO admin</div>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Email</span>
                <input v-model="createUserForm.email" type="email" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Username</span>
                <input v-model="createUserForm.username" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Password</span>
                <input v-model="createUserForm.password" type="password" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Nome completo</span>
                <input v-model="createUserForm.fullName" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Ruolo iniziale</span>
                <select v-model="createUserForm.role" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <option v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Data nascita</span>
                <input v-model="createUserForm.birthDate" type="date" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Country code</span>
                <input v-model="createUserForm.countryCode" type="text" maxlength="2" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm">
                <span class="font-medium text-slate-600 dark:text-slate-300">Avatar dir</span>
                <input v-model="createUserForm.avatarDir" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>
              <label class="space-y-2 text-sm sm:col-span-2">
                <span class="font-medium text-slate-600 dark:text-slate-300">Biografia</span>
                <textarea v-model="createUserForm.bio" rows="3" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"></textarea>
              </label>
              <label class="space-y-2 text-sm sm:col-span-2">
                <span class="font-medium text-slate-600 dark:text-slate-300">Email verificata subito</span>
                <select v-model="createUserForm.emailVerifiedAt" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <option :value="true">Sì</option>
                  <option :value="false">No</option>
                </select>
              </label>
            </div>

            <div class="mt-5 flex flex-wrap gap-3">
              <button type="button" class="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" :disabled="createUserLoading" @click="createAdminUser">{{ createUserLoading ? 'Creazione...' : 'Crea utente' }}</button>
              <button type="button" class="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" @click="clearCreateUserForm">Reset</button>
            </div>

            <p v-if="createUserMessage" class="mt-4 text-sm text-emerald-700 dark:text-emerald-300">{{ createUserMessage }}</p>
            <p v-if="createUserError" class="mt-4 text-sm text-rose-700 dark:text-rose-300">{{ createUserError }}</p>
          </section>

          <section class="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
            <h2 class="text-xl font-semibold">Note operative</h2>
            <ul class="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>• Gli utenti <span class="font-semibold">suspended</span> vengono convertiti in liste private e non possono modificare le proprie liste.</li>
              <li>• Gli utenti <span class="font-semibold">banned</span> vengono esclusi dal login e dalle sessioni attive.</li>
              <li>• La visibilità dell'elenco utenti dipende dal permesso backend del manager.</li>
              <li>• Le azioni mostrate a schermo seguono i permessi effettivi della sessione, non solo il ruolo.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>

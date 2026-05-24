<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
const themeManager = useThemePreference();

type SettingsResponse = {
  ok: true;
  user: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    birth_date: string | null;
    email_verified_at: string | null;
    two_factor_method: "none" | "email" | "totp";
    totp_enabled_at: string | null;
    bio?: string | null;
  };
  preferences: {
    theme: string | null;
    font_size: number | null;
    ui_language: string | null;
    image_size?: string | null;
    account_public?: number | null;
    lists_public_by_default?: number | null;
  };
};

const authUser = useAuthUser();

const form = reactive({
  fullName: "",
  birthDate: "",
  theme: "light",
  fontSize: 16,
  uiLanguage: "it",
  imageSize: "medium",
  accountPublic: 1,
  listsPublicByDefault: 0,
  bio: "",
});

const twoFactorMethod = ref<"none" | "email" | "totp">("none");
const emailVerifiedAt = ref<string | null>(null);
const totpEnabledAt = ref<string | null>(null);

const settingsMessage = ref("");
const settingsError = ref("");

const emailOtp = ref("");
const emailOtpMessage = ref("");
const emailOtpError = ref("");

const twoFactorMessage = ref("");
const twoFactorError = ref("");

const totpSecret = ref("");
const totpQrCode = ref("");
const totpCode = ref("");

const {
  data: settingsData,
  pending: settingsPending,
  refresh: refreshSettings,
} = await useFetch<SettingsResponse>("/api/profile/settings", {
  method: "GET",
  credentials: "include",
});

watch(
  settingsData,
  (value) => {
    if (!value?.ok) return;

    form.fullName = value.user.full_name ?? "";
    form.birthDate = value.user.birth_date ?? "";
    form.theme = value.preferences.theme ?? "light";
    form.fontSize = value.preferences.font_size ?? 16;
    form.uiLanguage = value.preferences.ui_language ?? "it";
    form.imageSize = value.preferences.image_size ?? "medium";
    form.accountPublic = value.preferences.account_public ?? 1;
    form.listsPublicByDefault = value.preferences.lists_public_by_default ?? 0;
    form.bio = value.user.bio ?? "";
    twoFactorMethod.value = value.user.two_factor_method ?? "none";
    emailVerifiedAt.value = value.user.email_verified_at ?? null;
    totpEnabledAt.value = value.user.totp_enabled_at ?? null;
  },
  { immediate: true },
);

const isEmailVerified = computed(() => !!emailVerifiedAt.value);

function syncAuthUser(partial: {
  email_verified_at?: string | null;
  two_factor_method?: "none" | "email" | "totp";
  totp_enabled_at?: string | null;
}) {
  if (!authUser.value) return;
  authUser.value = {
    ...authUser.value,
    email_verified_at:
      partial.email_verified_at ?? authUser.value.email_verified_at ?? null,
    two_factor_method:
      partial.two_factor_method ?? authUser.value.two_factor_method ?? "none",
    totp_enabled_at:
      partial.totp_enabled_at ?? authUser.value.totp_enabled_at ?? null,
  };
}

async function saveSettings() {
  settingsMessage.value = "";
  settingsError.value = "";

  try {
    const response = await $fetch("/api/profile/settings", {
      method: "POST",
      credentials: "include",
      body: {
        fullName: form.fullName,
        birthDate: form.birthDate,
        theme: form.theme,
        fontSize: form.fontSize,
        uiLanguage: form.uiLanguage,
        imageSize: form.imageSize,
        accountPublic: Number(form.accountPublic),
        listsPublicByDefault: Number(form.listsPublicByDefault),
        bio: form.bio,
      },
    });

    settingsMessage.value = "Impostazioni salvate.";
    themeManager.setTheme(form.theme === "dark" ? "dark" : "light");
    if (import.meta.client) {
      document.documentElement.style.fontSize = `${form.fontSize}px`;
    }
    await refreshSettings();
    return response;
  } catch (err: any) {
    settingsError.value =
      err?.data?.statusMessage || "Salvataggio non riuscito";
  }
}

async function requestEmailOtp() {
  emailOtpMessage.value = "";
  emailOtpError.value = "";

  try {
    await $fetch("/api/auth/email/verify/request", {
      method: "POST",
      credentials: "include",
    });
    emailOtpMessage.value = "Codice inviato alla tua email.";
  } catch (err: any) {
    emailOtpError.value =
      err?.data?.statusMessage || "Invio codice non riuscito";
  }
}

async function confirmEmailOtp() {
  emailOtpMessage.value = "";
  emailOtpError.value = "";

  try {
    const response = await $fetch<{ ok: true; email_verified_at: string }>(
      "/api/auth/email/verify/confirm",
      {
        method: "POST",
        credentials: "include",
        body: { code: emailOtp.value },
      },
    );

    emailVerifiedAt.value = response.email_verified_at;
    syncAuthUser({ email_verified_at: response.email_verified_at });
    emailOtpMessage.value = "Email verificata con successo.";
    emailOtp.value = "";
  } catch (err: any) {
    emailOtpError.value = err?.data?.statusMessage || "Codice non valido";
  }
}

async function setTwoFactorMethod(method: "none" | "email") {
  twoFactorMessage.value = "";
  twoFactorError.value = "";

  try {
    const response = await $fetch<{
      ok: true;
      two_factor_method: "none" | "email";
    }>("/api/auth/2fa/method", {
      method: "POST",
      credentials: "include",
      body: { method },
    });
    twoFactorMethod.value = response.two_factor_method;
    syncAuthUser({
      two_factor_method: response.two_factor_method,
      totp_enabled_at: null,
    });
    twoFactorMessage.value = "Metodo 2FA aggiornato.";
  } catch (err: any) {
    twoFactorError.value =
      err?.data?.statusMessage || "Aggiornamento non riuscito";
  }
}

async function setupTotp() {
  twoFactorMessage.value = "";
  twoFactorError.value = "";

  try {
    const response = await $fetch<{
      ok: true;
      qrCodeDataUrl: string;
      secret: string;
    }>("/api/auth/2fa/totp/setup", {
      method: "POST",
      credentials: "include",
    });
    totpSecret.value = response.secret;
    totpQrCode.value = response.qrCodeDataUrl;
  } catch (err: any) {
    twoFactorError.value =
      err?.data?.statusMessage || "Configurazione non riuscita";
  }
}

async function confirmTotp() {
  twoFactorMessage.value = "";
  twoFactorError.value = "";

  try {
    const response = await $fetch<{
      ok: true;
      two_factor_method: "totp";
      totp_enabled_at: string;
    }>("/api/auth/2fa/totp/confirm", {
      method: "POST",
      credentials: "include",
      body: { code: totpCode.value },
    });
    twoFactorMethod.value = response.two_factor_method;
    totpEnabledAt.value = response.totp_enabled_at;
    syncAuthUser({
      two_factor_method: response.two_factor_method,
      totp_enabled_at: response.totp_enabled_at,
    });
    twoFactorMessage.value = "2FA con app attivata.";
    totpCode.value = "";
  } catch (err: any) {
    twoFactorError.value = err?.data?.statusMessage || "Codice non valido";
  }
}
</script>

<template>
  <section
    class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-sky-100 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100"
  >
    <div class="mx-auto max-w-5xl px-4 py-10">
      <header class="mb-8">
        <p
          class="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"
        >
          Profilo
        </p>
        <h1 class="mt-2 text-3xl font-serif font-semibold">
          Impostazioni account
        </h1>
        <p class="mt-2 text-slate-600 dark:text-slate-300">
          Completa il profilo, verifica l'email e scegli il tipo di 2FA.
        </p>
      </header>

      <div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div class="space-y-6">
          <div
            class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
          >
            <h2 class="text-lg font-semibold">Dati personali</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Aggiorna i dati richiesti dal profilo.
            </p>

            <div class="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  class="text-sm font-medium text-slate-600 dark:text-slate-300"
                  >Nome completo</label
                >
                <input
                  v-model="form.fullName"
                  type="text"
                  class="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label
                  class="text-sm font-medium text-slate-600 dark:text-slate-300"
                  >Data di nascita</label
                >
                <input
                  v-model="form.birthDate"
                  type="date"
                  class="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </div>
            </div>
            <div class="mt-4">
              <label
                class="text-sm font-medium text-slate-600 dark:text-slate-300"
                >Biografia</label
              >
              <textarea
                v-model="form.bio"
                rows="4"
                class="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
                placeholder="Racconta qualcosa di te..."
              ></textarea>
            </div>
          </div>

          <div
            class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
          >
            <h2 class="text-lg font-semibold">Preferenze di lettura</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Personalizza tema, lingua e dimensione testo.
            </p>

            <div class="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  class="text-sm font-medium text-slate-600 dark:text-slate-300"
                  >Tema</label
                >
                <select
                  v-model="form.theme"
                  class="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-500"
                >
                  <option value="light">Chiaro</option>
                  <option value="dark">Scuro</option>
                </select>
              </div>
              <div>
                <label
                  class="text-sm font-medium text-slate-600 dark:text-slate-300"
                  >Lingua UI</label
                >
                <select
                  v-model="form.uiLanguage"
                  class="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-500"
                >
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="es">Espanol</option>
                </select>
              </div>
              <div>
                <label
                  class="text-sm font-medium text-slate-600 dark:text-slate-300"
                  >Dimensione testo</label
                >
                <input
                  v-model.number="form.fontSize"
                  type="number"
                  min="12"
                  max="28"
                  class="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label
                  class="text-sm font-medium text-slate-600 dark:text-slate-300"
                  >Dimensione immagini</label
                >
                <select
                  v-model="form.imageSize"
                  class="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-500"
                >
                  <option value="small">Piccola</option>
                  <option value="medium">Media</option>
                  <option value="large">Grande</option>
                </select>
              </div>
            </div>

            <div class="mt-4 space-y-2">
              <label
                class="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
              >
                <input
                  type="checkbox"
                  v-model="form.accountPublic"
                  :true-value="1"
                  :false-value="0"
                  class="w-4 h-4"
                />
                <span>Account pubblico (visibile nelle ricerche)</span>
              </label>
              <label
                class="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
              >
                <input
                  type="checkbox"
                  v-model="form.listsPublicByDefault"
                  :true-value="1"
                  :false-value="0"
                  class="w-4 h-4"
                />
                <span>Liste pubbliche di default</span>
              </label>
            </div>

            <div class="mt-6 flex items-center gap-3">
              <button
                type="button"
                :disabled="settingsPending"
                @click="saveSettings"
                class="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Salva impostazioni
              </button>
              <span v-if="settingsMessage" class="text-sm text-emerald-700">{{
                settingsMessage
              }}</span>
              <span v-if="settingsError" class="text-sm text-rose-700">{{
                settingsError
              }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div
            class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
          >
            <h2 class="text-lg font-semibold">Verifica email</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{
                isEmailVerified
                  ? "Email verificata."
                  : "Conferma la tua email con un codice OTP."
              }}
            </p>

            <div class="mt-4 flex items-center gap-2 text-sm">
              <span
                class="inline-flex items-center rounded-full px-3 py-1"
                :class="
                  isEmailVerified
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                "
              >
                {{ isEmailVerified ? "Verificata" : "Da verificare" }}
              </span>
              <span
                v-if="emailVerifiedAt"
                class="text-slate-500 dark:text-slate-400"
                >{{ emailVerifiedAt }}</span
              >
            </div>

            <div v-if="!isEmailVerified" class="mt-5 space-y-3">
              <button
                type="button"
                @click="requestEmailOtp"
                class="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Invia codice
              </button>

              <input
                v-model="emailOtp"
                type="text"
                placeholder="Codice OTP"
                class="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
              />

              <button
                type="button"
                @click="confirmEmailOtp"
                class="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Verifica email
              </button>

              <p v-if="emailOtpMessage" class="text-sm text-emerald-700">
                {{ emailOtpMessage }}
              </p>
              <p v-if="emailOtpError" class="text-sm text-rose-700">
                {{ emailOtpError }}
              </p>
            </div>
          </div>

          <div
            class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
          >
            <h2 class="text-lg font-semibold">Autenticazione a due fattori</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Scegli tra email o app di autenticazione gratuita.
            </p>

            <div class="mt-4 space-y-2">
              <button
                type="button"
                @click="setTwoFactorMethod('none')"
                class="w-full rounded-full border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                :class="
                  twoFactorMethod === 'none'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                    : ''
                "
              >
                Nessuna 2FA
              </button>
              <button
                type="button"
                @click="setTwoFactorMethod('email')"
                class="w-full rounded-full border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                :class="
                  twoFactorMethod === 'email'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                    : ''
                "
              >
                2FA via email
              </button>
              <div
                class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/70"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-semibold">App di autenticazione</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                      Google Authenticator, Microsoft Authenticator, Authy.
                    </p>
                  </div>
                  <button
                    type="button"
                    @click="setupTotp"
                    class="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Genera QR
                  </button>
                </div>

                <div v-if="totpQrCode" class="mt-4 space-y-3">
                  <img
                    :src="totpQrCode"
                    alt="QR TOTP"
                    class="h-40 w-40 rounded-xl bg-white p-2 dark:bg-slate-100"
                  />
                  <p class="text-xs text-slate-500 dark:text-slate-400">
                    Codice manuale: {{ totpSecret }}
                  </p>
                  <input
                    v-model="totpCode"
                    type="text"
                    placeholder="Codice app"
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
                  />
                  <button
                    type="button"
                    @click="confirmTotp"
                    class="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                  >
                    Attiva 2FA app
                  </button>
                </div>
              </div>
            </div>

            <p
              v-if="twoFactorMessage"
              class="mt-3 text-sm text-emerald-700 dark:text-emerald-300"
            >
              {{ twoFactorMessage }}
            </p>
            <p
              v-if="twoFactorError"
              class="mt-3 text-sm text-rose-700 dark:text-rose-300"
            >
              {{ twoFactorError }}
            </p>
            <p
              v-if="totpEnabledAt"
              class="mt-2 text-xs text-slate-500 dark:text-slate-400"
            >
              Attivo dal: {{ totpEnabledAt }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

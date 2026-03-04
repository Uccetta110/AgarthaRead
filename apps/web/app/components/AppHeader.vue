<template>
    <header class="bg-gray-800 text-white">
        <div class="grid w-full grid-cols-[1fr_minmax(320px,560px)_1fr] items-center gap-6 px-2 py-4">
            <NuxtLink to="/" class="justify-self-start pl-2 text-2xl font-bold tracking-tight">AgarthaRead</NuxtLink>

            <div class="w-full justify-self-center">
                <label for="header-search" class="sr-only">Cerca</label>
                <input
                    id="header-search"
                    type="text"
                    placeholder="Cerca libri, manga, giornali..."
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                />
            </div>

            <nav class="flex justify-self-end items-center gap-4 pr-2">
                <NuxtLink to="/" class="text-sm text-gray-200 hover:text-white">Home</NuxtLink>
                <NuxtLink to="/auth/login" class="text-sm text-gray-200 hover:text-white">Login</NuxtLink>
                <NuxtLink
                    to="/auth/register"
                    class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                    Sign Up
                </NuxtLink>
            </nav>
        </div>
    </header>
</template>
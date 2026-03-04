<template>
  <div class="flex h-screen items-center justify-center">
    <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
      <h2 class="mb-6 text-center text-2xl font-bold">Sign up</h2>
      <form >
                <div class="mb-4">
          <label for="name" class="mb-2 block text-sm font-medium text-gray-700">Name</label>
          <input
           
            type="text"
            id="name"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
        <div class="mb-4">
          <label for="email" class="mb-2 block text-sm font-medium text-gray-700">Email</label>
          <input
           
            type="email"
            id="email"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
        <div class="mb-6">
          <label for="password" class="mb-2 block text-sm font-medium text-gray-700">Password</label>
          <input
            
            type="password"
            id="password"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
        <button
          type="submit"
          class="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none"
        >
          Sign Up
        </button>
      </form>
    </div>
  </div>
</template>
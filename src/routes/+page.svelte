<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { Button } from "$components/shadcn-svelte/button";
  import { Input } from "$components/shadcn-svelte/input";
  import { setMode } from "mode-watcher";

  let name = $state("");
  let greetMsg = $state("");

  async function greet(event: Event) {
    event.preventDefault();
    greetMsg = await invoke("greet", { name });
  }

  async function switchMode(mode: "system" | "light" | "dark") {
    setMode(mode);
  }
</script>

<main class="flex h-screen w-screen flex-col items-center justify-center gap-4">
  <h1 class="text-3xl font-medium">Welcome to Tauri + Svelte</h1>

  <div class="flex flex-row items-center justify-center gap-2">
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="size-24" alt="Vite Logo" />
    </a>
    <a href="https://tauri.app" target="_blank">
      <img src="/tauri.svg" class="size-24" alt="Tauri Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank">
      <img src="/svelte.svg" class="size-24" alt="SvelteKit Logo" />
    </a>
  </div>

  <p class="text-xl font-normal">Click on the Tauri, Vite, and SvelteKit logos to learn more.</p>

  <div class="flex flex-row gap-2">
    <Button type="button" class="min-w-18" onclick={() => switchMode("system")}>System</Button>
    <Button type="button" class="min-w-18" onclick={() => switchMode("light")}>Light</Button>
    <Button type="button" class="min-w-18" onclick={() => switchMode("dark")}>Dark</Button>
  </div>

  <form class="flex flex-row items-center justify-center" onsubmit={greet}>
    <Input
      id="greet-input"
      placeholder="Enter a name..."
      aria-label="Enter a name..."
      bind:value={name}
    />
    <Button type="submit" class="min-w-24">Greet</Button>
  </form>

  <p>{greetMsg}</p>
</main>

<style lang="css">
</style>

<script lang="ts">
  import { setMode } from "mode-watcher";
  import type { Locale } from "$libs/commands/types";
  import { Button } from "$components/shadcn-svelte/button";
  import { Input } from "$components/shadcn-svelte/input";
  import commands from "$libs/commands";
  import { reportCommandFailure } from "$libs/commands/cores";
  import { m } from "$libs/i18n/paraglide/messages";
  import { getLocale, setLocale } from "$libs/i18n/paraglide/runtime";

  let name = $state("");
  let greetMsg = $state("");

  // 取值用法：失败或数据为 null/undefined 时回落默认值
  async function greet(event: Event) {
    event.preventDefault();
    greetMsg = await commands.greet(name).value("Default");
  }

  async function switchMode(mode: "system" | "light" | "dark") {
    setMode(mode);
  }

  // 事务用法：成功与失败各自处理；后端落盘成功后再切换前端语言
  function switchLocale(locale: Locale) {
    commands
      .setLocale(locale)
      .success((backendLocale) => {
        if (backendLocale !== getLocale()) {
          setLocale(backendLocale);
        }
      })
      .failed((failure) => {
        reportCommandFailure("[i18n] failed to switch locale", failure);
      });
  }

  let shouldCrash = $state(false);

  // 演示 ErrorBoundary：置为 true 后会在渲染期抛错，由错误边界接管
  $effect.pre(() => {
    if (shouldCrash) {
      throw new Error("这是通过按钮主动触发的组件渲染崩溃！");
    }
  });
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

  <div class="flex gap-4">
    <Button type="button" onclick={() => switchLocale("en")}>English</Button>
    <Button type="button" onclick={() => switchLocale("zh-CN")}>简体中文</Button>
    <Button
      type="button"
      onclick={() => {
        shouldCrash = true;
      }}>触发异常</Button
    >
  </div>

  <!-- name 变化时重建该片段，让插值后的消息重新求值 -->
  {#key name}
    <p>{m.hello_world({ name })}</p>
  {/key}

  <p>{greetMsg}</p>
</main>

<style lang="css">
</style>

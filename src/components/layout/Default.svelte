<script lang="ts">
  import WindowControl from "$components/widgets/WindowControl.svelte";
  let { children } = $props();
</script>

<div class="flex h-screen w-screen flex-col overflow-hidden">
  <header class="w-full shrink-0 border-b">
    <div class="flex h-8 items-center select-none" data-tauri-drag-region="deep">
      <div class="flex items-center gap-2 pl-3">
        <img src="/icon.png" alt="icon" class="size-4" />
        <span class="text-sm font-medium">{__APP_WINDOW_TITLE__}</span>
      </div>
      <div class="flex-1" data-tauri-drag-region="deep"></div>
      <WindowControl />
    </div>
  </header>
  <nav class="w-full shrink-0 border-b">nav</nav>
  <main class="flex-1 overflow-y-auto">
    {@render children()}
  </main>
  <footer class="w-full shrink-0 border-t">footer</footer>
</div>

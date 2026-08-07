<script lang="ts">
  let { children } = $props();
</script>

<div class="flex h-screen w-screen flex-col overflow-hidden">
  <header class="w-full shrink-0 border-b px-1 pt-1">
    <div class="flex-1" data-tauri-drag-region>header</div>
  </header>
  <nav class="w-full shrink-0 border-b">nav</nav>
  <main class="flex-1 overflow-y-auto">
    {@render children()}
  </main>
  <footer class="w-full shrink-0 border-t">footer</footer>
</div>

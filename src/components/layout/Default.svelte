<script lang="ts">
  let { children } = $props();
</script>

<div class="flex min-h-screen flex-col bg-background">
  <header class="border-b px-4 py-3">header</header>
  <nav class="border-b px-4 py-2">nav</nav>
  <main class="flex-1">
    {@render children()}
  </main>
  <footer class="border-t px-4 py-3">footer</footer>
</div>

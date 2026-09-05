<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import "./layout.css";
  import ErrorBoundary from "$components/common/ErrorBoundary.svelte";

  const { children } = $props();
</script>

<ModeWatcher defaultMode="system" />

<ErrorBoundary>
  {@render children()}
</ErrorBoundary>

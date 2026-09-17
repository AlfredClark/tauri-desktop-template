<script lang="ts">
  // 通用设置行：左侧文案、右侧控件插槽；控件状态一律由调用方持有，本组件只做布局。
  import type { Snippet } from "svelte";

  let { label, description, control }: { label: string; description?: string; control: Snippet } =
    $props();
</script>

<div class="flex items-center justify-between gap-4 py-3">
  <div class="min-w-0">
    <p class="text-sm font-medium">{label}</p>
    {#if description}
      <p class="text-sm text-muted-foreground">{description}</p>
    {/if}
  </div>
  <div class="shrink-0">
    {@render control()}
  </div>
</div>

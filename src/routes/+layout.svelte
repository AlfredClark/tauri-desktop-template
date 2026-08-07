<script lang="ts">
  import { onMount } from "svelte";
  import { initLocale } from "$libs/i18n";
  import { initLogger } from "$libs/logger";
  import { logBoundaryError } from "$libs/errors";
  import { m } from "$libs/i18n/paraglide/messages";
  import "../styles/app.css";

  // SPA 无服务端 hooks：app.html 硬编码 lang="en"，此处同步实际语言（initLocale 内部
  // 一并更新 document.documentElement.lang）。同步在 onMount（而非 layout load）执行：
  // Tauri IPC 内部使用 window.fetch，在 load 阶段会触发 SvelteKit dev 的 fetch 检查警告
  // （误报）。首帧已按 localStorage 持久化的 locale 渲染正确；initLocale 兜底自愈——
  // 与 config.json 一致时仅同步 lang 属性，失同步（外部改配置）时以 config 为准 reload 一次
  onMount(async () => {
    await initLogger();
    await initLocale();
  });
</script>

<!-- 渲染边界：子组件渲染错误 → 写入日志 + 回退提示（手动重试，不自动重挂载） -->
<svelte:boundary onerror={logBoundaryError}>
  <slot />
  {#snippet failed(error, reset)}
    <div class="boundary-error">
      <p>{m.boundary_error({ message: error instanceof Error ? error.message : String(error) })}</p>
      <button onclick={reset}>{m.boundary_retry()}</button>
    </div>
  {/snippet}
</svelte:boundary>

<style lang="css">
  .boundary-error {
    margin: 2rem auto;
    padding: 1rem 2rem;
    max-width: 480px;
    text-align: center;
    color: #b91c1c;
  }

  .boundary-error button {
    margin-top: 0.75rem;
  }
</style>

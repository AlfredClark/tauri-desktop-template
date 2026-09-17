<script lang="ts">
  // 演示：全局快捷键分组，固定键的注册 / 查询 / 注销，移动端经命令报错降级为不可用，零 props。
  import { Button } from "$components/shadcn-svelte/button";
  import CardRow from "$components/common/card-row.svelte";
  import CardSection from "$components/common/card-section.svelte";
  import commands from "$libs/commands";
  import { m } from "$libs/i18n/paraglide/messages";
  import { toast } from "$libs/utils/toast";

  /** 固定快捷键展示；取失败时留空，行内保持占位 */
  let shortcutKey = $state<string | null>(null);
  /** 注册态；`null` 为查询中，移动端恒 `false` 且附不可用说明 */
  let registered = $state<boolean | null>(null);
  /** 移动端无快捷键能力，命令报错即锁定为不可用展示 */
  let unavailable = $state(false);
  /** 操作进行中时禁用两按钮 */
  let busy = $state(false);

  /** 状态行文案：不可用优先，其次按注册态，查询中占位 */
  const statusText = $derived(
    unavailable
      ? m.demo_shortcut_unavailable()
      : registered === null
        ? "…"
        : registered
          ? m.demo_shortcut_registered()
          : m.demo_shortcut_unregistered(),
  );

  // 挂载即取固定键与注册态；移动端查询命令报错则标不可用（toast 免打扰，行内说明即可）
  $effect(() => {
    void commands
      .demoShortcutKey()
      .success((key) => {
        shortcutKey = key;
      })
      .failed(() => {
        shortcutKey = null;
      });
    void commands
      .demoShortcutIsRegistered()
      .success((value) => {
        registered = value;
      })
      .failed(() => {
        unavailable = true;
        registered = false;
      });
  });

  /** 注册固定键；移动端报错转不可用展示 */
  async function handleRegister(): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      const result = await commands
        .demoShortcutRegister()
        .failed(() => {
          toast.error(m.demo_shortcut_failed());
        })
        .result();
      if (result.status === "ok") {
        registered = result.data;
        toast.success(m.demo_shortcut_register_success());
      } else {
        unavailable = true;
      }
    } finally {
      busy = false;
    }
  }

  /** 注销固定键 */
  async function handleUnregister(): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      const result = await commands
        .demoShortcutUnregister()
        .failed(() => {
          toast.error(m.demo_shortcut_failed());
        })
        .result();
      if (result.status === "ok") {
        registered = false;
        toast.success(m.demo_shortcut_unregister_success());
      }
    } finally {
      busy = false;
    }
  }
</script>

<CardSection title={m.demo_shortcut_title()} description={m.demo_shortcut_description()}>
  <CardRow label={m.demo_shortcut_key_label()} description={shortcutKey ?? "…"} />

  <CardRow label={m.demo_shortcut_status_label()} description={statusText}>
    {#snippet control()}
      <div class="flex items-center gap-2">
        <Button
          size="sm"
          onclick={() => void handleRegister()}
          disabled={busy || unavailable || registered === true}
        >
          {m.demo_shortcut_register_button()}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onclick={() => void handleUnregister()}
          disabled={busy || unavailable || registered !== true}
        >
          {m.demo_shortcut_unregister_button()}
        </Button>
      </div>
    {/snippet}
  </CardRow>
</CardSection>

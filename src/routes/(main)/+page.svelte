<script lang="ts">
  import { Button } from "$components/ui/button";
  import { Input } from "$components/ui/input";
  import { greet } from "$features/demo";
  import { m } from "$libs/i18n/paraglide/messages";
  import { toast } from "$libs/overlay";

  // 首页演示（仿 create-tauri-app 初始化页）：双 logo + 名称输入 + 问候按钮；
  // 无表单，仅按钮事件触发；结果经 toast 展示（成功为后端本地化文案，失败走统一错误提示）
  let name = $state("");
  let pending = $state(false);

  async function handleGreet() {
    if (pending) return;
    pending = true;
    try {
      const greeting = await greet(name.trim());
      if (greeting) {
        toast.success(greeting);
      } else {
        toast.error(m.demo_greet_failed());
      }
    } finally {
      pending = false;
    }
  }
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
  <div class="flex items-center gap-6">
    <img src="/tauri.svg" alt="Tauri" class="h-20 w-auto" />
    <img src="/svelte.svg" alt="Svelte" class="h-20 w-auto" />
  </div>
  <h1 class="text-lg font-semibold">{m.demo_greet_title()}</h1>
  <div class="flex items-center gap-2">
    <Input bind:value={name} placeholder={m.demo_greet_placeholder()} class="w-56" />
    <Button onclick={handleGreet} disabled={pending}>{m.demo_greet_button()}</Button>
  </div>
</div>

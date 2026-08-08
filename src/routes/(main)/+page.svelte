<script lang="ts">
  import { Button } from "$components/ui/button";
  import { greet } from "$features/demo";
  import { m } from "$libs/i18n/paraglide/messages";
  import { toast } from "$libs/overlay";

  // 演示 greet（后端 rust-i18n 本地化文案）与 toast 联动：成功展示返回值，失败经 toast 报错
  async function handleGreet() {
    const greeting = await greet(__APP_PKG__.name);
    if (greeting) {
      toast.success(greeting);
    } else {
      toast.error(m.demo_greet_failed());
    }
  }
</script>

<div class="flex h-full w-full flex-col items-center gap-4 p-6">
  <h1 class="text-lg font-semibold">{m.nav_home()}</h1>
  <Button onclick={handleGreet}>{m.demo_greet_button()}</Button>
</div>

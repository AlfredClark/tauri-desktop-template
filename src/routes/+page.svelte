<script lang="ts">
  import { onMount } from "svelte";
  import { ParaglideMessage } from "@inlang/paraglide-js-svelte";
  import { m } from "$libs/i18n/paraglide/messages";
  import { invokeCommand, type SystemConfig } from "$libs/ipc";
  import { changeLocale } from "$libs/i18n";
  import { error, info, trace, warn } from "$libs/logger";
  import { sendNotification } from "@tauri-apps/plugin-notification";
  import { ask, confirm, message, open, save } from "@tauri-apps/plugin-dialog";
  import { exists, BaseDirectory } from "@tauri-apps/plugin-fs";
  import { arch, exeExtension, family, locale, platform, type as osType, version } from "@tauri-apps/plugin-os";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { getSystemFonts, type SystemFont } from "tauri-plugin-system-fonts-api";
  import { checkForUpdate, installUpdate, type Update } from "$libs/updater";
  import { themeStore, type ThemeMode } from "$libs/stores";
  import { Badge } from "$components/ui/badge";
  import { Button } from "$components/ui/button";
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$components/ui/card";
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "$components/ui/dialog";
  import { Input } from "$components/ui/input";
  import { Label } from "$components/ui/label";
  import { Switch } from "$components/ui/switch";

  // $state 为 Svelte 5 的响应式状态声明
  let name = $state("");
  let greetMsg = $state("");

  // 演示用：系统托盘开关（状态持久化于 Rust 端 config.json，无需国际化）
  let tray = $state(false);

  // 演示用：开机自启开关（状态持久化于 Rust 端 config.json，无需国际化）
  let autostart = $state(false);

  // 演示用：系统通知开关（状态持久化于 Rust 端 config.json，无需国际化）
  let notification = $state(false);
  let notifyResult = $state("");
  let notifyOk = $state(false);

  // 演示用：系统字体列表（经 tauri-plugin-system-fonts-api 获取，无需国际化）
  let fonts = $state<SystemFont[]>([]);
  let fontsLoading = $state(false);
  let fontsError = $state("");

  // 演示用：原生对话框结果（经 @tauri-apps/plugin-dialog 直调，无需国际化）
  let dialogResult = $state("");
  let dialogOk = $state(false);

  // 演示用：文件系统检查结果（经 @tauri-apps/plugin-fs 直调，无需国际化）
  let fsResult = $state("");
  let fsOk = $state(false);

  // 演示用：系统信息列表（经 @tauri-apps/plugin-os 直调，无需国际化）
  let osInfo = $state<{ label: string; value: string }[]>([]);
  let osLoading = $state(false);
  let osError = $state("");

  // 演示用：应用更新（经 $libs/updater 封装，配置见 tauri.conf.json plugins.updater，无需国际化）
  let updateAvailable = $state<Update | null>(null);
  let updateChecking = $state(false);
  let updateInstalling = $state(false);
  let updateProgress = $state("");
  let updateResult = $state("");

  // 演示用：全局异常拦截（uncaught / unhandled rejection / 渲染边界三层，无需国际化）
  let boundaryThrow = $state(false);

  // 演示用：主题偏好（$libs/stores themeStore，localStorage 持久化，system 跟随系统）
  const themeCycle: ThemeMode[] = ["system", "light", "dark"];
  const themeLabels: Record<ThemeMode, string> = {
    system: "跟随系统",
    light: "浅色",
    dark: "深色",
  };

  onMount(async () => {
    // get_config 一次返回全部系统配置（类型化快照，含 locale/autostart）
    const config = await invokeCommand<SystemConfig>("get_config");
    tray = config?.tray ?? true;
    notification = config?.notification ?? false;
    autostart = config?.autostart ?? false;
  });

  // 调用 Rust 侧命令 greet（定义于 src-tauri/src/commands/demo.rs）
  async function greet(event: Event) {
    event.preventDefault();
    // invokeCommand 自动解包统一响应（Response<T>），失败时 console.error 并返回 null
    greetMsg = (await invokeCommand<string>("greet", { name })) ?? "";
  }

  // 演示前后端共用日志：写入四个级别，控制台与 LogDir 日志文件均可见
  function writeLogDemo() {
    void trace("trace demo message");
    void info("info demo message");
    void warn("warn demo message");
    void error("error demo message");
  }

  // 切换系统托盘：无参命令，返回切换后的状态（Switch 状态由后端结果驱动，不做本地双写）
  async function toggleTray() {
    tray = (await invokeCommand<boolean>("toggle_tray")) ?? tray;
  }

  // 切换开机自启：无参命令，返回切换后的状态
  async function toggleAutostart() {
    autostart = (await invokeCommand<boolean>("toggle_autostart")) ?? autostart;
  }

  // 切换系统通知：无参命令，返回切换后的状态
  async function toggleNotification() {
    notification = (await invokeCommand<boolean>("toggle_notification")) ?? notification;
  }

  // 演示系统通知：双条件门控（config 开关开启 且 主窗口不可视或最小化）满足才经 npm 包发送
  async function sendNotifyDemo() {
    if (!notification) {
      notifyResult = "未发送：通知已关闭";
      notifyOk = false;
      return;
    }
    try {
      const win = getCurrentWindow();
      const hidden = !(await win.isVisible()) || (await win.isMinimized());
      if (!hidden) {
        notifyResult = "未发送：主窗口可见（需最小化或隐藏）";
        notifyOk = false;
        return;
      }
      sendNotification({ title: "Notification Demo", body: "Main window is hidden or minimized" });
      notifyResult = "已发送";
      notifyOk = true;
    } catch (error) {
      notifyResult = `发送失败：${error}`;
      notifyOk = false;
    }
  }

  // 演示文件选择：open 单文件，取消返回 null
  async function pickFileDemo() {
    try {
      const file = await open({ multiple: false, filters: [{ name: "文本", extensions: ["txt"] }] });
      dialogResult = file ? `已选择：${file}` : "已取消";
      dialogOk = !!file;
    } catch (error) {
      dialogResult = `选择失败：${error}`;
      dialogOk = false;
    }
  }

  // 演示多文件选择：open 多选返回路径数组，取消返回 null
  async function pickFilesDemo() {
    try {
      const files = await open({ multiple: true, filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg"] }] });
      dialogResult = files ? `已选择 ${files.length} 个文件` : "已取消";
      dialogOk = !!files;
    } catch (error) {
      dialogResult = `选择失败：${error}`;
      dialogOk = false;
    }
  }

  // 演示保存对话框：返回保存路径，取消返回 null
  async function saveFileDemo() {
    try {
      const path = await save({ defaultPath: "demo.txt", filters: [{ name: "文本", extensions: ["txt"] }] });
      dialogResult = path ? `保存路径：${path}` : "已取消";
      dialogOk = !!path;
    } catch (error) {
      dialogResult = `保存失败：${error}`;
      dialogOk = false;
    }
  }

  // 演示消息框：完成时 resolve，无返回值
  async function messageDemo() {
    try {
      await message("这是原生消息对话框", { title: "消息", kind: "info" });
      dialogResult = "消息框已弹出";
      dialogOk = true;
    } catch (error) {
      dialogResult = `弹出失败：${error}`;
      dialogOk = false;
    }
  }

  // 演示询问框：返回用户选择（boolean）
  async function askDemo() {
    try {
      const ok = await ask("是否继续执行？", { title: "询问", kind: "warning" });
      dialogResult = `用户选择：${ok ? "是" : "否"}`;
      dialogOk = ok;
    } catch (error) {
      dialogResult = `弹出失败：${error}`;
      dialogOk = false;
    }
  }

  // 演示确认框：返回用户选择（boolean）
  async function confirmDemo() {
    try {
      const ok = await confirm("确认执行该操作？", { title: "确认", kind: "error" });
      dialogResult = `用户选择：${ok ? "确认" : "取消"}`;
      dialogOk = ok;
    } catch (error) {
      dialogResult = `弹出失败：${error}`;
      dialogOk = false;
    }
  }

  // 演示文件系统：检查 config.json 是否存在（BaseDirectory.AppData 即 $APPDATA，与权限 scope 对齐）
  async function checkConfigExists() {
    try {
      const existed = await exists("config.json", { baseDir: BaseDirectory.AppData });
      fsResult = existed ? "config.json 存在" : "config.json 不存在";
      fsOk = true;
    } catch (error) {
      fsResult = `检查失败：${error}`;
      fsOk = false;
    }
  }

  // 演示系统信息：同步 API（platform/version/type/arch/family/exeExtension）+ 异步 API（hostname/locale）
  async function loadOsInfo() {
    osLoading = true;
    osError = "";
    try {
      const [localeTag] = await Promise.all([locale()]);
      osInfo = [
        { label: "平台", value: platform() },
        { label: "版本", value: version() },
        { label: "类型", value: osType() },
        { label: "架构", value: arch() },
        { label: "族系", value: family() },
        { label: "可执行文件后缀", value: exeExtension() || "(无)" },
        { label: "语言环境", value: localeTag ?? "未知" },
      ];
    } catch (error) {
      osError = `获取失败：${error}`;
      osInfo = [];
    } finally {
      osLoading = false;
    }
  }

  // 演示系统字体：经 npm 包获取本机全部字体（重量级操作，加载期间防重复点击）
  async function loadSystemFonts() {
    fontsLoading = true;
    fontsError = "";
    try {
      fonts = await getSystemFonts();
    } catch (error) {
      fontsError = `字体加载失败：${error}`;
      fonts = [];
    } finally {
      fontsLoading = false;
    }
  }

  // 演示检查更新：未配置 pubkey/endpoints 时 check 抛错，catch 后展示错误信息
  async function checkUpdate() {
    updateChecking = true;
    updateResult = "";
    updateProgress = "";
    updateAvailable = null;
    try {
      updateAvailable = await checkForUpdate();
      updateResult = updateAvailable ? `发现新版本：${updateAvailable.version}` : "已是最新版本";
    } catch (error) {
      updateResult = `检查更新失败：${error}`;
    } finally {
      updateChecking = false;
    }
  }

  // 演示手动更新：仅检查到新版本后可点，下载安装完成后自动重启应用
  async function installUpdateDemo() {
    if (!updateAvailable) return;
    updateInstalling = true;
    updateResult = "";
    updateProgress = "";
    try {
      await installUpdate(updateAvailable, (downloaded, total) => {
        const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        updateProgress = total ? `下载进度：${mb(downloaded)} / ${mb(total)}` : `已下载：${mb(downloaded)}`;
      });
      updateResult = "更新完成，正在重启应用...";
    } catch (error) {
      updateResult = `更新失败：${error}`;
    } finally {
      updateInstalling = false;
    }
  }

  // 触发未捕获异常：经 window error 监听写入日志链路
  function triggerUncaughtError() {
    throw new Error("demo uncaught error");
  }

  // 触发未处理 Promise rejection：经 unhandledrejection 监听写入日志链路
  function triggerUnhandledRejection() {
    void Promise.reject(new Error("demo unhandled rejection"));
  }

  // 触发渲染错误：svelte:boundary 捕获 → 回退 UI + 手动重试按钮
  function triggerBoundaryError() {
    boundaryThrow = true;
  }

  // 渲染期抛错函数：抛错前调度清理标志，边界手动重置后不再抛（一次性渲染异常演示）
  function throwRenderError(): never {
    queueMicrotask(() => {
      boundaryThrow = false;
    });
    throw new Error("demo render error");
  }

  // 循环切换主题偏好：system → light → dark → system（themeStore 持久化于 localStorage）
  function cycleTheme() {
    const current = themeStore.get();
    const next = themeCycle[(themeCycle.indexOf(current) + 1) % themeCycle.length];
    themeStore.set(next);
  }
</script>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
  <h1 class="text-center text-2xl font-bold">
    <ParaglideMessage message={m.welcome} />
  </h1>

  <div class="flex flex-wrap justify-center gap-2">
    <Button variant="outline" onclick={() => void changeLocale("en")}>{m.lang_en()}</Button>
    <Button variant="outline" onclick={() => void changeLocale("zh-CN")}>{m.lang_zh_cn()}</Button>
    <Button variant="ghost" onclick={cycleTheme}>主题：{themeLabels[$themeStore]}</Button>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Greet Demo</CardTitle>
      <CardDescription>前后端 IPC 调用演示（Rust 命令 greet）</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="flex flex-col gap-3" onsubmit={greet}>
        <div class="flex flex-col gap-1.5">
          <Label for="greet-input">{m.greet_placeholder()}</Label>
          <Input id="greet-input" type="text" bind:value={name} placeholder={m.greet_placeholder()} />
        </div>
        <Button type="submit" class="self-start">{m.greet_button()}</Button>
      </form>
      {#if greetMsg}
        <p class="mt-3 text-sm text-muted-foreground">{greetMsg}</p>
      {/if}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>系统能力</CardTitle>
      <CardDescription>托盘 / 自启 / 通知开关（状态持久化于 Rust 端 config.json）</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <Label>系统托盘</Label>
          <p class="text-xs text-muted-foreground">切换托盘可见性</p>
        </div>
        <Switch id="switch-tray" size="default" checked={tray} onCheckedChange={toggleTray} />
      </div>
      <div class="flex items-center justify-between gap-4">
        <div>
          <Label>开机自启</Label>
          <p class="text-xs text-muted-foreground">随系统启动自动运行</p>
        </div>
        <Switch id="switch-autostart" checked={autostart} onCheckedChange={toggleAutostart} />
      </div>
      <div class="flex items-center justify-between gap-4">
        <div>
          <Label for="switch-notification">系统通知</Label>
          <p class="text-xs text-muted-foreground">主窗口隐藏/最小化时发送通知</p>
        </div>
        <Switch id="switch-notification" checked={notification} onCheckedChange={toggleNotification} />
      </div>
    </CardContent>
    <CardFooter class="flex flex-wrap items-center gap-2">
      <Button variant="outline" onclick={sendNotifyDemo}>发送通知演示</Button>
      {#if notifyResult}
        <Badge variant={notifyOk ? "default" : "destructive"}>{notifyResult}</Badge>
      {/if}
    </CardFooter>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>原生对话框</CardTitle>
      <CardDescription>经 @tauri-apps/plugin-dialog 调用系统文件选择/保存/消息/询问框</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-wrap gap-2">
      <Button variant="outline" onclick={pickFileDemo}>选择文件</Button>
      <Button variant="outline" onclick={pickFilesDemo}>选择多文件</Button>
      <Button variant="outline" onclick={saveFileDemo}>保存文件</Button>
      <Button variant="outline" onclick={messageDemo}>消息框</Button>
      <Button variant="outline" onclick={askDemo}>询问框</Button>
      <Button variant="outline" onclick={confirmDemo}>确认框</Button>
    </CardContent>
    {#if dialogResult}
      <CardFooter>
        <Badge class="max-w-full break-all" variant={dialogOk ? "default" : "destructive"}>{dialogResult}</Badge>
      </CardFooter>
    {/if}
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>文件系统</CardTitle>
      <CardDescription>经 @tauri-apps/plugin-fs 检查 $APPDATA 下的 config.json</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-wrap items-center gap-2">
      <Button variant="outline" onclick={checkConfigExists}>检查 config.json 是否存在</Button>
      {#if fsResult}
        <Badge variant={fsOk ? "default" : "destructive"}>{fsResult}</Badge>
      {/if}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>系统信息</CardTitle>
      <CardDescription>经 @tauri-apps/plugin-os 获取操作系统信息（同步 API + hostname/locale）</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" onclick={loadOsInfo} disabled={osLoading}>
          {osLoading ? "获取中..." : "获取系统信息"}
        </Button>
        {#if osError}
          <Badge variant="destructive">{osError}</Badge>
        {/if}
      </div>
      {#if osInfo.length > 0}
        <ul class="flex flex-col gap-1 text-sm">
          {#each osInfo as item (item.label)}
            <li class="rounded-md bg-muted px-3 py-1.5">
              <span class="font-medium">{item.label}</span>：{item.value}
            </li>
          {/each}
        </ul>
      {/if}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>系统字体</CardTitle>
      <CardDescription>经 tauri-plugin-system-fonts-api 获取本机全部字体</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-wrap items-center gap-2">
      <Button variant="outline" onclick={loadSystemFonts} disabled={fontsLoading}>
        {fontsLoading ? "加载中..." : "加载系统字体"}
      </Button>
      {#if fonts.length > 0}
        <Badge>共 {fonts.length} 个字体</Badge>
      {/if}
      {#if fontsError}
        <Badge variant="destructive">{fontsError}</Badge>
      {:else if fonts.length > 0}
        <Dialog>
          <DialogTrigger>
            {#snippet child({ props })}
              <Button variant="secondary" {...props}>查看字体列表</Button>
            {/snippet}
          </DialogTrigger>
          <DialogContent class="max-w-md">
            <DialogHeader>
              <DialogTitle>系统字体（{fonts.length}）</DialogTitle>
              <DialogDescription>本机可用字体，滚动查看全部</DialogDescription>
            </DialogHeader>
            <ul class="max-h-72 space-y-1 overflow-y-auto text-sm">
              {#each fonts as font, i (i)}
                <li class="rounded-md px-2 py-1 hover:bg-muted">{font.name}</li>
              {/each}
            </ul>
          </DialogContent>
        </Dialog>
      {/if}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>应用更新</CardTitle>
      <CardDescription>自动更新演示（tauri-plugin-updater，需配置签名与端点）</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-wrap items-center gap-2">
      <Button variant="outline" onclick={checkUpdate} disabled={updateChecking}>
        {updateChecking ? "检查中..." : "检查更新"}
      </Button>
      <Button onclick={installUpdateDemo} disabled={!updateAvailable || updateInstalling}>
        {updateInstalling ? "更新中..." : "更新"}
      </Button>
    </CardContent>
    {#if updateProgress || updateResult}
      <CardFooter class="flex flex-col items-start gap-1 text-xs text-muted-foreground">
        {#if updateProgress}<p>{updateProgress}</p>{/if}
        {#if updateResult}<p>{updateResult}</p>{/if}
      </CardFooter>
    {/if}
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>异常拦截演示</CardTitle>
      <CardDescription>三层拦截：window error / unhandledrejection / 渲染边界</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-wrap gap-2">
      <Button variant="outline" onclick={triggerUncaughtError}>触发未捕获异常</Button>
      <Button variant="outline" onclick={triggerUnhandledRejection}>触发未处理 Promise</Button>
      <Button variant="destructive" onclick={triggerBoundaryError}>触发渲染错误</Button>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>日志演示</CardTitle>
      <CardDescription>前后端共用日志链路（控制台 + LogDir 落盘）</CardDescription>
    </CardHeader>
    <CardContent>
      <Button variant="outline" onclick={writeLogDemo}>写入四级日志</Button>
    </CardContent>
  </Card>

  <div class="flex flex-wrap justify-center gap-4 py-4">
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="h-10 transition hover:drop-shadow-[0_0_2em_#747bff]" alt="Vite Logo" />
    </a>
    <a href="https://tauri.app" target="_blank">
      <img src="/tauri.svg" class="h-10 transition hover:drop-shadow-[0_0_2em_#24c8db]" alt="Tauri Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank">
      <img src="/svelte.svg" class="h-10 transition hover:drop-shadow-[0_0_2em_#ff3e00]" alt="SvelteKit Logo" />
    </a>
  </div>
  <p class="text-center text-sm text-muted-foreground">{m.click_hint()}</p>

  {#if boundaryThrow}
    {throwRenderError()}
  {/if}
</main>

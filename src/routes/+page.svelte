<script lang="ts">
  import { onMount } from "svelte";
  import { ParaglideMessage } from "@inlang/paraglide-js-svelte";
  import { m } from "$lib/i18n/paraglide/messages";
  import { invokeCommand } from "$lib/ipc";
  import { changeLocale } from "$lib/i18n";
  import { error, info, trace, warn } from "$lib/logger";
  import { sendNotification } from "@tauri-apps/plugin-notification";
  import { getSystemFonts, type SystemFont } from "tauri-plugin-system-fonts-api";
  import { checkForUpdate, installUpdate } from "$lib/utils";
  import type { Update } from "@tauri-apps/plugin-updater";

  // $state 为 Svelte 5 的响应式状态声明
  let name = $state("");
  let greetMsg = $state("");

  // 演示用：系统托盘开关（状态持久化于 Rust 端 config.json，无需国际化）
  let tray = $state(false);

  // 演示用：系统通知开关（状态持久化于 Rust 端 config.json，无需国际化）
  let notification = $state(false);
  let notifyResult = $state("");

  // 演示用：系统字体列表（经 tauri-plugin-system-fonts-api 获取，无需国际化）
  let fonts = $state<SystemFont[]>([]);
  let fontsLoading = $state(false);
  let fontsError = $state("");

  // 演示用：应用更新（经 $lib/utils 封装，配置见 tauri.conf.json plugins.updater，无需国际化）
  let updateAvailable = $state<Update | null>(null);
  let updateChecking = $state(false);
  let updateInstalling = $state(false);
  let updateProgress = $state("");
  let updateResult = $state("");

  onMount(async () => {
    tray = (await invokeCommand<boolean>("get_config", { key: "tray" })) ?? true;
    notification = (await invokeCommand<boolean>("get_config", { key: "notification" })) ?? false;
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

  // 切换系统托盘：无参命令，返回切换后的状态
  async function toggleTray() {
    tray = (await invokeCommand<boolean>("toggle_tray")) ?? tray;
  }

  // 切换系统通知：无参命令，返回切换后的状态
  async function toggleNotification() {
    notification = (await invokeCommand<boolean>("toggle_notification")) ?? notification;
  }

  // 演示系统通知：双条件门控（config 开关开启 且 主窗口不可视或最小化）满足才经 npm 包发送
  async function sendNotifyDemo() {
    if (!notification) {
      notifyResult = "未发送：通知已关闭";
      return;
    }
    sendNotification({ title: "Notification Demo", body: "Main window is hidden or minimized" });
    notifyResult = "已发送";
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
</script>

<main class="container">
  <h1><ParaglideMessage message={m.welcome} /></h1>

  <div class="row">
    <button onclick={() => void changeLocale("en")}>{m.lang_en()}</button>
    <button onclick={() => void changeLocale("zh-CN")}>{m.lang_zh_cn()}</button>
  </div>

  <div class="row">
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo vite" alt="Vite Logo" />
    </a>
    <a href="https://tauri.app" target="_blank">
      <img src="/tauri.svg" class="logo tauri" alt="Tauri Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank">
      <img src="/svelte.svg" class="logo svelte-kit" alt="SvelteKit Logo" />
    </a>
  </div>
  <p>{m.click_hint()}</p>

  <form class="row" onsubmit={greet}>
    <input id="greet-input" placeholder={m.greet_placeholder()} bind:value={name} />
    <button type="submit">{m.greet_button()}</button>
  </form>
  <p>{greetMsg}</p>

  <div class="row">
    <button onclick={writeLogDemo}>Write Log Demo</button>
    <button onclick={toggleTray}>{tray ? "Tray: 已开启" : "Tray: 已关闭"}</button>
  </div>

  <div class="row">
    <button onclick={toggleNotification}>{notification ? "Notification: 已开启" : "Notification: 已关闭"}</button>
    <button onclick={sendNotifyDemo}>Send Notification Demo</button>
  </div>
  {#if notifyResult}
    <p>{notifyResult}</p>
  {/if}

  <div class="row">
    <button onclick={loadSystemFonts} disabled={fontsLoading}>
      {fontsLoading ? "Loading..." : "Load System Fonts"}
    </button>
  </div>
  {#if fontsError}
    <p>{fontsError}</p>
  {:else if fonts.length > 0}
    <p>共 {fonts.length} 个系统字体：</p>
    <ul class="font-list">
      {#each fonts as font, i (i)}
        <li>{font.name}</li>
      {/each}
    </ul>
  {/if}

  <div class="row">
    <button onclick={checkUpdate} disabled={updateChecking}>
      {updateChecking ? "检查中..." : "检查更新"}
    </button>
    <button onclick={installUpdateDemo} disabled={!updateAvailable || updateInstalling}>
      {updateInstalling ? "更新中..." : "更新"}
    </button>
  </div>
  {#if updateProgress}
    <p>{updateProgress}</p>
  {/if}
  {#if updateResult}
    <p>{updateResult}</p>
  {/if}
</main>

<style>
  .logo.vite:hover {
    filter: drop-shadow(0 0 2em #747bff);
  }

  .logo.svelte-kit:hover {
    filter: drop-shadow(0 0 2em #ff3e00);
  }

  :root {
    font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 24px;
    font-weight: 400;
    color: #0f0f0f;
    background-color: #f6f6f6;
    font-synthesis: none;
    text-rendering: optimizelegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-size-adjust: 100%;
  }

  .container {
    margin: 0;
    padding-top: 10vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }

  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: 0.75s;
  }

  .logo.tauri:hover {
    filter: drop-shadow(0 0 2em #24c8db);
  }

  .row {
    display: flex;
    justify-content: center;
  }

  a {
    font-weight: 500;
    color: #646cff;
    text-decoration: inherit;
  }

  a:hover {
    color: #535bf2;
  }

  h1 {
    text-align: center;
  }

  input,
  button {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    color: #0f0f0f;
    background-color: #fff;
    transition: border-color 0.25s;
    box-shadow: 0 2px 2px rgb(0 0 0 / 20%);
    outline: none;
  }

  button {
    cursor: pointer;
  }

  button:hover {
    border-color: #396cd8;
  }

  button:active {
    border-color: #396cd8;
    background-color: #e8e8e8;
  }

  #greet-input {
    margin-right: 5px;
  }

  .font-list {
    max-height: 240px;
    overflow-y: auto;
    margin: 0 auto;
    padding-left: 1.5em;
    text-align: left;
    width: max-content;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      color: #f6f6f6;
      background-color: #2f2f2f;
    }

    a:hover {
      color: #24c8db;
    }

    input,
    button {
      color: #fff;
      background-color: #0f0f0f98;
    }

    button:active {
      background-color: #0f0f0f69;
    }
  }
</style>

<script lang="ts">
  import { ParaglideMessage } from "@inlang/paraglide-js-svelte";
  import { m } from "$lib/i18n/paraglide/messages";
  import { invokeCommand } from "$lib/ipc";
  import { changeLocale } from "$lib/i18n";
  import { error, info, trace, warn } from "$lib/logger";

  // $state 为 Svelte 5 的响应式状态声明
  let name = $state("");
  let greetMsg = $state("");

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
  </div>
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

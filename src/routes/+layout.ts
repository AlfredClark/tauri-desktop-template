import { configState, hydrateConfig } from "$hooks/config.svelte";
import { getLocale, setLocale } from "$libs/i18n/paraglide/runtime";

// Tauri 没有 Node.js 服务器来做 SSR，使用静态适配器并回退到 `index.html`，将网站置于 SPA 模式
export const ssr = false;

// 启动对齐：以后端 config.json 为权威，在首帧渲染前水合配置并把前端语言对齐到它
// （不触发整页重载，否则会出现语言闪烁）
export const load = async () => {
  await hydrateConfig();

  const locale = configState.value?.locale;
  if (locale && locale !== getLocale()) {
    setLocale(locale, { reload: false });
  }
};

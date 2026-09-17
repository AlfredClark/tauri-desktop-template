import { configState, hydrateConfig } from "$hooks/config.svelte";
import { reportCommandFailure } from "$libs/commands/cores";
import { getLocale, setLocale } from "$libs/i18n/paraglide/runtime";

// Tauri 没有 Node.js 服务器来做 SSR，使用静态适配器并回退到 `index.html`，将网站置于 SPA 模式
export const ssr = false;

// 启动对齐：以后端 config.json 为权威，在首帧渲染前水合配置并把前端语言对齐到它
// （不触发整页重载，否则会出现语言闪烁；水合失败则回落 Paraglide 本地策略，不阻断首帧）
export const load = async () => {
  try {
    await hydrateConfig();
  } catch (error) {
    // 链式 API 永不 reject，此处仅防命令构造期同步抛错导致整页 load 失败
    reportCommandFailure("[config] hydrate threw", error);
  }

  const locale = configState.value?.locale;
  if (locale && locale !== getLocale()) {
    setLocale(locale, { reload: false });
  }
};

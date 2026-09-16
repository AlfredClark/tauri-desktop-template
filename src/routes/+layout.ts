import commands from "$libs/commands";
import { reportCommandFailure } from "$libs/commands/cores";
import { getLocale, setLocale } from "$libs/i18n/paraglide/runtime";

// Tauri没有Node.js服务器来进行SSR，使用适配器静态并回退到index.html，将网站置于SPA模式
export const ssr = false;

// 启动对齐：以后端 config.json 为权威，在首帧渲染前同步前端语言（不触发整页重载）
export const load = async () => {
  await commands
    .getLocale()
    .success((locale) => {
      if (locale !== getLocale()) {
        setLocale(locale, { reload: false });
      }
    })
    .failed((failure) => {
      reportCommandFailure("[i18n] failed to read locale from backend", failure);
    });
};

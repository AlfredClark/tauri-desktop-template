import { syncLocale } from "$lib/i18n";

// 关闭 SSR：Tauri 通过本地文件/自建协议加载页面，无服务器环境，
// 页面必须纯客户端渲染（SPA），构建产物为静态文件
export const ssr = false;

// SPA 客户端渲染：页面挂载前从后端同步 locale（config.json 为真相源），避免首帧闪变
export async function load(): Promise<void> {
  await syncLocale();
}

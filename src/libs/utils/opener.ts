// 外部链接薄封装：调用失败一律返回假，浏览器预览与单测环境下调用方只需分支提示。
/** 在系统默认应用中打开外部链接，成功返回真 */
export async function openExternal(url: string): Promise<boolean> {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return true;
  } catch {
    return false;
  }
}

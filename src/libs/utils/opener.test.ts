import { describe, expect, it } from "vitest";
import { openExternal } from "./opener";

describe("openExternal", () => {
  it("非 Tauri 环境返回假，调用方据此提示", async () => {
    await expect(openExternal("https://example.com")).resolves.toBe(false);
  });
});

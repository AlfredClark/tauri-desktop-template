import { beforeEach, describe, expect, it, vi } from "vitest";
import { configState, hydrateConfig } from "$hooks/config.svelte";
import type { Config_Serialize } from "$libs/commands/types";
import { getLocale, setLocale } from "$libs/i18n/paraglide/runtime";
import { load } from "../../../routes/+layout";

vi.mock("$hooks/config.svelte", () => ({
  configState: { value: null },
  hydrateConfig: vi.fn(),
}));

vi.mock("$libs/commands/cores", () => ({
  reportCommandFailure: vi.fn(),
}));

vi.mock("$libs/i18n/paraglide/runtime", () => ({
  getLocale: vi.fn(),
  setLocale: vi.fn(),
}));

const saved: Config_Serialize = {
  locale: "zh-CN",
  auto_start: true,
  remember_window: true,
  auto_check_update: true,
  tray_enabled: true,
  close_behavior: "prompt",
  schema_version: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  configState.value = null;
  vi.mocked(hydrateConfig).mockResolvedValue(undefined);
  vi.mocked(getLocale).mockReturnValue("en");
});

describe("根布局 load", () => {
  it("水合成功且语言不一致时首帧前对齐且不重载", async () => {
    configState.value = saved;

    await load();

    expect(hydrateConfig).toHaveBeenCalledOnce();
    expect(setLocale).toHaveBeenCalledOnce();
    expect(setLocale).toHaveBeenCalledWith("zh-CN", { reload: false });
  });

  it("语言已一致时不调用对齐", async () => {
    configState.value = { ...saved, locale: "en" };

    await load();

    expect(setLocale).not.toHaveBeenCalled();
  });

  it("水合构造期抛错时上报且不阻断首帧", async () => {
    const { reportCommandFailure } = await import("$libs/commands/cores");
    vi.mocked(hydrateConfig).mockRejectedValueOnce(new Error("boom"));

    await expect(load()).resolves.toBeUndefined();

    expect(reportCommandFailure).toHaveBeenCalledWith("[config] hydrate threw", expect.anything());
    expect(setLocale).not.toHaveBeenCalled();
  });
});

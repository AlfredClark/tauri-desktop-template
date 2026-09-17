import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleDeepLinkUrl, isDeepLink, routeForUrl } from "$hooks/deep-link.svelte";

const gotoMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("$app/navigation", () => ({ goto: gotoMock }));
vi.mock("$libs/utils/toast", () => ({ toast: toastMocks }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isDeepLink", () => {
  it("仅接受本应用协议", () => {
    expect(isDeepLink("tdt://settings")).toBe(true);
    expect(isDeepLink("tdt://")).toBe(true);
    expect(isDeepLink("https://example.com")).toBe(false);
    expect(isDeepLink("other://settings")).toBe(false);
    expect(isDeepLink("")).toBe(false);
  });
});

describe("routeForUrl", () => {
  it("映射已知路径到应用内路由", () => {
    expect(routeForUrl("tdt://settings")).toBe("/settings");
    expect(routeForUrl("tdt:///settings")).toBe("/settings");
    expect(routeForUrl("tdt://about")).toBe("/about");
    expect(routeForUrl("tdt://about?tab=1")).toBe("/about");
    expect(routeForUrl("tdt://")).toBe("/");
    expect(routeForUrl("tdt:///")).toBe("/");
  });

  it("未知路径与非本协议回落空", () => {
    expect(routeForUrl("tdt://unknown")).toBeNull();
    expect(routeForUrl("https://example.com")).toBeNull();
  });
});

describe("handleDeepLinkUrl", () => {
  it("命中跳转并提示", () => {
    handleDeepLinkUrl("tdt://settings");

    expect(gotoMock).toHaveBeenCalledWith("/settings");
    expect(toastMocks.info).toHaveBeenCalled();
  });

  it("未知路径停留并警告", () => {
    handleDeepLinkUrl("tdt://nope");

    expect(gotoMock).not.toHaveBeenCalled();
    expect(toastMocks.warning).toHaveBeenCalled();
  });

  it("短窗内重复到达只处理一次", () => {
    handleDeepLinkUrl("tdt://about");
    handleDeepLinkUrl("tdt://about");

    expect(gotoMock).toHaveBeenCalledTimes(1);
  });
});

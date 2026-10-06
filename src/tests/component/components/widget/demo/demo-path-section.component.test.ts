import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import Component from "$components/widget/demo/demo-path-section.svelte";

// 纯替身：目录解析命令、失败上报、提示全部 mock，
// 只验证目录卡片的接线——渲染标题、成功展示三处目录、失败提示并保持占位。
const demoAppPathsMock = vi.hoisted(() => vi.fn());
const reportFailureMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

type FakeResult =
  { status: "ok"; data: unknown } | { status: "error"; error: { kind: string; message: string } };

/** 与挂载期调用形态一致的替身：按分支跑回调后返回自身 */
function fakeCommand(result: FakeResult): {
  success: (handler: (data: never) => unknown) => unknown;
  failed: (handler: (failure: never) => unknown) => unknown;
} {
  const chain = {
    success(handler: (data: never) => unknown) {
      if (result.status === "ok") handler(result.data as never);
      return chain;
    },
    failed(handler: (failure: never) => unknown) {
      if (result.status === "error") handler(result.error as never);
      return chain;
    },
  };
  return chain;
}

vi.mock("$libs/commands", () => ({
  default: {
    demoAppPaths: demoAppPathsMock,
  },
}));

vi.mock("$libs/commands/cores", () => ({
  reportCommandFailure: reportFailureMock,
}));

vi.mock("$libs/utils/toast", () => ({ toast: toastMocks }));

const paths = { app_data: "/data/app", app_cache: "/data/cache", temp: "/tmp/app" };

beforeEach(() => {
  vi.clearAllMocks();
  demoAppPathsMock.mockReturnValue(fakeCommand({ status: "ok", data: paths }) as never);
});

afterEach(() => {
  cleanup();
});

describe("应用目录分组", () => {
  it("渲染标题", () => {
    render(Component);

    expect(screen.getByText("App directories")).not.toBeNull();
  });

  it("成功时展示三处目录", async () => {
    render(Component);

    expect(await screen.findByText("/data/app")).not.toBeNull();
    expect(screen.getByText("/data/cache")).not.toBeNull();
    expect(screen.getByText("/tmp/app")).not.toBeNull();
    expect(demoAppPathsMock).toHaveBeenCalledOnce();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("失败时上报并提示，占位保持不展示目录", async () => {
    demoAppPathsMock.mockReturnValue(
      fakeCommand({ status: "error", error: { kind: "Internal", message: "boom" } }) as never,
    );
    render(Component);

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledOnce();
    });
    expect(reportFailureMock).toHaveBeenCalledOnce();
    expect(screen.getAllByText("Loading…")).toHaveLength(3);
    expect(screen.queryByText("/data/app")).toBeNull();
  });
});

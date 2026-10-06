import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import Component from "$components/widget/demo/demo-fs-section.svelte";

// 纯替身：沙盒读写命令与提示全部 mock，
// 只验证沙盒文件卡片的接线——渲染、写成功回显路径、写失败提示、读成功回显内容、读失败提示。
const demoWriteFileMock = vi.hoisted(() => vi.fn());
const demoReadFileMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

type FakeResult =
  { status: "ok"; data: unknown } | { status: "error"; error: { kind: string; message: string } };

/** 与 `EnhancedCommand` 行为一致的替身：按分支跑回调后结算结果 */
function fakeCommand(result: FakeResult): {
  success: (handler: (data: never) => unknown) => unknown;
  failed: (handler: (failure: never) => unknown) => unknown;
  result: () => Promise<FakeResult>;
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
    result() {
      return Promise.resolve(result);
    },
  };
  return chain;
}

vi.mock("$libs/commands", () => ({
  default: {
    demoWriteFile: demoWriteFileMock,
    demoReadFile: demoReadFileMock,
  },
}));

vi.mock("$libs/utils/toast", () => ({ toast: toastMocks }));

beforeEach(() => {
  vi.clearAllMocks();
  demoWriteFileMock.mockReturnValue(
    fakeCommand({ status: "ok", data: "/data/demo/demo.txt" }) as never,
  );
  demoReadFileMock.mockReturnValue(
    fakeCommand({ status: "ok", data: "Hello from the Tauri demo sandbox." }) as never,
  );
});

afterEach(() => {
  cleanup();
});

describe("沙盒文件分组", () => {
  it("渲染标题与读写按钮", () => {
    render(Component);

    expect(screen.getByText("Sandbox file")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Write" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Read" })).not.toBeNull();
  });

  it("写成功后回显路径并提示成功", async () => {
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Write" }));

    expect(await screen.findByText("/data/demo/demo.txt")).not.toBeNull();
    expect(demoWriteFileMock).toHaveBeenCalledOnce();
    expect(toastMocks.success).toHaveBeenCalledOnce();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("写失败时提示写入失败且无回显", async () => {
    demoWriteFileMock.mockReturnValue(
      fakeCommand({ status: "error", error: { kind: "Internal", message: "boom" } }) as never,
    );
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Write" }));

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledOnce();
    });
    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(screen.queryByText("/data/demo/demo.txt")).toBeNull();
  });

  it("读成功后回显内容并提示成功", async () => {
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Read" }));

    expect(await screen.findByText("Hello from the Tauri demo sandbox.")).not.toBeNull();
    expect(demoReadFileMock).toHaveBeenCalledWith("demo.txt");
    expect(toastMocks.success).toHaveBeenCalledOnce();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("读失败时提示读取失败", async () => {
    demoReadFileMock.mockReturnValue(
      fakeCommand({ status: "error", error: { kind: "Internal", message: "boom" } }) as never,
    );
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Read" }));

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledOnce();
    });
    expect(toastMocks.success).not.toHaveBeenCalled();
  });
});

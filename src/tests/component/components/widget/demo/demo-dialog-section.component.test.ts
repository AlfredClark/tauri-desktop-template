import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import Component from "$components/widget/demo/demo-dialog-section.svelte";

// 纯替身：三个系统对话框命令与提示全部 mock，
// 只验证对话框卡片的接线——渲染、选文件回显、取消文案、选目录回显、存文件回显、失败提示。
const demoPickFileMock = vi.hoisted(() => vi.fn());
const demoPickFolderMock = vi.hoisted(() => vi.fn());
const demoSaveFileMock = vi.hoisted(() => vi.fn());
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
    demoPickFile: demoPickFileMock,
    demoPickFolder: demoPickFolderMock,
    demoSaveFile: demoSaveFileMock,
  },
}));

vi.mock("$libs/utils/toast", () => ({ toast: toastMocks }));

beforeEach(() => {
  vi.clearAllMocks();
  demoPickFileMock.mockReturnValue(fakeCommand({ status: "ok", data: "/tmp/picked.txt" }) as never);
  demoPickFolderMock.mockReturnValue(
    fakeCommand({ status: "ok", data: "/tmp/picked-dir" }) as never,
  );
  demoSaveFileMock.mockReturnValue(fakeCommand({ status: "ok", data: "/tmp/saved.txt" }) as never);
});

afterEach(() => {
  cleanup();
});

describe("系统对话框分组", () => {
  it("渲染标题与三个对话框按钮", () => {
    render(Component);

    expect(screen.getByText("System dialogs")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Browse…" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Choose…" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Save as…" })).not.toBeNull();
  });

  it("选文件成功后回显路径", async () => {
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Browse…" }));

    expect(await screen.findByText("/tmp/picked.txt")).not.toBeNull();
    expect(demoPickFileMock).toHaveBeenCalledOnce();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("取消选择是正常分支，展示取消文案而非报错", async () => {
    demoPickFileMock.mockReturnValue(fakeCommand({ status: "ok", data: null }) as never);
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Browse…" }));

    expect(await screen.findByText("Cancelled, nothing selected")).not.toBeNull();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("选目录成功后回显路径", async () => {
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Choose…" }));

    expect(await screen.findByText("/tmp/picked-dir")).not.toBeNull();
    expect(demoPickFolderMock).toHaveBeenCalledOnce();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("存文件成功后回显路径", async () => {
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Save as…" }));

    expect(await screen.findByText("/tmp/saved.txt")).not.toBeNull();
    expect(demoSaveFileMock).toHaveBeenCalledOnce();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("对话框失败时提示且无回显", async () => {
    demoPickFileMock.mockReturnValue(
      fakeCommand({ status: "error", error: { kind: "Internal", message: "boom" } }) as never,
    );
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Browse…" }));

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledOnce();
    });
    expect(screen.queryByText("/tmp/picked.txt")).toBeNull();
  });
});

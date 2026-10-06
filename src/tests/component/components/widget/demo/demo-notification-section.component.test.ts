import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import Component from "$components/widget/demo/demo-notification-section.svelte";

// 纯替身：通知发送命令与提示全部 mock，
// 只验证通知卡片的接线——渲染、发送成功提示、发送失败提示。
const demoNotifyMock = vi.hoisted(() => vi.fn());
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
    demoNotify: demoNotifyMock,
  },
}));

vi.mock("$libs/utils/toast", () => ({ toast: toastMocks }));

beforeEach(() => {
  vi.clearAllMocks();
  demoNotifyMock.mockReturnValue(fakeCommand({ status: "ok", data: null }) as never);
});

afterEach(() => {
  cleanup();
});

describe("系统通知分组", () => {
  it("渲染标题与发送按钮", () => {
    render(Component);

    expect(screen.getByText("Notification")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Send" })).not.toBeNull();
  });

  it("发送成功后提示成功，且透传标题正文", async () => {
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Send" }));

    await vi.waitFor(() => {
      expect(demoNotifyMock).toHaveBeenCalledOnce();
    });
    expect(demoNotifyMock).toHaveBeenCalledWith(
      "Demo notification",
      "Sent from the template demo page.",
    );
    expect(toastMocks.success).toHaveBeenCalledOnce();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("发送失败时提示发送失败", async () => {
    demoNotifyMock.mockReturnValue(
      fakeCommand({ status: "error", error: { kind: "Internal", message: "boom" } }) as never,
    );
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Send" }));

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledOnce();
    });
    expect(toastMocks.success).not.toHaveBeenCalled();
  });
});

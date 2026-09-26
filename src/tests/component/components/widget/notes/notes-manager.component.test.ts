import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import type { Note } from "$libs/notes/types";
import Component from "$components/widget/notes/notes-manager.svelte";

// 纯替身：数据层、提示全部 mock，只验证管理接线——增删改查触发与空态分支。
const listNotesMock = vi.hoisted(() => vi.fn());
const createNoteMock = vi.hoisted(() => vi.fn());
const updateNoteMock = vi.hoisted(() => vi.fn());
const deleteNoteMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("$libs/notes/db", () => ({
  listNotes: listNotesMock,
  createNote: createNoteMock,
  updateNote: updateNoteMock,
  deleteNote: deleteNoteMock,
}));

vi.mock("$libs/utils/toast", () => ({ toast: toastMocks }));

const row: Note = {
  id: 1,
  title: "标题",
  body: "正文",
  created_at: "2026-09-26T00:00:00.000Z",
  updated_at: "2026-09-26T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  listNotesMock.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  document.body.removeAttribute("style");
});

describe("笔记管理", () => {
  it("空库显示空态", async () => {
    render(Component);

    expect(await screen.findByText("No notes yet, add the first one above")).not.toBeNull();
  });

  it("新增走校验写库并重拉", async () => {
    listNotesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...row }]);
    createNoteMock.mockResolvedValue({ ...row });
    const user = userEvent.setup();
    render(Component);

    await user.type(screen.getByPlaceholderText("Title"), "标题");
    await user.type(screen.getByPlaceholderText("Body (optional)"), "正文");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(createNoteMock).toHaveBeenCalledOnce();
    expect(await screen.findByText("标题")).not.toBeNull();
  });

  it("空标题不写库只提示", async () => {
    const user = userEvent.setup();
    render(Component);
    await screen.findByText("No notes yet, add the first one above");

    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(createNoteMock).not.toHaveBeenCalled();
    expect(toastMocks.error).toHaveBeenCalledOnce();
  });

  it("行内编辑保存写库", async () => {
    listNotesMock.mockResolvedValue([{ ...row }]);
    updateNoteMock.mockResolvedValue(1);
    const user = userEvent.setup();
    render(Component);
    await screen.findByText("标题");

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const titleBox = screen.getByDisplayValue("标题");
    await user.clear(titleBox);
    await user.type(titleBox, "新标题");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(updateNoteMock).toHaveBeenCalledOnce();
    expect(updateNoteMock.mock.calls[0][1]).toBe("新标题");
  });

  it("删除经二次确认后写库", async () => {
    listNotesMock.mockResolvedValue([{ ...row }]);
    deleteNoteMock.mockResolvedValue(1);
    const user = userEvent.setup();
    render(Component);
    await screen.findByText("标题");

    // 行按钮与弹窗确认按钮同名，弹窗打开后取第二个
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Delete this note?")).not.toBeNull();
    await user.click(screen.getAllByRole("button", { name: "Delete" })[1]);

    expect(deleteNoteMock).toHaveBeenCalledOnce();
    expect(deleteNoteMock.mock.calls[0][0]).toBe(1);
  });
});

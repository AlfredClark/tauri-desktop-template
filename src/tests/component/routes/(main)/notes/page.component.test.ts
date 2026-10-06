import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import type { Note } from "$libs/notes/types";
import Page from "../../../../../routes/(main)/notes/+page.svelte";

// bits-ui 组件在 jsdom 下缺失的浏览器 API，就地补齐（滚动壳的 ResizeObserver）。
if (typeof ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

// 纯替身：笔记数据层、提示全部 mock，只验证笔记页的组装——标题、新增表单与列表分区。
const listNotesMock = vi.hoisted(() => vi.fn());
const createNoteMock = vi.hoisted(() => vi.fn());
const updateNoteMock = vi.hoisted(() => vi.fn());
const deleteNoteMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("$libs/notes/db", async (importOriginal) => ({
  // 真值（NOTES_PAGE_SIZE 等常量）走原模块，仅数据函数用替身
  ...(await importOriginal<typeof import("$libs/notes/db")>()),
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

describe("笔记页", () => {
  it("渲染页标题与新增表单", () => {
    render(Page);

    // 页头与管理分组共用同一标题，不断言出现次数，只断言分区齐备
    expect(screen.getAllByText("Notes").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Minimal end-to-end business example: SQLite persistence behind a typed data layer",
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("Title")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Add note" })).not.toBeNull();
  });

  it("空库显示空态", async () => {
    render(Page);

    expect(await screen.findByText("No notes yet, add the first one above")).not.toBeNull();
  });

  it("有数据时渲染列表行，不断言后端排序", async () => {
    listNotesMock.mockResolvedValue([{ ...row }]);
    render(Page);

    expect(await screen.findByText("标题")).not.toBeNull();
    expect(screen.getByText("正文")).not.toBeNull();
  });
});

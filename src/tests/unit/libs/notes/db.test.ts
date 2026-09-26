import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNote, deleteNote, listNotes, updateNote } from "$libs/notes/db";
import type { Note } from "$libs/notes/types";

// 连接单例常驻模块：全文件共用同一 fake 连接，逐用例重设其行为即可，无需复位导出。
const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: { load: vi.fn(async () => ({ select: selectMock, execute: executeMock })) },
}));

const row: Note = {
  id: 1,
  title: "标题",
  body: "正文",
  created_at: "2026-09-26T00:00:00.000Z",
  updated_at: "2026-09-26T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("笔记数据访问", () => {
  it("列表按更新时间倒序查询", async () => {
    selectMock.mockResolvedValue([row]);

    const notes = await listNotes();

    expect(notes).toEqual([row]);
    expect(selectMock).toHaveBeenCalledOnce();
    expect(selectMock.mock.calls[0][0]).toContain("ORDER BY updated_at DESC");
  });

  it("新增走参数化并返回写后行", async () => {
    selectMock.mockResolvedValue([row]);

    const created = await createNote("标题", "正文");

    expect(created).toEqual(row);
    const [sql, params] = selectMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("VALUES ($1, $2, $3, $3)");
    expect(params[0]).toBe("标题");
    expect(params[1]).toBe("正文");
  });

  it("更新刷新时间并返回影响行数", async () => {
    executeMock.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });

    const affected = await updateNote(1, "新标题", "新正文");

    expect(affected).toBe(1);
    const [sql, params] = executeMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("UPDATE notes SET");
    expect(params[3]).toBe(1);
  });

  it("删除返回影响行数", async () => {
    executeMock.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });

    expect(await deleteNote(1)).toBe(1);
    const [sql, params] = executeMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("DELETE FROM notes");
    expect(params[0]).toBe(1);
  });

  it("底层错误直接透传", async () => {
    selectMock.mockRejectedValue(new Error("db locked"));

    await expect(listNotes()).rejects.toThrow("db locked");
  });
});

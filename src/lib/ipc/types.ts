/** IPC 统一响应包裹（与 Rust 侧 cores/response.rs 对齐） */
export interface Response<T> {
  code: number; // 业务码：0 成功，非 0 失败
  message: string; // 提示信息
  data: T | null; // 业务数据；失败时为 null
}

/** 成功业务码 */
export const CODE_OK = 0;

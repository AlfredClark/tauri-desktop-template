# AGENTS.md

## 项目概述

基于 **Tauri 2 + SvelteKit 5 + TypeScript** 的桌面应用开发模板。

- 前端为 SPA 模式（`src/routes/+layout.ts` 中 `ssr = false`，adapter-static 以 `index.html` 为 fallback），仅负责 UI
- 后端为 Rust，与前端通过 Tauri IPC（`invoke` / `#[tauri::command]`）通信
- 前端构建产物输出到 `build/`，由 Tauri 打包为桌面应用

## 技术栈与工具链

| 类别     | 选型                                                                        |
| -------- | --------------------------------------------------------------------------- |
| 包管理器 | bun（`bun.lock` 已提交，勿用 npm/yarn/pnpm）                                |
| 前端     | SvelteKit 5、Vite 8、TypeScript 6                                           |
| 桌面端   | Tauri 2.11、tauri-plugin-opener、@tauri-apps/api                            |
| Rust     | stable 工具链（`rust-toolchain.toml`），edition 2024                        |
| 环境要求 | Node >= 24（`package.json` engines），Linux 需 webkit2gtk 等 Tauri 系统依赖 |

## 目录结构

```
├── src/                        SvelteKit 前端
│   ├── app.html                入口 HTML（引用 /favicon.png）
│   ├── components/             自定义 Svelte 组件（按功能分子目录）
│   ├── lib/                    前端功能模块
│   │   └── stores/             状态管理模块（types.ts / utils.ts / index.ts）
│   └── routes/                 页面路由
│       ├── +layout.ts          全局布局（关闭 SSR）
│       └── +page.svelte        IPC 调用示例（invoke("greet")）
├── static/                     静态资源（favicon、logo）
├── src-tauri/                  桌面端（Rust）
│   ├── src/lib.rs              所有 #[tauri::command] 与 Builder 配置
│   ├── src/main.rs             二进制入口（调用 lib::run()）
│   ├── capabilities/default.json  窗口权限（main + core:default + opener:default）
│   ├── tauri.conf.json         窗口 / CSP / 打包配置
│   ├── build.rs                tauri-build 构建脚本
│   └── icons/                  应用图标（勿删）
├── Cargo.toml                  workspace 根（profile、lints）
├── package.json                scripts、lint-staged、engines
├── svelte.config.ts            adapter-static 配置
├── vite.config.ts              dev server 端口 1420
├── eslint.config.ts / .stylelintrc.json / .prettierrc / rustfmt.toml   代码规范
├── .husky/pre-commit           lint-staged + cargo clippy 提交钩子
└── rust-toolchain.toml         固定 stable 工具链
```

## 常用命令（统一用 `bun run`）

| 命令                                | 说明                                                      |
| ----------------------------------- | --------------------------------------------------------- |
| `bun run tauri:dev`                 | 启动桌面应用开发（自动拉起 vite dev）                     |
| `bun run tauri:build`               | 打包发布版本                                              |
| `bun run dev` / `build` / `preview` | 纯前端开发 / 构建 / 预览                                  |
| `bun run check`                     | svelte-check 类型检查                                     |
| `bun run check:rust`                | cargo check                                               |
| `bun run lint:all`                  | eslint + stylelint + `cargo clippy -D warnings`           |
| `bun run format:all:check`          | prettier --check + cargo fmt --check                      |
| `bun run validate`                  | 完整验证：lint + 格式 + Rust + 类型检查（改动后必须通过） |

## 前端模块

前端功能按模块组织在 `src/lib/` 下，每个模块由类型契约、实现与统一出口三部分构成（详见各模块小节）。

### 状态管理（stores）

位于 `src/lib/stores/`：基于 Svelte `writable` 的增强型 store 工厂。

| 文件       | 职责                                                                              |
| ---------- | --------------------------------------------------------------------------------- |
| `types.ts` | 类型契约：`StorageType` 枚举、`StorageAdapter`、`PersistOptions`、`Store<T>` 接口 |
| `utils.ts` | `createStore` 工厂实现（含 local/session 适配器）                                 |
| `index.ts` | 统一出口：重导出工厂与类型，并集中实例化业务 store                                |

#### 创建 store

```ts
import { createStore } from "$lib/stores";

// 纯内存 store
const count = createStore<number>(0);

// 持久化：字符串简写，key 为 "theme"，介质默认 Local
const theme = createStore("light", { persist: "theme" });

// 持久化：完整对象配置（指定介质）
const status = createStore(() => ({ splashscreen: true }), {
  persist: { key: "status", storage: StorageType.Session },
});

// 值变更回调（与持久化相互独立，无绑定关系）
const countWithLog = createStore<number>(0, {
  subscribe: (value) => console.log("count:", value),
});
```

- `initial` 支持字面量或惰性函数（惰性函数在创建时执行一次）
- `persist` 为字符串时视为 key（介质默认 `Local`）；为对象时可指定 `key` 与 `storage`（`StorageType.Local` / `StorageType.Session`）
- `subscribe` 为值变更回调，注册为内部订阅者：创建时执行一次，此后每次 `set`/`update`/`reset` 后触发，接收新值

#### 使用 store

- 组件内用 `$store` 语法自动订阅（`{$store}` 读取）；`$store = value` 等价 `store.set(value)`（需整体赋值）
- `store.set(value)` / `store.update(fn)` / `store.get()` / `store.reset()`
- 对象型 store 的字段级 input 绑定无法使用 `bind:value={$store.field}`（Svelte 不支持 store 成员表达式绑定），需用 `value={$store.field}` + `oninput` + `update()` 组合，或采用「父组件订阅 + props 切片」模式
- 修改对象型 store 单项字段：`store.update((s) => ({ ...s, field: newValue }))`；通知所有订阅者是预期的（DOM 更新仍细粒度），设置项多时用 props 切片收窄子组件重跑

#### 持久化行为

- 创建时从存储读取数据（hydrate）；条目缺失或 JSON 损坏时静默回退初始值
- 首次创建且条目缺失时立即写入默认值，保证存储与内存一致
- `set`/`update` 同步写入，写入失败（配额满、隐私模式等）静默忽略，不影响内存状态
- `reset()`：删除存储条目 → 内存恢复默认值 → 写回默认值（存储条目始终存在）

#### 新增业务 store 的约定

- 值类型定义在 `types.ts`，实例化在 `index.ts` 并统一导出
- 命名不带 store 后缀（如 `settings`、`status`）
- 异步/复杂业务逻辑（如 Tauri IPC 调用）不放入工厂，由具体业务 store 自行实现

> 其他模块（如 IPC 封装、主题切换等）后续按此结构补充。

## 约定与注意事项

- **前端模块结构**：每个前端模块位于 `src/lib/<模块名>/`，遵循「类型契约 → 实现 → 统一出口」三段式：
  - `types.ts`：类型契约（接口/枚举/类型），与实现解耦
  - 实现文件（如 `utils.ts`）：核心逻辑，按职责拆分
  - `index.ts`：统一出口——重导出模块公开 API，并集中实例化业务实例（如 store）
  - 消费方统一从 `$lib/<模块名>` 导入，禁止跨模块内部文件引用
  - 新增模块时，同步在 AGENTS.md「前端模块」章节添加对应小节（文件职责表 + 用法 + 约定），「目录结构」添加模块目录及说明
- **新增 IPC 命令**：在 `src-tauri/src/lib.rs` 添加 `#[tauri::command]` 函数 → 注册到 `invoke_handler` → 前端用 `invoke()` 调用；如涉及新权限需同步修改 `capabilities/`
- **CSP**：`tauri.conf.json` 中 dev/prod 两套 CSP；prod 无 `unsafe-inline`，若前端需访问外部服务，必须同步更新 CSP 对应字段
- **端口**：dev 固定 1420（HMR websocket 1420/1421），与 vite.config.ts 及 CSP 一致，修改需三处同步
- **lib.rs 中 Linux Wayland 处理**（`WEBKIT_DISABLE_DMABUF_RENDERER`）为必要 workaround，勿删除
- **格式化规范**：prettier `printWidth: 128` 与 rustfmt `max_width: 128` 对齐；缩进 JS/JSON 2 空格、Rust/TOML 4 空格（.editorconfig）
- **Cargo profile**（Cargo.toml）：dev 主代码 `debug = "full"`，依赖 `opt-level = 1` + `line-tables-only`；release 为 `opt-level "s"` + fat LTO + `panic = "abort"` + `strip = "symbols"`（体积优先）
- **许可证**：GPL-3.0-only（package.json / Cargo.toml / LICENSE 三处一致）

## 对 Agent 的规则

1. 包管理一律使用 bun，不要手工编辑 `Cargo.lock` / `bun.lock`
2. 新依赖用 `bun add` / `cargo add` 添加（自动更新锁文件）
3. 改动完成后必须运行 `bun run validate`，全部通过才算完成
4. 不要修改生成目录：`build/`、`.svelte-kit/`、`target/`、`node_modules/`、`src-tauri/gen/`
5. 提交前注意 husky 钩子会自动运行 lint-staged 与 clippy

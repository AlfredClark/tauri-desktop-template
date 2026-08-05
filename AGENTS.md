# AGENTS.md

## 项目说明

本项目是基于 Tauri 2 的桌面应用开发模板，前端使用 SvelteKit 5 + TypeScript，后端使用 Rust。项目已集成托盘、全局快捷键、开机自启、单实例、自动更新、多语言、日志等桌面应用常见能力，可作为新桌面应用项目的起点。

## 技术栈

- **前端**：SvelteKit 5 / Svelte 5 / TypeScript / Vite / Tailwind CSS v4 / shadcn-svelte，包管理器 bun
- **后端**：Tauri 2 / Rust（edition 2024），Cargo workspace（成员为 `src-tauri`）
- **国际化**：前端 Paraglide（inlang），后端 rust-i18n
- **集成能力**：系统托盘、全局快捷键、开机自启、单实例、自动更新、通知、日志
- **质量工具**：ESLint / Stylelint / Prettier / Clippy / rustfmt / Husky + lint-staged
- **授权**：GPL-3.0-only

## 项目结构

```
├── .github/                        # CI / Release 工作流（ci.yml / release.yml）
├── src/                            # 前端（SvelteKit + TypeScript）
│   ├── components/                 # 业务组件（按功能分类，含简单与复杂组件）
│   │   └── ui/                     # shadcn-svelte 生成组件（仅经 CLI 添加，components.json 管理）
│   ├── libs/                       # 前端模块库
│   │   ├── errors/                 # 错误处理
│   │   ├── i18n/                   # 国际化（Paraglide 编译产物与消息文件）
│   │   ├── ipc/                    # Tauri 命令调用封装（invokeCommand + 类型定义）
│   │   ├── logger/                 # 日志（对接 tauri-plugin-log）
│   │   ├── stores/                 # 全局状态
│   │   ├── updater/                # 自动更新
│   │   └── utils/                  # 可复用散装工具（跨模块通用）
│   ├── routes/                     # 页面与布局（+layout.svelte / +layout.ts / +page.svelte）
│   ├── styles/                     # 样式（app.css 为唯一入口；themes/ 存放主题文件）
│   ├── app.html                    # 应用 HTML 模板（首帧 lang 硬编码）
│   └── hooks.client.ts             # 客户端钩子
├── src-tauri/                      # 后端（Rust，Cargo workspace 成员）
│   ├── capabilities/               # Tauri 权限配置（default / plugins）
│   ├── locales/                    # rust-i18n 语言文件
│   ├── src/
│   │   ├── commands/               # Tauri 命令（config / demo）
│   │   ├── cores/                  # 核心模块
│   │   │   ├── autostart.rs        # 开机自启
│   │   │   ├── config.rs           # 配置管理
│   │   │   ├── env.rs              # 环境信息
│   │   │   ├── instance.rs         # 单实例
│   │   │   ├── locale.rs           # 系统语言
│   │   │   ├── logger.rs           # 日志
│   │   │   ├── panic.rs            # panic 处理
│   │   │   ├── response.rs         # 统一响应
│   │   │   ├── shortcut.rs         # 全局快捷键
│   │   │   └── tray.rs             # 系统托盘
│   │   ├── features/               # 业务功能模块（新增功能放此处）
│   │   ├── lib.rs                  # 应用初始化
│   │   └── main.rs                 # 程序入口
│   ├── build.rs                    # Tauri 构建脚本
│   └── tauri.conf.json             # Tauri 应用配置
├── static/                         # 前端静态资源
├── .editorconfig                   # 编辑器统一风格
├── .gitattributes                  # Git 属性
├── .gitignore                      # Git 忽略规则
├── .husky/pre-commit               # 提交钩子（lint-staged）
├── .prettierignore                 # Prettier 忽略规则
├── .prettierrc                     # Prettier 配置
├── .stylelintignore                # Stylelint 忽略规则
├── .stylelintrc.json               # Stylelint 配置
├── bun.lock                        # bun 依赖锁定
├── Cargo.lock                      # Rust 依赖锁定
├── Cargo.toml                      # workspace 根：成员、lints、profile
├── cliff.toml                      # git-cliff 变更日志生成配置
├── eslint.config.ts                # ESLint 配置
├── LICENSE                         # GPL-3.0-only
├── package.json                    # 前端依赖与脚本（bun）、lint-staged
├── README.md                       # 项目说明
├── rust-toolchain.toml             # Rust 工具链版本固定
├── rustfmt.toml                    # rustfmt 配置
├── svelte.config.ts                # SvelteKit 配置
├── tsconfig.json                   # TypeScript 配置
└── vite.config.ts                  # Vite 配置
```

## 后端开发规范（src-tauri）

### 架构分层

- **main.rs**：仅委托调用 `lib.rs::run()`，不含业务逻辑
- **lib.rs**：薄层——仅声明模块、组装 Builder、注册命令；不写业务逻辑
- **commands/**：IPC 命令薄层——参数校验 → 调 features/cores → 转 `Response<T>`；不写业务逻辑
- **features/**：业务功能模块——**新增功能的业务逻辑一律放此处**，每功能一个模块、单一职责
- **cores/**：核心功能模块——仅保留系统级核心能力（配置、日志、托盘、快捷键、单实例、panic、环境、语言、统一响应），不承载业务
- **依赖方向**：单向 `lib.rs → commands → features → cores`（commands 可直接调用 cores 的系统能力）

### 命令（commands/）

- **命令签名**：所有 IPC 命令一律 `#[tauri::command]` + `pub fn` + 返回 `Response<T>`
- **业务入口**：需要前端交互的业务，commands 作为入口薄层调用 features 的业务函数
- **命令注册**：新增命令后追加到 `commands/mod.rs` 的 `invoke_handlers!` 宏（lib.rs 无需改动）
- **文档示例**：函数文档注明前端调用示例（如 `invokeCommand("set_locale", { locale: "zh-CN" })`）

### 统一响应协议

- **响应协议**：所有命令返回 `Response<T>`——`code=0` 成功（data 有值）、`code!=0` 失败，invoke 永不 reject
- **类型转换**：cores/features 层返回 `AppResult<T>`（`Result<T, AppError>`），命令层经 `From` 自动转为 `Response<T>`
- **错误码**：一律使用常量（`CODE_OK` / `CODE_ERROR`），不写魔法数字

### features 模块约定

- **模块结构**：每个功能一个模块，模块内函数返回 `AppResult<T>`，不直接构造 `Response`
- **能力复用**：可复用 cores 的系统能力（配置、日志、i18n），只调其公开接口，不重写
- **模块文档**：`//!` 说明职责与涉及的真相源

### cores 模块约定

- **模块三要素**：`plugin()` 插件装配、`setup()` 初始化、业务函数；`setup` 统一注册进 `cores/mod.rs::setup_cores`
- **启动前置例外**：`env::init_env()`（Linux Wayland DMABUF workaround，勿删）与 `panic::init_hook()` 无 plugin()/setup()，须在 Builder 创建前于 lib.rs 显式调用，不纳入 setup_cores
- **错误分级**：可恢复错误不阻断启动（`log::warn!` 后继续，如自启/快捷键同步失败）；关键错误返回 `Err` 阻断
- **损坏恢复**：配置损坏备份为 `*.corrupt` 后重建，不阻断启动
- **插件装配**：需业务配置/事件的插件经 cores 的 `plugin()` 统一封装（如 `config::plugin()` 装配 store、`logger::plugin()` 配置日志目标、`shortcut::plugin()` 注册快捷键 handler），lib.rs 仅链式调用，不写插件细节
- **官方插件**：无需定制的插件（opener/process/notification/system-fonts/updater）直接在 lib.rs 以 `tauri_plugin_xxx::init()` 注册
- **注册顺序**：单实例插件置于链首——尽早注册单例锁，避免窗口建好后回调竞态
- **职责分离**：事件/回调逻辑放 plugin()（如快捷键 handler、单实例聚焦回调），setup() 只做初始化与状态同步，不混写
- **权限同步**：新增插件且前端需调用其 API 时，同步在 `capabilities/plugins.json` 追加权限（如 `global-shortcut:default`）

### 系统级配置持久化

- **真相源**：`config.json`（应用数据目录）为系统级配置唯一真相源；前端 UI 偏好归前端 stores（localStorage）模块，两类配置不混用
- **持久化机制**：经 tauri-plugin-store 读写（`app.store()`），`ConfigState` 缓存于 Tauri State 注入，避免重复读文件
- **key 定义**：一律定义为常量 `KEY_*`，跨层使用 `pub(crate)`，不写字符串字面量
- **读取约定**：必须带默认回退（缺失/非法值返回默认值），如 `read_bool` / `read_locale`
- **写入约定**：写后立即落盘；落盘失败回滚内存缓存，保证内存态与持久化一致
- **副作用顺序**：需同步 OS 的配置（自启/托盘）先 OS 生效再写回 config，失败不落盘，避免两侧不一致
- **损坏恢复**：损坏不阻断启动——备份为 `*.corrupt` 后重建默认配置

### 日志约定

- **日志库**：使用 `log` crate（前端经 tauri-plugin-log 共用同一链路）
- **消息前缀**：日志消息带 `[模块名]` 前缀（如 `[config]`、`[tray]`、`[panic]`）
- **级别**：`info` 正常事件 / `warn` 可恢复失败 / `error` 出错

### 文档注释

- **模块注释**：`//!` 职责 + 真相源约定 + 已知边界
- **函数注释**：功能描述 + `@param` + `@returns`
- **决策注释**：关键决策写"为什么"注释（如"先 OS 生效，失败直接返回，不写回 config"）

### 国际化

- **注册**：`rust_i18n::i18n!("locales", fallback = "en")` 宏在 lib.rs 顶部注册，新增语言只需新增 `locales/{lang}.yml`
- **文案**：一律经 `t!("key")` 取，不硬编码中英文；消息源加在 `locales/*.yml`（缺失回退 `en`）
- **语言校验**：语言标签经 `Locale` 新类型校验，非法值拒绝写入

### 质量门槛

- **全局校验**：修改代码后运行 `bun run validate`（见「校验约定」）
- **格式化与检查**：提交前通过 `cargo fmt` 与 `cargo clippy -- -D warnings`
- **单元测试**：涉及状态/副作用的逻辑可加 `#[cfg(test)]` 单元测试（参考 `cores/panic.rs`）

### 注意事项

- **依赖添加**：新增 Rust 依赖统一加到 `src-tauri/Cargo.toml`；与前端成对的 Tauri 能力需同步 npm 包与 capabilities 权限（见前端注意事项）

## 前端开发规范（src）

### 架构与模块

- **SPA 模式**：`+layout.ts` 关闭 SSR（`ssr = false`）；adapter-static + fallback 单页渲染，适配 Tauri 本地文件加载
- **routes/**：页面与布局（+page.svelte / +layout.svelte）
- **components/**：业务组件目录——简单与复杂组件均放此处（不再按复杂度分层），内部按功能分类（svelte.config.ts 已预留 `$components` 别名）
- **components/ui/**：shadcn-svelte 生成组件（`$components/ui` 别名）——经 `bunx shadcn-svelte add <name>` 拉取，源码即项目代码可直接修改；**生成区禁手动添加组件**，需定制的基础组件放 components 对应功能分类；别名配置见 components.json（ui=$components/ui、utils=$libs/utils/shadcn）
- **libs/**：前端模块库，每模块的文件约定——`index.ts` 统一出口、`core.ts` 实现、`types.ts` 类型契约
- **模块出口**：`index.ts` 仅重导出（`export { x } from "./core"` + `export * from "./types"`），不写实现；无自有类型契约可省略 `types.ts`（如 logger/updater 复用 npm 包类型）
- **散装工具**：跨模块通用、无业务归属的小函数放 `$libs/utils`（复用性强的独立函数，不绑定具体业务模块）
- **别名**：`$libs` → `src/libs`、`$components` → `src/components`（svelte.config.ts）

### UI 组件规范（shadcn-svelte）

- **优先复用**：为保证风格统一，UI 一律尽可能使用 shadcn-svelte 已有组件（`$components/ui`）；缺失的组件经 `bunx shadcn-svelte add <name>` 添加，确需定制的基础组件才手写（放 components 对应功能分类）
- **禁止覆盖**：`add` 添加组件时不覆盖已有组件（不使用 `-o/--overwrite`，避免冲掉本地定制）；已有组件的升级另行处理（确认差异后手动合并，或作为新组件引入）
- **样式外置**：`src/components/ui` 中的组件源码尽可能避免影响逻辑的修改——样式定制优先经组件 `class` 属性（cn 合并）与外部 class 解决，源码仅在确需改变行为时修改

### 状态管理（stores）

- **createStore**：UI 偏好状态一律经 `$libs/stores` 的 `createStore` 创建（Writable 兼容 + `get`/`reset` 增强）
- **类型定义**：持久化相关类型（`PersistOptions` / `StorageType` / `StorageAdapter`）写入 `types.ts`
- **初始化导出**：具体 store 实例在模块 `index.ts` 中用 `createStore` 初始化并导出，业务直接 import 使用
- **持久化**：UI 偏好经 localStorage/sessionStorage（JSON）持久化，写入失败静默不影响内存；**系统级配置归后端 config.json，两类配置不混用**
- **Svelte 5**：响应式用 `$state` 声明；事件绑定用 `onclick` 属性；初始化放 onMount（Tauri IPC 在 load 阶段会触发 fetch 检查误报）

### IPC 调用

- **封装**：一律经 `$libs/ipc` 的 `invokeCommand<T>(command, args?)`，不直接调 `invoke`
- **解包**：自动解包统一响应——业务失败返回 null 并写日志；调用处用 `?? 默认值` 兜底
- **参数**：args 键名与 Rust 命令参数一致（Tauri 驼峰转换）
- **类型对齐**：前端接口（`Response<T>` / `SystemConfig`）与 Rust 侧 cores 一一对应，后端类型变更时同步更新 types.ts

### 错误处理

- **三层拦截**：window error（capture 阶段，含资源加载失败）+ unhandledrejection + svelte:boundary（渲染边界 + 手动重试按钮）；SvelteKit `handleError` 经 hooks.client.ts 接入
- **注册时机**：`initErrorHooks()` 在 hooks.client.ts 模块作用域调用（早于任何渲染，捕获最早异常）
- **防循环**：错误日志写入必须静默容错（`.catch(() => {})`），错误钩子带防重入守卫，避免日志失败触发 rejection 无限循环
- **边界 UI**：渲染边界回退提示文案经 `m.xxx()` 国际化

### 日志约定

- **日志库**：经 `$libs/logger`（重导出 @tauri-apps/plugin-log）写入，与后端共用同一链路（LogDir 落盘）
- **初始化**：应用启动（+layout.svelte onMount）调用 `initLogger()` 一次（attachConsole 控制台镜像）
- **消息前缀**：日志消息带 `[模块名]` 前缀，与后端风格对齐（如 `[ipc]`、`[error]`）

### 国际化

- **文案**：一律经 paraglide 编译产物 `m.xxx()` 取，不硬编码（+page.svelte 演示文案除外）；动态文案用 `ParaglideMessage` 组件
- **消息源**：`messages/{locale}.json`；新增语言需同步 `project.inlang/settings.json` 的 locales；改动后运行 `bun run i18n:compile`
- **locale 真相源**：config.json（后端）为准；`changeLocale` 先写后端成功才切前端（双写）；`syncLocale` 启动时同步，失同步以 config 为准 reload 自愈
- **首帧**：app.html 硬编码 lang="en"，由 syncLocale 运行期更新 `document.documentElement.lang`

### 注意事项

- **成对依赖**：前端用到的 Tauri 能力需 npm 包 + Rust 侧 tauri-plugin 依赖 + `capabilities/plugins.json` 权限三者齐备（如 notification/updater/system-fonts）
- **构建配置**：vite dev 端口固定 1420（strictPort），与 tauri.conf.json 的 devUrl/CSP 一致；watch 忽略 `src-tauri`；改端口需同步改 tauri.conf.json
- **Tailwind v4**：经 `@tailwindcss/vite` 插件编译（vite.config.ts，无 postcss 配置）；`src/styles/app.css` 为唯一入口（`@import "tailwindcss"` + `@import "./themes/default.css"`）；**主题真相源在 `src/styles/themes/`**（shadcn 语义 token + `@theme inline` 映射，换主题只改主题文件）；新增主题在 themes/ 下直接以名字命名（default.css、blue.css…），app.css 追加 import，运行期经 `data-theme` 切换；`@theme`/`@custom-variant`/`@apply` 等 at-rule 与 oklch 数字写法已在 stylelint 豁免（.stylelintrc.json）
- **CSP**：bits-ui 浮层组件（popover/dropdown/tooltip）经 floating-ui 内联 style 定位，生产 csp 的 style-src 必须含 `'unsafe-inline'`（已配置，勿删）
- **主题**：深色模式为 class 策略——`document.documentElement` 挂 `.dark`（styles/app.css `@custom-variant dark`）；主题偏好经 `$libs/stores` 的 themeStore（`system | light | dark`，localStorage 持久化）+ `applyTheme()` 应用（+layout.svelte onMount 挂载）
- **prettier**：prettier-plugin-tailwindcss 自动排序 Tailwind 类（`tailwindStylesheet` 指向 src/styles/app.css，插件顺序 svelte 在前）
- **eslint 豁免**：`src/components/ui/**` 关闭 `svelte/no-navigation-without-resolve`（按钮类组件 href 为动态绑定，规则误报）
- **质量门槛**：提交前通过 `bun run validate`（见「校验约定」）

## 校验约定

- **validate 命令**：每次修改代码后运行 `bun run validate`——包含 lint:all（eslint + stylelint + clippy -D warnings）、format:all:check（prettier + rustfmt --check）、check:rust（cargo check）、check（svelte-check）
- **提交门禁**：pre-commit 钩子（husky + lint-staged）自动修复暂存文件的格式；validate 作为改动完成后的最终校验

## Git 约定

- **提交规范**：提交信息遵循 Conventional Commits（英文），git-cliff 据此解析生成 changelog（cliff.toml）——类型为 `feat` / `fix` / `refactor` / `docs` / `style` / `test` / `perf` / `ci` / `chore` / `revert`，可带 scope；breaking 变更在 message 中标注 `!`
- **提交方式**：提交信息由开发者手动填写，AI 代理只完成代码改动、不代写提交

## 版本发布

- **版本号同步**：`package.json`、`src-tauri/Cargo.toml`、`tauri.conf.json` 三处 version 保持一致（当前均 0.1.0）
- **发布流程**：推送 tag（如 `v0.2.0`）触发 release.yml——tauri-action 三平台构建（linux/macos/windows）+ git-cliff 生成 CHANGELOG 写入 release notes
- **签名密钥**：自动更新安装包签名需在仓库配置 `TAURI_SIGNING_PRIVATE_KEY` secret

## 新增功能流程

- **后端**：`features/` 写业务逻辑（返回 `AppResult<T>`）→ `commands/` 写命令（校验 + 调 features + 转 `Response<T>`）→ 追加 `invoke_handlers!` 宏 → 文案加 `locales/*.yml`；涉及新能力时同步 Cargo.toml 依赖与 capabilities 权限
- **前端**：`ipc/types.ts` 对齐新增返回类型 → `invokeCommand` 调用 → 文案经 `m.xxx()` 并加入 `messages/*.json` → 运行 `bun run i18n:compile`；UI 偏好经 `$libs/stores` 持久化；UI 基础组件经 `bunx shadcn-svelte add <name>` 拉取到 `$components/ui`（不覆盖已有组件）
- **收尾**：运行 `bun run validate` 通过后，由开发者按 Conventional Commits 手动提交

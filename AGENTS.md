# AGENTS.md

> 基于 Tauri v2 + SvelteKit 2 + Svelte 5 + Tailwind CSS v4 + shadcn-svelte + Paraglide + tauri-specta 的桌面应用模板。

## 强制工作流（每次修改后必做）

> **硬性规则：任何文件改动（前端 / 后端 / 配置 / 文案 / 文档）完成后，都必须先 `pnpm format`，再 `pnpm validate`；两者全部通过之前不得宣称完成、不得提交。**

1. 按改动类型补齐生成步骤（两者都不在 `pnpm validate` 内）：
   - 改前端 `messages/` 文案 → `pnpm i18n:compile`；
   - 改后端命令（新增 / 改签名 / 改 `collect_commands!` 注册）→ `cargo test --manifest-path Cargo.toml` 重新生成 `bindings.ts`。
2. `pnpm format`：自动修复前端 Prettier + ESLint 与后端 `cargo fmt`。
3. `pnpm validate`：`lint` + `check` + `test`，必须全绿（覆盖 `prettier --check`、`eslint`、`cargo fmt --check`、`clippy -D warnings`、`cargo check`、`svelte-check`、`vitest`）。
4. 失败时修完再重跑。不得用 `--no-verify` 绕过 git 钩子，也不得把格式化留给 pre-commit 钩子或 CI——钩子只覆盖暂存文件，是最后防线而非替代。

- `pnpm validate` **不包含** `cargo test`（后端单测）与任何生成步骤，所以第 1 步不可省略。
- 改完后端逻辑即使不涉及命令签名，也要跑 `cargo test`（它会重写绑定并执行后端测试），再按上述流程验证。

## 项目架构

### 目录结构

```text
tauri-desktop-template/
├── src/                            # 前端：SvelteKit 单页应用（adapter-static + fallback: index.html）
│   ├── app.html                    # HTML 外壳，SvelteKit 在此注入脚本与样式
│   ├── assets/                     # 需要经构建处理的资源（预留目录，别名 $assets）
│   ├── routes/                     # 页面与全局样式
│   │   ├── +layout.svelte          # 根布局：ModeWatcher（主题）+ ErrorBoundary（渲染异常）包裹全部页面
│   │   ├── +layout.ts              # ssr = false（SPA 模式）+ 首帧前对齐界面语言的 load()
│   │   ├── +page.svelte            # 演示页：主题切换 / 命令调用 / 语言切换 / 崩溃演练
│   │   └── layout.css              # Tailwind v4 入口与 shadcn-svelte 主题令牌（含 .dark 暗色变体）
│   ├── components/
│   │   ├── common/                 # 手写共享组件（ErrorBoundary.svelte）
│   │   └── shadcn-svelte/          # CLI 生成的 UI 组件（nova / neutral / lucide），勿手动重组
│   └── libs/
│       ├── commands/               # tauri-specta 契约链（见「前端 ↔ 后端契约」）
│       ├── i18n/                   # Paraglide：messages/ 文案、project.inlang/ 配置、paraglide/ 生成物
│       ├── utils/                  # shadcn-svelte.ts（cn() 类名合并）等前端工具
│       └── hooks/                  # 预留目录（别名 $hooks），目前为空
├── src-tauri/                      # 后端：Rust（edition 2024）
│   ├── src/
│   │   ├── main.rs                 # 二进制入口，仅转发到 lib::run()
│   │   ├── lib.rs                  # 串联插件注册 → 命令处理器 → 核心初始化
│   │   ├── commands/               # 命令封装层：薄封装 + collect_commands! 注册
│   │   ├── cores/                  # 通用能力与跨层共享类型（types / locale / config / specta / system）
│   │   ├── features/               # 业务逻辑（纯函数，不依赖 Tauri 运行时）
│   │   ├── plugins/                # 各 Tauri 插件的初始化（log / store / opener / updater）
│   │   └── utils/                  # 预留工具目录
│   ├── locales/                    # rust-i18n 后端文案（*.yml）
│   ├── capabilities/               # 权限配置（default.json / plugins.json），外部 URL 需同步更新
│   ├── icons/                      # 应用图标（由 pnpm tauri:icon 生成）
│   ├── build.rs                    # tauri-build 构建脚本
│   ├── tauri.conf.json             # 窗口 / CSP / 打包目标 / updater 配置
│   └── Cargo.toml                  # 后端依赖与 crate 元信息
├── static/                         # 原样拷贝到产物根目录的资源（favicon / 图标 / svg）
├── .github/workflows/              # ci.yml（质量门禁）、release.yml（打包发布）
├── Cargo.toml                      # 虚拟工作区 + 全局 lints / profile
├── package.json                    # 脚本与前端依赖
├── svelte.config.ts                # adapter-static、路径别名（唯一来源）
├── vite.config.ts                  # Vite + SvelteKit + Tailwind + Paraglide 插件，固定端口 1420
├── vitest.config.ts                # 单元测试配置（复用 sveltekit() 插件以继承别名）
└── 其余根配置                      # eslint / prettier / commitlint / cliff / rustfmt / rust-toolchain
```

### 分层与调用链

```text
Svelte 组件 ──▶ src/libs/commands         链式 API：取值 / 分支 / 事务
                     │ invoke("xxx")
                     ▼
              commands/（Rust 薄封装）      参数与结果转换、注册进 collect_commands!
                     │
                     ▼
              features/ · cores/          业务逻辑与通用能力
```

- 后端分层：`commands`（薄）→ `features`（业务逻辑）/ `cores`（跨层共享能力：类型、语言、配置、绑定导出、系统初始化）。
- 前端分层：组件只通过 `libs/commands` 的链式 API 调用后端，不出现裸 `invoke`。

### 关键机制

- **路径别名**：`$assets`、`$components`、`$hooks`（即 `$libs/hooks`）、`$libs`。**唯一来源是 `svelte.config.ts` 的 `kit.alias`**——`@sveltejs/kit/vite` 会把它注入 Vite，`vitest.config.ts` 复用同一插件因而同样继承；不要再往 `vite.config.ts` 复制一份（复制就会漂移）。
- **国际化双轨制**：前端 Paraglide（`src/libs/i18n/project.inlang/`，策略 `localStorage` + `baseLocale` 基准语言），后端 `rust-i18n`（`src-tauri/locales/*.yml`，`fallback = "en"` 回退语言为英文）。
- **Paraglide 编译选项的唯一来源**是 `src/libs/i18n/project.inlang/paraglide.config.ts`：CLI（`pnpm i18n:compile`）与 vite 插件都读取它，**不要**再把参数写进 `package.json` 或 `vite.config.ts`（两边各写一份必然漂移）。该文件需要 `git add -f`——inlang 会在项目目录内生成「除 settings.json 外全部忽略」的 `.gitignore`。
- **界面语言数据流**：唯一持久化点是后端 `config.json` 的 `locale` 键（`cores/config.rs`），取值类型为 `cores/locale.rs` 的 `Locale` 枚举，经 specta 导出为 `"en" | "zh-CN"` 联合类型——前后端共用一个类型，不要再用裸 `string` 或类型断言。启动时 `cores::config::setup` 先读持久化值，缺失则用 `tauri_plugin_os::locale()` 探测系统语言并落库（该依赖仅作 Rust 侧函数调用，未注册插件、无 capability 变更），再 `rust_i18n::set_locale`；前端在 `+layout.ts` 的 `load()`（首帧渲染前）里调用 `getLocale` 对齐 Paraglide，必须带 `{ reload: false }`，否则启动即整页重载并出现语言闪烁。用户主动切换语言时 `commands.setLocale` 先落盘再改内存（写盘失败时运行时语言与磁盘保持一致），前端随后用默认的 `setLocale` 重载。
- **崩溃处理**：前端 `ErrorBoundary`（经 `@tauri-apps/plugin-log` 上报日志、堆栈仅 dev 显示）+ 后端 `cores/system.rs` 的 panic 钩子（日志 + `%TEMP%/my_app_crash.log` 文件兜底）。两者互不替代，不要另加并行机制。
- **安全边界**：CSP（内容安全策略，Content Security Policy）在 `tauri.conf.json` 的 `app.security` 中收紧；新增外部 URL 时需同步更新 `capabilities/*.json`（能力配置）与 CSP。

## 命令

包管理器为 `pnpm@11.25.0`，Node `>=24`；Rust 工具链锁定 `1.98.0`（见 `rust-toolchain.toml`）。

| 命令                                    | 用途                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`        | 按锁文件安装依赖                                                                                                                              |
| `pnpm tauri:dev`                        | 完整桌面联调：Vite（固定端口 1420）+ Tauri 窗口                                                                                               |
| `pnpm dev`                              | 仅启动前端（浏览器中 Tauri 命令不可用，会自动降级）                                                                                           |
| `pnpm build`                            | 仅构建前端，adapter-static 输出 SPA 到 `build/`（需先 `i18n:compile`）                                                                        |
| `pnpm tauri:build`                      | 完整打包；`pnpm tauri:build:local` 仅编译不打包（`--no-bundle`）                                                                              |
| `pnpm check`                            | `svelte-kit sync` + `svelte-check`（严格 TS 类型检查）；`check:watch` 为监听模式                                                              |
| `pnpm test`                             | vitest 单次运行；`test:watch` 为监听模式                                                                                                      |
| `pnpm lint`                             | 前端 + 后端；`lint:frontend` = `prettier --check .` + `eslint .`，`lint:backend` = `cargo fmt --check` + `clippy -D warnings` + `cargo check` |
| `pnpm format`                           | 自动修复两端的格式与可修复的 lint 问题                                                                                                        |
| `pnpm validate`                         | `lint` + `check` + `test`（**每次修改后必跑**，见「强制工作流」）                                                                             |
| `pnpm i18n:compile`                     | 编译前端国际化文案，改完 `messages/` 后必须执行；`i18n:translate` 走 inlang 机器翻译                                                          |
| `cargo test --manifest-path Cargo.toml` | 后端测试，同时重新生成 `src/libs/commands/bindings.ts`                                                                                        |
| `pnpm tauri:icon`                       | 由 `static/icon.png` 生成各平台图标                                                                                                           |
| `pnpm changelog`                        | git-cliff 生成变更日志；`changelog:preview` 仅预览未发布部分                                                                                  |
| `pnpm release`                          | bumpp 联动升级三处版本号（见「提交 / 发布」）                                                                                                 |
| `pnpm clean`                            | 清理构建产物；`clean:frontend` / `clean:backend` 分侧清理                                                                                     |

CI（`.github/workflows/ci.yml`）在 `main` 分支上按变更路径触发任务：

- **前端**：`i18n:compile` → `lint:frontend` → `check` → `test` → `build`。
- **后端**：`fmt --check` → `clippy -D warnings`（警告即错误）→ `check` → `test` → `git diff --exit-code src/libs/commands/bindings.ts`（绑定同步校验，防止改了后端命令却忘记重新生成绑定）。
- 门禁作业（`ci-passed`）同时拦截 `changes`（变更检测）作业的失败——它失败时前后端都会被跳过，只查前后端会漏放。

发布流水线（`.github/workflows/release.yml`）会校验 `tauri.conf.json` 中的版本号与 `v*` 标签一致。

## 前端 ↔ 后端契约（必须遵守）

1. 在 `src-tauri/src/features/<name>.rs` 实现业务逻辑，并在 `features/mod.rs` 中声明 `pub mod <name>;`。
2. 在 `src-tauri/src/commands/<name>.rs` 添加轻量封装，返回 `CommandResult`，同时标注 `#[tauri::command]` 和 `#[specta::specta]`，并加入 `collect_commands!`。
3. 运行 `cargo test` 重新生成 `src/libs/commands/bindings.ts`。**禁止手动编辑 `bindings.ts`**（已在 ESLint、Prettier 中忽略）。
4. 前端 Svelte 中一律使用链式 API 调用，禁止直接使用原生 `invoke`（命令调用）。`EnhancedCommand` 有三种用法：

   ```ts
   import commands from "$libs/commands";

   // 取值：失败或数据为 null/undefined 时回落默认值（默认值可省略，省略则得到 undefined）
   const msg = await commands.greet(name).value("Default");

   // 分支：需要自己按成败分支时拿完整结果
   const result = await commands.greet(name).result();

   // 事务：回调可为 async，await 整条链会等回调执行完
   await commands.setLocale(locale).success(onOk).failed(onFail);
   ```

   未注册 `.failed()` 的失败会自动上报日志（经 plugin-log 写文件），因此不会静默丢失；回调必须在 `await` / `value()` 之前链式注册（链式调用即注册）。

5. 后端错误统一使用 `CommandError::Internal(...)`（内部错误变体）；`anyhow::Error` 通过已有的 `From` 实现自动转换。前端 `.failed()` 回调收到的形状为 `{ kind, message }`（错误类型 + 错误信息）。

## 测试

- 运行器为 vitest（`vitest.config.ts` 复用 `sveltekit()` 插件，因此测试里可以直接用 `$libs` 等别名）。测试文件与源文件同目录、命名 `*.test.ts`（匹配 `src/**/*.{test,spec}.{js,ts}`）。
- 当前骨架只覆盖 node 环境的纯逻辑测试（`libs/utils`、`libs/commands`）；组件测试需要自行引入 `jsdom` + `@testing-library/svelte`（或 vitest 的 browser mode），并在 `vitest.config.ts` 里补 `environment`。
- 后端测试即 `cargo test`，它同时承担重新生成 `bindings.ts` 的职责。

## 国际化工作流

- 前端：在 `src/libs/i18n/project.inlang/` 下编辑文案，然后运行 `pnpm i18n:compile`。生成的 `src/libs/i18n/paraglide/` 已忽略提交——禁止编辑，也不要从别处导入其内部文件。用法：`m.hello_world({ name })`（消息函数）、`setLocale(locale)`（切换语言并重载；启动对齐场景传 `{ reload: false }`，见上文语言数据流）。
- 后端：编辑 `src-tauri/locales/*.yml`，使用 `rust_i18n::t!(...)` 宏取文案。

## 代码风格

- **前端**：Prettier（`double` 双引号、分号、2 空格缩进、行宽 100、LF 换行）+ ESLint（`js recommended`、`typescript-eslint recommended`、`svelte flat/recommended` + `flat/prettier`）。导入顺序强制要求：内建模块 → 第三方 → 类型 → `$assets`/`$hooks` → `$components` → `$libs` → 相对路径。Svelte 只用 5 代 runes 写法（`$state`/`$props`/`$effect`），新代码禁用旧式 store；样式使用 Tailwind v4 + `cn()` 合并类名，主题变量位于 `src/routes/layout.css`（Geist Variable 字体，经 `mode-watcher` 实现 `.dark` 暗色变体）。
- **后端**：`cargo fmt`（行宽 100、4 空格、`use_field_init_shorthand` 字段初始化简写、`use_try_shorthand` try 简写）+ Clippy `pedantic`（严苛）/`nursery`（实验）/`cargo` 检查组记为 `warn`，CI 中 `-D warnings`。`main.rs` 豁免 `clippy::module_name_repetitions`（模块名重复）；`commands/mod.rs` 豁免 `unnecessary_wraps`（不必要的封装）。
- **注释约定**：注释用中文，专有名词保留英文。后端用 `//!` 写模块职责、`///` 写导出项的契约与"为什么"、`//` 只解释非直观的取舍（不要复述代码）；文档注释里的标识符必须加反引号——Clippy 的 `doc_markdown` 会拦截 `WebKitGTK`、`AppImage` 这类驼峰词。前端用 TSDoc（`/** */`，短句保持单行），同样只在契约与非直观处注释；**不要在 TSDoc 里写代码示例**（prettier 的 jsdoc 插件会把它们重排成散文，示例请用 `//` 注释块），描述也别用英文小写标识符开头（`jsdocCapitalizeDescription` 会把首字母大写，如 `never[]` → `Never[]`，中文开头可规避）。
- **Prettier 的两处硬性约束**：`plugins` 数组中 `prettier-plugin-tailwindcss` **必须在最后**（其 README 的兼容性要求，它靠补丁协调其它插件）；`importOrderTypeScriptVersion` 必须与 `package.json` 的 `typescript` 版本同步（影响类型导入的合并行为）。
- **提交前钩子**（`lint-staged` 暂存区检查）：`*.{js,ts,svelte}` → `prettier --write` + `eslint --fix`；`*.{json,md,html,css,yml,yaml}` → prettier（范围必须与 CI 的 `prettier --check .` 保持一致，否则本地过了 CI 才报错）；`**/*.rs` → 对暂存文件执行 `cargo fmt` + 工作区级 `clippy -D warnings`。钩子只是提交前的最后防线——它看不到未暂存文件，也代替不了「强制工作流」里的 `pnpm format` + `pnpm validate`。

## 提交 / 发布

- 约定式提交（Conventional Commits），由 commitlint（`commit-msg` 钩子）强制：类型小写、描述非空，如 `feat: ...`（新功能）、`fix: ...`（缺陷修复）、`refactor: ...`（重构）、`chore(deps:update): ...`（依赖更新）。类型需与 `cliff.toml` 解析器对齐。
- **提交信息一律使用英文**：`type`、`scope`、描述与正文全部用英文书写（如 `feat(i18n): persist locale in backend`），不要写中文——即使本轮对话使用中文，也不要生成中文提交信息。
- 三处版本号联动升级，经 `pnpm release`（bumpp 版本提升工具）：`package.json` + `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml`。变更日志经 `git-cliff` 生成（`pnpm changelog`）。

## 同步点与注意事项

- **必须成对维护的配置**：
  - 两个 workflow 里 `dtolnay/rust-toolchain` 的 `toolchain: 1.98.0` ↔ `rust-toolchain.toml`。
  - `.prettierrc` 的 `importOrderTypeScriptVersion` ↔ `package.json` 的 `typescript`。
  - `.prettierignore` ↔ `.gitignore` 中的构建产物（Prettier 不读 `.gitignore`）。
  - CI backend 的 `changes` 路径过滤器 ↔ 新增的后端配置文件。
- 改完前端文案若跳过 `pnpm i18n:compile`，`pnpm build` / CI 会失败。
- Vite 开发服务器固定端口 `1420`，忽略监听 `src-tauri/**`，`clearScreen: false`（不清屏）以保留 Rust 日志。
- 构建产物（`target/`、`build/`、`.svelte-kit/`、`src-tauri/gen/`、`node_modules/`、`src/libs/i18n/paraglide/`）均已忽略提交；`src/libs/commands/bindings.ts` 虽是生成物但**需要提交**（CI 会校验它与后端源码同步）。
- `Cargo.lock` 需要提交；依赖升级走手动的 `chore(deps:update)` 提交（仓库不配置依赖更新机器人）。

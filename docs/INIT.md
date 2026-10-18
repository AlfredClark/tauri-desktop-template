# INIT.md — 模板派生项目初始化清单

> 面向 AI Agent 的**一次性初始化剧本**：把本模板（`tauri-desktop-template`）的全新副本变成
> 一个身份干净、脚手架已拔除的真实项目。
> 长期规范永远以 `AGENTS.md` 为准；本文件只覆盖「模板 → 新项目」这一段路，执行完毕可归档或删除。
> 本文件由一次真实初始化的差异复盘沉淀而来（派生项目身份已匿名化，实测差异量级见 §10）；
> 全文用占位符与变量名（如 `<SCHEME>` / `PROJECT_SLUG`）指代 §1 变量，模板侧不写死任何具体项目的值。

---

## 0. 使用方式

```text
读 AGENTS.md（第 3、5、9、10 章）→ Phase 0 收集变量（§1）→ Phase A→H 顺序执行 →
每个 Phase 收尾跑 pnpm format → 全部完成后跑 Phase G 验收矩阵（§9）+ pnpm validate → 按 Phase H（§11）汇报
```

**执行原则：**

1. **先收集变量，再动手**：Phase 0（§1）未完成前不得进入 Phase B；正文任何 `<VAR>` / 变量名出现处，
   必须先替换为 §1 已确认的真实值，禁止带着占位符改名、注册协议或轮换密钥。
2. **顺序不可换**：先改名与品牌（Phase B/C/D），后删脚手架（Phase E）。`about` 页测试与
   `productName` 耦合，Phase E 的残留扫描会顺带验证改名是否干净。
3. **只做去模板化**：不擅自新增业务功能、不顺手清理「看起来没用」的常驻能力（§8 白名单）。
4. **文档与代码冲突时以代码为准**，并在汇报里标注冲突点（模板文档可能落后于代码）。
5. **生成物只允许命令重生成**：`src/libs/commands/bindings.ts` 靠 `pnpm test:cargo`，
   `src/libs/i18n/paraglide/` 靠 `pnpm i18n:compile`，两者禁止手改。
6. **缺信息就问，且带着候选问**：§1 任何一项无法从仓库推导时，先按规则推导候选，再一次性
   向用户确认（见 §1.2 收集流程）；必填项未确认前宁可阻塞，不得臆测。
7. **文档不带模板尾巴**：`README.md` / `docs/README_zh-CN.md` 收尾时只留「语言跳转 + 标题 + 简介」，
   `AGENTS.md` 不保留脚手架移除流程（属模板侧知识，由本文件承载）；模板截图一律删除。

---

## 1. Phase 0 — 变量收集（执行前必须完成）

> 本文件正文的占位符与变量名都指向本表；值来自「仓库推导 + 用户确认」，模板侧永远保持占位形态。
> 确认后的变量表请随手留档（PR 描述、分支上的临时文件均可），跨会话执行时可原样恢复，避免重复询问。

### 1.1 变量表

| 变量           | 规则与约束                                                                                          | 推导候选（默认值）                                                             | 主要落点                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `PROJECT_SLUG` | kebab-case 包名；npm 规则：小写、无空格、不以 `.` / `_` 开头                                        | 仓库目录名，或 `git remote get-url origin` 的仓库名                            | `package.json` `name`；`Cargo.toml` `[package].name`；`cliff.toml` `remote.github.repo`；README / AGENTS 标题  |
| `PRODUCT_NAME` | 展示名，可含空格；含非 ASCII 时须在打包产物上目视验证                                               | 用户指定；草稿 = `PROJECT_SLUG` 去掉尾部 `-desktop` / `-app` 后 Title Case     | `tauri.conf.json` `productName`；`app.html` `<title>`；窗口 `title`；`about` 页两处测试                        |
| `IDENTIFIER`   | 反向域名，全局唯一（同机安装隔离 + store 路径隔离都认它）；避免 `com.tauri.*`；发布后再改等于换应用 | `io.github.<REPO_OWNER 小写>.<PROJECT_SLUG>`；有自有域名则 `<域名倒序>.<slug>` | `tauri.conf.json` `identifier`                                                                                 |
| `LIB_NAME`     | snake_case 的 Rust lib 名；合法标识符（不能数字开头，必要时加前缀）                                 | `<PROJECT_SLUG 的 - 换 _>_lib`                                                 | `Cargo.toml` `[lib].name`；`main.rs` 的 `lib::run()` 引用                                                      |
| `SCHEME`       | 深链协议名，小写 + 连字符；OS 级全局注册、撞名即串台，必须含项目可辨识片段                          | `PROJECT_SLUG` 去掉尾部 `-desktop` / `-app`                                    | `tauri.conf.json` `deep-link.desktop.schemes`；`cores/deep_link.rs`；`hooks/deep-link.svelte.ts`；两侧深链单测 |
| `CRASH_LOG`    | 崩溃日志文件名；`%TEMP%`（平台临时目录）根部多应用共享，同名互覆盖                                  | `<snake_case(PRODUCT_NAME)>_crash.log`                                         | `cores/system.rs` 的 `persist_fallback`；AGENTS §5.6；README / docs                                            |
| `REPO_OWNER`   | 仓库归属（GitHub 用户名，注意与账号大小写一致）                                                     | `git remote get-url origin` 的 owner 段；无 remote 则问用户                    | `package.json` 三处 URL；`cliff.toml` `owner`；`updater.endpoints`                                             |
| `DESCRIPTION`  | 一句话描述（英文、单行）                                                                            | 用户指定；草稿 `<PRODUCT_NAME> desktop application based on Tauri and Svelte.` | `package.json` / `Cargo.toml`                                                                                  |
| `KEYWORDS`     | 字符串数组：小写、无空格；Cargo 侧 ≤ 5 个且每个 ≤ 20 字符                                           | `["tauri", "desktop", <slug 分词>…]`（替换模板的 `template`）                  | `package.json` / `Cargo.toml`                                                                                  |
| `INIT_VERSION` | 语义化版本；新项目起点（与模板自身版本无关）                                                        | 默认 `0.1.0`；用户已有版本规划则从其                                           | `package.json` / `tauri.conf.json` / `Cargo.toml` 三处                                                         |

**附带确认项（与上表一起问，未确认前不落盘）：**

- **作者 / 版权**：默认沿用模板作者（模板 `package.json` 的 `author`）；更换时同步 `LICENSE`。
- **许可证**：模板为 `GPL-3.0-only`（见 §11 第 4 条）；是否更换由用户决定，闭源分发前必须评估传染性义务。

**示例（虚构，仅示意格式，勿直接采用）：** `acme-notes-desktop` → `Acme Notes` →
`io.github.acme.acme-notes-desktop` → `acme_notes_desktop_lib` → scheme `acme-notes` →
`acme_notes_crash.log`。

**推导命令参考：**

```bash
basename "$(git rev-parse --show-toplevel)"                 # PROJECT_SLUG 候选：仓库目录名
git remote get-url origin 2>/dev/null | sed -E 's#\.git$##' # REPO_OWNER / PROJECT_SLUG 候选：owner/repo
```

### 1.2 收集流程（Agent 必须执行）

1. **先推导，后询问**：按「推导候选」列的规则 / 命令算出候选值，不要空手问用户；无法推导的项
   标出「需用户提供」。
2. **一次性成组确认**：把候选值与来源整理成一张表，用一次成组提问交给用户（可整体接受或逐项
   覆盖）；不要一个变量一个问题。优先使用宿主 Agent 的提问机制（如选项式提问），无该机制时
   直接在对话里列出表格请用户逐项确认。
3. **缺信息处理**：必填项（`PROJECT_SLUG` / `PRODUCT_NAME` / `REPO_OWNER` / `IDENTIFIER` /
   `SCHEME`）不得臆测，问不到就阻塞；可推导项（`LIB_NAME` / `CRASH_LOG` / `KEYWORDS` /
   `INIT_VERSION`）采用推导默认，并在汇报里标注「取默认值」。
4. **回填与留档**：确认后把真实值填入 1.1 表（本文件副本随派生项目提交；模板仓库的本文件永远
   保持占位形态，不回填具体项目的值），并在收尾汇报中完整复述。
5. **改值要全量回查**：变量出现在包名、证书标识、协议注册、签名端点等多处；一旦确认后修改，
   必须按「主要落点」列全部重新替换一次，不允许只改一半。

**成组询问模板（可直接改写后发给用户）：**

```text
初始化前需要确认以下变量（括号内为按仓库推导的候选，可直接接受或逐项修改）：
1. PROJECT_SLUG（包名，kebab-case）：<候选>（来源：<仓库目录名 / git remote>）
2. PRODUCT_NAME（显示名）：<候选>
3. IDENTIFIER（反向域名，全局唯一）：<候选>
4. REPO_OWNER（GitHub 用户名）：<候选>
5. DESCRIPTION（一句话英文描述）：<候选>
6. SCHEME（深链协议）：<候选>
其余按推导默认：LIB_NAME=<推导值>、CRASH_LOG=<推导值>、KEYWORDS=<推导值>、INIT_VERSION=0.1.0；
作者与许可证默认沿用模板（GPL-3.0-only），如需更换请说明。
```

---

## 2. Phase A — 建立基线

1. 起点：GitHub `Use this template` 建库，或 `git clone` 后 `rm -rf .git && git init` 另起干净历史
   （二选一即定，模板历史是否保留溯源自选）。
2. `pnpm install --frozen-lockfile`；确认 `git status` 干净，从最新 `main` 拉分支 `chore/init`。
3. 基线自检：模板原状下 `pnpm validate` 应全绿，红则先修环境（Node ≥ 24 / pnpm 12.13.0 /
   Rust 1.99.0）再继续，避免把环境问题混进初始化提交。

**DoD：** 依赖装好、工作区干净、模板基线可跑。

---

## 3. Phase B — 改标识（漏任一项即带着模板身份发布）

> 下表 `PROJECT_SLUG` 等均指 §1 已确认值。

| 序号 | 文件                                 | 改动                                                                                                                                 |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| B1   | `package.json`                       | `name` → `PROJECT_SLUG`；`version` → `INIT_VERSION`；`description`；`homepage`；`repository.url`；`bugs.url`；`keywords`             |
| B2   | `src-tauri/Cargo.toml`               | `[package]` 的 `name` / `version` / `description` / `repository` / `keywords`；`[lib].name` → `LIB_NAME`                             |
| B3   | `src-tauri/src/main.rs`              | `tauri_desktop_template_lib::run()` → `LIB_NAME::run()`（B2 改名的连带引用，漏改即编译失败）                                         |
| B4   | `src-tauri/tauri.conf.json`          | `productName` / `identifier` / `version` / `app.windows[0].title`                                                                    |
| B5   | `cliff.toml`                         | `[remote.github]` 的 `owner` / `repo`                                                                                                |
| B6   | `src/app.html`                       | `<title>`（首帧标题，SvelteKit 之后不再覆盖）                                                                                        |
| B7   | `src/libs/i18n/messages/*.json`      | `page_home_intro`（含模板自述，改为本产品一句话介绍，en + zh-CN 两份）                                                               |
| B8   | `src/tests/component/...`            | `components/widget/about/app-info-section.component.test.ts` 与 `routes/(main)/about/page.component.test.ts` 的 `productName` 期望值 |
| B9   | `README.md` / `docs/README_zh-CN.md` | 标题与简介（两文件同改，避免漂移）；其余章节不在此处修补，Phase F 会整体瘦身                                                         |
| B10  | `AGENTS.md`                          | §1 项目概述（项目名称 / 一句话描述）、§3 目录树首行目录名                                                                            |

**DoD：**

```bash
rg -i "tauri-desktop-template|tauri_desktop_template|Tauri Desktop Template" \
  --glob '!**/node_modules/**' --glob '!**/images/**' --glob '!**/*.lock' .
# 期望：无命中（排除 node_modules / images / 锁文件；锁文件由依赖安装与构建自动更新）
pnpm check:sync && pnpm validate
```

---

## 4. Phase C — 换协议 / 密钥 / 兜底常量

**C1 深链 scheme（三处 + 两侧测试，OS 级全局注册，撞名即串台）：**

- `src-tauri/tauri.conf.json` → `plugins.deep-link.desktop.schemes` 改为 `SCHEME`
- `src-tauri/src/cores/deep_link.rs` → `SCHEME_PREFIX = "<SCHEME>://"`（含文件内单测的样例 URL）
- `src/libs/hooks/deep-link.svelte.ts` → `DEEP_LINK_SCHEME = "<SCHEME>"`
- `src/tests/unit/libs/hooks/deep-link.test.ts` 与 `cores/deep_link.rs` 的单测断言同步改

**C2 崩溃日志名：** `src-tauri/src/cores/system.rs` 的 `persist_fallback` 落盘文件名改为
`<CRASH_LOG>`（`%TEMP%` 根目录多应用共享，同名互覆盖）；连带改 `AGENTS.md` §5.6 与 README / docs 的提及。

**C3 更新密钥与端点（不换则验签失败，发版流水线必挂）：**

1. 生成新密钥对，落到用户目录下与项目同名的文件夹（`-w` 会同时写出私钥
   `~/<PROJECT_SLUG>/<PROJECT_SLUG>.key` 与公钥 `~/<PROJECT_SLUG>/<PROJECT_SLUG>.key.pub`，
   父目录自动创建；同名密钥已存在时会拒绝覆盖，确需轮换再加 `--force`）：

   ```bash
   pnpm tauri signer generate -w ~/<PROJECT_SLUG>/<PROJECT_SLUG>.key
   ```

   密码提示**直接回车两次**（留空即可：空密码密钥在更新签名链路与 CI 中都能正常使用，
   因此无需再配 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`）。执行环境没有可交互终端时（Agent 管道 / CI），
   用 `--ci` 等价跳过提示：`pnpm tauri signer generate --ci -w ~/<PROJECT_SLUG>/<PROJECT_SLUG>.key`。

2. 公钥**自动填入**：读取 `~/<PROJECT_SLUG>/<PROJECT_SLUG>.key.pub` 的内容，替换
   `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`（生成器 stdout 也会打印同一公钥）。
   用户若选择自行生成密钥，则由用户手动替换公钥，其余步骤不变。
3. `plugins.updater.endpoints` 改为新仓库的 `releases/latest/download/latest.json`。
4. 私钥配入新仓库 Secret `TAURI_SIGNING_PRIVATE_KEY`（`.github/workflows/release.yml` 引用名）：
   粘贴 `~/<PROJECT_SLUG>/<PROJECT_SLUG>.key` 的完整内容；空密码密钥不需要密码 Secret。
5. **提醒用户保存好私钥**（Agent 执行至此必须显式提示）：该文件是唯一能为更新签名的凭据，
   丢失后已发布的旧版本将无法验证任何新更新，请备份到密码管理器 / 加密存储。**密钥文件全程不入仓库**：
   `~` 下的路径天然在仓库外，不要复制进工作区、不要提交、不要粘贴进日志或聊天记录。

**DoD：** `cargo test`（深链单测）+ `pnpm test:vitest src/tests/unit/libs/hooks/deep-link.test.ts` 通过；
`rg "tdt://|my_app_crash" src src-tauri docs README.md` 无命中（模板旧值已全部替换）；
`git ls-files | rg '\.(key|pub)$'` 无命中，`~/<PROJECT_SLUG>/<PROJECT_SLUG>.key` 已生成且已提醒用户备份。

---

## 5. Phase D — 品牌与图标

1. **替换图标源**：准备本项目标识，替换 `static/icon.png` 或新增 `static/icon.svg`；**换格式时同步
   `package.json` 的 `tauri:icon` 脚本源路径**（模板脚本指向 `static/icon.png`，教训见 §10 经验 2）。
2. **重生成平台图标**：`pnpm tauri:icon`（脚本自带 `rimraf src-tauri/icons/{ios,android}`；
   `src-tauri/icons/` 下十余个二进制文件会被整体覆盖，属预期变更）。
3. **同步 favicon**：`static/favicon.png`（`src/app.html` 经 `/favicon.png` 引用，CSP 只放行 self）。
4. **内联图标组件**：`src/assets/icons/app-icon.svelte` 换成本产品标识（单色 + `currentColor`，
   明暗主题自适应；`aria-hidden`，纯装饰）。
5. **首页英雄区**：`src/routes/(main)/+page.svelte` 删掉技术栈图标数组，改用 `AppIcon`。
6. **删模板品牌静态资源**：`static/{svelte,tauri,vite}.svg`（首页不再引用即悬空）。
7. **删模板截图**：`docs/images/` 整目录删除（`home` / `settings` / `about` / `demo` 四张都是模板
   截图，标题栏与导航均为模板身份）。**不要留着等以后重拍**——旧截图会被 README 或 issue 引用，
   误导阅读者；项目有真实界面后再按路由名重新截图（`docs/images/<route>.png`）。

**DoD：** `pnpm dev` 目视首页/标题栏/图标正常；`rg "svelte.svg|tauri.svg|vite.svg" src static` 无命中；
`ls docs/images` 报「不存在」。

---

## 6. Phase E — 删脚手架（本文件的核心）

> 脚手架移除流程已从 `AGENTS.md` 迁出（属模板侧知识），**本文件是该清理工作的唯一清单**。
> 推荐采用**整删口径**（模板早期做法「保留 `greet` 最小契约」在一次真实初始化中被放弃：
> `greet` / `demo.yml` 一并删除，`collect_commands!` 从 27 项降到 11 项）。
> 若用户明确要保留演示页 / 业务示例作为参考，跳过对应小节并在此处记录理由。

### E1 删演示页 `/demo`

- **删目录**：`src/routes/(main)/demo/`、`src/components/widget/demo/`、`src/libs/shortcuts/`、
  `src-tauri/src/{commands,cores,features}/demo.rs`、`src-tauri/src/plugins/{fs,dialog,notification,global_shortcut}.rs`、`src-tauri/locales/demo.yml`
- **删导航**：`src/libs/navigation/nav-tabs.ts` 的 `/demo` 项（含 `FlaskConicalIcon` 导入）
- **删文案**：`src/libs/i18n/messages/*.json` 全部 `demo_` 开头键（当前模板实测 87 个）→ 留存键数 245 → 137
- **删测试**：`src/tests/component/components/widget/demo/` 整组 + `src/tests/unit/libs/shortcuts/`
  两组（不删则 import 悬空，vitest 变红）
- **摘后端注册**：`commands/mod.rs`（删 `pub mod demo` + `collect_commands!` 16 项 + 第 4 行分组注释）、
  `cores/mod.rs`、`features/mod.rs`；`plugins/mod.rs` 删四模块声明与 `with_global_shortcut`
  （含移动端空实现，`BuilderExt` 本体与其余槽位保留）；`lib.rs` 删三个 `.plugin(...)`
  （`fs`/`dialog`/`notification`）与 `.with_global_shortcut()`
- **裁权限**：`src-tauri/capabilities/plugins.json` 删 10 项（`dialog:default`、fs×4、
  `global-shortcut`×3、`notification:default`、`clipboard-manager:allow-read-text`），21 → 11 项
- **删依赖**：`src-tauri/Cargo.toml` 删 `tauri-plugin-{fs,dialog,notification,global-shortcut}`
  （17 → 13）；前端 `pnpm remove @tauri-apps/plugin-global-shortcut`（7 → 6），删后跑 `pnpm check:sync`
- **清类型透出**：`src/libs/commands/types.ts` 删 `DemoAppPaths` / `DropFileInfo` 的导入与导出
- **保留（勿误删）**：`clipboard-manager` 写权限（about 页 `copy_system_info` 依赖）+ `plugins/clipboard.rs`；
  `lib.rs` 的 `large_stack_frames` 豁免（插件仍多，实测仍在触发）

### E2 删业务示例 `/notes`

- **删目录**：`src/routes/(main)/notes/`、`src/components/widget/notes/`、`src/libs/notes/`
- **删导航 / 文案 / 测试**：`nav-tabs.ts` 的 `/notes` 项（含 `NotebookPenIcon`）；
  `notes_` 开头文案键（当前模板实测 21 个）；`src/tests/component/components/widget/notes/` 与
  `src/tests/unit/libs/notes/`
- **收敛后端**：`src-tauri/src/plugins/sql.rs` 删笔记建表（`NOTES_DB_URL` 常量、`Migration` /
  `MigrationKind` 导入、`migrations()` 函数与 `add_migrations(...)` 调用），`init()` 收敛为
  `Builder::default().build()`，模块注释同步；不保留空 `vec![]` 占位
- **保留（常驻决议）**：`capabilities/plugins.json` 的 `sql:allow-load/select/execute` 与双端 `sql` 依赖
  （业务表由新功能自行迁移）；已有用户库文件成孤儿残留属预期，不写 `DROP TABLE`

### E3 Phase E 收尾

```bash
pnpm test:cargo          # 重生成 src/libs/commands/bindings.ts（git diff 应有同步删减）
pnpm i18n:compile        # demo_/notes_ 键清零
pnpm format && pnpm validate
```

---

## 7. Phase F — 文档收尾

| 文件                   | 改动                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`            | **只保留三段：语言跳转、标题、简介**（外加一行 TODO 注释标记待补章节）。模板版长文——Screenshots / Features / Tech stack / Quickstart / Pages / Structure / i18n / Release——整体删除，项目落地后再补，避免带着模板自述发布                                                                                                                   |
| `docs/README_zh-CN.md` | 与 README 同源的对应改动（两文件必须同时改）                                                                                                                                                                                                                                                                                                |
| `AGENTS.md`            | §1 核心功能（删 demo/notes 两条）；§2 后端插件行；§3 目录树（删 demo/notes 行、libs 子目录行）；§5.6 崩溃日志名；§6.2 / §6.3 示例（改用真实命令，模板里用的 `greet` 已删）；§10 图标源文件路径与代码对齐；**凡是引用 `docs/INIT.md` 的文字（§1 / §3 / §10 页首提示 / 文件尾维护说明）：本文件删除后即悬空引用，须一并清理**；选择留档则保留 |
| `docs/images/`         | 整目录删除（Phase D 第 7 步）；项目有真实界面后再按路由名补截图                                                                                                                                                                                                                                                                             |
| `INIT.md`（本文件）    | 执行完成后删除，或在文件头标注「已于 <日期> 执行，结果见 commit <hash>」留档（留档时上文悬空引用可豁免）                                                                                                                                                                                                                                    |

> Agent 提示：Phase F 是最容易被跳过的一步。若只允许做一件事，也要保证
> `rg -i "template" README.md docs AGENTS.md` 不会把用户引导回模板身份；若本文件将被删除，
> `rg -n "docs/INIT.md" AGENTS.md README.md docs` 也不得留下悬空引用。

**README 初始化后的期望形态（可直接照此落地）：**

```markdown
English | [简体中文](docs/README_zh-CN.md)

# <PROJECT_SLUG>

<PRODUCT_NAME> desktop application based on Tauri v2 + SvelteKit 2 + Svelte 5.

<!-- TODO: add Features / Tech stack / Quickstart / Pages / Structure / Release sections once the product lands -->
```

---

## 8. 常驻能力白名单（初始化后仍须存活）

| 能力                                                            | 存活理由                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| `log`（plugin-log / capability `log:default`）                  | 未注册 `.failed()` 的失败上报通道，删除即静默丢错        |
| `opener`                                                        | about 页项目外链（前端 `openExternal` 仅放行 `http(s)`） |
| `http` + `https://timeapi.io`（capability + CSP `connect-src`） | 网络层常驻，改外部 URL 需同时改 capability 与 CSP        |
| `sql`（`sql:allow-load/select/execute`）                        | 结构化存储常驻空注册，业务表由各功能自行迁移             |
| `clipboard-manager` 写权限                                      | about 页复制系统信息                                     |
| `deep-link` / `single-instance`                                 | 深链与二次启动聚焦，改 scheme 见 §4 C1                   |
| `updater` / `autostart` / `window-state`                        | 桌面外壳三大件，仅非移动端启用                           |
| `store`                                                         | `config.json` 持久化（语言 / 通用设置）                  |

**禁止**「顺手清理」上表任一项；也禁止把 `store` / `autostart` / `window-state` / `single-instance`
补进 `capabilities/plugins.json`（它们仅 Rust 侧注册，无前端 JS 直调，属刻意最小授权）。

---

## 9. Phase G — 验收矩阵（全部完成后逐项核对）

### 9.1 残留扫描

```bash
rg "demo_|DemoAppPaths|DropFileInfo|with_global_shortcut|greet" src src-tauri      # 无命中（保留演示页时豁免）
rg "notes|NotebookPen" src src-tauri                                              # 仅剩 about 页测试 mock 的 body:"notes"（误报，勿删；保留业务示例时豁免）
rg -i "tauri-desktop-template|Tauri Desktop Template" .                            # 无命中（模板身份清零）
rg "tdt://|my_app_crash" src src-tauri docs README.md AGENTS.md                   # 无命中（<SCHEME> / <CRASH_LOG> 已替换成功）
ls docs/images 2>/dev/null                                                        # 报「不存在」（模板截图已删）
test "$(wc -l < README.md)" -le 10 && echo "README 已瘦身"                         # README / docs 各 ≤ 10 行
rg -n "移除流程" AGENTS.md                                                         # 无命中（脚手架流程已迁出）
rg -n "docs/INIT.md" AGENTS.md README.md docs 2>/dev/null                          # 本文件删除后须无命中；留档则豁免
```

### 9.2 计数基线（模板现状 → 整删口径初始化后，实测；随模板演进会漂移，验收以残留扫描为准）

| 指标                                     | 模板               | 初始化后                       |
| ---------------------------------------- | ------------------ | ------------------------------ |
| `collect_commands!` 注册命令数           | 27                 | 11                             |
| `capabilities/plugins.json` 权限项       | 21                 | 11                             |
| 后端 `tauri-plugin-*` 依赖               | 17                 | 13                             |
| 前端 `@tauri-apps/plugin-*` 依赖         | 7                  | 6                              |
| 前端测试文件（`src/tests/**/*.test.ts`） | 43                 | 28                             |
| 前端文案键（`en.json`）                  | 245                | 137                            |
| `src-tauri/locales/*.yml`                | 2（含 `demo.yml`） | 1（仅 `tray.yml`）             |
| 导航标签（`nav-tabs.ts`）                | 5                  | 3                              |
| `README.md` 行数                         | 193                | 7（跳转 + 标题 + 简介 + TODO） |
| `docs/images/`                           | 4 张模板截图       | 目录不存在                     |

> 保留演示页 / 业务示例时，上表与 9.1 扫描整体放宽，数字按实际删除范围重算，并在 PR 里记录保留理由。

### 9.3 质量门禁

```bash
pnpm format      # 必跑，钩子只看暂存文件
pnpm validate    # = test（vitest + cargo test + 绑定重生成）+ lint（前后端）+ check（svelte-check）
git diff src/libs/commands/bindings.ts   # 应已提交且无未预期的改动
```

### 9.4 端到端联调（`pnpm tauri:dev`）

- [ ] 标题栏显示 `<PRODUCT_NAME>`；无边框窗口拖拽 / 置顶 / 最大化 / 关闭正常
- [ ] 三个页面（`/`、`/settings`、`/about`）可访问；about 页应用名与版本正确
- [ ] 切换语言 → 重启 → 语言保持（`config.json` 持久化链路未破）
- [ ] `<SCHEME>://settings` 唤起应用并跳转（深链三处同源）
- [ ] 托盘菜单、开机自启、更新检查面板可用
- [ ] 崩溃兜底：人为 panic 后 `%TEMP%/<CRASH_LOG>` 生成

---

## 10. 参考基线：一次真实初始化的差异量级（派生项目已匿名）

```text
约 96 files changed, 249 insertions(+), 4457 deletions(-)
```

> 量级随「是否保留脚手架 / 是否换图标源」等选择浮动，仅作 sanity check，不作验收标准。

**删除面（模板脚手架，路径即清单）：**

- 前端页面 / 组件：`src/routes/(main)/{demo,notes}/`、`src/components/widget/{demo,notes}/`
- 前端领域层：`src/libs/{notes,shortcuts}/`
- 后端：`src-tauri/src/{commands,cores,features}/demo.rs`、
  `src-tauri/src/plugins/{fs,dialog,notification,global_shortcut}.rs`、`src-tauri/locales/demo.yml`
- 测试：演示页 8 组组件用例 + 演示页/笔记页路由用例 + `notes` / `shortcuts` 单测（共 15 个文件）
- 静态资源：`static/{svelte,tauri,vite}.svg`、`docs/images/{home,settings,about,demo}.png`
- 文档：`README.md` / `docs/README_zh-CN.md` 的模板长文（于初始化收尾时瘦身为三段式）、
  `AGENTS.md` 的脚手架移除流程章节（于收尾时迁出/移除）

**修改面（按用途分组）：**

| 分组     | 文件                                                                                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 标识     | `package.json`、`src-tauri/{Cargo.toml,tauri.conf.json}`、`src/app.html`、`cliff.toml`、`README.md`、`docs/README_zh-CN.md`、`AGENTS.md`                                   |
| 协议常量 | `cores/deep_link.rs`、`libs/hooks/deep-link.svelte.ts`、两侧深链单测                                                                                                       |
| 兜底     | `cores/system.rs`（崩溃日志名）                                                                                                                                            |
| 品牌     | `static/icon.*`（替换源）、`static/favicon.png`、`src-tauri/icons/*`（`pnpm tauri:icon` 全量重生成）、`src/assets/icons/app-icon.svelte`、`src/routes/(main)/+page.svelte` |
| 契约     | `src/libs/commands/{bindings.ts,types.ts,cores.ts}`（`bindings.ts` 为 `cargo test` 重生成）                                                                                |
| 文案     | `src/libs/i18n/messages/{en,zh-CN}.json`（删 108 键、改 1 键 `page_home_intro`）                                                                                           |
| 依赖     | `Cargo.lock`、`pnpm-lock.yaml`                                                                                                                                             |
| 权限     | `src-tauri/capabilities/plugins.json`                                                                                                                                      |

**据此得出的三条经验（复盘中踩过）：**

1. **模板文档里的「保留 `greet` 最小契约」在新项目里没有价值**——整删更干净，
   `collect_commands!` 与文案键都能清零，残留扫描也更好写。
2. **图标源换格式（如 png → svg）时要连带改 `package.json` 的 `tauri:icon` 脚本**，
   并同步首页英雄区与 `app-icon.svelte`，否则首页仍会露出模板的技术栈图标。
3. **截图与其相关文档不要「先留着」**：那次初始化只删了 `demo.png`，三张模板截图
   （标题栏仍是模板名）留在仓库里当了几个月的门面——正确做法是初始化即删除 `docs/images/`
   整目录、README 只留跳转/标题/简介，待项目有真实界面再补图。

---

## 11. Phase H — 首次提交与汇报

1. **提交**：Conventional Commits、英文小写；一次提交只做一件事，建议拆分：

   ```text
   chore(init): rebrand template to <PROJECT_SLUG>          # Phase B/C/D
   chore(init): drop demo and notes scaffolding             # Phase E
   docs(init): align readme and agents guide                # Phase F
   ```

   提交前必跑 `pnpm format` + `pnpm validate`；禁止自动提交（由开发者手动执行）。

2. **CI**：推送后确认 `ci.yml` 全绿；`main` 受保护时走 PR + Code Review + Squash 合并。
3. **汇报格式**（Agent 收尾输出）：

   ```text
   变量确认：§1 全表取值与来源（含取默认值的项与用户覆盖项）
   改动清单：按 Phase 罗列的「文件 / 动作 / 理由」
   验证结果：执行的命令 + 结果（validate 全绿 / rg 清零 / 计数基线对齐）
   未完成项：如「截图待补（docs/images 已清空）」「更新私钥尚未配 Secret」，逐条说明阻塞原因
   下一步建议：首个业务功能的入口（libs → commands → features 的落点）
   ```

4. **协议提醒**：本模板为 `GPL-3.0-only`；派生项目（含闭源分发）须先评估传染性义务。

---

<!-- 维护说明：本文件由一次真实初始化的差异复盘沉淀（派生项目身份已匿名化）；模板结构变化时同步更新 §3~§6 的落点表与 §9.2 计数基线；本文件在模板仓库保持占位形态，派生项目填写后的副本随该项目提交 -->

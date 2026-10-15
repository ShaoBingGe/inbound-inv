# CLAUDE.md — inbound-invoice-hub-web

全球进项发票中台的前端。React 19 + TS strict + Vite + react-router 6；自研组件库 + CSS Modules；OIDC 登录；18 语言（5 种完整翻译，ar 为 RTL）；部署到 K8s。总览见 README.md。

## 必读
- `docs/CONVENTIONS.md`：目录、样式、文案（t()）、数据（api.ts / mock）、路由、权限、可访问性约定。改代码前先读。
- `docs/API.md`：各模块的后端接口草案；`docs/SKILLS.md`：Skill 管理与 agent 平台接口。

## 常用命令
- `npm run dev`：本地开发，默认 mock 登录 + 示例数据（`public/config.js`）
- `npm run typecheck && npm run lint && npm test && npm run i18n:check && npm run build`：提交前全部通过

## 首个任务（项目交付时尚未完成）
生成本项目的环境无法安装依赖，代码只经过 esbuild 打包和 Chromium 实际运行（zh/en/ar/zh-TW 全部路由无报错），**没有跑过 tsc 和 vitest**。请：
1. `npm install`，提交生成的 `package-lock.json`。
2. `npm run typecheck`，修复类型错误（预计集中在 react-router / oidc-client-ts 的类型细节与少量隐式 any）。不要用 `any` 或 `@ts-ignore` 绕过。
3. `npm run lint`、`npm test`（i18n 引擎、Skill frontmatter 与 diff 有单测）。
4. 若各模块有重复的本地颜色变量（`--gd-*`、`--tb-*`、`--rb-*`、`palette.module.css` 等），把它们收拢到 `src/styles/tokens.css`。

## 规则
- 页面放在 `src/features/<模块>/`，从 `@/components/ui` 取组件；不要引入第三方 UI 库或 CSS 框架。
- 界面文字一律 `t('简体中文原文')`；词典键就是中文原文，改中文文案会导致其他语言失配 → 改文案时同步 4 个词典（`src/i18n/locales/`）。
- 发票原件影像、票面原文、主数据（公司名、人名）不翻译，容器加 `translate="no"`。
- 只用逻辑方向属性（`inset-inline-*`、`margin-inline-*`、`text-align: start`），保证阿拉伯语 RTL 正常；图表坐标区可固定 `dir="ltr"`。
- 页面通过 `api.ts` 的异步函数取数；mock 走 `data.ts`，live 走 `http`（自动带令牌、租户、语言）。不要在页面里直接 fetch。
- 国家数据隔离：选择器只列 `user.countries` 可见范围（`canSeeCountry`），但安全边界在后端。
- 运行时配置（API 地址、IdP、声明映射）只从 `config` 读取，不写死；新增配置项同步 `public/config.js`、`deploy/docker/config.js.template`、`40-app-config.sh`、`deploy/k8s/base/configmap.yaml`。
- 令牌只放 sessionStorage；不要把令牌、个人信息写进 localStorage 或日志。
- agent 的运行与调度属于统一 agent 平台；本项目只做配置展示与 Skill 查看 / 编辑。

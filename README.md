# 全球进项发票中台 · 前端（inbound-invoice-hub-web）

由 Claude Design 画布「全球进项发票中台」（https://claude.ai/artifact/SJ4Sv7An5Y2XCVokYoxaM8）的 18 个设计稿页面迁移而来，另新增 **Skill 管理**模块。页面布局、文案与示例数据以设计稿为准。

| 项目 | 选型 |
|---|---|
| 框架 | React 19 + TypeScript（strict）+ Vite 5 + react-router 6 |
| 样式 | 自研组件库 `src/components/ui` + CSS Modules + 设计令牌 `src/styles/tokens.css`，无第三方 UI 库 |
| 登录 | 通用 OIDC（授权码 + PKCE，`oidc-client-ts`），可配置多个身份提供方，可通过 `acrValues` 要求 MFA |
| 多语言 | 18 种界面语言；简体中文、繁體中文、English、Español、العربية（RTL）完整翻译，其余暂以英文显示 |
| 部署 | Docker 多阶段构建 → nginx（非 root、只读根文件系统）→ K8s（Kustomize：dev / prod） |
| agent | 由统一 agent 平台运行与管理；本项目提供 Skill 的查看与编辑（`/settings/skills`） |

## 快速开始

```bash
nvm use            # Node 20
npm install        # 首次安装会生成 package-lock.json，请提交
npm run dev        # http://localhost:5173 ，默认 mock 登录 + 示例数据
```

本地默认使用 `public/config.js`：`auth.mode = 'mock'`（登录页可选角色与数据视角），`dataMode = 'mock'`（各页面使用与设计稿一致的示例数据）。

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器（`/api`、`/agent-api` 代理见 `.env.example`） |
| `npm run build` | 生产构建（vite） |
| `npm run build:check` | 类型检查 + 构建（CI 使用） |
| `npm run typecheck` / `lint` / `test` | 类型检查 / ESLint / Vitest |
| `npm run i18n:check` | 列出源码中未进入词典的中文文案 |

> 交付说明：生成本项目的环境无法访问 npm 仓库，代码已用 esbuild 完整打包，并在 Chromium 中按 zh / en / ar / zh-TW 逐页运行，没有报错；但尚未执行 `tsc` 类型检查与 `npm install`。首次拉起时请先跑 `npm run typecheck`，修正可能出现的类型问题（见 CLAUDE.md「首个任务」）。

## 目录

```
src/
  app/          路由常量与菜单（routes.ts）、路由表（router.tsx）、App
  auth/         OIDC、登录页、回调页、守卫、角色与国家范围
  i18n/         翻译引擎、语言列表、词典 locales/{en,zh-TW,es,ar}.json
  layout/       应用框架、全局语言切换 LangSwitcher
  components/ui 组件库：Button / Field / Select / Segmented / Switch / Card / Section / Chip / Stat /
                Table / Tabs / Modal / Drawer / Popover / Toast / Icon / PageHeader / PageBody …
  lib/          http 客户端、useAsync、示例数据工具
  features/     每个页面一个模块：<Page>.tsx + module.css + types.ts + data.ts(mock) + api.ts + components/
deploy/
  docker/       nginx.conf、安全响应头、运行时配置模板与渲染脚本
  k8s/          base（Deployment/Service/Ingress/HPA/PDB/NetworkPolicy/ConfigMap）+ overlays/dev、prod
docs/
  CONVENTIONS.md  开发约定（样式、文案、数据、权限、可访问性）
  API.md          各模块调用的后端接口草案（自动整理）
  SKILLS.md       Skill 管理与 agent 平台接口约定
```

## 页面与路由

| 菜单 | 路由 | 模块 |
|---|---|---|
| 看板 · 全球统一看板 | `/dashboard/global` | dashboard-global |
| 看板 · 税务统计看板 | `/dashboard/tax` | dashboard-tax |
| 看板 · 识别效果看板 | `/dashboard/recognition` | dashboard-recognition |
| 票池 · 企业票池 | `/pool/enterprise`（明细弹窗即生命周期） | invoice-pool |
| 　发票全生命周期 | `/pool/invoices/:invoiceId` | invoice-lifecycle |
| 　影像查看器（新窗口，无框架） | `/viewer/:invoiceId` | invoice-viewer |
| 票池 · 供应商票夹 | `/pool/supplier-wallet`（页签：票夹 / 三单匹配 `?view=match` / 应付单 `?view=ap` / 药品匹配关系 `?view=drugs`） | supplier-wallet |
| 　三单匹配 · 手工匹配工作台 | `/pool/supplier-wallet/match/:groupId` | supplier-wallet |
| 采集 · H5页面采集 | `/capture/h5` | capture-h5 |
| 采集 · 邮箱采集与识别 | `/capture/mailbox` | capture-mailbox |
| 采集 · 供应商门户 | `/capture/portal` | capture-portal |
| 采集 · 移动端采集 | `/capture/mobile`（预览）、`/m/capture`（手机独立页） | capture-mobile |
| 设置 · 全球数据运维设置 | `/settings/data-ops` | settings-data-ops |
| 设置 · 采集渠道与校验策略 | `/settings/channels` | settings-channels |
| 设置 · 税务规则设置 | `/settings/tax-rules` | settings-tax-rules |
| 设置 · AI agent能力设置 | `/settings/agents` | settings-agents |
| 设置 · Skill 管理 | `/settings/skills`、`/settings/skills/:skillId` | skills |
| 数据管理 · 发票识别数据管理看板 | `/data/recognition` | data-recognition |
| 数据管理 · 发票数据修正 | `/data/correction` | data-correction |
| 数据管理 · 数据识别规则管理 | `/data/rules` | data-rules |

## 登录与权限

1. 登录页列出 `auth.providers` 中的每个身份提供方（Keycloak、Azure AD / Entra ID、Okta、ADFS 等任何标准 OIDC）。
2. 点击后跳转 IdP，授权码 + PKCE 回到 `/auth/callback`；需要额外认证时在 provider 上配置 `acrValues`（如 `mfa`），由 IdP 执行第二因素。
3. 令牌只存 sessionStorage；`offline_access` + refresh token 静默续期；API 返回 401 时回到登录页。
4. 角色来自令牌声明（默认 `roles`）：`viewer`、`ap_clerk`、`tax_manager`、`data_ops`、`skill_editor`、`admin`。菜单与路由按角色过滤（`src/app/routes.ts`、`router.tsx`）。
5. 国家数据范围来自声明（默认 `dc_scope`）：`["*"]` 为主数据中心全球视角，否则只显示所列国家。**后端必须同样按令牌校验。**

IdP 侧需要为客户端登记：
- Redirect URI：`https://<域名>/auth/callback`
- Post-logout redirect URI：`https://<域名>/login`
- Web origin（CORS）：`https://<域名>`
- 访问令牌或 userinfo 中包含 `roles`、`dc_scope`、`tenant` 声明（名称可在配置中映射）

## 多语言

- 右上角语言切换对所有页面、所有标签页生效（`localStorage: inboundHub.uiLang`，与设计稿原型共用）。
- 词典以简体中文原文为键，按语言懒加载；动态拼接文案由引擎按片段匹配，日期与「万 / 亿」按目标语言格式化。
- 发票原件影像、票面原文、公司与人名等主数据不翻译（`translate="no"`）；「智能翻译」负责票面内容。
- 新增文案：`t('中文原文')` → `npm run i18n:check` → 补齐 4 个词典。

## 部署（Linux / K8s）

```bash
# 构建镜像（内网可指定 npm 镜像源）
docker build -t registry.example.com/invoice-hub/invoice-hub-web:0.1.0 \
  --build-arg NPM_REGISTRY=https://registry.npmjs.org .
docker push registry.example.com/invoice-hub/invoice-hub-web:0.1.0

# 部署
kubectl apply -k deploy/k8s/overlays/dev     # dev：1 副本、示例数据
kubectl apply -k deploy/k8s/overlays/prod    # prod：3 副本、HPA 2–6
```

- 镜像与环境无关：运行时配置来自 ConfigMap `invoice-hub-web-config`，容器启动时渲染成 `/config.js`。修改后 `kubectl rollout restart deploy/invoice-hub-web`。
- Ingress 同域转发：`/` → 前端，`/api` → 业务后端 `invoice-hub-api`，`/agent-api` → agent 平台网关 `agent-platform-gateway`。若 agent 平台在其他命名空间，用 `ExternalName` Service 或在 Ingress 中指向其网关域名。
- 容器：`nginx-unprivileged`（uid 101、端口 8080）、只读根文件系统、`/tmp` 为 emptyDir、`/healthz` 探针、安全响应头（CSP 的 `connect-src` 需包含 IdP 域名，见 `deploy/docker/security-headers.conf`）。
- 字体随包发布（@fontsource），不依赖外网 CDN，适合内网与中国大陆环境。

| 环境变量（ConfigMap） | 说明 |
|---|---|
| `APP_ENV` | 环境名，显示用 |
| `API_BASE_URL` / `AGENT_PLATFORM_BASE_URL` | 业务 API / agent 平台根地址 |
| `DATA_MODE` | `live` 调后端；`mock` 使用示例数据 |
| `DEFAULT_LANG` | 用户未选择时的默认界面语言 |
| `AUTH_MODE` | `oidc`（生产）或 `mock`（演示） |
| `OIDC_PROVIDERS_JSON` | 身份提供方数组：`id`、`name`、`authority`、`clientId`、`scope`、`acrValues`、`extraQueryParams` |
| `OIDC_CLAIMS_JSON` | 声明映射：`roles`、`countries`、`tenant`、`name`、`email`（支持点路径） |

# 后端接口草案

前端各模块在 `src/features/<模块>/api.ts` 中调用的接口汇总（由代码自动整理）。路径为**约定草案**，后端确定后只需修改对应 `api.ts`。

- 业务 API 根地址：`apiBaseUrl`（默认 `/api`）；agent 平台：`agentPlatformBaseUrl`（默认 `/agent-api`）
- 所有请求带 `Authorization: Bearer <access_token>`、`X-Tenant-Id`、`Accept-Language`（当前界面语言）
- 国家数据隔离必须由后端按令牌中的数据范围（`dc_scope`）强制执行；前端过滤只用于展示
- 错误响应体建议 `{ "code": "…", "message": "…" }`，前端会显示 message；401 跳转登录，409 表示版本冲突
- 请求/响应结构以各模块 `types.ts` 为准

## 全球统一看板（`src/features/dashboard-global`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/dashboard/global` | 业务 API |
| GET | `/v1/dashboard/global/scopes` | 业务 API |
| GET | `/v1/dashboard/global/trend` | 业务 API |

## 税务统计看板（`src/features/dashboard-tax`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/dashboards/tax` | 业务 API |
| GET | `/v1/dashboards/tax/drill` | 业务 API |

## 识别效果看板（`src/features/dashboard-recognition`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/recognition/evaluation-board` | 业务 API |

## 企业票池（`src/features/invoice-pool`）

| 方法 | 路径 | 后端 |
|---|---|---|
| POST | `/v1/invoice-pool/exports` | 业务 API |
| GET | `/v1/invoice-pool/invoices` | 业务 API |
| GET | `/v1/invoices/{id}/lifecycle` | 业务 API |
| GET | `/v1/invoices/{id}/recognized-data` | 业务 API |
| GET | `/v1/orgs/catalog` | 业务 API |

## 发票全生命周期（`src/features/invoice-lifecycle`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/invoices/lifecycle-samples` | 业务 API |
| GET | `/v1/invoices/{invoiceId}/lifecycle` | 业务 API |

## 发票影像查看器（`src/features/invoice-viewer`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/invoices/{invoiceId}/original` | 业务 API |
| GET | `/v1/invoices/{invoiceId}/original/file` | 业务 API |

## 供应商票夹（`src/features/supplier-wallet`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/supplier-wallet/countries/{country}/suppliers`（发票带所属匹配组 `mg`） | 业务 API |
| POST | `/v1/supplier-wallet/invoices/{no}/accept-tolerance` | 业务 API |
| POST | `/v1/supplier-wallet/invoices/{no}/ap-voucher` | 业务 API |
| POST | `/v1/supplier-wallet/invoices/{no}/expense` | 业务 API |
| POST | `/v1/supplier-wallet/invoices/{no}/rematch` | 业务 API |
| GET | `/v1/supplier-wallet/overview` | 业务 API |

### 三单匹配 / 应付单 / 药品匹配关系（`src/features/supplier-wallet/match/api.ts`）

查询都带国家（数据驻留）；过滤上下文（时间区间、购买入库组织、供应商）作为查询参数，前端不做本地过滤。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/v1/supplier-wallet/countries/{country}/match/summary` | 三单匹配概况（票夹顶部流程导航：各分区组数、未匹配量、应付单数、知识库规模） |
| GET | `/v1/supplier-wallet/countries/{country}/match/board?range&buyer&supplier` | 概览指标、匹配组、匹配中（手工新增）、容差规则 |
| GET | `/v1/supplier-wallet/countries/{country}/match/run` | 匹配引擎批处理状态（前端轮询；可改 SSE） |
| POST | `/v1/supplier-wallet/countries/{country}/match/run` | 重新同步税务发票并重跑匹配 |
| GET | `/v1/supplier-wallet/countries/{country}/match/pool` | 新增匹配组可选的发票 / 入库单 |
| GET | `/v1/supplier-wallet/countries/{country}/match/pending?kind=inv\|inb` | 未匹配发票 / 待匹配入库单明细（含入库余额） |
| POST | `/v1/supplier-wallet/countries/{country}/match/groups` | 新增匹配组 `{inv, inb, source}`，进入匹配中 |
| PUT | `/v1/supplier-wallet/match-groups/{mg}/strategy` | 调整策略（版本化、可审计）并单组重跑 |
| POST | `/v1/supplier-wallet/match-groups/confirm` | 确认匹配 `{groups}`，幂等，生成应付单 |
| GET | `/v1/supplier-wallet/match-groups/{mg}/workbench` | 手工匹配工作台：发票行、入库行（余额）、候选单据、连线、差额单 |
| PUT | `/v1/supplier-wallet/match-groups/{mg}/workbench` | 保存连线 `{invoices, inbounds, links}`，重算行占用与组匹配率 |
| POST | `/v1/supplier-wallet/match-groups/{mg}/adjustments` | 按行生成差额单 `{rows: [{lid, type}]}` |
| POST | `/v1/supplier-wallet/match-groups/{mg}/push` | 下推应付单，匹配组锁定 |
| DELETE | `/v1/supplier-wallet/match-groups/{mg}` | 删除匹配组，明细行回到未匹配池 |
| GET | `/v1/supplier-wallet/countries/{country}/payables` | 应付单查询（只读） |
| GET | `/v1/supplier-wallet/countries/{country}/drug-mapping` | 药品匹配关系知识库 |

## H5页面采集（`src/features/capture-h5`）

| 方法 | 路径 | 后端 |
|---|---|---|
| POST | `/v1/capture/h5/invoices/{id}/confirm` | 业务 API |
| POST | `/v1/capture/h5/invoices/{id}/corrections` | 业务 API |
| PUT | `/v1/capture/h5/invoices/{id}/field-flags/{field}` | 业务 API |
| POST | `/v1/capture/h5/invoices/{id}/place-of-issue` | 业务 API |
| POST | `/v1/capture/h5/reports/{reportNo}/import` | 业务 API |
| GET | `/v1/capture/h5/session` | 业务 API |

## 邮箱采集与识别（`src/features/capture-mailbox`）

| 方法 | 路径 | 后端 |
|---|---|---|
| PATCH | `/v1/capture/mailbox/features/{key}` | 业务 API |
| GET | `/v1/capture/mailbox/settings` | 业务 API |
| POST | `/v1/capture/mailboxes/{boxId}/invite` | 业务 API |
| POST | `/v1/capture/mailboxes/{boxId}/reauthorize` | 业务 API |
| POST | `/v1/capture/mailboxes/{boxId}/revoke` | 业务 API |
| PUT | `/v1/capture/mailboxes/{boxId}/source-rules` | 业务 API |
| POST | `/v1/capture/mailboxes/{boxId}/source-rules/test` | 业务 API |

## 供应商门户（`src/features/capture-portal`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/supplier-portal` | 业务 API |
| POST | `/v1/supplier-portal/correction-requests/{requestId}/response` | 业务 API |
| POST | `/v1/supplier-portal/invoices/{invoiceNo}/field-marks` | 业务 API |

## 移动端采集（`src/features/capture-mobile`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/capture/mobile/session` | 业务 API |
| POST | `/v1/capture/mobile/submit` | 业务 API |

## 全球数据运维设置（`src/features/settings-data-ops`）

| 方法 | 路径 | 后端 |
|---|---|---|
| POST | `/v1/data-centers` | 业务 API |
| GET | `/v1/data-centers/overview` | 业务 API |
| DELETE | `/v1/data-centers/{code}` | 业务 API |
| PATCH | `/v1/data-centers/{code}` | 业务 API |
| POST | `/v1/data-centers/{code}/admins/reset-requests` | 业务 API |
| DELETE | `/v1/data-centers/{code}/ip-whitelist` | 业务 API |
| POST | `/v1/data-centers/{code}/ip-whitelist` | 业务 API |
| POST | `/v1/data-centers/{code}/keys/{keyId}/rotate` | 业务 API |
| POST | `/v1/data-centers/{from}/migrations/steps` | 业务 API |

## 采集渠道与校验策略（`src/features/settings-channels`）

| 方法 | 路径 | 后端 |
|---|---|---|
| POST | `/v1/capture-policies` | 业务 API |
| GET | `/v1/capture-policies/current` | 业务 API |

## 税务规则设置（`src/features/settings-tax-rules`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/tax-rules/regimes` | 业务 API |
| POST | `/v1/tax-rules/{country}/simulate` | 业务 API |
| POST | `/v1/tax-rules/{country}/versions` | 业务 API |

## AI agent能力设置（`src/features/settings-agents`）

| 方法 | 路径 | 后端 |
|---|---|---|
| PUT | `/v1/agents/automation-levels` | agent 平台 |
| PUT | `/v1/agents/memories/{tab}/{index}/state` | agent 平台 |
| POST | `/v1/agents/runs/undo` | agent 平台 |
| GET | `/v1/agents/settings` | agent 平台 |
| POST | `/v1/agents/todos/run-auto` | agent 平台 |
| POST | `/v1/agents/todos/{todoId}/decision` | agent 平台 |

## Skill 管理（`src/features/skills`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/skills` | agent 平台 |
| POST | `/v1/skills` | agent 平台 |
| GET | `/v1/skills/{id}` | agent 平台 |
| PATCH | `/v1/skills/{id}` | agent 平台 |
| PUT | `/v1/skills/{id}/draft` | agent 平台 |
| POST | `/v1/skills/{id}/publish` | agent 平台 |
| GET | `/v1/skills/{id}/versions` | agent 平台 |
| GET | `/v1/skills/{id}/versions/{version}` | agent 平台 |

## 发票识别数据管理看板（`src/features/data-recognition`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/data/corrections/dashboard` | 业务 API |
| POST | `/v1/data/corrections/verify-batch` | 业务 API |
| POST | `/v1/data/corrections/{id}/escalate` | 业务 API |
| POST | `/v1/data/corrections/{id}/verify` | 业务 API |

## 发票数据修正（`src/features/data-correction`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/invoice-corrections/queue` | 业务 API |
| GET | `/v1/invoice-corrections/rules` | 业务 API |
| POST | `/v1/invoices/{invoiceId}/compensation-events` | 业务 API |
| POST | `/v1/invoices/{invoiceId}/field-changes` | 业务 API |
| POST | `/v1/invoices/{invoiceId}/field-changes/{changeId}/approve` | 业务 API |

## 数据识别规则管理（`src/features/data-rules`）

| 方法 | 路径 | 后端 |
|---|---|---|
| GET | `/v1/dataset-rules` | 业务 API |
| POST | `/v1/dataset-rules/{country}/agents/{agent}/approve` | 业务 API |
| POST | `/v1/dataset-rules/{country}/batches/{batch}/format-check` | 业务 API |
| PUT | `/v1/dataset-rules/{country}/strategy` | 业务 API |
| POST | `/v1/dataset-rules/{country}/test-runs` | 业务 API |

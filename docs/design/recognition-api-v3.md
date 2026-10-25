# 识别 API V3：落进收票域（FON / INVD / EIP）的识别契约

> 2026-10-25 · **识别 API 的唯一设计文档**：决策、契约、字段映射、执行计划都在这里。此前的六份过程文档已并入本文并删除。
> 输入：收票域 87 个接口清单（`~/Desktop/e-invoice/收票API-全量接口清单.md`，下称「清单」）；`reference/invoice-inbound-core`（test 分支，下称 `core`）的 DDL、枚举、动作框架；`OCR/doc-ai` 与 `OCR/doc-ai-frontend`（test 分支）。
> 标注：「待核实」= 需要 doc-data 服务仓源码或业务确认；「推测」= 由 DDL / 种子推断的实现细节。

**读法**：§0 结论；§1 决策登记簿（全部已拍板）；§2–§9 是契约细节（§5.4 是服务仓代码事实），按需查；§10 是编码计划；附录 A 对照原始草案。

---

## 0. 结论先行

**识别不需要新的「识别任务」资源。** 收票域里它已经有名字：`ACT-FON-GEN-002 执行抽取`（`POST /api/v1/files/{fileId}/extraction`）。这个动作今天就在调外部识别服务（发票云 m3，provider `FPY_CLOUD`，方法 `CLOUD_COMPOSITE`），把结果落成 `fon.fon_source_region`（一纸多票的「区域」），再由 `ACT-FON-GEN-003 升格` 内部调 `ACT-INVD-GEN-001 / ACT-RDOC-GEN-001` 建数据对象。

| 早期设计的概念 | 收票域里已有的对应物 |
|---|---|
| `documents[]`（一个文件拆出的多张票） | FON 区域 `fon_source_region` |
| `docId`（终身不变） | 来源锚 `FON:{fileId}:R{n}`，已是 INVD 幂等键（`invd.invd_anchor_key`）与票池 L2a 防重键（`eip.eip_item.source_anchor`） |
| gov 校验 | `ACT-INVD-GEN-006 核验` + 轴 G 事件（`ACT-INVD-GEN-013`） |
| dup 校验 | `ACT-EIP-GEN-002` 的 L1 / L2a / L2b / L3 四层 + `fon_content_hash_registry` |
| sup / biz 校验 | 合规规则包 `CMP-*`，在挂票（`ACT-BDOC-GEN-006`）/ 导入（`ACT-PIW-GEN-006`）时按租户档位 `cfg.tenant_policy(COMPLIANCE_VERIFY)` 求值；票种黑名单在 EIP-002 |

**V3 做四件事**：

1. 把 doc-ai 引擎接成 FON 抽取的第二个 provider（方法 `LLM_EXTRACT`）：今天只有发票云一个适配器，要新建按方法路由的 `SegmentationPort`（S3）。
2. 给 `extraction` 加异步分支：202 + 运行态记在 `fon_file.ext_json`（不建新表，Q-01）+ 轮询。
3. 补一个读端点 `GET /api/v1/files/{fileId}/extraction`，用标准化字段格式渲染区域结果。
4. 给 `ingress` 加一条文件链 `POST /api/v1/ingress/files`：这是原始草案「一个创建接口、只返回编号」的落地形态（C-1）。

其余全部复用现有 87 个端点。编排不新建服务：交互式渠道由前端按「上传 → 抽取 → 升格 → 核验」调 doc-data；无人值守与外部集成走 ingress。doc-ai 只做引擎，不碰租户桶，不写收票域任何表。

**新增表面积**：对外 2 个查询端点（抽取结果、入口进度）、1 个单一入口；服务间 doc-ai 引擎 3 个端点；1 张任务表（`invd_verify_task`，Q-07）、1 个表达式索引（Q-01）；若干决策表行、值集行、1 个拒绝码。完成回调首版不做（Q-11）。

---

## 1. 决策登记簿

### 1.1 已拍板决策在 V3 中的状态

| 编号 | 原决策 | 状态 | V3 落点 |
|---|---|---|---|
| K-1 | 业务后端编排，doc-ai 只做引擎 | 保留，细化 | 编排 = doc-data（FON / INVD 动作）+ ingress；不新建编排服务，不合并进 doc-ai（§2.2） |
| K-2 | 只有法人 `entity` 必填 | 保留，位置移动 | 法人在**升格**（`ACT-FON-GEN-003`）时给出：既有必填的 `ownerScope=TENANT` + `ownerRef`；上传、抽取零业务必填（FON 层没有法人概念） |
| C-3 | 校验默认按渠道策略，`verify[]` 只能收窄 | **已修改**（2026-10-25 确认） | 删 `verify[]`，语义保留。校验分散在各动作里：gov 在 006、dup 在 EIP-002、sup / biz 在合规档位；档位是租户配置，「只允许已批准加严」（`core/CLAUDE.md:156`），请求本来就关不掉拦截项。「只识别」= 只抽取不升格。中台策略矩阵页改为编辑 `COMPLIANCE_VERIFY` 档位与法域画像 |
| K-3 | 字段键用中台 `InvoiceField` 别名 | 保留 | §8 |
| K-4 | `country=auto` 不进首版 | 保留 | `country` 进 `engine{}`；传 `auto` 返回 422 `ENGINE_OPTION_INVALID` |
| K-5 | 一个文件多张票在同一结果内，`docId` 终身不变 | 保留，加强 | `docId` = 来源锚，贯穿 FON → INVD → EIP |
| K-7 / C-4 | 四眼从阶段 2「审核中」起；阶段 0–1 税局真值自动覆盖法定字段 | 四眼起点**保留**；自动覆盖**已修改**（2026-10-25 确认） | 不自动覆盖已升格实例的键字段：006 查验不符是 `REJECTED`（`DenyCode.java:410-416`），017 禁改自然键六分量（`DENY_KEY_FIELD_IMMUTABLE`），键错 = 判弃重建（`DomainIds.java:35`）。真值融合（`truthSource=gov`）发生在**升格前**的引擎结果里。升格后：非键字段走 017，键字段走 007 + 重新升格；四眼 = `force_flag` + `INVD_REVISE_FORCE`（§6.4） |
| C-5 | `purpose=evaluation` 给 data_ops / admin / tax_manager | **已修改**（移位，2026-10-25 确认） | 评测文件若进 FON 会占内容哈希、可被升格。评测走 doc-ai 自己的评测面（WS-D4），角色不变，由 doc-ai 校验；收票域不出现 `purpose` |
| K-6 / C-2 | A+：每字段带 `bt`（EN 16931）与 `ubl`（UBL 2.1 路径），映射表以 BT 为主键，落库与溯源按 `ubl_path` | 身份与别名**保留**；库内键**已修改**（2026-10-25 确认） | `core` 已有内部词汇层（`FON_SECTION_FIELD_MAP.targetField`、`inv.*`），审计 `diff` 也用它（推测）。库内与审计键沿用核心词汇，`field-map.yaml` 加 `core` 列翻译；对外（API、看板、前端 `FieldChange.field`）仍按 `ubl_path`（§8.1） |
| C-1 | 原始草案：一个创建接口、只返回编号 | **落实到 P1**（2026-10-25 确认） | `POST /ingress/files` 就是它（§4.6）。交互式前端走 FON 四步最自然，但 ERP / 第三方集成方需要单一入口；`ingress` 已是编排层，`core.ingress_request` 有分段进度 + 租约（`01_schema_and_common.sql:500-562`）。推迟则集成方没有入口 |

### 1.2 问题决议（2026-10-25 拍板）

| # | 问题 | 决议 |
|---|---|---|
| Q-01 | 抽取运行态存哪 | **不建新表**，存 `fon_file.ext_json.extractionRun`，只加一个表达式索引（§4.9） |
| Q-02 | `ACT-FON-GEN-002` 如何选中 doc-ai | `FON_EXTRACT_METHOD_CHAIN` 加 `countryHint` 输入列；同时允许调用方显式传 `extractionMethod=LLM_EXTRACT`。要改决策表、规则表达式与规则事实三处（S13） |
| Q-03 | 非 CN 文档的升格分流 | `INVOICE_KIND_MAPPING` 加 `countryCode` 列与通配行：`docType=invoice/creditNote → INVD`、`receipt → RDOC` |
| Q-04 | 字段映射跨 provider | `FON_SECTION_FIELD_MAP` 加 `provider` 输入列（既有行写 `'*'`），doc-ai 行由 `field-map.yaml` 生成 |
| Q-05 | 查验端点的国家维度 | `cfg.legacy_capability_endpoint` 加 `jurisdiction` 列（默认 `'*'`），唯一键改为 `(capability, operation, jurisdiction)`。只用于查验：识别不走这张表（S3） |
| Q-06 | 多页单票 | 首页写 `page_no`，`pages[]` 进区域 JSON；与现行做法一致（`pageNumbers` 取首页，S4） |
| Q-07 | gov 补查任务 | 新建 `invd_verify_task`，照 `invd_completion_task` 形制（E19） |
| Q-08 | 字段级溯源 | 首版不建专门的表：FON 区域 JSON + `invd_invoice.ext_json.provenance` |
| Q-09 | Java 枚举与值集不一致（§8.9） | 契约以 `cfg.value_set` 为准，枚举由 core 另行修正 |
| Q-10 | `invoice_type_code` 码表 | UNTDID 1001，381=贷项；订正 DDL 注释 |
| Q-11 | doc-ai → doc-data 完成回调 | 首版不做，只轮询 |
| Q-12 | `ingress/files` 的 `autoPromote` 缺省 | 按渠道配置：邮箱默认自动、门户默认人工 |
| Q-13 | 中台处置档 ↔ `COMPLIANCE_VERIFY` 四档 | 拦截=FILTER、复核=MEDIUM、提示=YELLOW、自动/不适用=ALLOW；渠道维度用新的 `policy_ref` 形态 |
| Q-14 | 置信度 | 首版只出 `confRaw`，`conf=null`，界面标「未校准」 |
| Q-15 | `confRaw` 阈值 | 先记录 `confRaw`；低于所在字段组阈值即需人工确认：`id / tax / amount` **0.7**、`attr` **0.5**、`bank` **0.8**（§4.2.1） |
| Q-16 | doc-ai 管理面身份 | **保留 doc-ai 前端与自有登录，同时允许中台统一调度**：doc-ai 的管理与能力接口另外接受中台 IdP 令牌与服务凭证，供中台页面和统一 agent 平台调用；引擎调用仍用 mTLS + 客户端凭证，用户令牌不下传（WS-D7） |
| Q-17 | doc-ai v1 开放平台 | 冻结不改，加 `Deprecation / Sunset / Link` 头；下线日期与对接方协商 |
| Q-18 | `govCapability[country]` 初值 | 逐国核实费用、权限（如「只能查购方票」）后再填 |
| Q-19 | 黄金集客户 GT 已在 git 中（MY 41、JP 42 个文件，含公司名和税号） | **先保留在 git，不变**；不清理历史 |
| Q-20 | 前端维护边界 | 业务功能归中台，平台运营功能归 doc-ai-frontend；共享组件以中台实现为准，不跨仓复制 |
| Q-21 | 国家级模板发布与客户定制版本并存 | **国家模板变更时，通知基于该模板做过个性化优化的客户，用 AI 为每位客户生成个性化的更新建议稿，建议尽快更新；只发建议，不强制修改**（WS-D9）。看板口径沿用推荐：看板按国家级发布，客户 API 页面按 prompt 版本，`engine` 块同时报两者 |
| Q-22 | 无税局接口国家的抽检比例 | **2%** |


### 1.3 仍待拍板

无。C-1–C-5、Q-01–Q-22 已于 2026-10-25 全部拍板。正文中标「待核实」的是需要源码或业务数据确认的事实，不是待拍板的决策。

---

## 2. 架构定位

### 2.1 识别是新资源，还是现有动作的组合？—— 组合

1. **写入纪律**。区域表只允许 `ACT-FON-GEN-002 / 011` 写（E7）；`invd_invoice` 的 INSERT 只允许在 `InvdInvoiceWriter`（core README「七条约定」第 1 条）。独立的「识别任务服务」要么重复实现 002，要么只是它的 HTTP 转发：多一跳，少一份审计。
2. **身份已经存在**。「`docId` 终身不变」「文件级去重」「单票重试」在 FON 里分别是 `R{n}` 永不复用（E6）、内容哈希幂等命中（E18）、未升格区域可重抽（E6）。再造一套 `taskId / docId` 就是两套身份。
3. **检查项各有归宿**。gov 是轴 G 事件（E10 / E11），dup 是 EIP 四层防重（E12），sup / biz 是合规档位（E13）。装进一个「任务结果」等于在 FON 侧再物化一份只有 INVD / EIP 才有权威的事实，与 FON「非权威自认」的设计意图（`05_fon.sql:328, 332`）相悖。

对调用方，变化只是「POST 任务再 GET 任务」变成「POST 抽取（202）再 GET 抽取」。

### 2.2 编排落在哪里？—— doc-data + ingress，doc-ai 只做引擎

```
  交互式渠道（移动端 / H5 / 门户：用户看结果再确认）
  ──────────────────────────────────────────────
  前端 ──① POST /files（或 /legacy/v1/files 直传）────────────────► doc-data · ACT-FON-GEN-001
       ──② POST /files/{fileId}/extraction {method: LLM_EXTRACT, engine{…}} ► doc-data · ACT-FON-GEN-002
       ◄── 202  Location: …/extraction  Retry-After: 2                      │ 写 fon_file.ext_json.extractionRun(PENDING)
       ──③ GET  /files/{fileId}/extraction（轮询，ETag / 304）               │
                                                                           ▼ 任务 worker（租约）
                                                        SegmentationPort → DocAiSegmentationAdapter（invoice.docai.*）
                                                                           │ mTLS + 客户端凭证，用户令牌不下传
                                                                           ▼
                                                        doc-ai · POST/GET /doc-ai/v2/engine/tasks（§4.7）
                                                                           │ 202 → 轮询
                                                                           ▼
                                                        doc-data：短事务写 fon_source_region[]（R1..Rn）
                                                                    promotion_status=EXTRACTED
                                                                    outbox inbound-invoice.fon / FileExtracted
       ──④ POST /files/{fileId}/promotions {regionIds[], legalEntityId, countryCode} ► ACT-FON-GEN-003
                                                                           │ 进程内 ACT-INVD-GEN-001 / ACT-RDOC-GEN-001
       ──⑤ POST /invoices/{id}/verify {receipt?}                           ► ACT-INVD-GEN-006 → 013 写轴 G
       ──⑥ POST /pools:resolve → POST /pools/{poolId}/items                ► pool · ACT-EIP-GEN-002（四层防重）

  单一入口（邮箱 / ERP 等外部集成 / 门户批量）
  ──────────────────────────────────────────────
  调用方 ── POST /api/v1/ingress/files ──► ingress：core.ingress_request 分段进度
                                        FILE_REGISTERED → EXTRACTING → EXTRACTED → PROMOTED → POOL_RESOLVED → COMPLETED
                                        每段调上面同一组端点；重试按已有引用跳段
```

**不进 doc-ai**：doc-ai 没有也不该有 `tenant_bucket`、`TenantContext`、分区键拦截器，而「任何业务 SQL 必须带 tenant_bucket」是收票域红线（`TenantContext.java:10`）。让它写 FON 表，要么复制一整套 platform-tenant，要么绕过。它跑 sup / dup / biz 还得反向读 5 个 Java 服务的主数据、票池、合规档位。引擎层越薄，v1 契约越容易保持冻结。

**不新建第六个 Java 服务**：它能做的每件事都已是 doc-data 里的一个动作（002 / 003 / 006），新服务只能 HTTP 转发。`ingress` 已是编排层，`core.ingress_request` 的分段进度 + 租约正是为「第 2 段成功、第 4 段抖动」设计的（`01_schema_and_common.sql:503-512`）。

**职责边界**

| 能力 | doc-ai 引擎 | doc-data（FON / INVD） | pool / wallet |
|---|---|---|---|
| 多票拆分、字段识别、`confRaw / box / page`、票内勾稽（`OCR-*`） | ✅ 产出 | 原样存入 `region_extracted_data_json` | — |
| 国家模板、prompt 版本、`engine{processor, model, release}` | ✅ | 记入 `segmentation_run_ref = DOCAI_<tpl>@<release>#<runId>` | — |
| gov 查验（MY MyInvois 等） | ✅ 作为识别增强（`truthSource=gov`）并返回**回执** | 006 消费回执写轴 G；无回执时经 `INVOICE_CHECK` 端点调引擎查验器 | — |
| gov 补查 | ✗ | ✅ INVD 持久任务（§6.3） | — |
| 幂等、租户桶、审计、Outbox | ✗ | ✅ 动作框架 | ✅ |
| dup | ✗ | ✗ | ✅ EIP-002 四层防重 |
| sup / biz | ✗ | ✗ | ✅ 合规规则包：BDOC-006（挂票）、PIW-006（导入） |
| 计费、配额（按页） | ✅ 引擎内 | 透传 `429 + Retry-After`，不记账 | — |
| 评测（`purpose=evaluation`） | ✅ 自己的评测面 | ✗ | ✗ |

**交互方式**：同步 HTTP（mTLS + 客户端凭证），异步化在 doc-data 侧——拿到引擎 `taskId` 后由抽取 worker 按 `pollAfterMs` 轮询，运行态记在 `fon_file.ext_json.extractionRun`（§4.9）。两者之间**不引入 Kafka**：doc-ai 不在收票域的 Kafka 域内，`core.outbox_event` 是给下游域（票池、看板、前端推送）用的。

### 2.3 每件事只做一次

| 事情 | 唯一的地方 |
|---|---|
| 文件去重 | FON-001 内容哈希（E18） |
| 区域 / 文档身份 | FON `region_id`（E6） |
| 识别结果原样 | `region_extracted_data_json`（E6） |
| 字段词汇翻译 | `field-map.yaml` → 生成 `FON_SECTION_FIELD_MAP / LINE_FIELD_MAP` 的 doc-ai 行（§8） |
| 票种分流 | `INVOICE_KIND_MAPPING`（E9） |
| gov 状态 | 轴 G 事件史（E11） |
| 重复判定 | EIP-002（E12） |
| 合规档位 | `cfg.tenant_policy(COMPLIANCE_VERIFY)`（E13） |
| 外部端点 | 识别：应用配置 `invoice.open-api.recognition.*` / `invoice.docai.*`（S3）；查验：`cfg.legacy_capability_endpoint`（E20） |

---

## 3. 端点清单（最终集合）

「新增」列：✅ 新端点 / ➕ 既有端点加分支或入参 / — 不变。

### 3.1 doc-data（`/invoice_inbound/doc-data`）

| 方法 | 路径 | 动作编码 | 新增 | 用途 |
|---|---|---|---|---|
| POST | `/api/v1/files` | `ACT-FON-GEN-001` | — | 上传登记（元数据）。同内容 → 200 `IDEMPOTENT_HIT` 返回既有 `fileId` |
| POST | `/legacy/v1/files` | `ACT-FON-GEN-001`（模态 B） | — | multipart 二进制直传；移动端 / H5 首版用它（预签名端点不存在，清单 :259） |
| POST | `/api/v1/files/{fileId}/extraction` | `ACT-FON-GEN-002` | ➕ | 引擎选项放既有的 `segmentationRunConfig.engine`；方法为 `LLM_EXTRACT` 时返回 **202** + `Location` + `Retry-After`，其余 provider 保持 200 |
| GET | `/api/v1/files/{fileId}/extraction` | （查询） | ✅ | 抽取状态 + `regions[]` + `engine`；支持 `If-None-Match`、`?regionId=`、`?keys=alias\|bt`、`?view=raw` |
| GET | `/api/v1/files/{fileId}/regions/fingerprints` | （查询） | — | L2b 证据，供 pool |
| POST | `/api/v1/files/{fileId}/promotions`、`…/regions/{regionId}/promotion` | `ACT-FON-GEN-003` | ➕ | 新入参 `countryCode`；法人用既有的 `ownerScope=TENANT + ownerRef`；逐区域独立成败，恒 200 |
| GET | `/api/v1/files/{fileId}`、`…/download-url` | （查询） | — | 原件字节 / 公开 URL |
| POST | `/api/v1/files/{fileId}/invalidate` | `ACT-FON-GEN-007` | — | 作废 |
| POST | `/api/v1/invoices/{id}/verify` | `ACT-INVD-GEN-006` | ➕ | doc-ai 的 gov 回执转成既有的 `verificationEvidence` 直传；`retryable=true` 时登记补查任务（§6.3） |
| GET | `/api/v1/invoices/{id}`、`…/gov-status-events` | （查询） | — | 轴 G 现值 / 事件史 |
| POST | `/api/v1/invoices/{id}/update`、`…/completion` | `ACT-INVD-GEN-017 / 005` | — | 升格后修正 / 补全（§6.4） |
| POST | `/internal/files/{fileId}/extraction-runs/{runId}/completion` | （内部） | 后补（Q-11：首版不做） | doc-ai 完成回调；`X-Engine-Callback-Token` 服务令牌（先例 `X-Pool-Resolution-Token`，清单 :86）；只唤醒 worker |

### 3.2 pool / ingress / doc-ai

| 方法 | 路径 | 动作编码 | 新增 | 用途 |
|---|---|---|---|---|
| POST | `/api/v1/pools:resolve` → `/api/v1/pools/{poolId}/items` | — / `ACT-EIP-GEN-002` | — | 入池；`sourceAnchor` 必带（L2a 硬闸） |
| POST | `/api/v1/ingress/files` | （编排） | ✅（C-1） | 单一入口，§4.6 |
| GET | `/api/v1/ingress/requests/{requestId}` | （查询） | ✅ | 单一入口的进度，§4.6 |
| POST / GET | `/doc-ai/v2/engine/tasks[/{id}]` | — | ✅ | 引擎任务，§4.7 |
| GET | `/doc-ai/v2/engine/tasks/{id}/documents/{n}/gov` | — | ✅ | 查验器接口（`INVOICE_CHECK` 指向 doc-ai 的国家） |
| — | `/doc-ai/ai/knowledge/nlpService/…`（v1） | — | — | 冻结，加 `Deprecation / Sunset / Link` 头（Q-17） |

### 3.3 不再需要的端点

早期设计的 `POST /recognition/tasks`、`GET /tasks/{id}` 及其子资源、`:cancel`、`:retry`、`DELETE /tasks/{id}`、任务列表、预签名上传，全部不做。对应关系：重跑 = 再次调用 `extraction`（未升格区域可重抽）；删除 = `invalidate`；单一入口 = `ingress/files`。

---

## 4. 请求 / 响应契约

**公共请求头**：`Authorization: Bearer <token>`、`X-Tenant-Id`、`Accept-Language`（错误文案语言）、`traceparent`；个人票夹上下文另带 `X-Holder-Ref`（清单 :173）。`Idempotency-Key` 只在动作本身要求时必填：`update / completion`（清单 :54, 56）与 §4.6 的 ingress；§4.1–4.4 不要求（§4.5）。

### 4.1 `POST /api/v1/files/{fileId}/extraction`（➕）

请求体沿用现有字段（`FileController.ExtractRequest`，S1）；doc-ai 的选项放进已有的透传字段 `segmentationRunConfig`，不加新字段：

```jsonc
{
  "extractionMethod": "LLM_EXTRACT",           // 可省：由 FON_EXTRACT_METHOD_CHAIN 派生（Q-02 加 countryHint）
  "extractionSchemaId": "SCH-DOCAI-GLOBAL-V2", // 可省：按方法取（RULE-FON-241-G）
  "extractionSchemaVersion": null,
  "segmentationRunConfig": {                   // 既有透传 Map → SegmentationPort.Request.runConfig
    "engine": {
      "country": "MY",                         // 销方国家；与模板国家冲突或传 auto → 422 ENGINE_OPTION_INVALID
      "templateId": "tpl_sg_10",               // 可省 = 该国规范模板
      "gov": true                              // 允许引擎做查验增强；缺省按国家能力表（Q-18）
    }
  },
  "targetRegionIds": null                      // 既有；今天只参与 Guard 计数，重抽按位置刷新全部未升格的 ACTIVE 区域（S4）
}
```

- **同步 provider**（现有 `CLOUD_COMPOSITE`）：行为不变，200；响应体见 §9.1。
- **异步 provider**（`LLM_EXTRACT` → doc-ai）：`ActionResult` 没有「已受理」结果（S2），由 controller 看 payload 里 `extractionRun.status=PENDING` 返回 202：
  ```
  HTTP/1.1 202 Accepted
  Location: /api/v1/files/{fileId}/extraction
  Retry-After: 2
  { "result": "UPDATED", "extractionRunId": "<uuid7>", "pollAfterMs": 2000, "segmentationRunRef": "DOCAI_tpl_sg_10@MY-2026.10#<uuid7>" }
  ```
  同一文件已有 `PENDING / RUNNING` 的运行 → 200 `result=IDEMPOTENT_HIT`，返回同一 `extractionRunId`（§4.9）。
- Guard 拒绝（422）沿用现有码：`STATUS_NOT_UPLOADED`、`FORMAT_NOT_EXTRACTABLE`、`SCHEMA_NOT_FOUND`、`SCHEMA_VERSION_UNSUPPORTED`、`EXTRACTION_LOCKED_AFTER_PROMOTION`（`DenyCode.java:340-369`）；新码 `ENGINE_OPTION_INVALID`（§9.2）。
- 执行期失败不改 HTTP 状态：落 `promotion_status=EXTRACT_FAILED` + `extraction_failure_reason{reason, provider:"DOCAI", providerErrorCode, detail, providerTraceId}`（与现有键一致，S3）。是否可重试由 `FON_EXTRACT_ERROR_MAPPING.transient` 决定；这张表今天没有代码读（S3），DOCAI 适配器是第一个用它的。

### 4.2 `GET /api/v1/files/{fileId}/extraction`（✅）

```jsonc
{
  "fileId": "0195c3f0-…",
  "promotionStatus": "EXTRACTED",            // NOT_EXTRACTED | EXTRACTED | EXTRACT_FAILED | PROMOTED（05_fon.sql:163）
  "run": {                                   // 最近一次抽取运行 = fon_file.ext_json.extractionRun（§4.9）
    "extractionRunId": "…", "status": "DONE", "method": "LLM_EXTRACT", "extractionSchemaId": "SCH-DOCAI-GLOBAL-V2",
    "segmentationRunRef": "DOCAI_tpl_sg_10@MY-2026.10#…", "startedAt": "…", "finishedAt": "…",
    "pollAfterMs": null, "failure": null     // 进行中：status=RUNNING、pollAfterMs 有值；失败：failure = extraction_failure_reason
  },
  "engine": { "provider": "DOCAI", "processor": "gemini", "model": "gemini-2.5-pro", "release": "MY-2026.10", "promptVersionId": 812, "calibrationId": null },
  "pageCount": 3,
  "regions": [
    {
      "regionId": "R1",
      "docId": "FON:0195c3f0-…:R1",          // = source_anchor；升格后 invd_invoice.source_anchor 同值
      "pageNo": 1, "pages": [1, 2],          // pages 取自引擎结果（Q-06）
      "geometry": { "box": [x1, y1, x2, y2], "rotation": 0, "coordSpace": "ORIGINAL", "basisSize": [w, h] },
      "regionKind": "RECEIPT_CANDIDATE",     // NOISE = 非票据 / 空票
      "regionStatus": "ACTIVE",
      "regionPromotionStatus": "NOT_PROMOTED",   // PROMOTED 时附 promotedDataType / promotedDataRef
      "promotedDataType": null, "promotedDataRef": null,
      "docType": "invoice", "lang": "ms", "currency": "MYR",
      "fields":   [ /* §4.2.1 */ ],
      "items":    [ { "idx": 1, "fields": [ /* 同上 */ ] } ],
      "taxLines": [ { "idx": 1, "fields": [ /* 同上 */ ] } ],
      "refs":     [ /* 原票引用 */ ],
      "payMeans": [ /* 付款方式 */ ],
      "extra": { },                          // 映射表还没有的引擎键，原样保留
      "checks": { "recognition": [ { "code": "OCR-SUM", "status": "ok" } ] },   // 只有识别段；gov / dup / sup / biz 见 §6.2
      "fingerprint": { "perceptualHash": "…", "normalizedTextDigest": "…" }
    }
  ],
  "rowVersion": 3
}
```

- `ETag` = `rowVersion` + `extractionRun.status` + `extractionRun.attempts`（运行态写入不递增 `row_version`，§4.9）；`If-None-Match` 命中 → 304 + `Retry-After`。
- `?view=raw` 返回 `region_extracted_data_json` 原样（调试 / 回流用）。
- `?keys=bt` 把 `key` 换成 BT 编号；`bt / ubl` 属性在两种视图下都在。
- 404：文件不存在、不属本租户、或 `lifecycle_status=PURGED`。`INVALIDATED` 文件返回 200，`regions` 只含元数据不含字段（审计读取走 `/audit`，清单 :103）。

#### 4.2.1 字段对象

```jsonc
{
  "key": "total",                            // 中台别名（K-3）；?keys=bt 时为 "BT-112"
  "bt": "BT-112",                            // EN 16931 业务术语；无 BT 的扩展字段为 null
  "ubl": "cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount",   // UBL 2.1 路径；重复组含下标，如 cac:InvoiceLine[2]/cac:Item/cbc:Name
  "value": 1234.50,                          // 归一化值：码表、数字、ISO 8601 日期、ISO 4217 币种
  "valueRaw": "RM 1,234.50",                 // 票面原文，不翻译（容器 translate="no"）
  "valueType": "money",                      // string | number | money | date | enum
  "currency": "MYR",                         // valueType=money 时必带
  "confRaw": 0.97,                           // 引擎自报分，未校准（Q-14）；低于字段组阈值即需人工确认（Q-15）
  "conf": null,                              // 校准后概率；校准表上线前恒 null
  "truthSource": "gov",                      // 值的可信来源，见下表
  "box": { "x": 70.2, "y": 61.0, "w": 14.5, "h": 2.0, "page": 2, "coordSpace": "PERCENT" },  // 页面百分比 0–100；无定位为 null
  "group": "amount"                          // id | date | tax | amount | attr | bank：决定更正等级与阈值
}
```

`truthSource` 取值。引擎只会给出前四种；后五种由收票域在升格后写进数据对象侧的溯源。中台 `InvoiceField.src` 由它映射得到。

| 取值 | 含义 |
|---|---|
| `structured` | XML / UBL 等结构化主件直接解析 |
| `signature` | 本地验签或二维码（如 MY 二维码 UUID） |
| `gov` | 税局 / 清关平台返回（如 MY LHDN） |
| `ocr` | 影像识别 |
| `match` | 三单匹配确认 |
| `payment` | 实付金额 |
| `supplier` | 供应商确认 |
| `human` | 人工更正 |
| `master` | 主数据 |

`box` 优先用 PDF 文字层坐标（doc-ai `word_locator`），其次 LLM 回报的框（`normalize_bbox`，兼容 0–1000 坐标）；都没有则 `null`，前端不画锚点。区域整体框用 FON 的 `geometry` 结构。

**低置信判定（Q-15）**：`confRaw` 低于所在字段组的阈值时，`checks.recognition` 出 `OCR-CONF fail`，`detail.fields` 列出这些字段，界面要求人工确认。阈值放 doc-data 配置，首版取值：

| 字段组 | 阈值 |
|---|---|
| `id` / `tax` / `amount` | 0.7 |
| `attr`、`date` | 0.5（`date` 首版并入 `attr`，待业务确认） |
| `bank` | 0.8 |

校准上线（`conf` 有值）后，判定改用 `conf`，阈值重新评估。

### 4.3 `POST /api/v1/files/{fileId}/promotions`（➕）

```jsonc
{
  "regionIds": ["R1", "R3"],          // 既有，必填、显式点名（E8）
  "ownerScope": "TENANT",             // 既有，必填
  "ownerRef": "LE-SG01",              // 既有；TENANT 作用域下即法人（K-2）
  "countryCode": "MY",                // 新增；缺省取区域结果中的国家；升格分流用（Q-03）
  "targetTypeOverride": null,         // 既有：INVOICE_DATA | RECEIPT_DOC_DATA
  "bundleOpBatchNo": null,            // 既有
  "jurisdictionProfileVersion": null  // 既有
}
```

响应恒 200，逐区域 `{regionId, result, promotedDataType, promotedDataRef, idempotentHit, linkId, sourceAnchor}`（S5）；`INTERNAL_CREATE_DENIED` 透传 INVD-001 / RDOC-001 的拒绝码（`DenyCode.java:478`）。

- 完整度不开放入参：代码写死 `CompletenessLevel.FULL`（S5）。
- 已升格区域再升格返回 `REGION_ALREADY_PROMOTED`，不是幂等命中（S5）。调用方（含 ingress）要先落库每个区域的 `sourceAnchor / promotedDataRef`，再进下一段。
- 非 CN：DOCAI 适配器把引擎识别的国家写进区域（Cloud 适配器硬写 `CN`，S4）；`INVOICE_KIND_MAPPING` 加 `countryCode` 列后，非 CN 票不再落到兜底的 REJECT 行（Q-03）。

### 4.4 `POST /api/v1/invoices/{id}/verify`（➕ 扩展既有回执）

006 已支持回执直传：请求体 `{verificationEvidence, forceCheck}`，`verificationEvidence{outcome: PASSED | FAILED | NOT_APPLICABLE, channel, checkedAt, receiptRef, legacyCode, facesheet, rawPayload}`（S6）。doc-ai 的 gov 回执按 §6.5 转成它，不另立字段：

```jsonc
{ "verificationEvidence": { "outcome": "PASSED", "channel": "MYINVOIS", "checkedAt": "…", "receiptRef": "<MyInvois UUID>",
                            "legacyCode": "Valid", "rawPayload": { /* doc-ai 回执与融合报告原文 */ } },
  "forceCheck": false }
```

- 有回执且在 `VERIFY_REQUIRED_ELEMENTS.maxAgeDays` 内：不再调税局，经 `CHECK_INVOICE_STATUS` 翻译为轴 G 事件，状态 `01 → 02`。`CHECK_INVOICE_STATUS` 没有国家维度，MYINVOIS 要加输入列（C7，表结构待核实）。
- 无回执：走现有路径，经 `INVOICE_CHECK` 端点调查验器（CN 用发票云；MY 指向 doc-ai，Q-05）。
- 税局还没出结论时不传回执，由补查任务稍后以 `forceCheck=true` 调 006（§6.3）。

### 4.5 幂等与并发

| 步骤 | 幂等依据 | 并发控制 |
|---|---|---|
| 上传登记 | 内容哈希 → `IDEMPOTENT_HIT`（E18） | `fon_content_hash_registry` 主键 |
| 抽取 | 进行中的运行唯一；完成后可重抽未升格区域 | `extractionRun` 条件更新 + 租约（§4.9） |
| 升格 | 锚 `FON:{file}:{region}` → INVD-001 S7 第一道（`03_invd.sql:513-517`） | `invd_anchor_key` 主键 |
| 核验 | 006 现有口径（Redis 锁，`17_seed…:10`） | — |
| 单一入口 | `Idempotency-Key` → `core.ingress_request` 请求指纹 | ingress 租约 |

`core.idempotency_record` 的主键是裸 `idempotency_key`，没有租户分量（E18），所以凡要求 `Idempotency-Key` 的地方，调用方必须用 UUID。

### 4.6 `POST /api/v1/ingress/files`（✅ 单一入口，C-1）

```
POST /invoice_inbound/ingress/api/v1/ingress/files
Content-Type: multipart/form-data      （或 application/json 传已登记的 fileId）
Idempotency-Key: <uuid>
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `file` 或 `fileId` | ✅ 二选一 | 二进制直传（内部走 `/legacy/v1/files`），或已登记文件 |
| `uploadChannel` | ☐ | `FON.UploadChannel` 值（`EMAIL_INGEST / MOBILE_CAPTURE / …`）；缺省按调用凭证派生，派生不出 → 422 `USAGE_CATEGORY_UNRESOLVED` |
| `legalEntityId` | ☐ | 映射为升格的 `ownerScope=TENANT` + `ownerRef`；缺省时链路停在「已抽取」，等人工升格 |
| `countryCode` | ☐ | 销方国家；进 `engine.country` 与升格分流 |
| `templateId` | ☐ | 进 `engine.templateId`；为空用该国规范模板 |
| `autoPromote` | ☐ | `ALL_RECEIPT_CANDIDATES \| NONE`；缺省按渠道配置（Q-12） |

响应 `202 { "requestId": "…", "fileId": "…", "pollAfterMs": 2000 }` + `Location: /api/v1/ingress/requests/{requestId}`。同键同报文 → 200 重放；同键不同报文 → 409。

`GET /api/v1/ingress/requests/{requestId}` 返回 `core.ingress_request` 的分段进度：`stage`（`FILE_REGISTERED → EXTRACTING → EXTRACTED → PROMOTED → POOL_RESOLVED → COMPLETED`）、各段产出引用（`fileId`、`regions[].docId → dataRef → itemId`）、失败段的 `denyCodes[]`。识别结果本身从 `GET /files/{fileId}/extraction` 取，不重复返回。

实现要点（S15）：
- 现有 `/ingress/invoices` 全同步（201），没有 worker；文件链要 202，需要新增后台推进器（IG3）。
- `core.ingress_request` 主键是 `(tenant_id, idempotency_key)`，没有 `request_id / file_id`，要加列（C9）。
- 各段产出（`fileId`、每个区域的 `sourceAnchor / promotedDataRef`）必须逐段落库：升格重试返回 `REGION_ALREADY_PROMOTED` 而不是幂等命中，不落库就续不上。
- 入池要把 `sourceAnchor` 传给 EIP-002，L2a 锚幂等才生效。

### 4.7 doc-ai v2 引擎接口（服务间，数据中心内网）

每个数据中心一套 doc-ai；只被 doc-data 的任务 worker 调用；不认识法人、渠道、策略矩阵、sup / dup / biz；不写收票域任何表。

```
POST /doc-ai/v2/engine/tasks            mTLS + 客户端凭证（scope: engine.tasks）
GET  /doc-ai/v2/engine/tasks/{id}
GET  /doc-ai/v2/engine/tasks/{id}/documents/{n}/gov
```

**创建（multipart）**

| 字段 | 必填 | 说明 |
|---|---|---|
| `file` | ✅ | PDF / JPEG / PNG / TIFF / WebP；≤ 20 MB；加密 PDF、压缩包拒收 |
| `templateRef` | ✅ | `{ "externalTemplateId": 10 }` 或 `{ "country": "MY" }`（规范模板） |
| `tenantId` | ✅ | 收票域租户；引擎内部映射到 doc-ai 租户 |
| `ou` | ☐ | `{ "tenantOuNo", "useOuNo" }`，由 doc-data 从法人映射；引擎不再自己反查 base-cost |
| `checks` | ✅ | `["ocr"]` 或 `["ocr","gov"]` |
| `purpose` | ☐ | `production`（缺省）\| `evaluation`：不计费、不查验、结果只留在 doc-ai（C-5） |
| `Idempotency-Key` 头 | ☐ | 作用域 `(client_id, key)`，保留 24 h；同键不同文件哈希 → 409 |

**响应**：`202 { taskId, pollAfterMs }`。查询返回：

```jsonc
{
  "taskId": "…", "status": "queued | running | completed | failed",
  "engine": { "processor": "gemini", "model": "…", "release": "MY-2026.10", "promptVersionId": 812, "calibrationId": null },
  "summary": { "docs": 2, "ok": 2, "failed": 0 },
  "documents": [
    { "n": 1, "status": "ok", "docType": "invoice", "pages": [1, 2], "lang": "ms", "currency": "MYR",
      "fields": { /* doc-ai 开放平台分组键（§8.4），每个叶子 {value, valueRaw, confRaw, box, truthSource} */ },
      "checks": { "recognition": [ … ], "gov": [ … ] },
      "govReceipt": { "govVerdict": "VALID | NEGATIVE | INCONCLUSIVE", "rawStatusCode": "…", "uuid": "…", "reason": null, "fusion": { … } } }
  ]
}
```

- 任务状态：内部 `PENDING / RUNNING / COMPLETED / FAILED` 原样映射，**不再把 RUNNING 折成 PENDING**。
- 字段键是 doc-ai 开放平台键，由 doc-data 按 `field-map.yaml` 的 `docai` 列翻译（§8）。
- gov 查验在任务内同步做一次；没有结论就如实返回 `INCONCLUSIVE` 或 `reason`，补查由收票域负责（§6.3）。
- 重试：provider 故障指数退避；解析失败不重试，直接 failed。
- 保留：结果 10 天后删正文，墓碑行保留 30 天。
- v1 开放平台冻结；响应加 `Deprecation: true`、`Sunset: <日期>`、`Link: <…/v2>; rel="successor-version"`（Q-17）。

### 4.8 轮询与通知

- 前端：按 `Retry-After` / `pollAfterMs` 轮询（2 s 起退避到 10 s）；带 `If-None-Match`；页面隐藏暂停；`AbortController` 取消。
- 域内：现有 002 不发 outbox（S7）。新增：抽取完成或失败时写 `core.outbox_event(topic=inbound-invoice.fon, event_type=FileExtracted | FileExtractFailed, partition_key=fileId)`，与现有 `FileUploaded` 同 topic、同命名风格（S7）。ingress 首版不订阅，靠轮询推进（§4.6）。
- doc-ai → doc-data：首版不做回调（Q-11）。将来若做，回调只把 `extractionRun.availableAt` 置为 now，worker 仍去 GET 引擎结果，回调丢失、重放、乱序都无害。

### 4.9 抽取运行态：`fon_file.ext_json.extractionRun`（Q-01）

不建任务表，运行态放在文件行的 `ext_json`（`05_fon.sql:85`，今天没有代码写它）。只保存最近一次运行；历次运行留在 `core.action_audit_log`。

```jsonc
"extractionRun": {
  "runId": "<uuid7>",
  "status": "PENDING | RUNNING | DONE | MANUAL",
  "method": "LLM_EXTRACT", "engineTaskId": "…", "segmentationRunRef": "…",
  "attempts": 0,
  "availableAt": "…",    // 下次可认领时间；认领时推到 now+180s 即为租约（同 invd_revision_task）
  "leaseToken": null,    // 认领时写入；写回结果时校验（fencing）
  "startedAt": null, "finishedAt": null, "lastError": null
}
```

| 环节 | 做法 |
|---|---|
| 写入者 | 只经 `FonFileWriter`（或新建 Writer）；动作和 worker 不直接调 Mapper 写方法（`WriteDisciplineTest`；现 002 直接调 `fileMapper.updateExtraction` 是既有漏洞，S8） |
| JSON 写法 | 两层 `\|\|` 合并：`ext_json \|\| jsonb_build_object('extractionRun', …)`。不用 `jsonb_set`：中间层不存在时它静默不写。先例 `InvdVerifyMapper.updateKeyFieldMismatch`（S9） |
| 不递增 `row_version` | 同一先例，注释原话「不带 row_version：追加的票视角事实」（S9）。挂载、作废等用户动作用 `row_version` 做 CAS，运行态写入不该和它们争 |
| 受理防重复 | 条件更新 `WHERE coalesce(ext_json#>>'{extractionRun,status}','') NOT IN ('PENDING','RUNNING')`；影响 0 行 → `IDEMPOTENT_HIT` |
| 认领 | 照 `InvdRevisionTasks`：`@Scheduled(fixedDelay)` + 开关；跨桶 `FOR UPDATE SKIP LOCKED LIMIT 1`，Mapper 放 `repository/core/`（`PartitionKeyGuardInterceptor` 按语句 ID 的 `.core.` 段豁免）；认领后 `TenantContext.callWith` 执行（S10） |
| 索引 | `CREATE INDEX idx_fon_extract_run ON fon.fon_file ((ext_json#>>'{extractionRun,availableAt}')) WHERE ext_json#>>'{extractionRun,status}' IN ('PENDING','RUNNING');`（跨桶认领，不以 `tenant_bucket` 打头） |
| 写区域 | 拿到引擎结果后，在 002 现有的 Redis 锁内经 `FonRegionIdAllocator` 分配 `R{n}`、经 `FonFileCommitGuard` 短事务写区域，与同步路径同一套（S4） |
| 重试 | `transient=true`：`attempts + 1`，指数退避（上限 3600 s，同现有任务）；超 `extractRetryLimit` → `MANUAL` + `EXTRACT_FAILED`；不可重试 → `DONE` + `EXTRACT_FAILED` |

代价：没有独立任务表，就没有「全部进行中运行」的单表视图，运维查询要靠上面的表达式索引。

---

## 5. 证据摘要

### 5.1 收票域里与识别直接相关的事实

| # | 事实 | 出处 |
|---|---|---|
| E1 | FON 已有完整的「上传登记 → 切分抽取 → 区域 → 升格」链：`ACT-FON-GEN-001/002/003`，端点 `POST /files`、`POST /files/{id}/extraction`、`GET /files/{id}/regions/fingerprints`、`POST /files/{id}/promotions` | 清单 :92-105 |
| E2 | `ACT-FON-GEN-002` 今天就调外部识别：provider `FPY_CLOUD`，方法 `CLOUD_COMPOSITE`；结果经 `FON_SECTION_FIELD_MAP`（票头）与 `FON_SECTION_LINE_FIELD_MAP`（行）翻成内部词汇，表外字段进 `ext.recognition.*`「一个不丢」 | `28_seed_rules_fon_cloud_recognition.sql:1-19, 174-199, 285`；`50_seed_rules_fon_promote_lines.sql:17-48` |
| E3 | 抽取方法值集已含 `LLM_EXTRACT`（needsExternal=true）；Schema 注册表是值集 `FON.ExtractionSchema`，加新引擎只加行 | `22_seed_rules_fon_segment_extract.sql:49-53, 100-105` |
| E4 | 外部错误码 → 失败归因 + `transient` + 重试动作已表化（`FON_EXTRACT_ERROR_MAPPING / FON_EXTRACT_RETRY`），重试上限 `FON.Constant.extractRetryLimit=5` | `28_seed…:121-170`；`22_seed…:107-111` |
| E5 | 抽取是「外部识别后短事务提交」；失败仍返回 200，落状态轴 `promotion_status=EXTRACT_FAILED` + `extraction_failure_reason{reason, provider, errorCode, failedPages}`（DDL 注释；代码实际键见 S3） | core `CLAUDE.md:150`；清单 :95；`05_fon.sql:67-68, 163-165` |
| E6 | 区域是受限对象：身份 = (file_id, region_id)，`R{n}` 永不复用；几何是「寻址提示、可漂移」，含 `coordSpace` 与 `basisSize`；`region_extracted_data_json` 是「采集现场原样、非权威、不做业务清洗」；已升格区域禁止重抽 | `05_fon.sql:261-346`（尤其 :323, :325, :332）；`DenyCode.java:369` |
| E7 | 区域表的 INSERT / UPDATE 只允许在 `ACT-FON-GEN-002` 与 `011`；region_id 只经 `FonRegionIdAllocator` 分配 | `05_fon.sql:253-256` |
| E8 | 「识别不出」与「识别出一张空票」已区分：`FON_REGION_KIND_DERIVE` 加 `hasKeyElements` 列，空壳判 `NOISE`；升不升格由前端逐条点名，`regionIds` 必须显式传 | `28_seed…:86-116` |
| E9 | 升格分流复用 `INVOICE_KIND_MAPPING`（CN 票种 → INVD / RDOC / REJECT）；判不出即 `TARGET_TYPE_UNRESOLVED`，可 `targetTypeOverride` | `27_seed_rules_fon_promote_region.sql:6-9, 42-47`；`DenyCode.java:468` |
| E10 | INVD 核验 006 经 `cfg.legacy_capability_endpoint(INVOICE_CHECK)` 调查验，可直传回执；`CHECK_ERROR_MAPPING` 输出 `denyCode / retryable / retryAfterSeconds / govVerdict(NEGATIVE\|INCONCLUSIVE)`；执行期 `REJECTED` 有副作用（`cn_check_status=FAILED`），能力不可用 `DENY_CHECK_*` 一个字段都不写 | 清单 :52；`17_seed_rules_invd_verify.sql:6-11, 220-247, 503-509`；`30_seed…:35-42, 87-135`；`DenyCode.java:419-436`；`ActionResult.java:63-77` |
| E11 | 轴 G 事件史只追加，唯一常规写入口 `ACT-INVD-GEN-013`；`source_type` 含 `LOOKUP_RECEIPT / COLLECTION_PAYLOAD / PLATFORM_CALLBACK`；采集通道是否「政府状态可信」由值集属性 `INVD.SourceChannel.govStatusTrusted` 决定，`OCR_UPLOAD=false` | `03_invd.sql:350-401`；`68_seed_invd_gov_sync.sql:140-160` |
| E12 | 票池接收 EIP-002 四层防重：L1 自然键 / L2a 锚幂等（唯一硬闸）/ L2b 文件哈希 + 区域指纹（仅证据）/ L3；入池不硬拒，一律挂 `suspect_duplicate_flag` | `DenyCode.java:73-79`；`06_eip.sql` eip_item 的 `source_anchor / region_fingerprint / content_hash / suspect_duplicate_flag` |
| E13 | 合规校验（旧 26 项，`CMP-<校验项>-NN`）= 规则包 `COMPLIANCE_STANDARD` + 租户策略 `COMPLIANCE_VERIFY` 档位（`FILTER / ALLOW / MEDIUM / YELLOW`），单码 `COMPLIANCE_POLICY_DENIED`，在 `ACT-BDOC-GEN-006` 与 `ACT-PIW-GEN-006` 求值；票种黑名单在 EIP-002 Guard 第 5 款，硬编码拦截 | `51_seed_rules_compliance_standard.sql:2-36`；`02_cfg.sql:92`；`39_seed_rules_eip_receive_item.sql:72, 175` |
| E14 | `ingress` 只编排、只写 `core.ingress_request`（分段进度 + 租约 + 请求指纹），刻意不依赖规则引擎与动作框架；现只有 `POST /api/v1/ingress/invoices` 一条链 | core README :62-70；`01_schema_and_common.sql:500-562`；清单 :202 |
| E15 | 动作信封 `ActionResult{outcome ∈ CREATED/UPDATED/IDEMPOTENT_HIT/DENIED/REJECTED, denyCodes[], details[{ruleId, field, message, actual, retryable?, retryAfterSeconds?}], payload, warnCodes[]}`；`retryable` 是「编排层重试策略的唯一判据」 | `ActionResult.java:21-27, 43-77, 85-96, 165` |
| E16 | Guard 只判定、不写库、不做外部 IO；Apply 可调外部能力但外部 IO 在事务之外；审计 `core.action_audit_log` 带 `idempotency_key / trace_id / rule_package_ver / deny_codes[]`；Outbox 主题注释含 `fon.file.v1`（代码实际用 `inbound-invoice.fon`，S7） | `BusinessAction.java:6-15`；`01_schema_and_common.sql:355-423, 450-476` |
| E17 | HTTP 口径：201 新建 / 200 幂等命中 / 422 拒绝；不存在与不可见共用 404；`X-Tenant-Id` 与路径租户不一致才 403；冒号自定义方法已有先例（`pools:resolve`、`business-documents:sync`、`usages:release`） | 清单 :49, 75, 118, 140, 153, 191 |
| E18 | 幂等：`core.idempotency_record` 主键是裸 `idempotency_key`，Redis 快路径 + 表兜底；FON-001 的幂等键是内容哈希（`fon_content_hash_registry`）；INVD-001 是锚 → 自然键两级 | `01_schema_and_common.sql:481-497`；`05_fon.sql:208-232`；`03_invd.sql:501-537` |
| E19 | 持久任务表先例：`invd_revision_task / invd_completion_task`（`status PENDING/RUNNING/DONE/SUPERSEDED/MANUAL`、`lease_token`、`available_at`、`attempts`） | `03_invd.sql:640-678, 751-790` |
| E20 | 外部能力路由表 `cfg.legacy_capability_endpoint(capability, operation)` 唯一，含 `RECOGNITION / INVOICE_CHECK / RECEIPT_CHECK`，带 `timeout_ms / qps_limit / circuit_enabled / fallback_policy`；**没有国家维度** | `02_cfg.sql:290-314` |

### 5.2 落库形状

| 问题 | DDL 答案 | 出处 |
|---|---|---|
| 范围：EN 16931 核心还是完整 UBL | **两者都不是**。「CN 高频与 Guard 输入字段实表化，UBL 结构性字段入 `ubl_json`，国家扩展入 `ext_cn`，长尾入 `ext_json`」：票头约 16 个 BT 有真实列；参与方全量、交付、支付方式、折扣附加费、税率小计都在 `ubl_json`；行表 10 个业务列 + `line_json`；没有 tax_subtotal / party / payment_means / document_ref 表 | `03_invd.sql:4-5, 15-163, 294-343` |
| 根元素策略 | 单表 + `invoice_type_code`，即「`Invoice` 根 + BT-3」；红票经 `billing_reference_id`（LNK-INVD-003）指向蓝票 | `03_invd.sql:60, 135, 221, 280` |
| 行级税额 / govId / 国家扩展 | 行级税额有列 `line_tax_amount`（EN 16931 核心不允许；落库但不进核心校验）；govId 无列，进 `ubl_json.uuid`（对应 `cbc:UUID`）；CN 扩展 `ext_cn`，其他国家 `ext_json` | `03_invd.sql:309, 138-141` |

### 5.3 doc-ai 现状事实

| 事实 | 出处（相对 `OCR/doc-ai/`） |
|---|---|
| 定位「全球机器 + 国别皮肤」：全球共享的 prompt 优化机器 + 按国家维护的模板、领域知识、黄金集 | `CLAUDE.md:18-24` |
| v1 开放平台：HTTP 恒 200、靠 errcode；异步提交只回 `taskId`，查询一次最多 10 个、`result` 是 JSON 字符串；`callbackUrl` 只入库不触发；查验结果不进响应（作废票调用方看不到） | `app/api/v1/open_api.py:375, 458-590`；`app/services/async_task_service.py:87-141` |
| 国家只取 `api_def.country_code`，请求里的国家忽略，刻意禁止从票面推断 | `app/services/extract_service.py:115-125` |
| 对外字段是裸值：没有 conf / box；bbox 与置信度（LLM 自报）只在工作区路径 | `schemas/extract.py:21-54`；`domain/extraction_pipeline.py:76`；`services/word_locator.py` |
| 一个文件 → `data[]` 多张票，有票级 `page[]`，没有稳定 docId、没有单票状态；整份都是 `docType=other` 时整单 FAILED | `extract_service.py:457-479`；`async_task_worker.py:152-164` |
| 税局查验只有 MY（MyInvois）：二维码 → 一对一关联 → gjfp 查验（VALID / INVALID / CANCELLED / PENDING / NOT_FOUND）→ 只有 VALID 才融合，优先级 LHDN > UBL > OCR；失败一律放行，原因只进内部报告 | `app/services/invoice_verification/__init__.py:14-50`；`app/services/myinvois/{enricher,association,fusion,gateway_client}.py` |
| 已有 UBL → 29 字段映射器（MyInvois），含类型码、税种码、alpha-3 → alpha-2、`TaxExchangeRate` 折算、`schemeID` 区分 TIN / BRN / SST | `app/services/myinvois/ubl_mapper.py`（656 行） |
| 异步任务有租约、fencing、过期回收；重试无退避；准入闸是进程级（文档数 3 且在途页数 24） | `async_task_service.py:299-504`；`extract_gate.py:50-180` |
| 自有租户模型（`ApiDefinition.tenant_id`、X-API-Key、自签 HS256 JWT），与收票域的 `tenant_bucket` 互不相识；没有 OIDC | `CLAUDE.md:124-136, 197-214`；`app/core/security.py` |
| 国家覆盖：MY 生产级（模板 + 36 条黄金集 + 国家 agent + 查验）；JP 中等（20 条黄金集，全部来自 1 个 API）；AU / DE / GB / HK / IT / NL / PL / RO / SG / US / ZA 只有 v1 模板；CN / VN / MX / SA / BR 缺失 | 根目录 `<CC>_invoice_prompt.yaml`；`app/ocr_optimizer/eval/golden_set/` |

### 5.4 服务仓代码事实（2026-10-25 核对，test 分支）

路径相对各服务仓 `src/main/java/com/kingdee/invoice/<服务>/`；`core/` 指 `invoice-inbound-core`。

| # | 事实 | 出处 |
|---|---|---|
| S1 | 002 请求体字段：`extractionMethod, executionMode, extractionSchemaId, extractionSchemaVersion, segmentationRunConfig, targetRegionIds, manualPayload`；`segmentationRunConfig` 原样传到 `SegmentationPort.Request.runConfig` | doc-data `fon/api/FileController.java:743-750`；`fon/port/SegmentationPort.java:35-40` |
| S2 | 动作响应体 = payload 展开 + `result / denyCode / denyCodes / denyDetail`；`Outcome` 只有五种，没有「已受理」；顶层没有 `message`、`traceId`（只有异常处理器的错误体顶层有 `message`） | `FileController.java:274-283`；core `ActionResult.java:43`；`api/ActionExceptionHandler.java:41` |
| S3 | 识别只有一个适配器：`CloudSegmentationAdapter` 写死 `METHOD=CLOUD_COMPOSITE`、`PROVIDER=FPY_CLOUD`，`SegmentationConfig` 在它和 Stub 之间二选一；识别走 `RecognitionClient`（`invoice.open-api.recognition.*`），不走 `legacy_capability_endpoint`；重试是立即重试一次；`FON_EXTRACT_ERROR_MAPPING` 没有代码读；失败原因键为 `provider / providerErrorCode / detail / providerTraceId`，与 DDL 注释（`errorCode / failedPages`）不一致 | `fon/port/CloudSegmentationAdapter.java:45-50, 308-374, 431-437`；`config/SegmentationConfig.java:65-97` |
| S4 | 区域：`FonRegionIdAllocator` 文件内 max+1（首号 R0），须在锁内调用；重抽按位置刷新全部未升格 ACTIVE 区域，`targetRegionIds` 只参与 Guard 计数；`pageNumbers` 取首页；Cloud 适配器把 `countryCode` 硬写成 `CN` | `fon/repository/FonRegionIdAllocator.java:44-50`；`fon/action/FonSegmentExtractAction.java:330-349, 508-509`；`CloudSegmentationAdapter.java:63, 164, 182-193` |
| S5 | 003 请求体：`regionIds, ownerScope（必填）, ownerRef, targetTypeOverride, bundleOpBatchNo, jurisdictionProfileVersion`；响应逐区域 `regionId / result / promotedDataType / promotedDataRef / idempotentHit / linkId / sourceAnchor`；`CompletenessLevel.FULL` 写死；批量重试返回 `REGION_ALREADY_PROMOTED` | `FileController.java:646, 702-733`；`fon/action/FonPromoteRegionAction.java:365-372, 426` |
| S6 | 006 请求体 `{verificationEvidence, forceCheck}`；`VerificationEvidence{outcome PASSED/FAILED/NOT_APPLICABLE, channel, checkedAt, receiptRef, legacyCode, facesheet, rawPayload}`；INVD 侧只用 `CHECK_ERROR_MAPPING` 的 `denyCode / retryable / retryAfterSeconds / userMessage`（`govVerdict` 列只有 RDOC 用） | `api/InvoiceController.java:323, 678-683`；`domain/VerificationEvidence.java:28-35`；`action/InvdVerifyAction.java:463-467, 675-686` |
| S7 | FON outbox：topic `inbound-invoice.fon`，事件名 PascalCase（`FileUploaded`），与 DDL 注释的 `fon.file.v1` 不一致；现有 002 不发 outbox | `fon/action/FonUploadRegisterAction.java:122, 306-312` |
| S8 | 002 直接调 `fileMapper.updateExtraction`；`WriteDisciplineTest` 用小写子串匹配 `mapper.update`，所以没拦住 | `FonSegmentExtractAction.java:216, 237, 278`；`src/test/…/WriteDisciplineTest.java:276-293` |
| S9 | 局部 jsonb 写入、不递增 `row_version` 有先例，且注明用 `\|\|` 合并而非 `jsonb_set` | `resources/mapper/invd/InvdVerifyMapper.xml:103-121` |
| S10 | 后台任务模式：`@Configuration + @EnableScheduling + @Scheduled(fixedDelay)` + `@ConditionalOnProperty` 开关；跨桶 `SKIP LOCKED` 认领，租约 = `available_at` 推到 now+180s + `lease_token`，指数退避上限 3600 s；Mapper 在 `repository.core` 包，被分区键拦截器豁免；认领后进 `TenantContext.callWith` | `action/InvdRevisionTasks.java:22-66`；`resources/mapper/core/InvdRevisionTaskMapper.xml`；core `PartitionKeyGuardInterceptor.java:41-67` |
| S11 | 「已锁」= 池条目 `usageStatus == LOCKED`；`rejectLocked` 可被租户策略 `INVD_REVISE_CONTROL` 覆盖；`forceFlag` 需 `INVD_REVISE_FORCE.allowed=true`，否则 403；`docNumberPrimary / issueDate / countryCode / invoiceTypeCode` 在 `INVD.RevisionReadonly`，017 不能改 | `action/InvdReviseAction.java:95-101, 217-226, 356-364`；core `ddl/78_seed…` |
| S12 | 017 / 005 的 `diff` 键是 `InvoiceDetailRow` 的 camelCase 属性路径（`issuerTaxId`、`taxInclusiveAmount`、`extCn.special.rail.train_no`、`lines`） | `domain/RevisionPayload.java:51, 176-210`；`action/InvdCompleteAction.java:347-352` |
| S13 | `FON_EXTRACT_METHOD_CHAIN` 输入只有 `mimeType, usageCategory`；002 的规则事实里没有国家 | core `ddl/22_seed…:154-156, 285-307`；`FonSegmentExtractAction.java:496-516` |
| S14 | 字段映射只按 `sourceField` 查表；50 号种子自检写死「恰好 15 行」「同一目标至多一条 MAP」 | `fon/port/SectionFieldMapper.java:77`；`PromotedInvoiceLineMapper`；core `ddl/50_seed…:160-172` |
| S15 | ingress：`/ingress/invoices` 全同步（201），没有任何 worker；`core.ingress_request` 主键 `(tenant_id, idempotency_key)`，没有 `request_id / file_id`，`stage` 是无约束 text；只传 `X-Tenant-Id / X-Operator-Ref`；入池调用把 `sourceAnchor` 写死为 null；`WriteDisciplineTest` 禁止源码出现 `fon_file` 等表名、禁止 import `DenyCode` | ingress `api/IngressInvoiceController.java:33-85`；`journal/IngressStage.java:13-25`；core `ddl/01_schema_and_common.sql:516-536`；`client/HttpPoolClient.java:66-68` |
| S16 | pool / wallet / ledger-query 不受影响：EIP-002 只做票种黑名单；`CMP-*` 只在 BDOC-006 与 PIW-006；INVOICE 入池快照为 null 时 pool 读 doc-data 现值；台账视图只读轴 G 等现成列 | pool `action/ItemReceiveAction.java:191-203, 466-470`；`bdoc/action/BdocLinkVoucherAction.java:583-600`；wallet `action/WalletImportToPoolAction.java:293-310` |
| S17 | 工程约定：JDK 25；先在 core 仓 `mvn clean install` 再 `mvn clean verify`；JUnit 5 + AssertJ + Mockito，没有 Testcontainers，DB 集成测试连共享测试库、以环境变量开关；新 Mapper 登记 `MapperParseTest`；改表只改 core `ddl/01_–09_`；新拒绝码同时登记 `DenyCode` 与 `cfg.deny_code_dict`；业务代码从 master 拉分支、PR 到 test，分支名与 PR 标题带 Linear ID | doc-data `CLAUDE.md:143-144`；core `DenyCode.java:938-945`；`FonVoidTransactionIT.java:51-90` |

---

## 6. 状态与检查对齐

### 6.1 任务 / 文档状态 → FON

| 早期概念 | V3 载体 | 说明 |
|---|---|---|
| 任务 `queued` | `extractionRun.status=PENDING`；`promotion_status=NOT_EXTRACTED` | |
| `running` | `extractionRun.status=RUNNING`（持租约） | |
| `completed` | `promotion_status=EXTRACTED`，`extractionRun.status=DONE`；识别段冻结 = `region_extracted_data_json` 在升格后定格（E6） | 区域全为 `NOISE` 也是 EXTRACTED（E8），不算失败 |
| `failed` | `promotion_status=EXTRACT_FAILED` + `extraction_failure_reason`；`extractionRun.status=DONE`（不可重试）或 `MANUAL`（重试耗尽） | 只有引擎一个条目都没返回（`EMPTY_RESULT`）或文件不可用才算失败（`28_seed…:133`） |
| 单票 ok | `region_kind=RECEIPT_CANDIDATE` | |
| 单票 failed / `docType=other` | `region_kind=NOISE`（不可升格，`REGION_KIND_NOT_PROMOTABLE`） | 类别判错走 `ACT-FON-GEN-011` REKIND |
| 汇总计数 | 由 `regions[]` 聚合，服务端不另存 | |
| 过期 / 410 | **无**。文件按 FON 生命周期与 `09_partition_maintenance` 留存；`PURGED` → 404 | |

### 6.2 检查状态 → 轴 A / 轴 G / VerifiedScope / CompletenessLevel

| 检查族 | 状态 | 收票域表达 | 出处 / 说明 |
|---|---|---|---|
| **recognition**（`OCR-*`） | 任意 | 留在区域 JSON `checks.recognition`，由 `GET …/extraction` 渲染；升格时 INVD-001 的 `PRE_FILL / GUARD` 规则再做一次权威勾稽 | FON 层只「自认」，不写旗标；公式见 §8.6 |
| **gov** | `ok` | 006 `UPDATED`：轴 A `01 COLLECTED → 02 VERIFIED`；`gov_status_code=VALIDATED`（事件 `LOOKUP_VERIFY`）；`verified_scope=FULL_DOCUMENT`（或 `SNAPSHOT_ELEMENTS`） | `InvdLifecycleStatus.java:26-29`；`17_seed…:38-41` |
| | `fail`（作废 / 红冲 / 不符） | 回执 `outcome=FAILED` 或查验器返回不符 → 006 `REJECTED` + `DENY_VERIFICATION_FAILED`，`cn_check_status=FAILED`，主状态留 01；回执含 `CANCEL / CREDIT(FULL)` 事件时 → 013 折叠负面 → 010 冻结为 `05 BLOCKED` | `DenyCode.java:419`；`03_invd.sql:155-162` |
| | `pending`（税局未出结论） | 查验器返回可重试错误（`CHECK_ERROR_MAPPING.retryable=true` + `retryAfterSeconds`）→ 006 `REJECTED / DENY_CHECK_UPSTREAM_UNAVAILABLE`，不写任何字段；登记补查任务（§6.3）；`gov_status_code` 仍 `UNKNOWN` | `DenyCode.java:430-431`；`30_seed…:89` |
| | `unavailable`（无接口 / 无权益 / 配置错 / 超窗口） | `DENY_CHECK_NOT_ENTITLED / CONFIG_ERROR`（不可重试），或法域 `gov_status_expectation=NONE` → `NOT_APPLICABLE`；入账时按 `unknown_at_accounting_policy` 处置 | `02_cfg.sql:41-43`；`03_invd.sql:255` |
| | `skipped` | 法域 `expectation=NONE` → `NOT_APPLICABLE`；`LOOKUP_AVAILABLE` 但还没调 006 → `UNKNOWN` | 没有「调用方要求跳过」这件事（C-3） |
| **dup** | `ok / fail` | EIP-002：L2a 锚命中 → `IDEMPOTENT_HIT`（同票不重建）；L1 / L2b / L3 命中 → 条目照建，置 `suspect_duplicate_flag=true` + `duplicate_hit_scope`，复核走 `ACT-EIP-GEN-004` | 入池不硬拒（`DenyCode.java:73-79`） |
| **sup / biz** | `ok / fail` | 合规规则 `CMP-*`：`FILTER` 档 → `COMPLIANCE_POLICY_DENIED`（挂票 / 导入时拒）；`MEDIUM / YELLOW` → `warnCodes[]`；`ALLOW` → 不评 | `51_seed…:34-36, 55`；与中台处置档的对应见 Q-13 |
| | `pending`（主数据同步） | 新鲜度 `F` 级刷新失败 → `staleness_warning=true` 放行；`S` 级 → `STALENESS_UNRESOLVED` 拒 | `FreshnessLevel.java:9-14`；`DenyCode.java:251` |
| **可入池** | — | = EIP-002 的 `outcome.ok()` | |
| **需复核** | — | = `suspect_duplicate_flag ∨ pending_verification_flag ∨ partial_credit_review_flag ∨ missing_registration_flag ∨ warnCodes 非空`（读 `GET /invoices/{id}` 与池条目） | |
| **CompletenessLevel** | — | 升格随行 → `FULL`；`FON_PROMOTED_INVD_LINE_POLICY.emitLines=false` 的票种 → `PARTIAL`；TAIP → `SNAPSHOT`。入账硬门槛 `FULL`（W-10） | `03_invd.sql:206`；`50_seed…:102-107` |

### 6.3 gov 补查 = INVD 侧持久任务

照 `invd_completion_task` 形制新建 `invd.invd_verify_task(…, invoice_id, source_version, status, attempts, available_at, lease_token, last_result)`（Q-07）。006 在 `retryable=true` 时登记一行，`available_at = now + retryAfterSeconds`（缺省 5 分钟，`17_seed…` §7.8；上限 7 天后转 `MANUAL`）。到期转 `MANUAL`，轴 G 仍 `UNKNOWN`，由入账策略处置。doc-ai 里**不建**补查队列。

### 6.4 修正阶段与四眼（K-7 / C-4）

| 中台 `StageIdx` | 收票域对应 | 改值入口 |
|---|---|---|
| 0 采集中（未升格） | 区域 `NOT_PROMOTED` | 重抽（002），或人工改分节（`ACT-FON-GEN-011`，推测是 ANNOTATE 分支）；无四眼 |
| 0 采集中（已升格，轴 A 01） | `COLLECTED` | `ACT-INVD-GEN-017`（非键字段）；键字段错 → `ACT-INVD-GEN-007` 判弃 + 重新升格（`supersedes_ref` 世代链） |
| 1 已查验 | `VERIFIED` | 017 → `revised_flag=true`，触发 REVERIFY（`invd_revision_task.task_type=REVERIFY`） |
| 2 审核中 | 池条目 `usageStatus=LOCKED`（被单据占用，S11） | 017 受 `INVD_REVISE_CONTROL.rejectLocked` 约束；越过需 `force_flag` + `INVD_REVISE_FORCE` 授权（两人 = 操作者 + 授权策略持有人） |
| 3 已入账 / 4 已付款 | `ACCOUNTED` | 票面冻结；补偿走账务（`reversal_voucher_no`，W-11） |

收款账户（`bank / bankName`）任何阶段都不自动覆盖；已被人工更正过的字段，晚到真值只生成复核项。

### 6.5 doc-ai 回执 → `verificationEvidence`（以 MY 为样板）

doc-ai 引擎返回 `govReceipt`（§4.7），doc-data 按下表转成 006 既有的 `verificationEvidence`（S6）：

| doc-ai 信号 | 转成 | 006 结果 |
|---|---|---|
| gjfp `VALID`，已融合 | `outcome=PASSED`，`legacyCode=Valid` | ok |
| gjfp `INVALID / CANCELLED` | `outcome=FAILED`，`legacyCode` 为原状态 | fail |
| gjfp `PENDING`；`NOT_FOUND` 且发票提交距今不足 72 小时 | 不传回执；登记补查任务（§6.3） | pending |
| 没有二维码且摘要关联失败 | 不传；006 走 `INVOICE_CHECK` 或法域 `NOT_APPLICABLE` | 视查验器结果 |
| 关联有竞争或歧义 | 不传；提示人工 | 同上 |
| `tenantOuNo` 缺失、权益不足 | 不传 | 查验器返回 `DENY_CHECK_NOT_ENTITLED` |
| 国家没有查验器 | 不传 | 法域画像决定 `NOT_APPLICABLE` |

**配对防错**：回执（或晚到的税局数据）必须 `no` + `sellerTax` 一致，且 `total`（容差内）或 `date` 至少一项一致，才算该票的回执；否则不采纳，标 `GOV-MATCH-AMBIGUOUS` 转人工。

---

## 7. 设计原则

| 原则 | 做法 |
|---|---|
| 长任务 = 202 + 状态资源 | 抽取与单一入口返回 `202` + `Location`；状态资源可反复 GET |
| 轮询友好 | `Retry-After` + `pollAfterMs`；`ETag / If-None-Match` → 304 |
| 字段身份锚定标准 | BT 是身份，UBL 路径是外部绑定，别名是前端键；非 UBL 国家只做一次「自有格式 → BT」映射 |
| 不给裸值 | 每字段带 `confRaw / conf / truthSource / box / page / valueRaw` |
| 不冒充通过 | 检查有 pending / unavailable 及原因；gov 失败不静默放行 |
| 错误体统一 | 收票域动作信封 + 拒绝码（§9），不另立体系 |
| 弃用显式 | doc-ai v1 加 `Deprecation / Sunset / Link` |
| 可观测 | 请求带 `traceparent`，响应回 `traceId`；拒绝码稳定，`message` 按 `Accept-Language` |
| 安全 | 令牌只在头部；文件不走 URL；服务间 mTLS + 客户端凭证；用户令牌不下传引擎 |

---

## 8. 字段映射与落库

### 8.1 四层词汇，一张映射表

| 层 | 例子 | 用在哪 |
|---|---|---|
| 别名 `alias` | `no`、`total`、`items.name` | 线上 `key`、前端 `t()` 文案（K-3） |
| 身份 `bt` | `BT-1`、`BT-112`；无 BT 的用 `X-` 前缀 | 映射表主键；`?keys=bt` 视图（K-6） |
| 外部绑定 `ubl` | `cbc:ID`、`cac:InvoiceLine[n]/cac:Item/cbc:Name` | 对外溯源、看板分层、前端 `FieldChange.field`（C-2） |
| 核心词汇 `core` / 列 `db` | `docNumberPrimary`、`taxInclusiveAmount`；列 `issuer_tax_id` | 规则 `inv.*` 与 `FON_SECTION_FIELD_MAP.targetField` 用核心词汇；审计 `diff` 用列的 camelCase 路径（§8.8）（C-2） |

`field-map.yaml`（放 doc-data 仓，版本化；前端不持有，只认别名与 `bt`）：

```yaml
version: 1
fields:
  BT-1:
    alias: no
    ubl: cbc:ID
    type: string
    group: id
    docai: basic.invoiceNumber              # doc-ai 引擎键 → 生成 FON_SECTION_FIELD_MAP 的 provider=DOCAI 行（Q-04）
    core: docNumberPrimary                  # 收票域内部词汇
    db: invd.invd_invoice.doc_number_primary
  BT-3:
    alias: docType
    ubl: cbc:InvoiceTypeCode
    type: enum
    codelist: UNTDID-1001                   # Q-10
    group: attr
    docai: basic.invoiceType
    db: invd.invd_invoice.invoice_type_code
    normalize:                              # 引擎枚举 → 码；原文留 valueRaw，票面标题进 docName
      "Tax Invoice": "380"
      "Commercial Invoice": "380"
      "Credit Note": "381"
  BT-112:
    alias: total
    ubl: cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount
    type: money
    group: amount
    docai: basic.totalAmount
    core: taxInclusiveAmount
    db: invd.invd_invoice.tax_inclusive_amount
  BT-153:
    alias: items.name
    ubl: cac:InvoiceLine[n]/cac:Item/cbc:Name
    type: string
    group: attr
    docai: detailOfGoodsOrServices[n].articleName
    core: itemName
    db: invd.invd_invoice_line.item_name
    translate: false
  X-govId:                                  # 无 BT 的扩展项用 X- 前缀
    alias: govId
    ubl: cbc:UUID
    type: string
    group: id
    docai: basic.uuid
    db: invd.invd_invoice.ubl_json#uuid     # `#` 后为 JSON 列内的键
  X-cn-checkCode:
    alias: cn.checkCode
    ubl: null
    type: string
    group: id
    core: checkCode
    db: invd.invd_invoice.cn_check_code
```

规则：
- 引擎输出 → 别名按 `docai` 列；别名 → 落库按 `core / db` 列。引擎升级只改 `docai` 列。
- 映射表没有的引擎键进 `extra{}`，不丢弃；补进映射表后自动提升。
- 国家特有字段用前缀别名（`jp.taxCategory`、`cn.checkCode`），映射表键 `X-<cc>-…`；CN 落 `ext_cn`，其他国家落 `ext_json.<cc>.*`。
- 每个国家另有 `country-map/<cc>.yaml`，把自有格式（CFDI、NF-e、数电 XML…）的路径映射到同一组 BT。

### 8.2 票头：别名 ↔ BT ↔ UBL ↔ 核心词汇 ↔ 表.列

| 别名 | BT | UBL 2.1（相对 `/Invoice`） | 核心词汇 `inv.*` | 落点 | 备注 |
|---|---|---|---|---|---|
| `no` | BT-1 | `cbc:ID` | `docNumberPrimary` | `invd_invoice.doc_number_primary` | 自然键分量；另派生 `doc_number_key` |
| `code` | X-cn-code | — | `docCode` | `invd_invoice.doc_code` | CN 发票代码 |
| `date` | BT-2 | `cbc:IssueDate` | `issueDate` | `invd_invoice.issue_date`（= `part_date`） | 自然键分量 |
| `issueTime` | — | `cbc:IssueTime` | — | `invd_invoice.issue_time` | MY `IssueTime` 合成本地日期后余下的时间 |
| `docType` | BT-3 | `cbc:InvoiceTypeCode` | 待核实（现由 `INVOICE_KIND_MAPPING` 推 `invoiceKind`） | `invd_invoice.invoice_type_code` | 码表见 Q-10 |
| `docName` | — | — | `ext.recognition.nameOfInvoice` | `ext_json.recognition.*` | 票面标题（INVOIS CUKAI、請求書…），展示用 |
| `kind` | X-cn-kind | — | `invoiceKind / typeCode` | `invd_invoice.invoice_kind` | CN 28 票种 |
| `currency` | BT-5 | `cbc:DocumentCurrencyCode` | 待核实 | `invd_invoice.currency_code` | 缺省 CNY |
| `taxCurrency` | BT-6 | `cbc:TaxCurrencyCode` | — | `ubl_json.taxCurrencyCode` | MY 税额固定 MYR 的情形 |
| `subtotal` | BT-109 | `cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount` | `taxExclusiveAmount` | `invd_invoice.tax_exclusive_amount` | |
| `tax` | BT-110 | `cac:TaxTotal/cbc:TaxAmount` | `taxAmount` | `invd_invoice.tax_amount` | 多个 `TaxTotal` 时取单据币种那条 |
| `total` | BT-112 | `…/cbc:TaxInclusiveAmount` | `taxInclusiveAmount` | `invd_invoice.tax_inclusive_amount` | |
| `lineTotal / allowanceTotal / chargeTotal / paid / rounding / amountDue` | BT-106 / 107 / 108 / 113 / 114 / 115 | `cac:LegalMonetaryTotal/*` | — | `ubl_json.legalMonetaryTotal{…}` | 票面「应付」常指 BT-115 而非 BT-112 |
| `remark` | BT-22 | `cbc:Note` | `remark` | `invd_invoice.note` | `RULE-INVD-L043` 读 `inv.remark` |
| `supplier` | BT-27 | `…Supplier…/cac:PartyLegalEntity/cbc:RegistrationName` | `sellerName` | `invd_invoice.issuer_name` | 主数据，不翻译 |
| `supplierId` | BT-29 | `…/cac:PartyIdentification/cbc:ID` + `@schemeID` | — | `ubl_json.accountingSupplierParty.partyIdentification[]` | MY 的 BRN / SST 号按 schemeID 区分 |
| `regno` | BT-30 | `…/cac:PartyLegalEntity/cbc:CompanyID` | — | `ubl_json.accountingSupplierParty…` | 日本登録番号、公司注册号 |
| `sellerTax` | BT-31 | `…/cac:PartyTaxScheme/cbc:CompanyID` | `sellerTaxId` | `invd_invoice.issuer_tax_id` | 派生 `issuer_party_key`（自然键分量） |
| `buyer` | BT-44 | `…Customer…/cbc:RegistrationName` | `buyerName` | `invd_invoice.receiver_name` | 购方抬头校验在 EIP / 合规 |
| `buyerTax` | BT-48 | `…Customer…/cac:PartyTaxScheme/cbc:CompanyID` | `buyerTaxId` | `invd_invoice.receiver_tax_id` | `pools:resolve` 的输入 |
| `supplierAddr / supplierCountry / supplierEmail / supplierPhone / buyerAddr / buyerCountry …` | BG-5 / BT-40 / BT-43 / BT-42 / BG-8 / BT-55 | `…/cac:PostalAddress/*`、`…/cac:Country/cbc:IdentificationCode`、`cac:Contact/*` | — | `ubl_json.accountingSupplierParty{…}` / `accountingCustomerParty{…}` | 整段地址写 BT-35（街道行），不拆城市邮编；国家码 ISO alpha-2（MyInvois 是 alpha-3，需转） |
| `cn.checkCode` | X-cn-checkCode | — | `checkCode` | `invd_invoice.cn_check_code` | |
| `drawer / reviewer / payee` | — | — | `ext.recognition.drawer…` → `signatoryIssuer…` | `invd_invoice.signatory_issuer / _reviewer / _payee` | `RULE-INVD-SIG-001..003` |
| `selfBilled / reverseCharge` | BT-3=389 / BT-151=AE | — | — | `self_billed_flag / reverse_charge_flag` | |
| `origNo / origDate` | BT-25 / BT-26 | `cac:BillingReference/cac:InvoiceDocumentReference/*` | `ext.recognition.*` → 建链 | `billing_reference_id`（LNK-INVD-003）+ `ubl_json.billingReference[]` | 链接权威在 `core.entity_link`；多条放 `refs[]` |
| `govId` | X-govId | `cbc:UUID` | — | `ubl_json.uuid` | 税局唯一标识：MY UUID、MX UUID、CN 数电号码 |
| `dueDate / payTerms / payMethod / payRef / bank / bankName / bic` | BT-9 / 20 / 81 / 83 / 84 / 85 / 86 | `cbc:DueDate`、`cac:PaymentTerms/cbc:Note`、`cac:PaymentMeans/*` | — | `ubl_json.dueDate`、`ubl_json.paymentTerms`、`ubl_json.paymentMeans[]` | `payMethod` 用 UNTDID 4461；`bank` 永不自动覆盖 |
| `po / so / do / contract / receiptAdvice / buyerRef / projectRef` | BT-13 / 14 / 16 / 12 / 15 / 10 / 11 | `cac:OrderReference/*`、`cac:*DocumentReference/cbc:ID`、`cbc:BuyerReference` | — | `ubl_json.orderReference{id, salesOrderID}`、`ubl_json.*DocumentReference` | 三单匹配读此；`receiptAdvice` 即入库单号 |
| `periodFrom / periodTo / deliveryDate / taxPointDate` | BT-73 / 74 / 72 / 7 | `cac:InvoicePeriod/*`、`cac:Delivery/cbc:ActualDeliveryDate`、`cbc:TaxPointDate` | — | `ubl_json.invoicePeriod{…}`、`ubl_json.delivery{…}`、`ubl_json.taxPointDate` | |
| `fxRate` | — | `cac:TaxExchangeRate/cbc:CalculationRate`（+ Source / Target / Operator） | — | `ubl_json.taxExchangeRate{…}` | 不在 EN 16931 核心；MY 实测存在 |
| 国家特有（`jp.* / mx.* / sa.*`） | X-<cc>-* | `ext:UBLExtensions` 或无 | — | CN → `ext_cn`；其他 → `ext_json.<cc>.*` | `03_invd.sql:139-141` |

`ubl_json` 内部键名：UBL 元素名的 lowerCamel（去命名空间前缀），数组保留 UBL 复数语义。这是建议；`03_invd.sql:281` 只写了「落位规则见方案 §5.3」，是否已有既定键名待核实。

### 8.3 行项目 `items[n]`（BG-25）→ `invd_invoice_line`

| 别名 | BT | UBL（相对 `cac:InvoiceLine`） | 核心词汇 | 列 |
|---|---|---|---|---|
| `items.idx` | BT-126 | `cbc:ID` | 下标 + 1，Java 侧生成（`50_seed…:43`） | `line_no` |
| `items.name` | BT-153 | `cac:Item/cbc:Name` | `itemName` | `item_name`（不翻译） |
| `items.spec` | BT-160 / 161 | `cac:Item/cac:AdditionalItemProperty` | `itemSpec` | `item_spec`（医药品规：规格 / 批号 / 效期放这里，与三单匹配知识库对齐） |
| `items.qty` | BT-129 | `cbc:InvoicedQuantity` | `quantity` | `quantity numeric(31,18)` |
| `items.uom` | BT-130 | `cbc:InvoicedQuantity/@unitCode` | `unitCode` | `unit_code`（票面原文；UN/ECE Rec 20 码放 `line_json.unitCodeStd`） |
| `items.price` | BT-146 | `cac:Price/cbc:PriceAmount` | `unitPrice` | `unit_price numeric(31,18)` |
| `items.net` | BT-131 | `cbc:LineExtensionAmount` | `lineExtensionAmount` | `line_extension_amount` |
| `items.rate` | BT-152 | `cac:Item/cac:ClassifiedTaxCategory/cbc:Percent` | `taxRate` | `tax_rate numeric(9,6)`（小数 0.13；`"6%"`、`"免税"` 由 INVD-001 归一） |
| `items.tax` | —（UBL 行级 `cac:TaxTotal`） | | `lineTaxAmount` | `line_tax_amount`（EN 16931 核心不允许，落库但不进核心校验） |
| `items.discount` | BT-136 | `cac:AllowanceCharge/cbc:Amount` | — | `discount_amount` |
| `items.class` | BT-158 | `cac:Item/cac:CommodityClassification/cbc:ItemClassificationCode` | `itemTaxCategoryCode` | `item_tax_category_code`（CN 税收分类编码；其他国家 HS / UNSPSC 同列，`@listID` 进 `line_json`） |
| `items.cat` | BT-151 | `…/cac:ClassifiedTaxCategory/cbc:ID` | — | `line_json.classifiedTaxCategory.id`（UNTDID 5305） |
| `items.sku / items.po / items.desc / items.attrs[]` | BT-155 / 132 / 154 / 160-161 | | — | `line_json.*`（`items.po` 是行级 PO 行号；PO 单号归票头 BT-13） |
| `items.gross` | — | | — | 不落库（= `net + tax`） |
| 表外 | | | | `ext_json.recognition.*`（`50_seed…:92-99`） |

**税率行 `taxLines[n]`（BG-23）**：无独立表，落 `ubl_json.taxTotal.taxSubtotal[]`。

| 别名 | BT | UBL（相对 `cac:TaxTotal/cac:TaxSubtotal`） |
|---|---|---|
| `taxLines.net` | BT-116 | `cbc:TaxableAmount` |
| `taxLines.tax` | BT-117 | `cbc:TaxAmount` |
| `taxLines.cat` | BT-118 | `cac:TaxCategory/cbc:ID` |
| `taxLines.rate` | BT-119 | `cac:TaxCategory/cbc:Percent` |
| `taxLines.exemptReason / exemptCode` | BT-120 / 121 | `cac:TaxCategory/cbc:TaxExemptionReason / …Code` |

### 8.4 doc-ai 引擎键 → 别名（`field-map.yaml` 的 `docai` 列）

| doc-ai 开放平台键 | 别名 | doc-ai 开放平台键 | 别名 |
|---|---|---|---|
| `basic.docType` | `docType` | `billFrom.billFromEmail` | `supplierEmail` |
| `basic.nameOfInvoice` | `docName` | `billTo.billToName` | `buyer` |
| `basic.invoiceType` | `docType`（经 `normalize`） | `billTo.billToTaxIdentificationNumber` | `buyerTax` |
| `basic.invoiceNumber` | `no` | `billTo.billToComposite` | `buyerAddr` |
| `basic.invoiceCode` | `code` | `bussiness.purchaseOrderNumber` | `po` |
| `basic.invoiceDate` | `date` | `bussiness.contractNumber` | `contract` |
| `basic.currency` | `currency` | `bussiness.salesOrderNumber / deliveryOrderNumber` | `so / do` |
| `basic.totalNetAmount` | `subtotal` | `bussiness.startDate / endDate` | `periodFrom / periodTo` |
| `basic.totalTaxAmount` | `tax` | `payment.dueDate / paymentTerms / paymentMethod` | `dueDate / payTerms / payMethod` |
| `basic.totalAmount` | `total` | `payment.exchangeRate / paidAmount` | `fxRate / paid` |
| `basic.remark` | `remark` | `basic.uuid`（MY） | `govId` |
| `billFrom.billFromName` | `supplier` | `originalInvoiceReferences[n].*` | `refs.origNo / origCode / origDate` |
| `billFrom.billFromComposite` | `supplierAddr` | `detailOfGoodsOrServices[n].articleID / articleName / description` | `items.sku / name / desc` |
| `billFrom.billFromCountryCode` | `supplierCountry` | `…quantity / unitOfMeasure / unitPrice` | `items.qty / uom / price` |
| `billFrom.billFromTaxIdentificationNumber` | `sellerTax` | `…netAmount / taxRate / tax / grossAmount` | `items.net / rate / tax / gross` |
| `billFrom.billFromBusinessRegistrationNumber` | `regno` | `detailOfTaxSummary[n].taxCategory / taxRate / netTaxableAmount / tax` | `taxLines.cat / rate / net / tax` |
| `billFrom.billFromBankAccount / BankOfAccount` | `bank / bankName` | 其余（如 `billToFax`） | `extra{}` |

（`bussiness` 是 doc-ai 线上契约的原拼写，照抄。）

**v2 引擎相对 doc-ai 现有输出要改的四点**（WS-D1）：
1. 现在所有标量都转成字符串 → 保留原始类型，每个金额带 `currency`（UBL 每个 Amount 都有 `@currencyID`；MY「税额固定 MYR」靠它对账）。
2. `taxRate` 现为 `"6%"` 字符串 → 数字，原文留 `valueRaw`。
3. `invoiceType` 枚举（`Tax Invoice / Commercial Invoice / Credit Note`）与 BT-3 不一一对应：两种 Invoice 都是 380 → 票面标题进 `docName`。
4. `billFromComposite` 整段地址 → BT-35（街道行），不拆城市 / 邮编。

### 8.5 RDOC 与非 CN 分流

RDOC 分支经 `FON_PROMOTED_RDOC_FACE_MAP / LINE_MAP`（`48_seed…`）落 `rdoc.rdoc_document`：`doc_number / doc_date / issuer_name / issuer_tax_id / issuer_site_qualifier / receiver_name / receiver_tax_id / currency_code / tax_exclusive_amount / tax_amount / tax_inclusive_amount / payable_amount / charged_amount / received_amount / tendered_amount / change_amount / note`，长尾进 `ext_cn / ext_json`（`04_rdoc.sql`）。收据类字段（`charged / received / tendered / change`）在 EN 16931 中没有 BT，`field-map.yaml` 用 `X-rcpt-*`。

**非 CN 分流缺口**：`INVOICE_KIND_MAPPING` 以 CN `typeCode` 为输入（`11_seed…:173-174`），非 CN 文档没有 typeCode，必落 `TARGET_TYPE_UNRESOLVED`。解法见 Q-03。

### 8.6 票内勾稽：直接套 EN 16931 业务规则

| 检查码 | EN 16931 规则 | 内容 |
|---|---|---|
| `OCR-SUM` | BR-CO-10 | Σ 行净额（BT-131）= BT-106 |
| `OCR-SUM` | BR-CO-13 | BT-109 = BT-106 − BT-107 + BT-108 |
| `OCR-SUM` | BR-CO-14 / 17 | BT-110 = Σ BT-117；BT-117 = BT-116 × BT-119 |
| `OCR-SUM` | BR-CO-15 | BT-112 = BT-109 + BT-110 |
| `OCR-SUM` | BR-CO-16 | BT-115 = BT-112 − BT-113 + BT-114 |
| `OCR-CUR` | 码表 | 币种 ISO 4217；小数位按币种（JPY / KRW / VND 为 0 位） |
| `GOV-SCHEMA / GOV-CIUS` | Schematron（EN 16931 + 国家 CIUS） | 只对结构化来源（Peppol 渠道）跑 |

OCR 场景下这些规则只提示、不拦截：违反说明某个金额读错，`detail.fields` 指向相关 BT，修正页据此高亮。

### 8.7 字段级溯源落哪（Q-08）

| 层 | 内容 | 落点 | 键 |
|---|---|---|---|
| 采集现场（「识别发生了什么」的权威记录） | 每字段 `confRaw / conf / box / page / truthSource / valueRaw`、`checks.recognition`、`engine` | `fon.fon_source_region.region_extracted_data_json`（引擎结果原样，Schema `SCH-DOCAI-GLOBAL-V2`） | `(file_id, region_id)` + 字段 `ubl` 路径 |
| 数据对象侧（升格时带过去的摘要） | `{ubl_path: {confRaw, truthSource}}`，不含 box | `invd_invoice.ext_json.provenance`、`invd_invoice_line.ext_json.provenance` | `ubl_path` |
| 几何 | 区域整体框 | `fon_source_region.geometry{box, coordSpace, basisSize}`；字段框只在区域 JSON | |
| 引擎版本 | `processor@release#runId` | `fon_source_region.segmentation_run_ref`（`05_fon.sql:331`；三分量禁含 `@ #`） | |

### 8.8 与现有审计的对接（C-2）

| 审计表 | 字段键 | 对接 |
|---|---|---|
| `invd_revision_event.diff`（017）、`invd_completion_event.diff`（005） | `InvoiceDetailRow` 的 camelCase 属性路径：`issuerTaxId`、`taxInclusiveAmount`、`extCn.special.rail.train_no`、`lines`（S12） | 即 `field-map.yaml` 的 `db` 列转 camelCase；API 层把 `diff` 渲染为 `{key, bt, ubl, before, after}`，不改库内键 |
| `invd_gov_status_event` | 非字段级；`event_payload` 存回执原文 | doc-ai gov 回执 → `event_payload`；`raw_status_code` 存平台原码；`source_platform=MYINVOIS` 等 |
| `core.action_audit_log.business_detail` | 动作结论 | 抽取动作记 `{provider, segmentationRunRef, regionCount, noiseCount}`，不记票面要素（`01_schema_and_common.sql:414-423`） |

### 8.9 DDL 与早期假设的出入

| 早期假设 | DDL 事实 | 处理 |
|---|---|---|
| `VerifiedScope ∈ {NONE, FULL}`（`VerifiedScope.java:4-9`） | 值集 `INVD.VerifiedScope = {SNAPSHOT_ELEMENTS, FULL_DOCUMENT}`，并注明 `NONE / FULL` 不属于值集（`17_seed…:35-41`） | 契约用值集名（Q-09） |
| `CompletenessLevel ∈ {FULL, SNAPSHOT}` | 列默认 `'PARTIAL'`，注释三值 `SNAPSHOT / PARTIAL / FULL`（`03_invd.sql:35, 206`） | 契约按三值 |
| `GovStatusCode` 枚举含 `REGISTERED`、无 `SUSPENDED` | 列注释 8 值含 `SUSPENDED`、无 `REGISTERED`（`03_invd.sql:241`） | 待核实哪个权威；契约按列注释 + `cfg.value_set(INVD.GovStatusCode)` |
| 贷项码 381 | `invoice_type_code` 注释写「384 贷项」（`03_invd.sql:221`） | Q-10 |
| 字段框统一页面百分比 | FON `geometry` 带 `coordSpace / basisSize`，不限定百分比 | 区域框按 FON 结构；字段框声明 `coordSpace:"PERCENT"` |

---

## 9. 错误与拒绝码

### 9.1 响应体与状态码

```jsonc
// 动作端点（POST）的响应体 = payload 原样展开 + 以下键（S2）
{ "result": "DENIED",                        // CREATED | UPDATED | IDEMPOTENT_HIT | DENIED | REJECTED
  "denyCode": "FORMAT_NOT_EXTRACTABLE",      // 首个拒绝码
  "denyCodes": ["FORMAT_NOT_EXTRACTABLE"],
  "denyDetail": [ { "ruleId": "RULE-FON-241", "field": "mimeType", "message": "该格式不可抽…",
                    "actual": "application/zip", "retryable": false } ] }   // retryable / retryAfterSeconds 只在有值时出现
```

- 顶层**没有** `message`、`traceId`（只有异常处理器的错误体顶层有 `message`，S2）。中台 `src/lib/http.ts:98-102` 现在只读顶层 `message`，要改为依次读 `message`、`denyDetail[0].message`，最后按 `denyCode` 查词典（F-2）。
- `traceId` 不进响应体；链路号从网关的响应头取（网关是否回传待核实）。

| HTTP | 何时 | 出处 |
|---|---|---|
| 201 | `CREATED` | 清单 :49 |
| 200 | `UPDATED / IDEMPOTENT_HIT`；批量端点恒 200 | 清单 :49, 100 |
| 202 | 抽取异步受理、单一入口受理（带 `Location + Retry-After`）；`ActionResult` 没有此结果，由 controller 按 payload 判定 | 先例：`tenant-links` 202 待审批（清单 :179） |
| 304 | `If-None-Match` 命中 | |
| 404 | 不存在**或**不可见（跨租户、跨数据中心） | 清单 :75 |
| 403 | 仅 `X-Tenant-Id` 与路径租户不一致；`PERMISSION_DENIED` | 清单 :191；`DenyCode.java:346` |
| 409 | 资源状态被他人改变（如 `ITEM_NOT_SUSPECT`）；同幂等键不同报文；ingress 的 `IN_FLIGHT` | `DenyCode.java:137`；ingress `IngressInvoiceController.java:33-42` |
| 422 | `DENIED`（准入）与 `REJECTED`（执行期） | 清单 :49 |
| 429 | 引擎配额 / 队列满，透传 `Retry-After`、`RateLimit-*` | 基础设施，不是拒绝码 |
| 502 | ingress 调下游不可达 | ingress `client/DownstreamHttp.java:55-67` |
| 503 | 只用于 doc-data 自身不可用；抽取失败落状态轴（E5），不用 503 | |

查询端点（GET）返回资源本身，不套这些键（清单 :326）。

### 9.2 新增拒绝码

| 码 | 动作 | 成因（`denyDetail` 区分） |
|---|---|---|
| `ENGINE_OPTION_INVALID` | `ACT-FON-GEN-002` Guard | `TEMPLATE_NOT_FOUND / COUNTRY_MISMATCH / COUNTRY_AUTO_UNSUPPORTED`。同一码多成因由 `denyDetail` 区分是 FON 既有手法（`HASH_MISMATCH` 三成因，`DenyCode.java:323-327`） |

需同时登记 `DenyCode.java` 与 `cfg.deny_code_dict`（R-14）。

### 9.3 常见情形 → 使用的码

| 情形 | 码 / 状态 | 出处 |
|---|---|---|
| 文件过大 | `SIZE_LIMIT_EXCEEDED` 422（FON-001） | `DenyCode.java:321` |
| 类型不支持、压缩包 | `MIME_NOT_ALLOWED`（001）/ `FORMAT_NOT_EXTRACTABLE`（002）422 | `DenyCode.java:319, 354` |
| 加密 PDF | 执行期 `extraction_failure_reason.reason=FILE_FORMAT_REJECTED`（`FON_EXTRACT_ERROR_MAPPING` 加 provider `DOCAI` 行）；Guard 判不了，要打开才知道 | |
| 模板不存在、国家与模板冲突、`country=auto` | `ENGINE_OPTION_INVALID` 422 | §9.2 |
| 渠道推断不出 | `USAGE_CATEGORY_UNRESOLVED` 422（001） | `DenyCode.java:329` |
| 文件 / 发票不存在或跨租户 | 404 | §9.1 |
| 已升格区域重抽 | `EXTRACTION_LOCKED_AFTER_PROMOTION` 422 | `DenyCode.java:369` |
| 引擎配额 / 队列满 | 429 透传 | |
| 引擎不可用 | 执行期 `PROVIDER_UNREACHABLE transient=true` + 自动重试 | |
| 入池被拒 | EIP-002 / 合规拒绝码原样 | |

**检查码**：`OCR-*` 留在区域 JSON；`GOV-*` 由 `CHECK_ERROR_MAPPING.denyCode + govVerdict` 表达；`DUP-*` 由 `dup_key_level (L1 / L2A / L2B / L3)` 表达；`SUP-* / BIZ-*` 由 `CMP-<校验项>-NN` 表达。前端词典按这些码补四种语言文案。

---

## 10. 编码计划

### 10.1 共同约定

- **分支**：从 `master` 拉功能分支 → PR 到 `test`；分支名与 PR 标题带 Linear ID（`[A-Z]{2,8}-[0-9]+`），否则下游流水线整条降级（doc-data `CLAUDE.md:143-144`，其余仓同）。各仓 CLAUDE.md 里「按用户授权直接推 test」是一次性授权，不沿用。
- **构建**：JDK 25；先在 core 仓 `mvn clean install`，再在服务仓 `mvn clean verify`。
- **DDL**：只改 core 的 `ddl/01_–09_` 建表语句与种子文件；服务仓不放迁移脚本。
- **拒绝码**：新码同时登记 core 的 `DenyCode` 枚举与 `cfg.deny_code_dict`（R-14，否则 `DenyCode.of` 抛错）；FON 码不带前缀，INVD 码带 `DENY_`；ingress 不产生拒绝码。
- **测试**：JUnit 5 + AssertJ + Mockito。动作单测直接 new 动作类、配 Fake 规则 / Mapper / 锁；DB 集成测试 `*TransactionIT` 连共享测试库、以环境变量开关；新 Mapper 登记 `MapperParseTest`；`WriteDisciplineTest` 卡写入纪律。
- **doc-ai**：Python / FastAPI，`pytest -q`；遵守其 CLAUDE.md 红线（尤其 ⑥ 处理器经 `resolve_spec`、⑦ 提取过闸并丢线程池）。

### 10.2 兼容性影响

| 调用方 | 影响 |
|---|---|
| doc-ai v1 开放平台（piaozone） | 无；冻结，加 `Deprecation / Sunset` 头（Q-17） |
| 发票云 `FPY_CLOUD` 现有链路 | 无；路由用的 `SegmentationPort` 对 `CLOUD_COMPOSITE` 仍转给现有适配器，CN 继续同步 200 |
| ingress | 现有 `/ingress/invoices` 不变；新增 `/ingress/files`，ingress 首次引入后台推进器 |
| pool / wallet / ledger-query | 不改代码（S16） |
| 数据中心路由 | 每个数据中心一套收票域 + 一套 doc-ai；前端按 `entity → dc` 选 `apiBaseUrl` |

### 10.3 分期与验收

| 期 | 交付 | 验收 |
|---|---|---|
| **P0 止血** | doc-ai WS-D0 | 令牌不进计费日志；usage 按租户隔离；X-API-Key 端点过闸 |
| **P1 识别主链 + 单一入口** | core C1–C5、C9；doc-data DD1–DD7、DD10；ingress IG1–IG5；doc-ai WS-D1；前端 F-1–F-7 | 移动端拍票 → 202 → 轮询拿到带 `box / confRaw / bt / ubl` 的 `regions[]`；集成方一次调用拿到 `requestId`，能查进度并最终入池 |
| **P2 升格与核验** | core C6–C8、C10；doc-data DD8–DD9；前端 F-8 | MY 票从上传到入池全链路；查验状态在轴 G 可见；税局未出结论时自动补查 |
| **P3 识别数据群底座** | doc-ai WS-D2、WS-D4（冻结集与评测持久化）、WS-D9 | data-rules、dashboard-recognition 接真实数据；MY / JP 冻结集 v1 |
| **P4 回流闭环** | doc-ai WS-D3 | 一次完整回流：中台修正 → 回流池 → 质检 → 发布 → 看板可见提升 |
| **P5 扩国与驻留** | doc-ai WS-D5、WS-D6、置信度校准 | 每国冻结集、发布与 `govCapability`；校准后的 `conf` 上线 |
| 持续 | doc-ai WS-D7、WS-D8 | — |

**P1 内部顺序**：core 的 C1–C5、C9 先合入并 `install` → doc-data 与 ingress 并行开发；doc-ai WS-D1 与 doc-data DD1–DD3 以 §4.7 契约对齐，可并行，联调前用 Stub 适配器。其余依赖：P0 是一切对接的前提；P3 的标注变更表是 P4 的前提；P5 多数据中心上线前须完成 WS-D6 第 3 条（跨租户授权）。

### 10.4 core（invoice-inbound-core）

| # | 改动 | 文件 | 期 |
|---|---|---|---|
| C1 | `fon_file.ext_json` 列注释写明 `extractionRun` 结构；加表达式部分索引 `idx_fon_extract_run`（§4.9） | `ddl/05_fon.sql` | P1 |
| C2 | 值集 `FON.ExtractionSchema` 加 `SCH-DOCAI-GLOBAL-V2`；`FON_EXTRACT_METHOD_CHAIN` 加 `countryHint` 输入列与 DOCAI 行，`RULE-FON-241-D/F/G/H` 表达式传入国家（Q-02，S13） | `ddl/22_seed_rules_fon_segment_extract.sql` | P1 |
| C3 | `FON_EXTRACT_ERROR_MAPPING`、`FON_REGION_KIND_DERIVE` 加 provider=DOCAI 行 | `ddl/28_seed_rules_fon_cloud_recognition.sql` | P1 |
| C4 | `FON_SECTION_FIELD_MAP / FON_SECTION_LINE_FIELD_MAP` 加 `provider` 输入列（既有行写 `'*'`），DOCAI 行由 `field-map.yaml` 生成；同步改 50 号种子自检的「恰好 15 行」「同一目标至多一条 MAP」（Q-04，S14） | `ddl/28_…`、`ddl/50_seed_rules_fon_promote_lines.sql` | P1 |
| C5 | 拒绝码 `ENGINE_OPTION_INVALID`：`DenyCode` 枚举 + `cfg.deny_code_dict` | `invoice-core-model/…/DenyCode.java`、对应种子 | P1 |
| C9 | `core.ingress_request` 加 `request_id uuid UNIQUE`、`file_id uuid`、`region_refs jsonb`、`next_poll_at timestamptz`；`stage` 注释增 `FILE_REGISTERED / EXTRACTING / EXTRACTED / PROMOTED`（§4.6，S15） | `ddl/01_schema_and_common.sql:516-562` | P1 |
| C6 | `INVOICE_KIND_MAPPING` 加 `countryCode` 输入列与通配行（Q-03） | `ddl/11_seed…`、`ddl/27_seed…` | P2 |
| C7 | 新建 `invd.invd_verify_task`（照 `invd_completion_task`，Q-07）；`CHECK_INVOICE_STATUS` 加国家输入列与 MYINVOIS 行（表结构待核实）；`cfg.legacy_capability_endpoint` 加 `jurisdiction` 列、唯一键改 `(capability, operation, jurisdiction)`（Q-05） | `ddl/03_invd.sql`、`ddl/17_seed…`、`ddl/02_cfg.sql` | P2 |
| C8 | 值集与 Java 枚举对齐（`VerifiedScope / GovStatusCode / CompletenessLevel`，Q-09）；`invoice_type_code` 注释改为 UNTDID 1001（Q-10）；订正 DDL 注释与代码不一致的两处：outbox topic（S7）、`extraction_failure_reason` 键（S3） | `invoice-core-model/…`、`ddl/03_invd.sql` | P2 |
| C10 | `COMPLIANCE_VERIFY` 的渠道维度：新的 `policy_ref` 形态（Q-13） | `ddl/02_cfg.sql`、`ddl/51_seed…` | P2 |

### 10.5 doc-data（invoice-inbound-doc-data）

路径相对 `src/main/java/com/kingdee/invoice/docdata/`。

| # | 改动 | 落点 | 期 |
|---|---|---|---|
| DD1 | doc-ai 客户端：仿 `RecognitionClient` / `OpenApiProperties` 新建 `DocAiEngineClient` + 配置 `invoice.docai.*`（地址、超时、mTLS、客户端凭证）；不走 `legacy_capability_endpoint`（S3） | `fon/port/`、`config/`、`application.yml` | P1 |
| DD2 | `DocAiSegmentationAdapter`（provider=DOCAI，method=LLM_EXTRACT）：提交引擎任务、取结果、转成区域候选；国家取自引擎结果；按 `FON_EXTRACT_ERROR_MAPPING` 判 transient；失败原因沿用现有四个键 | `fon/port/` | P1 |
| DD3 | 路由用的 `SegmentationPort`：按 `effectiveMethod` 分派给 Cloud 或 DocAi 适配器，替换 `SegmentationConfig` 现在的二选一（`config/SegmentationConfig.java:77-97`） | `config/`、`fon/port/` | P1 |
| DD4 | 002 异步分支：`FonSegmentExtractAction` 在 method=LLM_EXTRACT 时只登记 `extractionRun(PENDING)` 并返回；规则事实加国家（S13）；controller 按 payload 返回 202 + `Location` + `Retry-After`（`fon/api/FileController.java:293-342`） | `fon/action/`、`fon/api/` | P1 |
| DD5 | 抽取 worker `FonExtractionRunTasks`：照 `action/InvdRevisionTasks.java` 做 `@Scheduled` + 开关 + 跨桶 `SKIP LOCKED` 认领，Mapper 放 `repository/core/`；运行态写入经 Writer、`\|\|` 合并、不递增 `row_version`；结果在 Redis 锁内经 `FonRegionIdAllocator` + `FonFileCommitGuard` 写区域；写 outbox `FileExtracted / FileExtractFailed`（§4.8、§4.9） | `action/`、`repository/core/`、`fon/repository/`、`resources/mapper/` | P1 |
| DD6 | 读端点 `GET /api/v1/files/{fileId}/extraction`：读 `extractionRun` + `fon_source_region`，按 `field-map.yaml` 渲染字段；`ETag / If-None-Match`、`?regionId / ?keys / ?view=raw`；`field-map.yaml` 与渲染器（§4.2、§8） | `fon/api/`、`fon/domain/`、`resources/` | P1 |
| DD7 | `SectionFieldMapper` / `PromotedInvoiceLineMapper` 按 `(provider, sourceField)` 查表（C4 配套） | `fon/port/SectionFieldMapper.java:77`、`PromotedInvoiceLineMapper` | P1 |
| DD10 | 修写入纪律漏洞：002 对 `fileMapper.updateExtraction` 的直接调用改经 Writer；`WriteDisciplineTest` 的子串检查改为大小写无关（S8） | `fon/action/FonSegmentExtractAction.java:216,237,278`、`src/test/…/WriteDisciplineTest.java:276-293` | P1 |
| DD8 | 003 升格：请求体加 `countryCode`；分流规则读国家（C6 配套） | `fon/api/FileController.java:702-733`、`fon/action/FonPromoteRegionAction.java` | P2 |
| DD9 | 006 核验：doc-ai 回执 → `verificationEvidence`（§6.5）；新 worker `InvdVerifyTasks` 消费 `invd_verify_task`，以 `forceCheck=true` 调 006；`LegacyEndpointMapper` / `HttpInvoiceCheckClient` 按 `jurisdiction` 选端点（C7 配套） | `action/`、`domain/`、`repository/core/`、`resources/mapper/cfg/LegacyEndpointMapper.xml` | P2 |

**测试**：每项配动作单测；DD5 加 `*TransactionIT` 覆盖认领、fencing、`||` 写入与「不递增 row_version」；DD6 覆盖 304 与 `?keys=bt`；新 Mapper 进 `MapperParseTest`。

### 10.6 ingress（invoice-inbound-ingress）

| # | 改动 | 落点 | 期 |
|---|---|---|---|
| IG1 | `IngressFileController`：`POST /api/v1/ingress/files`（multipart 或 JSON 传 `fileId`）+ `GET /api/v1/ingress/requests/{requestId}`；`Idempotency-Key` 必填（同现有） | `api/` | P1 |
| IG2 | `FileIngressOrchestrator`：复用 `InvoiceIngressOrchestrator` 的认领、指纹、租约、失败分档；`RequestFingerprint` 加文件命令重载（二进制以 contentHash 入指纹） | `orchestration/` | P1 |
| IG3 | 后台推进器：ingress 现在全同步、没有 worker（S15）。新增 `@Scheduled` 推进器，按 `next_poll_at` 认领 `stage=EXTRACTING` 的请求，轮询抽取结果，再升格、入池；租约时长须大于各段读超时之和（`application.yml:68`） | `orchestration/`、`journal/` | P1 |
| IG4 | `DocDataApi` 加 `/legacy/v1/files`（multipart）、`/files/{id}/extraction`（POST、GET）、`/files/{id}/promotions`；每个区域的 `sourceAnchor / promotedDataRef` 先写回 `region_refs` 再进下一段；入池传 `sourceAnchor`（`client/HttpPoolClient.java:66-68` 现写死 null）；入池快照传 null 即可（pool 读 doc-data 现值），放开 ingress 侧 `@NotNull snapshot` | `client/` | P1 |
| IG5 | `IngressStage` 增阶段；Mapper 增按 `request_id` 查询、写 `file_id / region_refs / next_poll_at`；登记 `MapperParseTest` | `journal/`、`resources/mapper/core/IngressRequestMapper.xml` | P1 |

**约束**：ingress 不依赖规则引擎与动作框架；源码不得出现 `fon_file` 等表名、不得 import `DenyCode`，JSON 一律用 `InternalJson.MAPPER`（`WriteDisciplineTest`）。
**测试**：仿 `IngressOrchestrationTest`，用 `FakeJournal` + 桩客户端覆盖跳段续跑、重复提交、各段失败分档、推进器认领。

### 10.7 pool / wallet / ledger-query

不改代码（S16）。顺带发现、不在本计划内：ingress `InvoiceIngressOrchestrator.java:48-51` 与 README 写的「换键重发，段 4 会建出第二条」已过时（pool 已实现 L2a′）；pool `CLAUDE.md:135` 与 `:323` 对「INVOICE 是否调 doc-data」说法矛盾，以代码为准。

### 10.8 doc-ai（OCR/doc-ai）

**WS-D0 安全与合规止血（P0）**

| # | 问题 | 位置（相对 `OCR/doc-ai/`） | 处理 |
|---|---|---|---|
| D0-1 | 计费日志 `content` 写入开放平台 `access_token` | `app/services/base_cost_service.py:148` | 删除该字段；评估已签出令牌是否轮换 |
| D0-2 | `/usage/stats` 不按租户过滤 | `app/api/v1/usage.py:63` | 加租户过滤 |
| D0-3 | X-API-Key 提取端点在 `async def` 里直接调同步函数、不过准入闸（违反红线 ⑦）；不校验 key 与 API 同租户；`scopes / rate_limit` 只存表不执行 | `app/api/v1/extract.py:73`；`extract_service.py:99-113` | 改走 `run_extraction` + 准入闸；补校验与限流 |
| D0-4 | 标注物理删除；「已审视」后再改值不记 `original_value`（OCR 原值丢失） | `app/services/annotation_service.py:276, 338` | 软删除；修复原值记录 |
| D0-5 | 国家 agent 在线编辑直接写回仓库 YAML（多副本下不持久、不一致） | `country_agents_loader.py:161-182` | 改存数据库并保留版本 |
| D0-6 | 技能晋升展示跨租户反馈原文，可能夹带票面值 | `skill_promotion.py` | 先脱敏 |
| D0-7 | qwen 处理器超过 16 页静默丢页 | `app/processors/qwen_processor.py` | 输出 `OCR-PAGES-TRUNCATED` 检查 |
| D0-8 | 准入闸是进程级，多副本时总并发 = N × 副本数 | `extract_gate.py` | 按数据中心做全局并发控制（Redis 信号量），或只由 worker 消费 |

**WS-D1 v2 引擎接口（P1）**：按 §4.7 实现。字段带 `confRaw / box / page / truthSource`，box 复用工作区路径的 `extraction_pipeline` 与 `word_locator`；输出改造见 §8.4 四点；幂等键；对外不折叠 RUNNING；查验结果以 `govReceipt` 如实返回（§6.5）；重试加指数退避并区分可重试 / 不可重试。不做补查队列和回调。v1 冻结。

**WS-D2 识别数据群数据模型（P3）**：在现有表基础上新增，不动 `OcrPromptVersion` 等核心不变量。

| 新表 / 列 | 关键字段 | 对应中台页面 / 类型 |
|---|---|---|
| `documents` 加列 | `country`、`doc_type`、`language`、`source`、`entity`、`dc`、`page_count`、`quality_score`、`amount_log10`、`layout_key`、`supplier_key`、`consent_scope` | data-rules 分层维度 `STRATA` |
| `annotation_changes`（只追加） | `document_id`、`field_key`（= `ubl` 路径）、`old`、`new`、`actor`、`actor_type`（human / system / gov / supplier / match）、`truth_source`、`reason`、`at`、`result_version` | data-correction 字段审计 |
| `annotations` 加列 | `review_state`（unreviewed / confirmed / corrected，替代 `is_corrected` 单一布尔）、`reviewed_by`、`reviewed_at`、`truth_source` | 「确认」与「改过」分开 |
| `datasets` / `dataset_items` | 国家、票种、角色（train / val / frozen_test / hard / feedback）、数据中心、版本、内容哈希、冻结时间；条目带分层、来源、租户、触发器 | data-rules `CountryProfile` |
| `dataset_strategies` | 目标量、回流上限、分层目标、触发器、版本 | `PUT /v1/dataset-rules/{country}/strategy` |
| `trigger_events` | tpl / newsup / err / release / quarter + 证据 | data-rules 触发器 |
| `pipeline_batches` / `pipeline_steps` | collect / clean / prelabel / qa / balance / eval / gate，含人工关口审批人 | `…/agents/{agent}/approve` |
| `model_releases` | 国家、发布号（如 MY-2026.11）、模板版本、处理器、模型、prompt 哈希、校准表 | dashboard-recognition `ModelRelease` |
| `eval_runs` | 发布 × 数据集版本 × 模式（strict / fuzzy）× 字段准确率、票级全对率、耗时 p50/p95、超时率，按字段 / 真值来源 / 分层 | `TestRun`、按版本看板 |
| `online_metrics_daily` | 日期、国家、发布、租户、调用、页数、耗时、超时、gov 结果分布 | 按月看板、超时率 |

晚到真值进入回流池，但不直接成为 GT：经质检关口才进入 `dataset_items`（守住 doc-ai 红线「永不自动把 OCR 当 GT」）。噪声门用当前 OCR 结果当基线的样本只用于稳定性检验，标 `origin=ocr_baseline`，排除出冻结集。

**WS-D3 回流与加工流水线（P4）**：七段的运行与调度归统一 agent 平台；doc-ai 提供能力接口与数据集 / 评测的事实源。

| 段 | 输入 | doc-ai 能力（现有 → 改造） | 人工关口 |
|---|---|---|---|
| collect | 收票域 017 / 005 修正、轴 G 晚到真值、三单匹配确认、供应商确认、线上低置信样本 | 新增：订阅真值事件，按策略抽样 | — |
| clean | 原件 + GT | 新增：票面个人信息掩码、影像质量打分、感知哈希去重 | — |
| prelabel | 清洗后样本 | 现有 OCR 预标注 → 带 `confRaw / box` | — |
| qa | 预标注 + 真值候选 | 现有 `gt_quality` 只读告警 → 抽检 50 张、κ ≥ 0.85 | ✅ |
| balance | 候选池 | 新增：按分层配额抽样，回流占比 ≤ 上限，PSI 漂移告警 | — |
| eval | 新数据集版本 × 候选发布 | 现有 harness（严格 + 模糊）→ 结果持久化，补票级全对率、按真值来源分层 | — |
| gate | eval 结果 | 现有单调守护 + 判官 → 发布级关口：冻结集不回退，困难集不劣化超过阈值 | ✅ |

触发器：`tpl`（同一供应商版式 30 天被更正 ≥ 20 次）、`newsup`（新供应商累计 ≥ 30 张）、`err`（线上字段误差超阈值）、`release`（改机器时自动跑全部国家冻结集）、`quarter`（季度分层抽检 5%；无税局接口国家 2%，Q-22）。

**WS-D4 评测与指标（P3）**：
1. 每国一个冻结测试集，带版本与内容哈希，目标 ≥ 100 张、分层覆盖。现有 MY 36、JP 20 太小，JP 全部来自 1 个 API；`japan/split.json` 的 test 36 张接入平台。
2. 修复 MY 黄金 GT 键名不统一（`salerName / buyerName / PO` 等客户自定义名混杂，严格模式跳过大量字段）：加键名映射到模板标准名，重算覆盖率。
3. 补票级全对率（关键字段全对才算对，关键字段集按国家配置）。
4. 评测抖动治理：固定 temperature 与 seed；发布评测跑 3 次取中位数并报方差。
5. 线上指标：从任务、处理结果、用量每日聚合到 `online_metrics_daily`；前提是审计补写 `tenant_id / api_definition_id / prompt_version_id`（现缺失，`extract_service.py:517-544`）。
6. 置信度校准：用标注变更真值对 `confRaw` 按「发布 × 国家 × 字段组」做等渗回归，校准表随发布出版，看板报 ECE（Q-14）。
7. 评测面（C-5）：`/v2/eval-runs` 与 `purpose=evaluation` 引擎任务，角色 data_ops / admin / tax_manager。

**WS-D5 国家覆盖：结构化优先（P5）**。中台 8 国中 doc-ai 只覆盖 JP（中等）、DE / US（仅 v1 模板）。有结构化电子发票的国家优先解析 XML，OCR 只处理只有 PDF / 图片的情况（各国细节待核实，Q-18）：

| 国家 | 结构化来源 | OCR 角色 | 顺序 |
|---|---|---|---|
| CN | 数电票 XML / OFD；税局同步渠道 | 纸票、扫描件、境外票 | 1（现由发票云 `FPY_CLOUD` 承担，doc-ai 补境外票） |
| MX | CFDI XML 带数字印章 | PDF 呈现件 | 2 |
| BR | NF-e XML；SEFAZ 可查 | DANFE PDF | 2 |
| SA | ZATCA UBL + 二维码（TLV） | PDF + 二维码 | 2（可复用 MY 二维码链路） |
| VN | 电子发票 XML | PDF | 3 |
| JP | 适格请求书（无统一平台），T 号可公开查 | 主力 | 已有；补冻结集 |
| DE | XRechnung / ZUGFeRD（PDF 内嵌 XML） | 非结构化票 | 3 |
| US | 无统一平台 | 主力 | 3（模板从 v1 起步） |

每国走 doc-ai 现有上线流程：模板 v1 → 冻结集 ≥ 100 → 国家 agent → `govCapability` 登记 → 首次发布。结构化解析作为新处理器类型接入 `resolve_chain`，在 OCR 之前执行，命中后字段 `truthSource=structured` 并跳过模型调用。

**WS-D6 数据驻留与跨租户共享（P5）**：
1. 每个数据中心一套 doc-ai，与中台数据中心一一对应；文件、样本、GT、审计留在本中心；存储补 `s3` 后端（`abstractions/storage.py:174` 未实现）。
2. 处理器链按中心配置（境内 qwen、海外 gemini），沿用 `resolve_spec`。
3. 跨租户共享：可出域的是模板、技能、校准表、聚合指标；样本原件、GT 值、票面文本不出域。黄金集跨租户取样需租户授权（`consent_scope`）+ 脱敏 + 数据运维审批；驻留国家（如中国大陆）区内单独发布。模型权重是否算数据出境需法务确认。
4. 保留期：审计与 `raw_output` 按租户合同设保留期；支持 GDPR 删除，连带移出数据集并重算哈希。

**WS-D7 身份与前端**：
1. 身份（Q-16）：保留 doc-ai 前端与自有登录；doc-ai 的管理与能力接口（定制、优化、评测、数据群流水线）另外接受中台 IdP 令牌（OIDC 资源服务器）与服务凭证，供中台页面和统一 agent 平台调度。角色映射：中台 `data_ops / admin` ↔ doc-ai 平台管理员，`ap_clerk` 等 ↔ normal_user。
2. 移植进中台（按中台约定重写为 CSS Modules + `t()` + `api.ts`）：文档查看器（bbox 锚点 + 聚焦缩放 + PDF，来源 `doc-ai-frontend/src/components/workspace-v2/DarkDocumentViewer.tsx`，并入 `data-correction/components/InvoiceImage.tsx`）；字段 / 明细编辑器（`field-viewer/*`）；字段 × 轮次准确率热力图（`optimization-panel/charts.tsx`）。
3. doc-ai-frontend 保留为平台运营控制台（API 定义、优化器、技能晋升、开放平台客户端、租户、国家模板），补：运行时 `config.js`、401 统一处理、PDF.js 资源本地托管（现走 unpkg CDN）、清理死代码（`workspace/`、`document-store`、`DocumentCanvas`）、最小测试集。

**WS-D8 工程质量（持续）**：生产只用 PostgreSQL，迁移统一走 alembic；重试加退避；修正文档与代码不一致（`backend/app` 旧路径、`recover_orphans` 函数名、改后缀放行规则）；为新表和接口补单测，评测 harness 加回归基线。

**WS-D9 模板变更建议（Q-21，P3）**：
1. 触发：国家规范模板发布新版本（WS-D2 的 `model_releases`）。
2. 找客户：按 `ApiDefinition.config.source_country / preset_yaml_id`（`preset_init.py:125-129` 已记录模板来源）找出基于该模板做过定制的客户 API。
3. 生成建议稿：AI 对比「新旧模板的差异」与「该客户的字段编辑和当前激活的 prompt」，逐字段给出建议（采纳 / 保留定制 / 有冲突需人工），附在该客户已审视样本上的预估准确率变化（用客户回路评测，不用黄金集）。
4. 送达：通知客户管理员，建议尽快更新；只发建议。
5. 不强制：客户采纳时走现有「定制」流程生成新 prompt 版本，准确率单调不降的守护照旧；不采纳则一切不变。这与 doc-ai 红线一致：黄金回路不改任何客户 API。

### 10.9 中台前端（本仓库）

| # | 任务 | 期 |
|---|---|---|
| F-1 | 新建 `src/features/recognition/`：`types.ts`（§4.2 区域与 §4.2.1 字段对象）、`api.ts`（`registerFile / startExtraction / getExtraction / promote / verify / ingressFiles / getIngressRequest`），mock 走 `data.ts` | P1 |
| F-2 | `src/lib/http.ts`：支持读响应头（`Location / Retry-After / ETag / RateLimit-*`），返回 `{ data, headers }` 的变体；错误文案依次读顶层 `message`、`denyDetail[0].message`，最后按 `denyCode` 查词典（§9.1） | P1 |
| F-3 | `src/lib/usePolling.ts`：按 `pollAfterMs`、`If-None-Match` 轮询；页面隐藏暂停；`AbortController` 取消 | P1 |
| F-4 | 接入页：`capture-mobile / capture-h5 / capture-portal`（上传 → 抽取 → 轮询 → 升格）；`data-correction`（`InvoiceField` 加 `bt / ubl / valueRaw / confRaw / truthSource`，`src` 由 `truthSource` 映射，`box` 用对象并带 `page`）；`invoice-pool`；`dashboard-recognition`（`engine.release`、按 `truthSource` 分层） | P1–P3 |
| F-5 | i18n：新拒绝码与检查码的文案进四个词典；`valueRaw`、`labelRaw` 与票面值容器加 `translate="no"`；影像框坐标区 `dir="ltr"` | P1 |
| F-6 | 运行时配置（四处同步：`public/config.js`、`deploy/docker/config.js.template`、`deploy/docker/40-app-config.sh`、`deploy/k8s/base/configmap.yaml`）：`docDataBaseUrl`（`/invoice_inbound/doc-data`）、`ingressBaseUrl`、`recognition.maxFileMb`、`recognition.uploadTimeoutMs` | P1 |
| F-7 | `data-correction/types.ts` 的 `StageIdx` 注释改为「2 审核中（起冻结）」（K-7） | P1 |
| F-8 | 策略矩阵页 `settings-channels` 改为编辑 `COMPLIANCE_VERIFY` 档位与法域画像（C-3、Q-13） | P2 |

---

## 附录 A：原始草案的落地对照

原始草案（2026-10-23）：

> （1）任务创建接口，主要入参四个：国家 / 文件 / 识别模板编号（为空则是该国家默认模板，有编号则为私有化定制模板）/ 校验方式（不校验 / 只有税局校验 / 税局 + 企业内部规则校验 / 只有企业内部规则校验，默认不校验）；出参只有一个，任务编号；不支持批量。
> （2）任务执行结果查询，根据任务编号查询识别结果。
> （3）结果内容分为三类：一是识别内容，二是税局校验结果，三是企业内部校验结果。

| 草案要点 | V3 落地 |
|---|---|
| 一个创建接口，出参只有任务编号 | `POST /ingress/files` → `requestId`（C-1）；交互式前端用 FON 四步 |
| 入参：国家 | `countryCode` → `engine.country`；`auto` 不进首版（K-4） |
| 入参：文件 | `file` 或 `fileId`；一个文件可拆出多张票，各有终身不变的 `docId`（K-5） |
| 入参：模板编号，为空用国家默认 | `templateId` → `engine.templateId`；为空用该国规范模板 |
| 入参：校验方式，默认不校验 | 改为按租户合规档位与法域画像执行，请求不能关闭拦截项；「只识别」= 只抽取不升格（C-3） |
| 不支持批量 | 保持：一次一个文件 |
| 按编号查结果 | `GET /ingress/requests/{id}`（进度）+ `GET /files/{fileId}/extraction`（识别内容） |
| 结果三类：识别内容 | `regions[].fields / items / taxLines` + `checks.recognition` |
| 结果三类：税局校验 | 轴 G：`GET /invoices/{id}` 与 `…/gov-status-events` |
| 结果三类：企业内部校验 | 票池条目的防重旗标 + 合规 `warnCodes / denyCodes` |
| 草案没有、V3 新增 | 法人 `legalEntityId`（升格必填，K-2）；字段级 `bt / ubl / confRaw / box / truthSource`；动作信封与拒绝码 |

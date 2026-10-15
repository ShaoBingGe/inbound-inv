/**
 * Skill 管理示例数据（mock 模式）。6 个进项发票相关的 Skill，每个含 SKILL.md 与辅助文件、2–4 个版本。
 * 历史版本由「上一个较新版本 + 编辑」推导，便于版本对比时看到真实的差异。
 */
import type { Skill, SkillFile, SkillPermissions, SkillVersion, SkillVersionDetail } from './types';

/** 统一 agent 平台上的 agent（名称由平台维护） */
export const AGENTS = [
  '识别复核 agent',
  '供应商特征 agent',
  '员工习惯 agent',
  '对账 agent',
  '税务规则 agent',
  '数据清洗 agent',
] as const;

export interface SkillRecord {
  skill: Skill;
  /** 最新在前 */
  versions: SkillVersionDetail[];
}

interface Edit {
  path: string;
  /** 在较新版本内容上做的替换 [新版本片段, 本版本片段] */
  replace?: Array<[string, string]>;
  /** 本版本没有此文件 */
  remove?: true;
  /** 本版本此文件的完整内容 */
  content?: string;
}

interface SeedVersion extends SkillVersion {
  /** 如何从列表中上一个（更新的）版本得到本版本 */
  edits?: Edit[];
}

interface Seed extends Omit<Skill, 'files' | 'version' | 'publishedVersion' | 'hasDraft' | 'lastPublished' | 'name' | 'description'> {
  name?: string;
  files: SkillFile[];
  versions: SeedVersion[];
}

const PERM_DEFAULT: Omit<SkillPermissions, 'editors'> = {
  viewRoles: ['skill_editor', 'data_ops'],
  editRoles: ['skill_editor'],
};

const f = (path: string, content: string): SkillFile => ({ path, content });

/* ------------------------------------------------------------------ */
/* 1. invoice-ocr-review                                              */
/* ------------------------------------------------------------------ */

const OCR_SKILL = `---
name: invoice-ocr-review
description: 发票识别结果低置信度或与主数据不一致时，按开票国家规则复核关键字段（发票号码、税号、金额、税率、开票日期），给出纠正建议与理由，必要时转人工复核。
metadata:
  owner: 识别中台
  countries:
    - CN
    - JP
    - DE
    - SG
    - MX
---

# 发票识别复核

## 何时使用

- 任一关键字段识别置信度低于国家阈值（见 \`scripts/confidence_gate.py\`）
- 票面价税合计与「不含税金额 + 税额」差异超过币种最小单位
- 销方税号与供应商主数据不一致，或校验位不通过
- 同一发票号码在 90 天内重复出现

## 复核步骤

1. 读取识别结果与原件影像坐标，只复核被标记的字段，不要改动高置信度字段。
2. 按开票国家加载字段规则：\`references/country-fields.md\`。
3. 逐字段核对：
   - **发票号码**：CN 数电票 20 位数字；JP 适格请求书登记号 \`T\` + 13 位；DE 无统一格式，保留原文。
   - **税号**：CN 统一社会信用代码 18 位并校验末位；DE USt-IdNr. \`DE\` + 9 位；MX RFC 12/13 位。
   - **金额与税率**：用票面明细行重新求和；税率只能取该国法定税率表中的值。
   - **开票日期**：统一为 \`YYYY-MM-DD\`；JP 和历（令和）需换算公历。
4. 需要纠正时，按 \`references/correction-rules.md\` 生成建议，每条写明「原值 → 建议值 · 依据」。
5. 置信度仍不足或涉及金额改动超过 1% 时，不要自动提交，转人工复核队列并附上建议。

## 输出格式

返回 JSON：

\`\`\`json
{ "fields": [{ "key": "tax_id", "from": "…", "to": "…", "reason": "…", "confidence": 0.93 }], "action": "suggest" }
\`\`\`

\`action\` 取值：\`auto_fix\`（自动纠正）、\`suggest\`（预填待确认）、\`manual\`（转人工）。

## 不要做的事

- 不要凭供应商历史数据猜测金额；历史特征只用于定位字段，不用于填值。
- 不要修改票面原文字段；纠正写入修正层，原件与原始识别结果保留。
- 不要在输出中包含银行账号、个人证件号。
`;

const OCR_FIELDS = `# 各国关键字段规则

| 国家 | 发票号码 | 销方税号 | 法定税率 | 日期格式 |
|---|---|---|---|---|
| CN | 数电票 20 位数字；专票 8 位 + 代码 10/12 位 | 统一社会信用代码 18 位（GB 32100 校验位） | 13% / 9% / 6% / 3% / 1% / 0 | YYYY年MM月DD日 |
| JP | 自由格式；适格请求书须有登记号 T + 13 位 | 法人番号 13 位 | 10% / 8%（轻减） | 令和 6 年 / YYYY/MM/DD |
| DE | 自由格式，须唯一连续 | USt-IdNr. DE + 9 位，或 Steuernummer | 19% / 7% / 0 | DD.MM.YYYY |
| SG | 自由格式 | GST Reg. No.（UEN 或 M + 8 位 + 字母） | 9% / 0 | DD/MM/YYYY |
| MX | CFDI 4.0 UUID（36 位） | RFC 12 位（法人）/ 13 位（自然人） | 16% / 8%（边境）/ 0 | ISO 8601 |

## 说明

- 号码与税号只做格式与校验位检查，真伪核验由税务规则 agent 调用各国查验接口完成。
- DE 发票缺少 §14 UStG 必填项时，在 \`reason\` 中写明缺少的字段，不要补全。
- JP 轻减税率 8% 只适用于食品与报纸，其他品目出现 8% 时标记为可疑。
`;

const OCR_CORRECTION = `# 纠正建议规则

1. **只建议，不覆盖**：建议写入修正层（correction layer），原始识别值保留，可追溯。
2. **依据优先级**：票面影像 > 明细行重算 > 供应商主数据 > 历史特征。
3. **金额类字段**：
   - 价税合计不平时，优先怀疑税额识别错误（小数点、千分位）。
   - 改动幅度超过 1% 一律转人工。
4. **税号类字段**：
   - 校验位不通过且主数据中只有一个相近税号（编辑距离 ≤ 1）时，建议替换为主数据税号。
   - 存在多个相近税号时，不建议，转人工。
5. **日期**：开票日期晚于收票日期、或早于供应商建档日期时，标记为可疑。
6. 每条建议附 \`confidence\`；低于 0.6 的建议不要输出。
`;

const OCR_GATE = `"""按国家的置信度阈值：低于阈值的字段进入复核。"""

THRESHOLDS = {
    "CN": 0.85,
    "JP": 0.88,
    "DE": 0.82,
    "SG": 0.85,
    "MX": 0.85,
}
DEFAULT_THRESHOLD = 0.85
KEY_FIELDS = ("invoice_no", "seller_tax_id", "total_amount", "tax_amount", "tax_rate", "issue_date")


def fields_to_review(country: str, fields: dict[str, dict]) -> list[str]:
    """返回需要复核的字段名。fields: {name: {"value": ..., "confidence": float}}"""
    threshold = THRESHOLDS.get(country, DEFAULT_THRESHOLD)
    out = []
    for name in KEY_FIELDS:
        f = fields.get(name)
        if f is None or f.get("confidence", 0.0) < threshold:
            out.append(name)
    return out
`;

/* ------------------------------------------------------------------ */
/* 2. supplier-feature-memory                                         */
/* ------------------------------------------------------------------ */

const SUP_SKILL = `---
name: supplier-feature-memory
description: 维护「供应商特征」记忆：从已确认的发票中学习每个供应商的版式模板、常用税率、币种与明细行习惯，用于识别时定位字段与提示异常；记忆按法人隔离，可被 AP 确认、修改或删除。
metadata:
  scope: legal-entity
  retention-days: 180
---

# 供应商特征记忆

## 记什么

| 特征 | 示例 | 来源 |
|---|---|---|
| 版式模板 | 发票号码在右上角，税号在页脚 | 已确认发票的字段坐标 |
| 常用税率 | 13%，偶尔 6%（服务费） | 明细行 |
| 币种 | JPY；结算币种 CNY | 票面与付款记录 |
| 明细行习惯 | 运费单列一行，品名带规格型号 | 明细行 |
| 开票节奏 | 每月 25 日前后集中开票 | 开票日期 |

## 如何形成

1. 同一特征在 **≥ 3 张**已确认发票上重复出现，才形成「观察到」的记忆，初始置信度 = 出现次数 / 近 90 天发票数。
2. AP 在界面上确认的特征，置信度置为 100%，状态为「已确认」。
3. AP 选择「不要这样做」时，立即降权到 30% 以下，并询问是否删除。
4. 特征 180 天未被使用时自动降权一半；再过 180 天未使用则归档。

## 如何使用

- 识别时：用版式模板缩小字段搜索范围；**不要**用历史值直接填写字段。
- 校验时：税率或币种与特征不符时，给出提示「与该供应商近 90 天习惯不同」，不阻断。
- 记忆结构见 \`assets/feature-schema.json\`；存储与共享边界见 \`references/memory-policy.md\`。

## 边界

- 记忆属于**法人**：只对同一法人的 AP 共享，跨法人不可读。
- 不记录银行账号、联系人电话、票面影像本身。
`;

const SUP_POLICY = `# 供应商特征记忆 · 存储与授权

- **归属**：供应商特征属于采购方法人（legal entity），存储在该法人所属数据中心。
- **可见范围**：同一法人下具有 AP 角色的用户可查看；数据运维只能看到统计，看不到特征内容。
- **修改**：AP 可确认、修改、删除；每次修改记录操作人与时间，可回滚。
- **跨境**：特征不出数据中心；主数据中心只汇总特征数量与命中率。
- **删除**：供应商停用后 30 天删除其全部特征；法人注销时立即删除。
- **不会被记住的**：银行账号、个人证件、票面影像、联系人信息。
`;

const SUP_SCHEMA = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SupplierFeature",
  "type": "object",
  "required": ["supplierId", "legalEntity", "kind", "value", "confidence", "status"],
  "properties": {
    "supplierId": { "type": "string" },
    "legalEntity": { "type": "string", "description": "采购方法人编码" },
    "kind": { "enum": ["layout", "tax_rate", "currency", "line_items", "cadence"] },
    "value": { "type": "object" },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "status": { "enum": ["observed", "confirmed", "downweighted", "archived"] },
    "evidence": { "type": "array", "items": { "type": "string", "description": "发票编号" }, "maxItems": 20 },
    "lastUsedAt": { "type": "string", "format": "date-time" }
  }
}
`;

/* ------------------------------------------------------------------ */
/* 3. employee-habit-memory                                           */
/* ------------------------------------------------------------------ */

const EMP_SKILL = `---
name: employee-habit-memory
description: 维护「员工习惯」记忆：记住报销人常用的费用类型、成本中心、项目号和差旅城市，为发票归集与报销单预填提供建议；记忆属于员工本人，员工可随时查看、修改和清除。
metadata:
  scope: employee
---

# 员工习惯记忆

## 记什么

- 常用费用类型（如「市内交通」「业务招待」）与对应的发票类型
- 默认成本中心、常用项目号
- 常去的差旅城市与常住酒店（只记城市与酒店名称）
- 提交习惯：通常在月末集中提交、一次提交的发票张数

## 如何形成

1. 同一习惯重复 **≥ 3 次**才形成记忆；员工确认后置信度为 100%。
2. 员工点「不要这样做」后立即降权，并在下次预填前询问是否删除。
3. 员工调岗（成本中心变化）时，成本中心与项目号相关记忆全部失效。

## 如何使用

- 发票采集后，按习惯预填报销单的费用类型、成本中心、项目号，状态为「预填待确认」。
- 自动化级别由员工本人设置，不能高于所属法人允许的上限。
- 预填理由要说明用到了哪条记忆，例如「你近 3 个月的打车票都归到了项目 P-2041」。

## 隐私

详见 \`references/privacy.md\`。不记录行程细节、同行人、个人证件。
`;

const EMP_PRIVACY = `# 员工习惯记忆 · 隐私约定

1. 记忆属于员工本人，存于其所属数据中心，不跨境。
2. 只有员工本人可以查看自己的习惯记忆；直属主管与财务只能看到预填结果，看不到记忆本身。
3. 员工可以在「AI agent能力设置」页一键清除全部记忆，清除后 24 小时内从备份中删除。
4. 不记录：精确行程与时间、同行人、个人证件、银行卡号、医疗相关费用的明细。
5. 员工离职后 30 天删除其全部记忆。
`;

/* ------------------------------------------------------------------ */
/* 4. reconciliation-rules                                            */
/* ------------------------------------------------------------------ */

const REC_SKILL = `---
name: reconciliation-rules
description: 进项发票与采购订单、收货单的三单匹配规则：按行匹配数量与单价，按国家与币种使用金额容差，支持部分到货、红字发票冲减和外币汇率差异说明，输出匹配结果与差异原因。
metadata:
  maintainer: 财务共享中心
---

# 对账规则（三单匹配）

## 输入

- 发票（已通过识别复核）：明细行、价税合计、币种
- 采购订单（PO）：行号、物料、数量、单价
- 收货单（GRN）：PO 行号、收货数量、收货日期

## 匹配步骤

1. 用发票上的 PO 号定位订单；没有 PO 号时，按供应商 + 金额 + 近 60 天订单模糊匹配，最多返回 3 个候选。
2. **按行匹配**：发票明细行 ↔ PO 行（物料编码优先，其次品名相似度 ≥ 0.8）。
3. 每行比较：
   - 数量：发票数量 ≤ 累计收货数量 − 已开票数量（支持部分到货）
   - 单价：差异在容差内（见 \`references/matching-tolerance.md\`）
4. 红字发票 / 贷项通知单：找到被冲减的原发票，冲减其已开票数量与金额。
5. 外币发票：按入账日汇率折算；汇率差异单独列示，不计入单价差异。

## 输出

- \`matched\`：全部行在容差内
- \`partial\`：部分行匹配，列出未匹配行
- \`exception\`：存在超容差差异，写明差异原因与建议处理人

计算逻辑参考 \`scripts/match.ts\`。

## 不要做的事

- 不要为了匹配而修改发票或订单数据。
- 超容差时不要自动通过，即使差异金额很小。
`;

const REC_TOL = `# 金额容差

| 国家 / 币种 | 单价容差 | 行金额容差 | 整单容差 |
|---|---|---|---|
| CN · CNY | ±0.5% | ±1.00 | ±5.00 |
| JP · JPY | ±0.5% | ±10（整数单位） | ±100 |
| DE · EUR | ±0.5% | ±0.50 | ±2.00 |
| SG · SGD | ±0.5% | ±0.50 | ±2.00 |
| MX · MXN | ±1% | ±5.00 | ±20.00 |
| KR · KRW | ±0.5% | ±100（整数单位） | ±1000 |

- 容差由财务共享中心维护，全局可读；各法人可以收紧，不能放宽。
- 运费、包装费行不参与单价比较，只比较行金额。
`;

const REC_MATCH = `/** 三单匹配：按行比较数量与单价（示意实现，平台运行时会注入真实数据访问层）。 */

export interface Line {
  poLine: string;
  qty: number;
  unitPrice: number;
}

export interface Tolerance {
  unitPricePct: number;
  lineAmount: number;
}

export type LineResult =
  | { poLine: string; status: 'ok' }
  | { poLine: string; status: 'qty_exceeded'; available: number }
  | { poLine: string; status: 'price_diff'; diffPct: number };

export function matchLine(inv: Line, po: Line, receivedQty: number, invoicedQty: number, tol: Tolerance): LineResult {
  const available = receivedQty - invoicedQty;
  if (inv.qty > available) return { poLine: inv.poLine, status: 'qty_exceeded', available };
  const diffPct = Math.abs(inv.unitPrice - po.unitPrice) / po.unitPrice;
  const lineDiff = Math.abs(inv.unitPrice - po.unitPrice) * inv.qty;
  if (diffPct > tol.unitPricePct && lineDiff > tol.lineAmount) {
    return { poLine: inv.poLine, status: 'price_diff', diffPct };
  }
  return { poLine: inv.poLine, status: 'ok' };
}
`;

/* ------------------------------------------------------------------ */
/* 5. tax-rule-check                                                  */
/* ------------------------------------------------------------------ */

const TAX_SKILL = `---
name: tax-rule-check
description: 按开票国家的税务规则判断进项发票能否抵扣：检查票种、必填项、税率与登记号，给出可抵扣 / 不可抵扣 / 待查验结论与依据条款。
metadata:
  countries:
    - CN
    - DE
    - JP
    - SG
    - MX
---

# 税务规则检查

## 判断顺序

1. 票种是否允许抵扣：
   - CN：增值税专用发票、数电票（专票）可抵扣；普通发票不可抵扣（旅客运输服务除外）。
   - JP：须为适格请求书（有登记号 T + 13 位），2026 年 10 月前非适格请求书按 80% 过渡比例。
   - DE：须满足 §14 Abs. 4 UStG 必填项；小额发票（≤ 250 EUR）按 §33 UStDV 简化要求。
   - SG：须为 tax invoice，且供应商已进行 GST 登记。
   - MX：须有 CFDI 4.0 UUID，且已在 SAT 查验为有效。
2. 必填项是否齐全（缺项时结论为「不可抵扣」，并列出缺少的字段）。
3. 税率是否在 \`assets/rate-table.json\` 的法定税率中。
4. 需要外部查验的（CN 全电查验、MX SAT、DE VIES），结论先给「待查验」。

## 输出

\`{ "result": "deductible" | "not_deductible" | "pending", "basis": "条款", "missing": [] }\`

各国税率说明见 \`references/vat-rates.md\`。
`;

const TAX_RATES = `# 各国增值税 / 消费税税率

- **CN**：13%（货物）、9%（运输、建筑、不动产）、6%（现代服务）、3% / 1%（小规模纳税人征收率）、0（出口）
- **DE**：19%（标准）、7%（食品、书籍等）、0（光伏组件等）
- **JP**：10%（标准）、8%（轻减：食品、报纸）
- **SG**：9%（自 2024 年起）
- **MX**：16%（标准）、8%（北部边境地区）、0
`;

const TAX_TABLE = `{
  "version": "2026-09",
  "rates": {
    "CN": [0.13, 0.09, 0.06, 0.03, 0.01, 0],
    "DE": [0.19, 0.07, 0],
    "JP": [0.1, 0.08],
    "SG": [0.09, 0],
    "MX": [0.16, 0.08, 0]
  }
}
`;

/* ------------------------------------------------------------------ */
/* 6. dataset-cleaning                                                */
/* ------------------------------------------------------------------ */

const DS_SKILL = `---
name: dataset-cleaning
description: 清洗发票识别模型的训练与评测数据集：按影像哈希去重、脱敏个人信息、统一字段标注、按国家切分，并冻结各国测试集，避免测试数据泄漏到训练集。
---

# 数据集清洗

## 步骤

1. **去重**：按影像感知哈希（pHash）去重，汉明距离 ≤ 4 视为同一张；保留标注最完整的一张。
2. **脱敏**：删除或遮盖个人证件号、手机号、银行账号；人名替换为占位符。脚本见 \`scripts/dedupe.py\`。
3. **标注统一**：字段名按 \`references/field-mapping.md\` 映射为平台标准字段；金额统一为字符串、保留原始小数位。
4. **切分**：按国家分组后，按供应商切分训练 / 验证（同一供应商不同时出现在两边）。
5. **冻结测试集**：每个国家的测试集一旦冻结，不再加入新样本；新增样本只进入训练集。

## 质量门槛

- 每个国家测试集 ≥ 500 张，覆盖 ≥ 50 个供应商
- 标注一致性抽检（双人标注）≥ 98%
- 脱敏后抽检 200 张，个人信息残留为 0

## 不要做的事

- 不要把用户纠正过的线上发票直接放进测试集。
- 不要跨数据中心复制原始影像；只上传脱敏后的样本。
`;

const DS_DEDUPE = `"""按感知哈希去重并做基础脱敏（示意脚本）。"""
import re

ID_PATTERNS = [
    re.compile(r"\\b\\d{17}[\\dXx]\\b"),  # CN 身份证号
    re.compile(r"\\b1[3-9]\\d{9}\\b"),  # CN 手机号
    re.compile(r"\\b\\d{16,19}\\b"),  # 银行卡号
]


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def dedupe(samples: list[dict], max_distance: int = 4) -> list[dict]:
    kept: list[dict] = []
    for s in sorted(samples, key=lambda x: -len(x.get("labels", {}))):
        if all(hamming(s["phash"], k["phash"]) > max_distance for k in kept):
            kept.append(s)
    return kept


def mask(text: str) -> str:
    for p in ID_PATTERNS:
        text = p.sub("***", text)
    return text
`;

const DS_MAPPING = `# 字段映射

| 原始标注 | 平台标准字段 |
|---|---|
| 发票号码 / Invoice No. / Rechnungsnummer | invoice_no |
| 销方税号 / Seller Tax ID / USt-IdNr. | seller_tax_id |
| 价税合计 / Total / Gesamtbetrag | total_amount |
| 税额 / Tax / MwSt. | tax_amount |
| 开票日期 / Date / Rechnungsdatum | issue_date |
`;

/* ------------------------------------------------------------------ */

const SEEDS: Seed[] = [
  {
    id: 'invoice-ocr-review',
    status: 'published',
    agents: ['识别复核 agent'],
    owner: '王琳',
    updatedBy: '李敏',
    updatedAt: '2026-10-11T16:42:00+08:00',
    createdAt: '2026-08-12T10:05:00+08:00',
    permissions: { ...PERM_DEFAULT, editors: ['王琳', '李敏', '周宁'] },
    files: [
      f('SKILL.md', OCR_SKILL),
      f('references/country-fields.md', OCR_FIELDS),
      f('references/correction-rules.md', OCR_CORRECTION),
      f('scripts/confidence_gate.py', OCR_GATE),
    ],
    versions: [
      {
        version: '1.3.0-draft.2',
        note: 'JP 和历日期换算；金额改动超过 1% 一律转人工；JP 阈值调到 0.88',
        author: '李敏',
        createdAt: '2026-10-11T16:42:00+08:00',
        status: 'draft',
      },
      {
        version: '1.2.0',
        note: '新增 MX RFC 校验与 90 天重复发票号检查',
        author: '王琳',
        createdAt: '2026-09-28T11:20:00+08:00',
        status: 'published',
        edits: [
          {
            path: 'SKILL.md',
            replace: [
              ['；JP 和历（令和）需换算公历。', '。'],
              ['置信度仍不足或涉及金额改动超过 1% 时', '置信度仍不足时'],
            ],
          },
          { path: 'scripts/confidence_gate.py', replace: [['"JP": 0.88', '"JP": 0.85']] },
          { path: 'references/correction-rules.md', replace: [['   - 改动幅度超过 1% 一律转人工。\n', '']] },
        ],
      },
      {
        version: '1.1.0',
        note: '补充纠正建议输出格式；新增 SG',
        author: '王琳',
        createdAt: '2026-09-05T15:08:00+08:00',
        status: 'archived',
        edits: [
          {
            path: 'SKILL.md',
            replace: [
              ['；MX RFC 12/13 位。', '。'],
              ['- 同一发票号码在 90 天内重复出现\n', ''],
              ['    - MX\n', ''],
            ],
          },
          { path: 'scripts/confidence_gate.py', replace: [['    "MX": 0.85,\n', '']] },
          {
            path: 'references/country-fields.md',
            replace: [['| MX | CFDI 4.0 UUID（36 位） | RFC 12 位（法人）/ 13 位（自然人） | 16% / 8%（边境）/ 0 | ISO 8601 |\n', '']],
          },
        ],
      },
      {
        version: '1.0.0',
        note: '首个版本：CN / JP / DE 关键字段复核',
        author: '王琳',
        createdAt: '2026-08-12T10:05:00+08:00',
        status: 'archived',
        edits: [
          {
            path: 'SKILL.md',
            replace: [
              [
                '4. 需要纠正时，按 `references/correction-rules.md` 生成建议，每条写明「原值 → 建议值 · 依据」。',
                '4. 需要纠正时，生成建议并写明依据。',
              ],
              [
                '## 输出格式\n\n返回 JSON：\n\n```json\n{ "fields": [{ "key": "tax_id", "from": "…", "to": "…", "reason": "…", "confidence": 0.93 }], "action": "suggest" }\n```\n\n`action` 取值：`auto_fix`（自动纠正）、`suggest`（预填待确认）、`manual`（转人工）。\n\n',
                '',
              ],
              ['    - SG\n', ''],
            ],
          },
          { path: 'references/correction-rules.md', remove: true },
          { path: 'scripts/confidence_gate.py', replace: [['    "SG": 0.85,\n', '']] },
          {
            path: 'references/country-fields.md',
            replace: [['| SG | 自由格式 | GST Reg. No.（UEN 或 M + 8 位 + 字母） | 9% / 0 | DD/MM/YYYY |\n', '']],
          },
        ],
      },
    ],
  },
  {
    id: 'supplier-feature-memory',
    status: 'published',
    agents: ['供应商特征 agent', '识别复核 agent'],
    owner: '张悦',
    updatedBy: '张悦',
    updatedAt: '2026-09-30T10:12:00+08:00',
    createdAt: '2026-08-18T09:30:00+08:00',
    permissions: { ...PERM_DEFAULT, editors: ['张悦', '王琳'] },
    files: [
      f('SKILL.md', SUP_SKILL),
      f('references/memory-policy.md', SUP_POLICY),
      f('assets/feature-schema.json', SUP_SCHEMA),
    ],
    versions: [
      {
        version: '2.1.0',
        note: '特征 180 天未使用自动降权；新增币种特征',
        author: '张悦',
        createdAt: '2026-09-30T10:12:00+08:00',
        status: 'published',
      },
      {
        version: '2.0.0',
        note: '记忆按法人隔离，AP 共享范围收窄到同一法人',
        author: '张悦',
        createdAt: '2026-09-02T14:40:00+08:00',
        status: 'archived',
        edits: [
          {
            path: 'SKILL.md',
            replace: [
              ['| 币种 | JPY；结算币种 CNY | 票面与付款记录 |\n', ''],
              ['4. 特征 180 天未被使用时自动降权一半；再过 180 天未使用则归档。\n', ''],
              ['  retention-days: 180\n', ''],
              ['税率或币种与特征不符时', '税率与特征不符时'],
            ],
          },
          {
            path: 'assets/feature-schema.json',
            replace: [
              ['"kind": { "enum": ["layout", "tax_rate", "currency", "line_items", "cadence"] }', '"kind": { "enum": ["layout", "tax_rate", "line_items", "cadence"] }'],
              [',\n    "lastUsedAt": { "type": "string", "format": "date-time" }', ''],
            ],
          },
        ],
      },
      {
        version: '1.4.0',
        note: '版式模板与常用税率特征；AP 确认后置信度 100%',
        author: '王琳',
        createdAt: '2026-08-18T09:30:00+08:00',
        status: 'archived',
        edits: [
          {
            path: 'SKILL.md',
            replace: [
              [
                '记忆按法人隔离，可被 AP 确认、修改或删除。',
                '可被 AP 确认、修改或删除。',
              ],
              ['  scope: legal-entity\n', '  scope: tenant\n'],
              [
                '- 记忆属于**法人**：只对同一法人的 AP 共享，跨法人不可读。',
                '- 记忆在租户内共享，所有 AP 可读。',
              ],
            ],
          },
          { path: 'references/memory-policy.md', remove: true },
        ],
      },
    ],
  },
  {
    id: 'employee-habit-memory',
    status: 'published',
    agents: ['员工习惯 agent'],
    owner: '周宁',
    updatedBy: '陈涛',
    updatedAt: '2026-09-20T17:25:00+08:00',
    createdAt: '2026-08-25T11:00:00+08:00',
    permissions: { ...PERM_DEFAULT, editors: ['周宁', '陈涛'] },
    files: [f('SKILL.md', EMP_SKILL), f('references/privacy.md', EMP_PRIVACY)],
    versions: [
      {
        version: '1.1.0',
        note: '新增成本中心与项目号习惯；员工调岗时相关记忆失效',
        author: '陈涛',
        createdAt: '2026-09-20T17:25:00+08:00',
        status: 'published',
      },
      {
        version: '1.0.0',
        note: '首个版本：费用类型与差旅城市',
        author: '周宁',
        createdAt: '2026-08-25T11:00:00+08:00',
        status: 'archived',
        edits: [
          {
            path: 'SKILL.md',
            replace: [
              ['- 默认成本中心、常用项目号\n', ''],
              ['3. 员工调岗（成本中心变化）时，成本中心与项目号相关记忆全部失效。\n', ''],
              ['按习惯预填报销单的费用类型、成本中心、项目号', '按习惯预填报销单的费用类型'],
              ['「你近 3 个月的打车票都归到了项目 P-2041」', '「你近 3 个月的打车票都选了市内交通」'],
              ['、成本中心、项目号和差旅城市', '和差旅城市'],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'reconciliation-rules',
    status: 'published',
    agents: ['对账 agent'],
    owner: '王琳',
    updatedBy: '王琳',
    updatedAt: '2026-10-08T09:48:00+08:00',
    createdAt: '2026-08-21T16:15:00+08:00',
    permissions: { ...PERM_DEFAULT, editors: ['王琳'] },
    files: [
      f('SKILL.md', REC_SKILL),
      f('references/matching-tolerance.md', REC_TOL),
      f('scripts/match.ts', REC_MATCH),
    ],
    versions: [
      {
        version: '3.0.0',
        note: '三单匹配改为按行匹配，支持部分到货',
        author: '王琳',
        createdAt: '2026-10-08T09:48:00+08:00',
        status: 'published',
      },
      {
        version: '2.2.0',
        note: 'JPY / KRW 容差按整数单位',
        author: '刘洋',
        createdAt: '2026-09-15T13:30:00+08:00',
        status: 'archived',
        edits: [
          {
            path: 'SKILL.md',
            replace: [
              [
                '2. **按行匹配**：发票明细行 ↔ PO 行（物料编码优先，其次品名相似度 ≥ 0.8）。\n3. 每行比较：\n   - 数量：发票数量 ≤ 累计收货数量 − 已开票数量（支持部分到货）\n   - 单价：差异在容差内（见 `references/matching-tolerance.md`）',
                '2. **按整单匹配**：发票价税合计 ↔ PO 金额 ↔ 收货金额。\n3. 差异在整单容差内视为匹配（见 `references/matching-tolerance.md`）。',
              ],
              ['，支持部分到货、红字发票冲减', '，支持红字发票冲减'],
              ['按行匹配数量与单价，', ''],
            ],
          },
          {
            path: 'scripts/match.ts',
            content: `/** 三单匹配：整单比较金额（示意实现）。 */

export function matchTotal(invoiceTotal: number, poTotal: number, grnTotal: number, tolerance: number): boolean {
  return Math.abs(invoiceTotal - poTotal) <= tolerance && Math.abs(invoiceTotal - grnTotal) <= tolerance;
}
`,
          },
        ],
      },
      {
        version: '2.1.0',
        note: '新增红字发票（贷项通知单）冲减',
        author: '王琳',
        createdAt: '2026-08-21T16:15:00+08:00',
        status: 'archived',
        edits: [
          {
            path: 'references/matching-tolerance.md',
            replace: [
              ['| JP · JPY | ±0.5% | ±10（整数单位） | ±100 |', '| JP · JPY | ±0.5% | ±10.00 | ±100.00 |'],
              ['| KR · KRW | ±0.5% | ±100（整数单位） | ±1000 |\n', ''],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tax-rule-check',
    status: 'disabled',
    statusNote: '已改由「税务规则设置」中的规则引擎执行，暂停下发到 agent',
    agents: ['税务规则 agent'],
    owner: '刘洋',
    updatedBy: '刘洋',
    updatedAt: '2026-10-02T10:30:00+08:00',
    createdAt: '2026-08-28T15:20:00+08:00',
    permissions: { ...PERM_DEFAULT, editors: ['刘洋', '王琳'] },
    files: [
      f('SKILL.md', TAX_SKILL),
      f('references/vat-rates.md', TAX_RATES),
      f('assets/rate-table.json', TAX_TABLE),
    ],
    versions: [
      {
        version: '1.1.0',
        note: 'JP 非适格请求书过渡比例 80%；DE 小额发票简化要求',
        author: '刘洋',
        createdAt: '2026-09-10T18:05:00+08:00',
        status: 'published',
      },
      {
        version: '1.0.0',
        note: '首个版本：CN / DE / JP / SG / MX 可抵扣判断',
        author: '刘洋',
        createdAt: '2026-08-28T15:20:00+08:00',
        status: 'archived',
        edits: [
          {
            path: 'SKILL.md',
            replace: [
              ['，2026 年 10 月前非适格请求书按 80% 过渡比例。', '。'],
              ['；小额发票（≤ 250 EUR）按 §33 UStDV 简化要求。', '。'],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'dataset-cleaning',
    status: 'draft',
    agents: ['数据清洗 agent'],
    owner: '周宁',
    updatedBy: '周宁',
    updatedAt: '2026-10-10T20:16:00+08:00',
    createdAt: '2026-10-02T09:10:00+08:00',
    permissions: { ...PERM_DEFAULT, editors: ['周宁'] },
    files: [
      f('SKILL.md', DS_SKILL),
      f('scripts/dedupe.py', DS_DEDUPE),
      f('references/field-mapping.md', DS_MAPPING),
    ],
    versions: [
      {
        version: '0.1.0-draft.2',
        note: '补充脱敏规则与质量门槛',
        author: '周宁',
        createdAt: '2026-10-10T20:16:00+08:00',
        status: 'draft',
      },
      {
        version: '0.1.0-draft.1',
        note: '初稿：去重、切分、冻结测试集',
        author: '周宁',
        createdAt: '2026-10-02T09:10:00+08:00',
        status: 'draft',
        edits: [
          {
            path: 'SKILL.md',
            replace: [
              [
                '\n## 质量门槛\n\n- 每个国家测试集 ≥ 500 张，覆盖 ≥ 50 个供应商\n- 标注一致性抽检（双人标注）≥ 98%\n- 脱敏后抽检 200 张，个人信息残留为 0\n',
                '',
              ],
              ['人名替换为占位符。脚本见 `scripts/dedupe.py`。', '人名替换为占位符。'],
              ['按影像哈希去重、脱敏个人信息、', '按影像哈希去重、'],
            ],
          },
          { path: 'scripts/dedupe.py', remove: true },
        ],
      },
    ],
  },
];

function applyEdits(files: SkillFile[], edits: Edit[] = []): SkillFile[] {
  let out = files.map((x) => ({ ...x }));
  for (const e of edits) {
    if (e.remove) {
      out = out.filter((x) => x.path !== e.path);
      continue;
    }
    if (e.content !== undefined) {
      const i = out.findIndex((x) => x.path === e.path);
      if (i >= 0) out[i] = { path: e.path, content: e.content };
      else out.push({ path: e.path, content: e.content });
    }
    if (e.replace) {
      const file = out.find((x) => x.path === e.path);
      if (file) for (const [from, to] of e.replace) file.content = file.content.split(from).join(to);
    }
  }
  return out;
}

/** 生成内存仓库的初始数据（每次调用返回全新的副本） */
export function buildSkillSeed(): SkillRecord[] {
  return SEEDS.map((seed) => {
    const { versions: seedVersions, files, ...rest } = seed;
    const versions: SkillVersionDetail[] = [];
    let cur = files;
    seedVersions.forEach((v, i) => {
      if (i > 0) cur = applyEdits(cur, v.edits);
      const { edits: _edits, ...meta } = v;
      void _edits;
      versions.push({ ...meta, files: cur.map((x) => ({ ...x })) });
    });
    const latest = versions[0];
    const published = versions.find((v) => v.status === 'published');
    const fm = /^---\n[\s\S]*?^description:\s*(.+)$/m.exec(files[0].content);
    const skill: Skill = {
      ...rest,
      name: seed.name ?? seed.id,
      description: fm ? fm[1].trim() : '',
      version: latest.version,
      publishedVersion: published?.version,
      hasDraft: latest.status === 'draft',
      files: files.map((x) => ({ ...x })),
      lastPublished: published
        ? { version: published.version, by: published.author, at: published.createdAt, note: published.note }
        : undefined,
    };
    return { skill, versions };
  });
}

/**
 * 更正规则（与设计稿 rule() 一致）：按字段来源、字段类别与发票环节判定
 * free 可直接更正 / review 复核后生效 / lock 不得更正（附补偿方式）。
 * 页面用它展示与拦截；后端必须做同样的校验，前端判断只是体验。
 * 返回的文案为简体中文原文，显示时经 t() 翻译。
 */
import type { Tone } from '@/components/ui';
import type { CorrectionInvoice, FieldChange, FieldRule, InvoiceField, RuleClass } from './types';

export function fieldRule(inv: CorrectionInvoice, f: InvoiceField): FieldRule {
  const s = inv.stageIdx;
  const grp = f.group;
  const src = f.src;
  if (src === '税局')
    return {
      cls: 'lock',
      why:
        '该字段已与' +
        inv.authority +
        '比对一致，以税局数据为准，不得人工更正。识别差异已被税局值覆盖，并计入 OCR 误差统计。',
      comps: [
        {
          title: '业务内容有误：申请红字发票',
          desc: '由购方发起红字确认单，供应商开具红字发票后重新开票；原票作废链路保留',
          btn: '发起红字确认单',
        },
        {
          title: 'OCR 识别差异：仅回流样本',
          desc: '不改数据，把这张票的影像与税局真值作为标注样本送入训练集',
          btn: '加入回流样本',
        },
      ],
    };
  if (src === 'XML')
    return {
      cls: 'lock',
      why: '该字段来自 ZUGFeRD 结构化 XML（法定主件），PDF 呈现件只做参照，不得更正。',
      comps: [
        {
          title: '票面有误：请供应商开具 Gutschrift / 更正发票',
          desc: '经供应商门户发出更正请求，新票到达后自动关联并冲销原票',
          btn: '通知供应商更正',
        },
      ],
    };
  if (grp === 'bank' && s >= 2)
    return {
      cls: 'lock',
      why: s >= 4 ? '已付款，收款账户不得更正。' : '已生成付款相关单据，收款账户不得在发票上更正，防止付款欺诈。',
      comps: [
        {
          title: '走供应商主数据变更',
          desc: '在主数据系统提交银行账户变更：双人复核 + 回拨供应商确认，生效后影响后续付款',
          btn: '提交主数据变更',
        },
      ],
    };
  if ((grp === 'amount' || grp === 'tax') && s >= 3)
    return {
      cls: 'lock',
      why: '发票已入账生成会计凭证，金额与税额冻结。',
      comps:
        s >= 4
          ? [
              {
                title: '已付款差额：补付或扣款',
                desc: '少付则生成差额付款单；多付则向供应商开具 Debit memo，抵扣下次付款',
                btn: '生成差额处理单',
              },
              { title: '冲销重做', desc: '冲销原凭证，按更正后的版本重新过账', btn: '发起冲销' },
            ]
          : [{ title: '冲销重做', desc: '冲销原凭证，生成更正版本后重新过账，AP 余额随之调整', btn: '发起冲销' }],
    };
  if (grp === 'attr')
    return {
      cls: 'free',
      why:
        '归属类字段，不改变票面事实，可直接更正并记录日志。' +
        (s >= 2 ? '已生成 ' + inv.doc + '，更正后自动撤回并重新匹配。' : ''),
      comps: [],
    };
  if (grp === 'date' && s >= 3)
    return { cls: 'review', why: '已入账发票的日期更正影响期间归属，需财务复核；跨期时生成调整分录。', comps: [] };
  return {
    cls: 'review',
    why:
      '票面字段须与影像一致；金额差超过 1% 或等值 500 CNY、税号类字段，需第二人复核后生效。' +
      (s >= 2 ? '生效后撤回 ' + inv.doc + '，重新三单匹配后重推审批。' : ''),
    comps: [],
  };
}

export const CLS: Record<RuleClass, { label: string; tone: Tone }> = {
  free: { label: '可直接更正', tone: 'green' },
  review: { label: '复核后生效', tone: 'orange' },
  lock: { label: '不得更正', tone: 'red' },
};

/** 当前生效值：系统值叠加已生效（applied）的变更 */
export function currentValue(f: InvoiceField, log: FieldChange[]): string {
  let v = f.cur;
  log.forEach((l) => {
    if (l.field === f.key && l.status === 'applied') v = l.after;
  });
  return v;
}

export function hasPending(f: InvoiceField, log: FieldChange[]): boolean {
  return log.some((l) => l.field === f.key && l.status === 'pending');
}

/** 下游撤回重推的 Saga 步骤 */
export function withdrawSteps(doc: string): string {
  return '撤回 ' + doc + ' → 重新三单匹配 → 重推审批流';
}

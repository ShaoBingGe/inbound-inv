import { ApiError, http, isMock, mockDelay } from '@/lib/http';
import { buildReference, buildWorkspace, MOCK_OPERATOR, MOCK_REVIEWER, MOCK_SEQ_START } from './data';
import { currentValue, fieldRule, withdrawSteps } from './rules';
import type {
  CompensationEvent,
  CorrectionInvoice,
  CorrectionReference,
  CorrectionResult,
  CorrectionWorkspace,
  FieldChange,
  StartCompensationInput,
  SubmitCorrectionInput,
} from './types';

/* ---------- mock 后端：内存中的只追加日志 ---------- */

interface MockStore {
  ws: CorrectionWorkspace;
  seq: number;
}
let store: MockStore | null = null;
function mock(): MockStore {
  if (!store) store = { ws: buildWorkspace(), seq: MOCK_SEQ_START };
  return store;
}
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
function findInvoice(st: MockStore, id: string): CorrectionInvoice {
  const inv = st.ws.invoices.find((i) => i.id === id);
  if (!inv) throw new ApiError(404, '发票不存在');
  return inv;
}
function withdrawEvent(st: MockStore, inv: CorrectionInvoice): CompensationEvent {
  return { eid: 'CE-' + st.seq, type: '下游单据撤回重推', steps: withdrawSteps(inv.doc), obj: inv.doc, status: 'running' };
}

/* ---------- 查询 ---------- */

/** 待修正队列 + 每张票的 invoice_field_change / compensation_event */
export async function fetchCorrectionWorkspace(): Promise<CorrectionWorkspace> {
  if (isMock()) return mockDelay(clone(mock().ws));
  return http.get<CorrectionWorkspace>('/v1/invoice-corrections/queue');
}

/** 修正流程、更正规则矩阵与补偿方式说明 */
export async function fetchCorrectionReference(): Promise<CorrectionReference> {
  if (isMock()) return mockDelay(buildReference());
  return http.get<CorrectionReference>('/v1/invoice-corrections/rules');
}

/* ---------- 写操作 ---------- */

/**
 * 提交字段更正，返回写入的 invoice_field_change 记录。
 * 可直接更正 → 立即生效（applied）；复核后生效 → pending，等待第二人复核；不得更正 → 拒绝（409）。
 * 审核中及之后环节且立即生效时，同时生成「下游单据撤回重推」补偿事件。
 */
export async function submitCorrection(input: SubmitCorrectionInput): Promise<CorrectionResult> {
  if (!isMock())
    return http.post<CorrectionResult>(`/v1/invoices/${encodeURIComponent(input.invoiceId)}/field-changes`, {
      field: input.field,
      before: input.before,
      after: input.after,
      errorType: input.errorType,
    });
  const st = mock();
  const inv = findInvoice(st, input.invoiceId);
  const f = inv.fields.find((x) => x.key === input.field);
  if (!f) throw new ApiError(404, '字段不存在');
  const rule = fieldRule(inv, f);
  if (rule.cls === 'lock') throw new ApiError(409, '不得更正');
  const log = st.ws.logs[inv.id] ?? [];
  const before = currentValue(f, log);
  if (input.after === before) throw new ApiError(422, '更正值与当前值相同，未生成记录');
  const change: FieldChange = {
    cid: 'FC-' + st.seq,
    ver: 'v' + (log.length + 2),
    field: f.key,
    before,
    after: input.after,
    source: '人工更正',
    etype: input.errorType,
    op: MOCK_OPERATOR,
    rev: rule.cls === 'review' ? '待指派' : '—',
    status: rule.cls === 'review' ? 'pending' : 'applied',
    at: '2026-10-13 10:4' + (st.seq % 10),
  };
  st.ws.logs[inv.id] = [...log, change];
  let compensation: CompensationEvent | undefined;
  if (inv.stageIdx >= 2 && rule.cls !== 'review') {
    compensation = withdrawEvent(st, inv);
    st.ws.comps[inv.id] = [...(st.ws.comps[inv.id] ?? []), compensation];
  }
  st.seq += 1;
  return mockDelay(clone({ change, compensation }));
}

/** 第二人复核通过：变更记录状态改为 applied（日志本身只追加，状态由复核写入） */
export async function approveCorrection(invoiceId: string, changeId: string): Promise<CorrectionResult> {
  if (!isMock())
    return http.post<CorrectionResult>(
      `/v1/invoices/${encodeURIComponent(invoiceId)}/field-changes/${encodeURIComponent(changeId)}/approve`,
    );
  const st = mock();
  const inv = findInvoice(st, invoiceId);
  const log = st.ws.logs[inv.id] ?? [];
  const cur = log.find((l) => l.cid === changeId);
  if (!cur) throw new ApiError(404, '变更记录不存在');
  if (cur.status !== 'pending') throw new ApiError(409, '该记录无需复核');
  const change: FieldChange = { ...cur, status: 'applied', rev: MOCK_REVIEWER };
  st.ws.logs[inv.id] = log.map((l) => (l.cid === changeId ? change : l));
  let compensation: CompensationEvent | undefined;
  if (inv.stageIdx >= 2) {
    compensation = withdrawEvent(st, inv);
    st.ws.comps[inv.id] = [...(st.ws.comps[inv.id] ?? []), compensation];
  }
  st.seq += 1;
  return mockDelay(clone({ change, compensation }));
}

/** 不得更正字段：发起补偿方式（红字确认单、冲销、主数据变更…），返回 compensation_event */
export async function startCompensation(input: StartCompensationInput): Promise<CompensationEvent> {
  if (!isMock())
    return http.post<CompensationEvent>(`/v1/invoices/${encodeURIComponent(input.invoiceId)}/compensation-events`, {
      type: input.type,
      steps: input.steps,
    });
  const st = mock();
  const inv = findInvoice(st, input.invoiceId);
  const ev: CompensationEvent = { eid: 'CE-' + st.seq, type: input.type, steps: input.steps, obj: inv.id, status: 'initiated' };
  st.ws.comps[inv.id] = [...(st.ws.comps[inv.id] ?? []), ev];
  st.seq += 1;
  return mockDelay(clone(ev));
}

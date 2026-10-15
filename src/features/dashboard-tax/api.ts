import { http, isMock, mockDelay } from '@/lib/http';
import { buildTaxBoard, buildTaxDrill } from './data';
import type { DrillInvoice, TaxBoardData, TaxBoardQuery, TaxDrillQuery } from './types';

/** 税务统计看板汇总（KPI、阶段、税种、国家、趋势、风险） */
export async function fetchTaxBoard(q: TaxBoardQuery): Promise<TaxBoardData> {
  if (isMock()) return mockDelay(buildTaxBoard(q));
  return http.get<TaxBoardData>('/v1/dashboards/tax', { query: { scope: q.scope, period: q.period } });
}

/** 按处理阶段下钻到发票（示例） */
export async function fetchTaxDrill(q: TaxDrillQuery): Promise<DrillInvoice[]> {
  if (isMock()) return mockDelay(buildTaxDrill(q));
  return http.get<DrillInvoice[]>('/v1/dashboards/tax/drill', {
    query: { scope: q.scope, period: q.period, state: q.state },
  });
}

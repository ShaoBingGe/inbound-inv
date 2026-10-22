/**
 * 匹配训练成果示例数据（与设计稿 ai-learning-supplier.html 的生成方式一致，
 * 品名与规格沿用三单匹配关系知识库的药品主数据）。只在 mock 模式下使用。
 */
import { DRUG_NAMES, IUNITS, PKG, SPECS, UNITS } from '@/features/supplier-wallet/match/data';
import type { LearnedInvoice, TrainingName, TrainingSpec, TrainingSupplier } from './types';

export const UPDATED_AT = '2026-06-23 09:00';

type SupTuple = [string, string, number, number, number, number];
export const TRAINING_SUPPLIERS: TrainingSupplier[] = (
  [
    ['SUP-0050003', '贵州省医药(集团)和平医药有限公司', 2553, 1762, 1421, 91.1],
    ['SUP-0050001', '重庆医药(集团)股份有限公司', 2472, 1586, 1496, 99.4],
    ['SUP-0050002', '重庆医药集团四川医药有限公司', 1865, 1356, 663, 93.5],
    ['SUP-0050006', '重庆医药集团药特分有限责任公司', 1589, 1095, 853, 98.3],
    ['SUP-0050007', '重庆医药集团药品销售有限公司', 1827, 1202, 947, 91.9],
    ['SUP-0050004', '重庆医药集团湖南有限公司', 1355, 1050, 977, 93.5],
    ['SUP-0050005', '重庆医药集团医贸药品有限公司', 1335, 978, 801, 98.5],
    ['SUP-0050008', '重控股湖南民生药业有限公司', 1273, 889, 784, 92.1],
  ] as SupTuple[]
).map(([code, name, materials, names, learned, coverage]) => ({ code, name, materials, names, learned, coverage }));

const PREFIXES = ['重组', '盐酸', '注射用', '复方', '硫酸', '醋酸', '枸橼酸'];
const SUFFIXES = ['', '(进口)', '(原研)', '(仿制)', '注射剂'];
const RATIOS = [1, 5, 10, 12, 6, 100, 0.5, 0.1, 2, 3, 4, 0.25];
const ALL_UNITS = [...UNITS, '粒', '片'];

const sumCodes = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);

/** 按供应商生成品名 → 规格 → 已学习发票（确定性，每次相同） */
export function buildTrainingItems(supplierCode: string): TrainingName[] {
  const seed = sumCodes(supplierCode);
  return DRUG_NAMES.map((name, i) => {
    const id = `N${i}`;
    const cnt = 2 + Math.floor(Math.abs(Math.sin(i * 7 + 1) * 8));
    const code = sumCodes(id);
    const specs: TrainingSpec[] = Array.from({ length: cnt }, (_, k) => {
      const sid = `${id}_${k}`;
      const unit = ALL_UNITS[(code + k * 5) % ALL_UNITS.length];
      const ok = (code + k * 3 + 17 + seed) % 40 !== 0;
      const hh = sumCodes(sid);
      const invoices: LearnedInvoice[] = ok
        ? Array.from({ length: 3 + (hh % 5) }, (_, j) => ({
            iname:
              j > 0 ? PREFIXES[(hh + j) % PREFIXES.length] + name + SUFFIXES[(hh + j * 2) % SUFFIXES.length] : name,
            ispec: SPECS[(hh + j * 11) % SPECS.length] + PKG[(hh + j * 7) % PKG.length],
            iunit: IUNITS[(hh + j * 3) % IUNITS.length],
            ratio: RATIOS[(hh + j * 5) % RATIOS.length],
            conf: Math.min(99, 76 + ((hh * 7 + j * 13) % 24)),
          }))
        : [];
      return {
        sid,
        spec: SPECS[(code * 3 + k * 7) % SPECS.length] + PKG[(code + k * 3) % PKG.length],
        unit,
        ok,
        invoices,
      };
    });
    return { id, name, specs };
  });
}

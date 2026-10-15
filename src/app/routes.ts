import type { Role } from '@/auth/types';

/** 路由路径常量。页面间跳转一律引用这里，不手写字符串。 */
export const ROUTES = {
  login: '/login',
  authCallback: '/auth/callback',
  forbidden: '/403',

  dashboardGlobal: '/dashboard/global',
  dashboardTax: '/dashboard/tax',
  dashboardRecognition: '/dashboard/recognition',

  poolEnterprise: '/pool/enterprise',
  /** 发票全生命周期（企业票池明细） */
  invoiceLifecycle: (id = ':invoiceId') => `/pool/invoices/${id}`,
  /** 影像查看器：在新窗口打开，不带应用框架 */
  invoiceViewer: (id = ':invoiceId') => `/viewer/${id}`,
  supplierWallet: '/pool/supplier-wallet',

  captureH5: '/capture/h5',
  captureMailbox: '/capture/mailbox',
  capturePortal: '/capture/portal',
  captureMobile: '/capture/mobile',
  /** 手机端独立页面（扫码打开，不带应用框架） */
  mobileStandalone: '/m/capture',

  settingsDataOps: '/settings/data-ops',
  settingsChannels: '/settings/channels',
  settingsTaxRules: '/settings/tax-rules',
  settingsAgents: '/settings/agents',
  settingsSkills: '/settings/skills',
  skillDetail: (id = ':skillId') => `/settings/skills/${id}`,

  dataRecognition: '/data/recognition',
  dataCorrection: '/data/correction',
  dataRules: '/data/rules',
} as const;

/**
 * 设计稿画板 → 路由。迁移时把原型里的 <a href="X.dc.html"> 换成 <Link to={...}>。
 */
export const PROTOTYPE_ROUTE: Record<string, string> = {
  'Main.dc.html': ROUTES.dashboardGlobal,
  'TaxBoard.dc.html': ROUTES.dashboardTax,
  'ModelBoard.dc.html': ROUTES.dashboardRecognition,
  'InvoicePool.dc.html': ROUTES.poolEnterprise,
  'Lifecycle.dc.html': ROUTES.invoiceLifecycle('TK-2609-0031'),
  'InvoiceViewer.dc.html': ROUTES.invoiceViewer('TK-2609-0031'),
  'Wallet.dc.html': ROUTES.supplierWallet,
  'Capture.dc.html': ROUTES.captureH5,
  'Mailbox.dc.html': ROUTES.captureMailbox,
  'Portal.dc.html': ROUTES.capturePortal,
  'CaptureH5.dc.html': ROUTES.captureMobile,
  'DataCenter.dc.html': ROUTES.settingsDataOps,
  'Channels.dc.html': ROUTES.settingsChannels,
  'TaxRules.dc.html': ROUTES.settingsTaxRules,
  'Agents.dc.html': ROUTES.settingsAgents,
  'CorrectionData.dc.html': ROUTES.dataRecognition,
  'Correction.dc.html': ROUTES.dataCorrection,
  'Dataset.dc.html': ROUTES.dataRules,
};

export interface NavItem {
  to: string;
  /** 简体中文原文，显示时经 t() 翻译 */
  label: string;
  icon: string;
  roles?: Role[];
  /** 详情页等子路由也高亮此菜单 */
  match?: string[];
}
export interface NavGroup {
  group: string;
  items: NavItem[];
}

/** 左侧菜单（与设计稿菜单结构一致，新增「Skill 管理」） */
export const NAV: NavGroup[] = [
  {
    group: '看板',
    items: [
      { to: ROUTES.dashboardGlobal, label: '全球统一看板', icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
      { to: ROUTES.dashboardTax, label: '税务统计看板', icon: 'M3 3v18h18M8 17V9M12 17V5M16 17v-7' },
      { to: ROUTES.dashboardRecognition, label: '识别效果看板', icon: 'M3 3v18h18M7 15l4-4 3 3 5-6' },
    ],
  },
  {
    group: '票池',
    items: [
      {
        to: ROUTES.poolEnterprise,
        label: '企业票池',
        icon: 'M4 7h16v13H4zM8 7V4h8v3M8 12h8M8 16h5',
        match: ['/pool/invoices/'],
      },
      { to: ROUTES.supplierWallet, label: '供应商票夹', icon: 'M3 7h18v13H3zM3 7l2-4h14l2 4M16 13h2' },
    ],
  },
  {
    group: '采集',
    items: [
      {
        to: ROUTES.captureH5,
        label: 'H5页面采集',
        icon: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10',
      },
      { to: ROUTES.captureMailbox, label: '邮箱采集与识别', icon: 'M3 5h18v14H3zM3 6l9 7 9-7' },
      { to: ROUTES.capturePortal, label: '供应商门户', icon: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6' },
      {
        to: ROUTES.captureMobile,
        label: '移动端采集',
        icon: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
      },
    ],
  },
  {
    group: '设置',
    items: [
      {
        to: ROUTES.settingsDataOps,
        label: '全球数据运维设置',
        icon: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
        roles: ['data_ops'],
      },
      {
        to: ROUTES.settingsChannels,
        label: '采集渠道与校验策略',
        icon: 'M4 5h16M4 12h16M4 19h16M8 5v14M16 5v14',
        roles: ['data_ops', 'tax_manager'],
      },
      {
        to: ROUTES.settingsTaxRules,
        label: '税务规则设置',
        icon: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
        roles: ['tax_manager'],
      },
      {
        to: ROUTES.settingsAgents,
        label: 'AI agent能力设置',
        icon: 'M12 2v4M5 8h14v12H5zM9 13h.01M15 13h.01M9 17h6',
        roles: ['data_ops', 'skill_editor'],
      },
      {
        to: ROUTES.settingsSkills,
        label: 'Skill 管理',
        icon: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z',
        roles: ['skill_editor', 'data_ops'],
        match: ['/settings/skills/'],
      },
    ],
  },
  {
    group: '数据管理',
    items: [
      {
        to: ROUTES.dataRecognition,
        label: '发票识别数据管理看板',
        icon: 'M4 4h16v16H4zM4 10h16M10 4v16',
        roles: ['data_ops'],
      },
      {
        to: ROUTES.dataCorrection,
        label: '发票数据修正',
        icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
        roles: ['ap_clerk', 'data_ops'],
      },
      {
        to: ROUTES.dataRules,
        label: '数据识别规则管理',
        icon: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
        roles: ['data_ops'],
      },
    ],
  },
];

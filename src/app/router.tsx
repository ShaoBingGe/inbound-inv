import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { CallbackPage } from '@/auth/CallbackPage';
import { RequireAuth, RequireRole } from '@/auth/guards';
import { LoginPage } from '@/auth/LoginPage';
import type { Role } from '@/auth/types';
import { PageLoading } from '@/components/ui';
import { AppLayout } from '@/layout/AppLayout';
import { ForbiddenPage, NotFoundPage } from './StatusPages';
import { ROUTES } from './routes';

/** 每个页面按需加载，首屏只下载框架与当前页面 */
const page = (load: () => Promise<{ default: ComponentType }>) => lazy(load);

const GlobalDashboard = page(() => import('@/features/dashboard-global/GlobalDashboardPage'));
const TaxDashboard = page(() => import('@/features/dashboard-tax/TaxDashboardPage'));
const RecognitionDashboard = page(() => import('@/features/dashboard-recognition/RecognitionDashboardPage'));
const InvoicePool = page(() => import('@/features/invoice-pool/InvoicePoolPage'));
const InvoiceLifecycle = page(() => import('@/features/invoice-lifecycle/InvoiceLifecyclePage'));
const InvoiceViewer = page(() => import('@/features/invoice-viewer/InvoiceViewerPage'));
const SupplierWallet = page(() => import('@/features/supplier-wallet/SupplierWalletPage'));
const MatchWorkbench = page(() => import('@/features/supplier-wallet/MatchWorkbenchPage'));
const CaptureH5 = page(() => import('@/features/capture-h5/CaptureH5Page'));
const CaptureMailbox = page(() => import('@/features/capture-mailbox/CaptureMailboxPage'));
const CapturePortal = page(() => import('@/features/capture-portal/CapturePortalPage'));
const CaptureMobile = page(() => import('@/features/capture-mobile/CaptureMobilePage'));
const DataOps = page(() => import('@/features/settings-data-ops/DataOpsPage'));
const Channels = page(() => import('@/features/settings-channels/ChannelsPage'));
const TaxRules = page(() => import('@/features/settings-tax-rules/TaxRulesPage'));
const Agents = page(() => import('@/features/settings-agents/AgentsPage'));
const SkillList = page(() => import('@/features/skills/SkillListPage'));
const SkillDetail = page(() => import('@/features/skills/SkillDetailPage'));
const DataRecognition = page(() => import('@/features/data-recognition/DataRecognitionPage'));
const DataCorrection = page(() => import('@/features/data-correction/DataCorrectionPage'));
const DataRules = page(() => import('@/features/data-rules/DataRulesPage'));

function guard(el: ReactNode, roles?: Role[]) {
  return <RequireRole roles={roles}>{el}</RequireRole>;
}

function standalone(el: ReactNode) {
  return (
    <RequireAuth>
      <Suspense fallback={<PageLoading />}>{el}</Suspense>
    </RequireAuth>
  );
}

export const routes: RouteObject[] = [
  { path: ROUTES.login, element: <LoginPage /> },
  { path: ROUTES.authCallback, element: <CallbackPage /> },
  // 不带应用框架的独立页面
  { path: ROUTES.invoiceViewer(), element: standalone(<InvoiceViewer />) },
  { path: ROUTES.mobileStandalone, element: standalone(<CaptureMobile />) },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to={ROUTES.dashboardGlobal} replace /> },
      { path: ROUTES.dashboardGlobal, element: <GlobalDashboard /> },
      { path: ROUTES.dashboardTax, element: <TaxDashboard /> },
      { path: ROUTES.dashboardRecognition, element: <RecognitionDashboard /> },
      { path: ROUTES.poolEnterprise, element: <InvoicePool /> },
      { path: ROUTES.invoiceLifecycle(), element: <InvoiceLifecycle /> },
      { path: ROUTES.supplierWallet, element: <SupplierWallet /> },
      { path: ROUTES.matchWorkbench(), element: <MatchWorkbench /> },
      { path: ROUTES.captureH5, element: <CaptureH5 /> },
      { path: ROUTES.captureMailbox, element: <CaptureMailbox /> },
      { path: ROUTES.capturePortal, element: <CapturePortal /> },
      { path: ROUTES.captureMobile, element: <CaptureMobile /> },
      { path: ROUTES.settingsDataOps, element: guard(<DataOps />, ['data_ops']) },
      { path: ROUTES.settingsChannels, element: guard(<Channels />, ['data_ops', 'tax_manager']) },
      { path: ROUTES.settingsTaxRules, element: guard(<TaxRules />, ['tax_manager']) },
      { path: ROUTES.settingsAgents, element: guard(<Agents />, ['data_ops', 'skill_editor']) },
      { path: ROUTES.settingsSkills, element: guard(<SkillList />, ['skill_editor', 'data_ops']) },
      { path: ROUTES.skillDetail(), element: guard(<SkillDetail />, ['skill_editor', 'data_ops']) },
      { path: ROUTES.dataRecognition, element: guard(<DataRecognition />, ['data_ops']) },
      { path: ROUTES.dataCorrection, element: guard(<DataCorrection />, ['ap_clerk', 'data_ops']) },
      { path: ROUTES.dataRules, element: guard(<DataRules />, ['data_ops']) },
      { path: ROUTES.forbidden, element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);

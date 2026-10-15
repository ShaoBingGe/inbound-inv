# 前端开发约定

本项目由设计稿（Claude Design 画布中的 `.dc.html` 原型）迁移而来。新增或修改页面时遵守以下约定。

## 目录

```
src/
  app/            路由（routes.ts 路径常量 + 菜单，router.tsx 路由表）、全局 Provider
  auth/           OIDC 登录、回调、守卫、角色
  i18n/           翻译引擎、语言列表、词典（locales/*.json）
  layout/         应用框架（侧边菜单、顶栏、语言切换）
  components/ui/  自研组件库（CSS Modules），页面只从 '@/components/ui' 引入
  lib/            http 客户端、useAsync、示例数据工具
  styles/         设计令牌 tokens.css、基础样式 base.css
  features/<模块>/
    <Name>Page.tsx      页面组件（default export）
    <Name>Page.module.css
    components/         只在本模块使用的子组件（可选）
    types.ts            领域类型
    data.ts             示例数据（mock）
    api.ts              取数函数：mock 模式返回 data.ts，live 模式调用后端
```

## 页面结构

```tsx
export default function TaxRulesPage() {
  const t = useT();
  const { data, loading, error, reload } = useAsync(fetchTaxRules, []);
  if (loading && !data) return <PageLoading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <>
      <PageHeader crumb={`${t('设置')} / ${t('税务规则设置')}`} title={t('税务规则设置')} actions={…} />
      <PageBody>…</PageBody>
    </>
  );
}
```

- 侧边菜单、顶栏（语言切换、用户菜单）由 `AppLayout` 提供，页面不要再画。
- 页面宽度自适应：容器用 flex / grid + `minmax(0, 1fr)`，宽表格放在 `<Table>`（自带横向滚动）。
- 方向：用逻辑属性（`margin-inline-start`、`inset-inline-end`、`text-align: start`），阿拉伯语会切换为 RTL。

## 样式

- 静态样式写在同名 `*.module.css`，类名小驼峰（`styles.statusCard`）。
- 颜色、字号、圆角、间距只用 `src/styles/tokens.css` 中的变量；需要新颜色先加令牌。
- 只有运行时才知道的值（宽度百分比、选中态颜色、图表坐标）才用 `style={{ … }}`。
- 全局工具类仅有 `num`（等宽数字）、`mono`、`kick`（小标题）、`sr-only`。

## 文案与多语言

- 所有界面文字用简体中文原文包在 `t()` 里：`t('企业票池')`。词典以中文原文为键，`src/i18n/locales/*.json`。
- 拼接字符串：保持与设计稿相同的片段，最终结果交给 `t()`：`t('共 ' + n + ' 张')`；模板中的「文字 + 变量」写成 `{t('第')} {page} / {pages} {t('页')}`。引擎会做整串匹配 → 日期/万·亿规则 → 片段替换。
- **不翻译**：发票原件影像、票面原文字段值、公司/人名等主数据、代码与编号。这些区域不调用 `t()`，并在容器上加 `translate="no"`。
- 新增文案后运行 `npm run i18n:check`，把列出的缺失条目补进 4 个词典（en / zh-TW / es / ar）。
- 金额、日期优先用 `Intl`（`useI18n().locale`）。

## 数据

- 页面不直接 import `data.ts`，统一通过 `api.ts` 的异步函数取数：

```ts
export async function fetchInvoicePool(q: PoolQuery): Promise<PoolResult> {
  if (isMock()) return mockDelay(buildPool(q));
  return http.get<PoolResult>('/v1/invoice-pool', { query: { ...q } });
}
```

- mock 模式（`config.js` 中 `dataMode: 'mock'`）使用确定性随机（`rng`/`hs`），每次打开数据相同。
- 接口路径为约定草案（`/v1/...`），后端确定后在 `api.ts` 中调整即可，页面不用动。
- 写操作（保存、提交、纠正）也放在 `api.ts`，页面用 `useToast()` 反馈结果。

## 路由与跳转

- 路径常量在 `src/app/routes.ts`；设计稿中的 `<a href="X.dc.html">` 对照 `PROTOTYPE_ROUTE` 改成 `<Link to={ROUTES.xxx}>`。
- 影像查看器在新窗口打开：`<a href={ROUTES.invoiceViewer(id)} target="_blank" rel="noopener">`。

## 权限

- 菜单与路由的角色限制在 `routes.ts` / `router.tsx`；页面内按钮级权限用 `hasRole(user, ['tax_manager'])`。
- 国家数据隔离：`user.countries` 为 `["*"]` 时是主数据中心全球视角，否则只能看到所列国家；页面的国家/主体切换器只列出可见范围（`canSeeCountry`）。后端必须同样校验，前端过滤只是体验。

## 可访问性

- 可点击的一律用 `<button>` / `<a>`，不要在 div 上挂 onClick（遮罩层除外）。
- 只有图标的按钮必须有 `aria-label`；装饰性 SVG `aria-hidden`。
- 文字对比度至少 4.5:1；仅靠颜色区分的状态同时给出文字或形状。

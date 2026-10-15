/*
 * 本地开发用运行时配置。生产环境由容器启动脚本按环境变量覆盖生成（见 deploy/docker/config.js.template）。
 * 不要在这里放任何密钥：OIDC 使用授权码 + PKCE，前端只需要公开的 client_id。
 */
window.__APP_CONFIG__ = {
  env: 'local',
  apiBaseUrl: '/api',
  agentPlatformBaseUrl: '/agent-api',
  dataMode: 'mock',
  defaultLang: 'zh',
  auth: {
    mode: 'mock',
    providers: [
      {
        id: 'corp',
        name: '企业统一身份认证',
        authority: 'https://idp.example.com/realms/invoice-hub',
        clientId: 'invoice-hub-web',
        scope: 'openid profile email offline_access',
        acrValues: '',
        extraQueryParams: {}
      }
    ],
    claims: { roles: 'roles', countries: 'dc_scope', tenant: 'tenant', name: 'name', email: 'email' }
  }
};

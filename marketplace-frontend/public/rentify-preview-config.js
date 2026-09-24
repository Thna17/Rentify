// Normal marketplace routes use Rentify. Replace blank URLs with public
// Core/Commerce/Auth origins before serving this outside localhost.
window.__RENTIFY_MARKETPLACE__ = {
  enabled: true,
  cutoverEnabled: true,
  coreApiUrl: '',
  commerceApiUrl: '',
  authUrl: '',
  merchantDashboardUrl: '',
};

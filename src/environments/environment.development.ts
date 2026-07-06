export const environment = {
  production: false,
  appName: 'SpendSmart',
  googleClientId: '992955080336-bmts5mu987s33p12hnnidldai5pc23hu.apps.googleusercontent.com',
  // Single gateway entry point — never call individual service ports from the frontend.
  // Gateway rewrites: /api/expenses/** → /expenses/** on port 8082, etc.
  apiBase: 'http://localhost:8080/api'
};

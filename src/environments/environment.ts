export const environment = {
  production: true,
  appName: 'SpendSmart',
  googleClientId: '992955080336-bmts5mu987s33p12hnnidldai5pc23hu.apps.googleusercontent.com',
  // Production API base — must point at the deployed Spring Cloud Gateway.
  // If you rename the Render service in render.yaml, update this URL accordingly.
  apiBase: 'https://spendsmart-gateway-uret.onrender.com/api'
};

const pEnv = 'production'
const pEnvMap = {
  production: {
    PRIMUS_PROXY_URL: 'wss://api1.padolabs.org/algorithm-proxyV2',
    PRIMUS_MPC_URL: 'wss://api1.padolabs.org/algorithmV2',
    PROXY_URL: 'wss://api1.padolabs.org/algoproxyV2',
    BASE_SERVICE_URL: 'https://api.padolabs.org',
  },
  test: {
    PRIMUS_PROXY_URL: 'wss://api-dev.padolabs.org/algorithm-proxyV2',
    PRIMUS_MPC_URL: 'wss://api-dev.padolabs.org/algorithmV2',
    PROXY_URL: 'wss://api-dev.padolabs.org/algoproxyV2',
    BASE_SERVICE_URL: 'https://api-dev.padolabs.org',
  }
}


export const PRIMUS_PROXY_URL = pEnvMap[pEnv].PRIMUS_PROXY_URL
export const PRIMUS_MPC_URL = pEnvMap[pEnv].PRIMUS_MPC_URL
export const PROXY_URL = pEnvMap[pEnv].PROXY_URL
export const BASE_SERVICE_URL = pEnvMap[pEnv].BASE_SERVICE_URL
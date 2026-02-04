const pEnv = 'production'
const pEnvMap = {
  production: {
    PRIMUS_PROXY_URL: 'wss://api2.padolabs.org/algorithm-proxy',
    PRIMUS_MPC_URL: 'wss://api2.padolabs.org/algorithm',
    PROXY_URL: 'wss://api2.padolabs.org/algoproxy',
    BASE_SERVICE_URL: 'https://api.padolabs.org',
  },
  test: {
    PRIMUS_PROXY_URL: 'wss://api-dev.padolabs.org/algorithm-proxy',
    PRIMUS_MPC_URL: 'wss://api-dev.padolabs.org/algorithm',
    PROXY_URL: 'wss://api-dev.padolabs.org/algoproxy',
    BASE_SERVICE_URL: 'https://api-dev.padolabs.org',
  }
}


const BASEAPIMap = {
  production: 'https://api.padolabs.org',
  test: 'https://api-dev.padolabs.org'
}

export const PRIMUS_PROXY_URL = pEnvMap[pEnv].PRIMUS_PROXY_URL
export const PRIMUS_MPC_URL = pEnvMap[pEnv].PRIMUS_MPC_URL
export const PROXY_URL = pEnvMap[pEnv].PROXY_URL
export const BASE_SERVICE_URL = pEnvMap[pEnv].BASE_SERVICE_URL
export const BASEAPI = BASEAPIMap[pEnv]

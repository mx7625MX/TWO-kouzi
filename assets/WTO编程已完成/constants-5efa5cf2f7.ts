/**
 * 应用配置常量
 */

// 共享常量
export const APP_NAME = 'Electron React App'
export const APP_VERSION = '1.0.0'

/**
 * RPC节点配置
 */
export const RPC_ENDPOINTS = {
  BSC: [
    'https://bsc-dataseed1.binance.org',
    'https://bsc-dataseed2.binance.org',
    'https://bsc-dataseed3.binance.org',
    'https://bsc-dataseed4.binance.org',
  ],
  Solana: [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
  ]
} as const

/**
 * 其他配置常量
 */
export const CONFIG = {
  // 轮询间隔（毫秒）
  POLL_INTERVAL: 3000,
  
  // 最大重试次数
  MAX_RETRY_ATTEMPTS: 3,
  
  // 请求超时（毫秒）
  REQUEST_TIMEOUT: 30000,
  
  // 并发查询数
  CONCURRENT_QUERIES: 5,
  
  // 货币精度
  CURRENCY_DECIMALS: {
    BSC: 18,
    Solana: 9
  },
  
  // Gas配置
  GAS: {
    // BSC默认gas限制
    DEFAULT_BSC_GAS_LIMIT: 300000,
    // Solana默认计算单元
    DEFAULT_SOLANA_COMPUTE_UNITS: 200000,
  }
} as const

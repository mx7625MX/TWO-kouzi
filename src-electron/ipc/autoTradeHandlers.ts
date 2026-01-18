let autoTradingEnabled = false;
let currentStrategy: any = null;

/**
 * 启用/禁用自动交易
 */
export async function enableTrading(enabled: boolean): Promise<any> {
  autoTradingEnabled = enabled;

  // 更新数据库设置
  const db = require('../data/database').getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES ('auto_trading_enabled', ?, strftime('%s', 'now'))
  `).run(enabled ? 'true' : 'false');

  if (enabled && currentStrategy) {
    startAutoTrading();
  }

  return {
    enabled: enabled,
    message: enabled ? 'Auto trading enabled' : 'Auto trading disabled',
  };
}

/**
 * 设置交易策略
 */
export async function setStrategy(strategy: any): Promise<any> {
  currentStrategy = strategy;

  return {
    strategy: strategy,
    message: 'Trading strategy updated',
  };
}

/**
 * 获取交易状态
 */
export async function getTradingStatus(): Promise<any> {
  return {
    enabled: autoTradingEnabled,
    strategy: currentStrategy,
    activeOrders: 0,
    profitLoss: '0',
    lastTrade: null,
  };
}

/**
 * 启动自动交易（内部函数）
 */
function startAutoTrading() {
  // 这里应该实现自动交易逻辑
  console.log('Auto trading started with strategy:', currentStrategy);
}

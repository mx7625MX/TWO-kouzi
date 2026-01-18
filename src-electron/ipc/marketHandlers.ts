import { getDatabase } from '../data/database';

/**
 * 获取市场数据
 */
export async function getMarketData(token: string): Promise<any> {
  // 这里应该调用实际的市场数据API
  // 目前返回模拟数据
  return {
    token: token,
    price: (Math.random() * 1000).toFixed(4),
    change24h: (Math.random() * 20 - 10).toFixed(2),
    volume24h: (Math.random() * 1000000).toFixed(0),
    marketCap: (Math.random() * 100000000).toFixed(0),
    updatedAt: Date.now(),
  };
}

/**
 * 获取监控列表
 */
export async function getWatchlist(): Promise<any[]> {
  const db = getDatabase();

  const watchlist = db.prepare(`
    SELECT * FROM market_watchlist
    ORDER BY added_at DESC
  `).all();

  return watchlist;
}

/**
 * 添加到监控列表
 */
export async function addToWatchlist(token: string): Promise<any> {
  const db = getDatabase();

  const result = db.prepare(`
    INSERT OR REPLACE INTO market_watchlist (token_address, token_name, token_symbol, chain)
    VALUES (?, ?, ?, ?)
  `).run(token, `Token ${token}`, token.toUpperCase().substring(0, 6), 'BSC');

  return {
    id: result.lastInsertRowid,
    token: token,
    message: 'Token added to watchlist',
  };
}

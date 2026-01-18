import { ipcMain } from 'electron';
import { getDatabase } from '../data/database';
import { logger } from '../utils/logger';
import { errorHandler, ErrorCategory } from '../utils/errorHandler';

/**
 * 注册热点监控IPC处理器
 */
export function registerHotspotHandlers(): void {
  logger.info('HotspotIPC', '注册热点监控IPC处理器...');

  /**
   * 获取热点代币
   */
  ipcMain.handle('hotspot:getTokens', async () => {
    try {
      logger.debug('HotspotIPC', '获取热点代币列表');

      // 这里应该调用实际的热点检测算法
      // 目前返回模拟数据
      const hotTokens = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `HotToken${i + 1}`,
        symbol: `HOT${i + 1}`,
        price: (Math.random() * 100).toFixed(4),
        change24h: (Math.random() * 50 - 25).toFixed(2),
        volume24h: (Math.random() * 500000).toFixed(0),
        socialScore: Math.floor(Math.random() * 100),
        trend: Math.random() > 0.5 ? 'up' : 'down',
        detectedAt: Date.now(),
      }));

      logger.debug('HotspotIPC', `获取热点代币: ${hotTokens.length} 个`);

      return {
        success: true,
        data: hotTokens
      };
    } catch (error: any) {
      logger.error('HotspotIPC', '获取热点代币失败', error);
      errorHandler.handleError(error, ErrorCategory.UNKNOWN, 'Get Hot Tokens');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取趋势数据
   */
  ipcMain.handle('hotspot:getTrending', async () => {
    try {
      logger.debug('HotspotIPC', '获取趋势数据');

      // 这里应该分析社交媒体趋势
      // 目前返回模拟数据
      const trending = [
        { topic: 'Meme Coin Season', mentions: 15234, sentiment: 0.75, change: '+23%' },
        { topic: 'DeFi Governance', mentions: 8456, sentiment: 0.62, change: '+15%' },
        { topic: 'Layer 2 Solutions', mentions: 6789, sentiment: 0.58, change: '+8%' },
        { topic: 'NFT Gaming', mentions: 5432, sentiment: 0.45, change: '-5%' },
        { topic: 'Cross-chain Bridges', mentions: 4321, sentiment: 0.52, change: '+2%' },
      ];

      logger.debug('HotspotIPC', `获取趋势数据: ${trending.length} 个话题`);

      return {
        success: true,
        data: trending
      };
    } catch (error: any) {
      logger.error('HotspotIPC', '获取趋势数据失败', error);
      errorHandler.handleError(error, ErrorCategory.UNKNOWN, 'Get Trending Data');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 添加热点监控
   */
  ipcMain.handle('hotspot:addMonitor', async (_event, token: string) => {
    try {
      logger.info('HotspotIPC', `添加热点监控: ${token}`);

      if (!token) {
        throw new Error('代币符号不能为空');
      }

      const db = getDatabase();

      const result = db.prepare(`
        INSERT INTO hotspot_monitors (token, enabled, created_at)
        VALUES (?, 1, ?)
      `).run(token, Date.now());

      logger.info('HotspotIPC', `热点监控已添加: ${token}`);

      return {
        success: true,
        data: {
          id: result.lastInsertRowid,
          token: token,
          message: 'Hotspot monitor added',
        }
      };
    } catch (error: any) {
      logger.error('HotspotIPC', `添加热点监控失败: ${token}`, error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Add Hotspot Monitor');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取热点监控列表
   */
  ipcMain.handle('hotspot:getMonitors', async () => {
    try {
      logger.debug('HotspotIPC', '获取热点监控列表');

      const db = getDatabase();

      const monitors = db.prepare(`
        SELECT * FROM hotspot_monitors
        WHERE enabled = 1
        ORDER BY created_at DESC
      `).all();

      logger.debug('HotspotIPC', `获取热点监控: ${monitors.length} 个`);

      return {
        success: true,
        data: monitors
      };
    } catch (error: any) {
      logger.error('HotspotIPC', '获取热点监控列表失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Get Hotspot Monitors');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 移除热点监控
   */
  ipcMain.handle('hotspot:removeMonitor', async (_event, monitorId: number) => {
    try {
      logger.info('HotspotIPC', `移除热点监控: ${monitorId}`);

      const db = getDatabase();

      const result = db.prepare(`
        UPDATE hotspot_monitors
        SET enabled = 0
        WHERE id = ?
      `).run(monitorId);

      if (result.changes === 0) {
        throw new Error('监控不存在');
      }

      logger.info('HotspotIPC', `热点监控已移除: ${monitorId}`);

      return {
        success: true,
        message: 'Hotspot monitor removed'
      };
    } catch (error: any) {
      logger.error('HotspotIPC', `移除热点监控失败: ${monitorId}`, error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Remove Hotspot Monitor');
      return {
        success: false,
        error: error.message
      };
    }
  });

  logger.info('HotspotIPC', '热点监控IPC处理器注册完成');
}

/**
 * 注销热点监控IPC处理器
 */
export function unregisterHotspotHandlers(): void {
  const channels = [
    'hotspot:getTokens',
    'hotspot:getTrending',
    'hotspot:addMonitor',
    'hotspot:getMonitors',
    'hotspot:removeMonitor'
  ];

  channels.forEach(channel => {
    ipcMain.removeHandler(channel);
  });

  logger.info('HotspotIPC', '热点监控IPC处理器已注销');
}

/**
 * 导出的辅助函数（供内部使用）
 */
export async function getHotTokens(): Promise<any[]> {
  // 这里应该调用实际的热点检测算法
  // 目前返回模拟数据
  const hotTokens = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `HotToken${i + 1}`,
    symbol: `HOT${i + 1}`,
    price: (Math.random() * 100).toFixed(4),
    change24h: (Math.random() * 50 - 25).toFixed(2),
    volume24h: (Math.random() * 500000).toFixed(0),
    socialScore: Math.floor(Math.random() * 100),
    trend: Math.random() > 0.5 ? 'up' : 'down',
  }));

  return hotTokens;
}

export async function getTrendingData(): Promise<any[]> {
  // 这里应该分析社交媒体趋势
  // 目前返回模拟数据
  const trending = [
    { topic: 'Meme Coin Season', mentions: 15234, sentiment: 0.75, change: '+23%' },
    { topic: 'DeFi Governance', mentions: 8456, sentiment: 0.62, change: '+15%' },
    { topic: 'Layer 2 Solutions', mentions: 6789, sentiment: 0.58, change: '+8%' },
    { topic: 'NFT Gaming', mentions: 5432, sentiment: 0.45, change: '-5%' },
    { topic: 'Cross-chain Bridges', mentions: 4321, sentiment: 0.52, change: '+2%' },
  ];

  return trending;
}

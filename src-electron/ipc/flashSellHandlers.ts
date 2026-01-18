import { ipcMain } from 'electron';
import { getDatabase } from '../data/database';
import { logger } from '../utils/logger';
import { errorHandler, ErrorCategory } from '../utils/errorHandler';

let sellSettings = {
  maxSlippage: 5,
  minPrice: 0,
  sellStrategy: 'market',
};

/**
 * 注册快速卖出IPC处理器
 */
export function registerFlashSellHandlers(): void {
  logger.info('FlashSellIPC', '注册快速卖出IPC处理器...');

  /**
   * 执行快速卖出
   */
  ipcMain.handle('flashSell:execute', async (_event, params: any) => {
    try {
      logger.info('FlashSellIPC', `执行快速卖出: ${params.amount} ${params.token}`);

      // 验证参数
      if (!params.token || !params.amount) {
        throw new Error('缺少必填参数: token, amount');
      }

      // 这里应该执行实际的卖出操作
      // 目前返回模拟数据
      const sellResult = {
        transactionId: `0x${Math.random().toString(16).substring(2, 66)}`,
        soldAmount: params.amount,
        receivedAmount: (parseFloat(params.amount) * Math.random()).toFixed(4),
        slippage: (Math.random() * 2).toFixed(2),
        status: 'completed',
        timestamp: Date.now(),
      };

      // 记录到数据库
      const db = getDatabase();
      db.prepare(`
        INSERT INTO flash_sell_history (token, amount, received, transaction_id, slippage, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        params.token,
        params.amount,
        sellResult.receivedAmount,
        sellResult.transactionId,
        sellResult.slippage,
        Date.now()
      );

      logger.info('FlashSellIPC', `快速卖出完成: ${sellResult.transactionId}`);

      return {
        success: true,
        data: sellResult
      };
    } catch (error: any) {
      logger.error('FlashSellIPC', '执行快速卖出失败', error);
      errorHandler.handleError(error, ErrorCategory.TRANSACTION, 'Execute Flash Sell');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取卖出设置
   */
  ipcMain.handle('flashSell:getSettings', async () => {
    try {
      logger.debug('FlashSellIPC', '获取快速卖出设置');

      return {
        success: true,
        data: sellSettings
      };
    } catch (error: any) {
      logger.error('FlashSellIPC', '获取快速卖出设置失败', error);
      errorHandler.handleError(error, ErrorCategory.CONFIGURATION, 'Get Flash Sell Settings');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 更新卖出设置
   */
  ipcMain.handle('flashSell:updateSettings', async (_event, settings: any) => {
    try {
      logger.info('FlashSellIPC', '更新快速卖出设置', settings);

      if (!settings) {
        throw new Error('设置参数无效');
      }

      sellSettings = { ...sellSettings, ...settings };

      // 保存到数据库
      const db = getDatabase();
      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES ('flash_sell_settings', ?, strftime('%s', 'now'))
      `).run(JSON.stringify(sellSettings));

      logger.info('FlashSellIPC', '快速卖出设置已更新');

      return {
        success: true,
        data: sellSettings,
        message: 'Settings updated'
      };
    } catch (error: any) {
      logger.error('FlashSellIPC', '更新快速卖出设置失败', error);
      errorHandler.handleError(error, ErrorCategory.CONFIGURATION, 'Update Flash Sell Settings');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取快速卖出历史
   */
  ipcMain.handle('flashSell:getHistory', async (_event, limit: number = 50) => {
    try {
      logger.debug('FlashSellIPC', '获取快速卖出历史');

      const db = getDatabase();

      const history = db.prepare(`
        SELECT * FROM flash_sell_history
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit);

      logger.debug('FlashSellIPC', `获取快速卖出历史: ${history.length} 条记录`);

      return {
        success: true,
        data: history
      };
    } catch (error: any) {
      logger.error('FlashSellIPC', '获取快速卖出历史失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Get Flash Sell History');
      return {
        success: false,
        error: error.message
      };
    }
  });

  logger.info('FlashSellIPC', '快速卖出IPC处理器注册完成');
}

/**
 * 注销快速卖出IPC处理器
 */
export function unregisterFlashSellHandlers(): void {
  const channels = [
    'flashSell:execute',
    'flashSell:getSettings',
    'flashSell:updateSettings',
    'flashSell:getHistory'
  ];

  channels.forEach(channel => {
    ipcMain.removeHandler(channel);
  });

  logger.info('FlashSellIPC', '快速卖出IPC处理器已注销');
}

/**
 * 导出的辅助函数（供内部使用）
 */
export async function executeQuickSell(params: any): Promise<any> {
  // 这里应该执行实际的卖出操作
  // 目前返回模拟数据
  const sellResult = {
    transactionId: `0x${Math.random().toString(16).substring(2, 66)}`,
    soldAmount: params.amount,
    receivedAmount: (parseFloat(params.amount) * Math.random()).toFixed(4),
    slippage: (Math.random() * 2).toFixed(2),
    status: 'completed',
    timestamp: Date.now(),
  };

  return sellResult;
}

export async function getSellSettings(): Promise<any> {
  return sellSettings;
}

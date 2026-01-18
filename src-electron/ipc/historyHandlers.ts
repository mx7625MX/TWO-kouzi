import { ipcMain } from 'electron';
import { getDatabase } from '../data/database';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { errorHandler, ErrorCategory } from '../utils/errorHandler';

/**
 * 注册交易历史IPC处理器
 */
export function registerHistoryHandlers(): void {
  logger.info('HistoryIPC', '注册交易历史IPC处理器...');

  /**
   * 获取交易历史
   */
  ipcMain.handle('history:getTransactions', async (_event, filters?: any) => {
    try {
      logger.debug('HistoryIPC', '获取交易历史', filters);

      const db = getDatabase();

      let query = 'SELECT * FROM transactions';
      const params: any[] = [];

      if (filters?.chain) {
        query += ' WHERE chain = ?';
        params.push(filters.chain);
      }

      if (filters?.walletId) {
        query += params.length > 0 ? ' AND wallet_id = ?' : ' WHERE wallet_id = ?';
        params.push(filters.walletId);
      }

      if (filters?.type) {
        query += params.length > 0 ? ' AND type = ?' : ' WHERE type = ?';
        params.push(filters.type);
      }

      query += ' ORDER BY created_at DESC LIMIT 100';

      const transactions = db.prepare(query).all(...params);

      logger.debug('HistoryIPC', `获取交易历史: ${transactions.length} 条记录`);

      return {
        success: true,
        data: transactions
      };
    } catch (error: any) {
      logger.error('HistoryIPC', '获取交易历史失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Get Transactions');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 导出交易记录
   */
  ipcMain.handle('history:export', async (_event, format: string) => {
    try {
      logger.info('HistoryIPC', `导出交易记录: ${format} 格式`);

      if (!format || !['csv', 'json'].includes(format)) {
        throw new Error('不支持的导出格式');
      }

      const db = getDatabase();

      const transactions = db.prepare(`
        SELECT * FROM transactions
        ORDER BY created_at DESC
      `).all();

      const exportDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const timestamp = Date.now();
      let filePath: string;

      if (format === 'csv') {
        filePath = path.join(exportDir, `transactions_${timestamp}.csv`);
        if (transactions.length > 0) {
          const headers = Object.keys(transactions[0] as any).join(',');
          const rows = transactions.map((t: any) => Object.values(t).map((v: any) => `"${v}"`).join(','));
          fs.writeFileSync(filePath, [headers, ...rows].join('\n'));
        } else {
          fs.writeFileSync(filePath, '');
        }
      } else {
        filePath = path.join(exportDir, `transactions_${timestamp}.json`);
        fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2));
      }

      logger.info('HistoryIPC', `交易记录已导出: ${filePath}`);

      return {
        success: true,
        data: {
          filePath: filePath,
          recordCount: transactions.length,
          format: format,
          exportedAt: timestamp,
        }
      };
    } catch (error: any) {
      logger.error('HistoryIPC', '导出交易记录失败', error);
      errorHandler.handleError(error, ErrorCategory.UNKNOWN, 'Export Transactions');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 清除交易历史
   */
  ipcMain.handle('history:clear', async (_event, beforeDate?: number) => {
    try {
      logger.info('HistoryIPC', '清除交易历史');

      const db = getDatabase();

      let result;
      if (beforeDate) {
        result = db.prepare(`
          DELETE FROM transactions
          WHERE created_at < ?
        `).run(beforeDate);
      } else {
        result = db.prepare('DELETE FROM transactions').run();
      }

      logger.info('HistoryIPC', `已清除 ${result.changes} 条交易记录`);

      return {
        success: true,
        data: {
          deleted: result.changes
        }
      };
    } catch (error: any) {
      logger.error('HistoryIPC', '清除交易历史失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Clear History');
      return {
        success: false,
        error: error.message
      };
    }
  });

  logger.info('HistoryIPC', '交易历史IPC处理器注册完成');
}

/**
 * 注销交易历史IPC处理器
 */
export function unregisterHistoryHandlers(): void {
  const channels = [
    'history:getTransactions',
    'history:export',
    'history:clear'
  ];

  channels.forEach(channel => {
    ipcMain.removeHandler(channel);
  });

  logger.info('HistoryIPC', '交易历史IPC处理器已注销');
}

/**
 * 导出的辅助函数（供内部使用）
 */
export async function getTransactions(filters?: any): Promise<any[]> {
  const db = getDatabase();

  let query = 'SELECT * FROM transactions';
  const params: any[] = [];

  if (filters?.chain) {
    query += ' WHERE chain = ?';
    params.push(filters.chain);
  }

  if (filters?.walletId) {
    query += params.length > 0 ? ' AND wallet_id = ?' : ' WHERE wallet_id = ?';
    params.push(filters.walletId);
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const transactions = db.prepare(query).all(...params);

  return transactions;
}

export async function exportTransactions(format: string): Promise<any> {
  const db = getDatabase();

  const transactions = db.prepare(`
    SELECT * FROM transactions
    ORDER BY created_at DESC
  `).all();

  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = Date.now();
  let filePath: string;

  if (format === 'csv') {
    filePath = path.join(exportDir, `transactions_${timestamp}.csv`);
    const headers = Object.keys(transactions[0] || {}).join(',');
    const rows = transactions.map((t: any) => Object.values(t).join(','));
    fs.writeFileSync(filePath, [headers, ...rows].join('\n'));
  } else {
    filePath = path.join(exportDir, `transactions_${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2));
  }

  return {
    filePath: filePath,
    recordCount: transactions.length,
    format: format,
    exportedAt: timestamp,
  };
}

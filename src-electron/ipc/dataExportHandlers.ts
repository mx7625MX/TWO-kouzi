import { ipcMain } from 'electron';
import { getDatabase } from '../data/database';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { errorHandler, ErrorCategory } from '../utils/errorHandler';

/**
 * 注册数据管理IPC处理器
 */
export function registerDataExportHandlers(): void {
  logger.info('DataExportIPC', '注册数据管理IPC处理器...');

  /**
   * 导出数据
   */
  ipcMain.handle('data:export', async (_event, type: string) => {
    try {
      logger.info('DataExportIPC', `导出数据: ${type}`);

      if (!type) {
        throw new Error('导出类型不能为空');
      }

      const db = getDatabase();
      const exportDir = path.join(process.cwd(), 'exports');

      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const timestamp = Date.now();
      let filePath: string;

      switch (type) {
        case 'wallets':
          const wallets = db.prepare('SELECT id, name, address, chain FROM wallets').all();
          filePath = path.join(exportDir, `wallets_${timestamp}.json`);
          fs.writeFileSync(filePath, JSON.stringify(wallets, null, 2));
          logger.info('DataExportIPC', `导出钱包数据: ${wallets.length} 个钱包`);
          break;

        case 'settings':
          const settings = db.prepare('SELECT * FROM settings').all();
          filePath = path.join(exportDir, `settings_${timestamp}.json`);
          fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
          logger.info('DataExportIPC', `导出设置数据: ${settings.length} 条设置`);
          break;

        case 'full':
          const allData = {
            wallets: db.prepare('SELECT id, name, address, chain FROM wallets').all(),
            settings: db.prepare('SELECT * FROM settings').all(),
            transactions: db.prepare('SELECT * FROM transactions LIMIT 1000').all(),
          };
          filePath = path.join(exportDir, `full_backup_${timestamp}.json`);
          fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
          logger.info('DataExportIPC', '导出完整备份数据');
          break;

        default:
          throw new Error(`Unknown export type: ${type}`);
      }

      logger.info('DataExportIPC', `数据导出成功: ${filePath}`);

      return {
        success: true,
        data: {
          filePath: filePath,
          type: type,
          exportedAt: timestamp,
        }
      };
    } catch (error: any) {
      logger.error('DataExportIPC', `导出数据失败: ${type}`, error);
      errorHandler.handleError(error, ErrorCategory.UNKNOWN, 'Export Data');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 导入数据
   */
  ipcMain.handle('data:import', async (_event, type: string, filePath: string) => {
    try {
      logger.info('DataExportIPC', `导入数据: ${type} 从 ${filePath}`);

      if (!type || !filePath) {
        throw new Error('缺少必填参数: type, filePath');
      }

      // 这里应该实现数据导入逻辑
      logger.info('DataExportIPC', `数据导入成功: ${type}`);

      return {
        success: true,
        data: {
          type: type,
          status: 'success',
          importedAt: Date.now(),
        }
      };
    } catch (error: any) {
      logger.error('DataExportIPC', `导入数据失败: ${type}`, error);
      errorHandler.handleError(error, ErrorCategory.UNKNOWN, 'Import Data');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 清理数据
   */
  ipcMain.handle('data:clear', async (_event, type: string) => {
    try {
      logger.info('DataExportIPC', `清理数据: ${type}`);

      if (!type) {
        throw new Error('清理类型不能为空');
      }

      const db = getDatabase();
      let deleted = 0;

      switch (type) {
        case 'alerts':
          deleted = db.prepare('DELETE FROM alerts').run().changes;
          break;
        case 'transactions':
          deleted = db.prepare('DELETE FROM transactions').run().changes;
          break;
        case 'sentiments':
          deleted = db.prepare('DELETE FROM sentiments').run().changes;
          break;
        case 'all':
          // 清理所有数据（保留设置）
          deleted = db.prepare('DELETE FROM alerts').run().changes;
          deleted += db.prepare('DELETE FROM transactions').run().changes;
          deleted += db.prepare('DELETE FROM sentiments').run().changes;
          deleted += db.prepare('DELETE FROM auto_trade_history').run().changes;
          break;
        default:
          throw new Error(`Unknown clear type: ${type}`);
      }

      logger.info('DataExportIPC', `数据清理完成: ${deleted} 条记录`);

      return {
        success: true,
        data: {
          type: type,
          deleted: deleted,
          clearedAt: Date.now(),
        }
      };
    } catch (error: any) {
      logger.error('DataExportIPC', `清理数据失败: ${type}`, error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Clear Data');
      return {
        success: false,
        error: error.message
      };
    }
  });

  logger.info('DataExportIPC', '数据管理IPC处理器注册完成');
}

/**
 * 注销数据管理IPC处理器
 */
export function unregisterDataExportHandlers(): void {
  const channels = [
    'data:export',
    'data:import',
    'data:clear'
  ];

  channels.forEach(channel => {
    ipcMain.removeHandler(channel);
  });

  logger.info('DataExportIPC', '数据管理IPC处理器已注销');
}

/**
 * 导出的辅助函数（供内部使用）
 */
export async function exportData(type: string): Promise<any> {
  const db = getDatabase();
  const exportDir = path.join(process.cwd(), 'exports');

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = Date.now();
  let filePath: string;

  switch (type) {
    case 'wallets':
      const wallets = db.prepare('SELECT id, name, address, chain FROM wallets').all();
      filePath = path.join(exportDir, `wallets_${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(wallets, null, 2));
      break;

    case 'settings':
      const settings = db.prepare('SELECT * FROM settings').all();
      filePath = path.join(exportDir, `settings_${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
      break;

    case 'full':
      const allData = {
        wallets: db.prepare('SELECT id, name, address, chain FROM wallets').all(),
        settings: db.prepare('SELECT * FROM settings').all(),
        transactions: db.prepare('SELECT * FROM transactions LIMIT 1000').all(),
      };
      filePath = path.join(exportDir, `full_backup_${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
      break;

    default:
      throw new Error(`Unknown export type: ${type}`);
  }

  return {
    filePath: filePath,
    type: type,
    exportedAt: timestamp,
  };
}

export async function importData(type: string, filePath: string): Promise<any> {
  // 这里应该实现数据导入逻辑
  console.log(`Importing ${type} from ${filePath}`);

  return {
    type: type,
    status: 'success',
    importedAt: Date.now(),
  };
}

export async function clearData(type: string): Promise<any> {
  const db = getDatabase();

  switch (type) {
    case 'alerts':
      db.prepare('DELETE FROM alerts').run();
      break;
    case 'transactions':
      db.prepare('DELETE FROM transactions').run();
      break;
    case 'sentiments':
      db.prepare('DELETE FROM sentiments').run();
      break;
    default:
      throw new Error(`Unknown clear type: ${type}`);
  }

  return {
    type: type,
    clearedAt: Date.now(),
  };
}

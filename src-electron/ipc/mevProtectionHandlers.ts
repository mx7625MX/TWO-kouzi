import { ipcMain } from 'electron';
import { getDatabase } from '../data/database';
import { logger } from '../utils/logger';
import { errorHandler, ErrorCategory } from '../utils/errorHandler';

let mevProtectionEnabled = true;

/**
 * 注册MEV防护IPC处理器
 */
export function registerMEVHandlers(): void {
  logger.info('MEVIPC', '注册MEV防护IPC处理器...');

  /**
   * 启用/禁用MEV防护
   */
  ipcMain.handle('mev:enable', async (_event, enabled: boolean) => {
    try {
      logger.info('MEVIPC', `${enabled ? '启用' : '禁用'}MEV防护`);

      mevProtectionEnabled = enabled;

      // 更新数据库设置
      const db = getDatabase();
      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES ('mev_protection_enabled', ?, strftime('%s', 'now'))
      `).run(enabled ? 'true' : 'false');

      logger.info('MEVIPC', `MEV防护已${enabled ? '启用' : '禁用'}`);

      return {
        success: true,
        enabled: enabled,
        message: enabled ? 'MEV protection enabled' : 'MEV protection disabled',
      };
    } catch (error: any) {
      logger.error('MEVIPC', `${enabled ? '启用' : '禁用'}MEV防护失败`, error);
      errorHandler.handleError(error, ErrorCategory.CONFIGURATION, 'Toggle MEV Protection');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取防护状态
   */
  ipcMain.handle('mev:getStatus', async () => {
    try {
      logger.debug('MEVIPC', '获取MEV防护状态');

      return {
        success: true,
        data: {
          enabled: mevProtectionEnabled,
          flashbotsEnabled: true,
          jitoEnabled: true,
          lastScan: Date.now(),
        }
      };
    } catch (error: any) {
      logger.error('MEVIPC', '获取MEV防护状态失败', error);
      errorHandler.handleError(error, ErrorCategory.UNKNOWN, 'Get MEV Status');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取攻击统计
   */
  ipcMain.handle('mev:getAttackStats', async () => {
    try {
      logger.debug('MEVIPC', '获取MEV攻击统计');

      const db = getDatabase();

      const stats = db.prepare(`
        SELECT attack_type, blocked, detected_at
        FROM mev_protection_stats
        ORDER BY detected_at DESC
        LIMIT 100
      `).all();

      // 按攻击类型统计
      const summary = stats.reduce((acc: any, stat: any) => {
        acc[stat.attack_type] = (acc[stat.attack_type] || 0) + stat.blocked;
        return acc;
      }, {});

      const result = {
        totalBlocked: stats.reduce((sum: number, stat: any) => sum + stat.blocked, 0),
        byType: summary,
        recentAttacks: stats.slice(0, 10),
      };

      logger.info('MEVIPC', `获取MEV攻击统计: 共阻止 ${result.totalBlocked} 次攻击`);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      logger.error('MEVIPC', '获取MEV攻击统计失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Get MEV Attack Stats');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取MEV防护日志
   */
  ipcMain.handle('mev:getLogs', async (_event, limit: number = 50) => {
    try {
      logger.debug('MEVIPC', '获取MEV防护日志');

      const db = getDatabase();

      const logs = db.prepare(`
        SELECT * FROM mev_protection_logs
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(limit);

      return {
        success: true,
        data: logs
      };
    } catch (error: any) {
      logger.error('MEVIPC', '获取MEV防护日志失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Get MEV Logs');
      return {
        success: false,
        error: error.message
      };
    }
  });

  logger.info('MEVIPC', 'MEV防护IPC处理器注册完成');
}

/**
 * 注销MEV防护IPC处理器
 */
export function unregisterMEVHandlers(): void {
  const channels = [
    'mev:enable',
    'mev:getStatus',
    'mev:getAttackStats',
    'mev:getLogs'
  ];

  channels.forEach(channel => {
    ipcMain.removeHandler(channel);
  });

  logger.info('MEVIPC', 'MEV防护IPC处理器已注销');
}

/**
 * 导出的辅助函数（供内部使用）
 */
export async function enableProtection(enabled: boolean): Promise<any> {
  mevProtectionEnabled = enabled;

  // 更新数据库设置
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES ('mev_protection_enabled', ?, strftime('%s', 'now'))
  `).run(enabled ? 'true' : 'false');

  return {
    enabled: enabled,
    message: enabled ? 'MEV protection enabled' : 'MEV protection disabled',
  };
}

export async function getProtectionStatus(): Promise<any> {
  return {
    enabled: mevProtectionEnabled,
    flashbotsEnabled: true,
    jitoEnabled: true,
    lastScan: Date.now(),
  };
}

export async function getAttackStats(): Promise<any> {
  const db = getDatabase();

  const stats = db.prepare(`
    SELECT attack_type, blocked, detected_at
    FROM mev_protection_stats
    ORDER BY detected_at DESC
    LIMIT 100
  `).all();

  // 按攻击类型统计
  const summary = stats.reduce((acc: any, stat: any) => {
    acc[stat.attack_type] = (acc[stat.attack_type] || 0) + stat.blocked;
    return acc;
  }, {});

  return {
    totalBlocked: stats.reduce((sum: number, stat: any) => sum + stat.blocked, 0),
    byType: summary,
    recentAttacks: stats.slice(0, 10),
  };
}

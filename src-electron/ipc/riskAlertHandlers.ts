import { ipcMain } from 'electron';
import { getDatabase } from '../data/database';
import { logger } from '../utils/logger';
import { errorHandler, ErrorCategory } from '../utils/errorHandler';

/**
 * 注册风险预警IPC处理器
 */
export function registerRiskAlertHandlers(): void {
  logger.info('RiskAlertIPC', '注册风险预警IPC处理器...');

  /**
   * 获取所有预警
   */
  ipcMain.handle('risk:getAlerts', async () => {
    try {
      logger.debug('RiskAlertIPC', '获取风险预警列表');

      const db = getDatabase();

      const alerts = db.prepare(`
        SELECT * FROM alerts
        ORDER BY created_at DESC
        LIMIT 100
      `).all();

      logger.debug('RiskAlertIPC', `获取预警列表: ${alerts.length} 条`);

      return {
        success: true,
        data: alerts
      };
    } catch (error: any) {
      logger.error('RiskAlertIPC', '获取风险预警失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Get Risk Alerts');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 设置预警规则
   */
  ipcMain.handle('risk:setRule', async (_event, rule: any) => {
    try {
      logger.info('RiskAlertIPC', '设置预警规则', rule);

      if (!rule || !rule.type) {
        throw new Error('规则参数无效');
      }

      // 这里应该实现预警规则的设置和监控
      const db = getDatabase();

      const result = db.prepare(`
        INSERT INTO alert_rules (type, threshold, enabled, created_at)
        VALUES (?, ?, ?, ?)
      `).run(rule.type, rule.threshold, rule.enabled !== false, Date.now());

      logger.info('RiskAlertIPC', `预警规则已创建: ID ${result.lastInsertRowid}`);

      return {
        success: true,
        data: {
          ruleId: result.lastInsertRowid,
          rule: rule,
          message: 'Alert rule created',
        }
      };
    } catch (error: any) {
      logger.error('RiskAlertIPC', '设置预警规则失败', error);
      errorHandler.handleError(error, ErrorCategory.CONFIGURATION, 'Set Alert Rule');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 清除预警
   */
  ipcMain.handle('risk:clearAlert', async (_event, alertId: string) => {
    try {
      logger.info('RiskAlertIPC', `清除预警: ${alertId}`);

      const db = getDatabase();

      const result = db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(alertId);

      if (result.changes === 0) {
        throw new Error('预警不存在或已清除');
      }

      logger.info('RiskAlertIPC', `预警已清除: ${alertId}`);

      return {
        success: true,
        message: 'Alert cleared'
      };
    } catch (error: any) {
      logger.error('RiskAlertIPC', `清除预警失败: ${alertId}`, error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Clear Alert');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取风险统计
   */
  ipcMain.handle('risk:getStats', async () => {
    try {
      logger.debug('RiskAlertIPC', '获取风险统计');

      const db = getDatabase();

      const stats = db.prepare(`
        SELECT
          COUNT(*) as total_alerts,
          SUM(CASE WHEN level = 'high' THEN 1 ELSE 0 END) as high_alerts,
          SUM(CASE WHEN level = 'medium' THEN 1 ELSE 0 END) as medium_alerts,
          SUM(CASE WHEN level = 'low' THEN 1 ELSE 0 END) as low_alerts,
          SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_alerts
        FROM alerts
        WHERE created_at >= strftime('%s', 'now') - 86400
      `).get();

      logger.debug('RiskAlertIPC', `风险统计: ${JSON.stringify(stats)}`);

      return {
        success: true,
        data: stats
      };
    } catch (error: any) {
      logger.error('RiskAlertIPC', '获取风险统计失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Get Risk Stats');
      return {
        success: false,
        error: error.message
      };
    }
  });

  logger.info('RiskAlertIPC', '风险预警IPC处理器注册完成');
}

/**
 * 注销风险预警IPC处理器
 */
export function unregisterRiskAlertHandlers(): void {
  const channels = [
    'risk:getAlerts',
    'risk:setRule',
    'risk:clearAlert',
    'risk:getStats'
  ];

  channels.forEach(channel => {
    ipcMain.removeHandler(channel);
  });

  logger.info('RiskAlertIPC', '风险预警IPC处理器已注销');
}

/**
 * 导出的辅助函数（供内部使用）
 */
export async function getAlerts(): Promise<any[]> {
  const db = getDatabase();

  const alerts = db.prepare(`
    SELECT * FROM alerts
    ORDER BY created_at DESC
    LIMIT 100
  `).all();

  return alerts;
}

export async function setAlertRule(rule: any): Promise<any> {
  // 这里应该实现预警规则的设置和监控
  console.log('Setting alert rule:', rule);

  return {
    ruleId: Date.now().toString(),
    rule: rule,
    message: 'Alert rule created',
  };
}

export async function clearAlert(alertId: string): Promise<void> {
  const db = getDatabase();

  db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(alertId);

  console.log(`Alert ${alertId} cleared`);
}

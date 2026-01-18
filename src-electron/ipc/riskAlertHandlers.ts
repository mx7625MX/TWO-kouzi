import { getDatabase } from '../data/database';

/**
 * 获取所有预警
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

/**
 * 设置预警规则
 */
export async function setAlertRule(rule: any): Promise<any> {
  // 这里应该实现预警规则的设置和监控
  console.log('Setting alert rule:', rule);

  return {
    ruleId: Date.now().toString(),
    rule: rule,
    message: 'Alert rule created',
  };
}

/**
 * 清除预警
 */
export async function clearAlert(alertId: string): Promise<void> {
  const db = getDatabase();

  db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(alertId);

  console.log(`Alert ${alertId} cleared`);
}

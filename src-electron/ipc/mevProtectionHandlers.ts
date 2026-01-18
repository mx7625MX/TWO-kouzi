import { getDatabase } from '../data/database';

let mevProtectionEnabled = true;

/**
 * 启用/禁用MEV防护
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

/**
 * 获取防护状态
 */
export async function getProtectionStatus(): Promise<any> {
  return {
    enabled: mevProtectionEnabled,
    flashbotsEnabled: true,
    jitoEnabled: true,
    lastScan: Date.now(),
  };
}

/**
 * 获取攻击统计
 */
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

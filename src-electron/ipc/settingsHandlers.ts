import { getDatabase } from '../data/database';

/**
 * 获取所有设置
 */
export async function getSettings(): Promise<any> {
  const db = getDatabase();

  const settings = db.prepare('SELECT * FROM settings').all();

  // 转换为对象
  const settingsObj: any = {};
  for (const setting of settings) {
    settingsObj[setting.key] = setting.value;
  }

  return settingsObj;
}

/**
 * 更新设置
 */
export async function updateSettings(settings: any): Promise<any> {
  const db = getDatabase();

  const updateSetting = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, strftime('%s', 'now'))
  `);

  const updateMany = db.transaction((settings: any) => {
    for (const [key, value] of Object.entries(settings)) {
      updateSetting.run(key, String(value));
    }
  });

  updateMany(settings);

  return {
    updated: Object.keys(settings),
    updatedAt: Date.now(),
  };
}

/**
 * 重置设置
 */
export async function resetSettings(): Promise<any> {
  const db = getDatabase();

  // 删除所有设置
  db.prepare('DELETE FROM settings').run();

  // 插入默认设置
  const defaultSettings = [
    { key: 'theme', value: 'dark' },
    { key: 'language', value: 'zh-CN' },
    { key: 'auto_trading_enabled', value: 'false' },
    { key: 'mev_protection_enabled', value: 'true' },
  ];

  const insertSetting = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?)'
  );

  const insertMany = db.transaction((settings) => {
    for (const setting of settings) {
      insertSetting.run(setting.key, setting.value);
    }
  });

  insertMany(defaultSettings);

  return {
    message: 'Settings reset to default',
    resetAt: Date.now(),
  };
}

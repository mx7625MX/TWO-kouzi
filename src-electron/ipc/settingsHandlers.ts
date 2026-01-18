import { ipcMain } from 'electron';
import { getDatabase } from '../data/database';
import { logger } from '../utils/logger';
import { errorHandler, ErrorCategory } from '../utils/errorHandler';

/**
 * 注册设置IPC处理器
 */
export function registerSettingsHandlers(): void {
  logger.info('SettingsIPC', '注册设置IPC处理器...');

  /**
   * 获取所有设置
   */
  ipcMain.handle('settings:getAll', async () => {
    try {
      logger.debug('SettingsIPC', '获取所有设置');

      const db = getDatabase();

      const settings = db.prepare('SELECT * FROM settings').all();

      // 转换为对象
      const settingsObj: any = {};
      for (const setting of settings as any[]) {
        settingsObj[setting.key] = setting.value;
      }

      logger.debug('SettingsIPC', `获取设置: ${Object.keys(settingsObj).length} 条`);

      return {
        success: true,
        data: settingsObj
      };
    } catch (error: any) {
      logger.error('SettingsIPC', '获取设置失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Get Settings');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取单个设置
   */
  ipcMain.handle('settings:get', async (_event, key: string) => {
    try {
      logger.debug('SettingsIPC', `获取设置: ${key}`);

      if (!key) {
        throw new Error('设置键不能为空');
      }

      const db = getDatabase();

      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;

      const value = setting ? setting.value : null;

      logger.debug('SettingsIPC', `获取设置: ${key} = ${value}`);

      return {
        success: true,
        data: {
          key: key,
          value: value
        }
      };
    } catch (error: any) {
      logger.error('SettingsIPC', `获取设置失败: ${key}`, error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Get Setting');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 更新设置
   */
  ipcMain.handle('settings:update', async (_event, settings: any) => {
    try {
      logger.info('SettingsIPC', '更新设置', settings);

      if (!settings || typeof settings !== 'object') {
        throw new Error('设置参数无效');
      }

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

      logger.info('SettingsIPC', `设置已更新: ${Object.keys(settings).length} 条`);

      return {
        success: true,
        data: {
          updated: Object.keys(settings),
          updatedAt: Date.now(),
        }
      };
    } catch (error: any) {
      logger.error('SettingsIPC', '更新设置失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Update Settings');
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 重置设置
   */
  ipcMain.handle('settings:reset', async () => {
    try {
      logger.info('SettingsIPC', '重置设置为默认值');

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

      const insertMany = db.transaction((settings: any[]) => {
        for (const setting of settings) {
          insertSetting.run(setting.key, setting.value);
        }
      });

      insertMany(defaultSettings);

      logger.info('SettingsIPC', '设置已重置为默认值');

      return {
        success: true,
        data: {
          message: 'Settings reset to default',
          resetAt: Date.now(),
        }
      };
    } catch (error: any) {
      logger.error('SettingsIPC', '重置设置失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Reset Settings');
      return {
        success: false,
        error: error.message
      };
    }
  });

  logger.info('SettingsIPC', '设置IPC处理器注册完成');
}

/**
 * 注销设置IPC处理器
 */
export function unregisterSettingsHandlers(): void {
  const channels = [
    'settings:getAll',
    'settings:get',
    'settings:update',
    'settings:reset'
  ];

  channels.forEach(channel => {
    ipcMain.removeHandler(channel);
  });

  logger.info('SettingsIPC', '设置IPC处理器已注销');
}

/**
 * 导出的辅助函数（供内部使用）
 */
export async function getSettings(): Promise<any> {
  const db = getDatabase();

  const settings = db.prepare('SELECT * FROM settings').all();

  // 转换为对象
  const settingsObj: any = {};
  for (const setting of settings as any[]) {
    settingsObj[setting.key] = setting.value;
  }

  return settingsObj;
}

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

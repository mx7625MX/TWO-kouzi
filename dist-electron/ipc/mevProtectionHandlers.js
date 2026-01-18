"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMEVHandlers = registerMEVHandlers;
exports.unregisterMEVHandlers = unregisterMEVHandlers;
exports.enableProtection = enableProtection;
exports.getProtectionStatus = getProtectionStatus;
exports.getAttackStats = getAttackStats;
const electron_1 = require("electron");
const database_1 = require("../data/database");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
let mevProtectionEnabled = true;
/**
 * 注册MEV防护IPC处理器
 */
function registerMEVHandlers() {
    logger_1.logger.info('MEVIPC', '注册MEV防护IPC处理器...');
    /**
     * 启用/禁用MEV防护
     */
    electron_1.ipcMain.handle('mev:enable', async (_event, enabled) => {
        try {
            logger_1.logger.info('MEVIPC', `${enabled ? '启用' : '禁用'}MEV防护`);
            mevProtectionEnabled = enabled;
            // 更新数据库设置
            const db = (0, database_1.getDatabase)();
            db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES ('mev_protection_enabled', ?, strftime('%s', 'now'))
      `).run(enabled ? 'true' : 'false');
            logger_1.logger.info('MEVIPC', `MEV防护已${enabled ? '启用' : '禁用'}`);
            return {
                success: true,
                enabled: enabled,
                message: enabled ? 'MEV protection enabled' : 'MEV protection disabled',
            };
        }
        catch (error) {
            logger_1.logger.error('MEVIPC', `${enabled ? '启用' : '禁用'}MEV防护失败`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.CONFIGURATION, 'Toggle MEV Protection');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取防护状态
     */
    electron_1.ipcMain.handle('mev:getStatus', async () => {
        try {
            logger_1.logger.debug('MEVIPC', '获取MEV防护状态');
            return {
                success: true,
                data: {
                    enabled: mevProtectionEnabled,
                    flashbotsEnabled: true,
                    jitoEnabled: true,
                    lastScan: Date.now(),
                }
            };
        }
        catch (error) {
            logger_1.logger.error('MEVIPC', '获取MEV防护状态失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.UNKNOWN, 'Get MEV Status');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取攻击统计
     */
    electron_1.ipcMain.handle('mev:getAttackStats', async () => {
        try {
            logger_1.logger.debug('MEVIPC', '获取MEV攻击统计');
            const db = (0, database_1.getDatabase)();
            const stats = db.prepare(`
        SELECT attack_type, blocked, detected_at
        FROM mev_protection_stats
        ORDER BY detected_at DESC
        LIMIT 100
      `).all();
            // 按攻击类型统计
            const summary = stats.reduce((acc, stat) => {
                acc[stat.attack_type] = (acc[stat.attack_type] || 0) + stat.blocked;
                return acc;
            }, {});
            const result = {
                totalBlocked: stats.reduce((sum, stat) => sum + stat.blocked, 0),
                byType: summary,
                recentAttacks: stats.slice(0, 10),
            };
            logger_1.logger.info('MEVIPC', `获取MEV攻击统计: 共阻止 ${result.totalBlocked} 次攻击`);
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            logger_1.logger.error('MEVIPC', '获取MEV攻击统计失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get MEV Attack Stats');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取MEV防护日志
     */
    electron_1.ipcMain.handle('mev:getLogs', async (_event, limit = 50) => {
        try {
            logger_1.logger.debug('MEVIPC', '获取MEV防护日志');
            const db = (0, database_1.getDatabase)();
            const logs = db.prepare(`
        SELECT * FROM mev_protection_logs
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(limit);
            return {
                success: true,
                data: logs
            };
        }
        catch (error) {
            logger_1.logger.error('MEVIPC', '获取MEV防护日志失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get MEV Logs');
            return {
                success: false,
                error: error.message
            };
        }
    });
    logger_1.logger.info('MEVIPC', 'MEV防护IPC处理器注册完成');
}
/**
 * 注销MEV防护IPC处理器
 */
function unregisterMEVHandlers() {
    const channels = [
        'mev:enable',
        'mev:getStatus',
        'mev:getAttackStats',
        'mev:getLogs'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    logger_1.logger.info('MEVIPC', 'MEV防护IPC处理器已注销');
}
/**
 * 导出的辅助函数（供内部使用）
 */
async function enableProtection(enabled) {
    mevProtectionEnabled = enabled;
    // 更新数据库设置
    const db = (0, database_1.getDatabase)();
    db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES ('mev_protection_enabled', ?, strftime('%s', 'now'))
  `).run(enabled ? 'true' : 'false');
    return {
        enabled: enabled,
        message: enabled ? 'MEV protection enabled' : 'MEV protection disabled',
    };
}
async function getProtectionStatus() {
    return {
        enabled: mevProtectionEnabled,
        flashbotsEnabled: true,
        jitoEnabled: true,
        lastScan: Date.now(),
    };
}
async function getAttackStats() {
    const db = (0, database_1.getDatabase)();
    const stats = db.prepare(`
    SELECT attack_type, blocked, detected_at
    FROM mev_protection_stats
    ORDER BY detected_at DESC
    LIMIT 100
  `).all();
    // 按攻击类型统计
    const summary = stats.reduce((acc, stat) => {
        acc[stat.attack_type] = (acc[stat.attack_type] || 0) + stat.blocked;
        return acc;
    }, {});
    return {
        totalBlocked: stats.reduce((sum, stat) => sum + stat.blocked, 0),
        byType: summary,
        recentAttacks: stats.slice(0, 10),
    };
}

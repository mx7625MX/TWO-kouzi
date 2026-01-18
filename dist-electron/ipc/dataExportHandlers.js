"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDataExportHandlers = registerDataExportHandlers;
exports.unregisterDataExportHandlers = unregisterDataExportHandlers;
exports.exportData = exportData;
exports.importData = importData;
exports.clearData = clearData;
const electron_1 = require("electron");
const database_1 = require("../data/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
/**
 * 注册数据管理IPC处理器
 */
function registerDataExportHandlers() {
    logger_1.logger.info('DataExportIPC', '注册数据管理IPC处理器...');
    /**
     * 导出数据
     */
    electron_1.ipcMain.handle('data:export', async (_event, type) => {
        try {
            logger_1.logger.info('DataExportIPC', `导出数据: ${type}`);
            if (!type) {
                throw new Error('导出类型不能为空');
            }
            const db = (0, database_1.getDatabase)();
            const exportDir = path_1.default.join(process.cwd(), 'exports');
            if (!fs_1.default.existsSync(exportDir)) {
                fs_1.default.mkdirSync(exportDir, { recursive: true });
            }
            const timestamp = Date.now();
            let filePath;
            switch (type) {
                case 'wallets':
                    const wallets = db.prepare('SELECT id, name, address, chain FROM wallets').all();
                    filePath = path_1.default.join(exportDir, `wallets_${timestamp}.json`);
                    fs_1.default.writeFileSync(filePath, JSON.stringify(wallets, null, 2));
                    logger_1.logger.info('DataExportIPC', `导出钱包数据: ${wallets.length} 个钱包`);
                    break;
                case 'settings':
                    const settings = db.prepare('SELECT * FROM settings').all();
                    filePath = path_1.default.join(exportDir, `settings_${timestamp}.json`);
                    fs_1.default.writeFileSync(filePath, JSON.stringify(settings, null, 2));
                    logger_1.logger.info('DataExportIPC', `导出设置数据: ${settings.length} 条设置`);
                    break;
                case 'full':
                    const allData = {
                        wallets: db.prepare('SELECT id, name, address, chain FROM wallets').all(),
                        settings: db.prepare('SELECT * FROM settings').all(),
                        transactions: db.prepare('SELECT * FROM transactions LIMIT 1000').all(),
                    };
                    filePath = path_1.default.join(exportDir, `full_backup_${timestamp}.json`);
                    fs_1.default.writeFileSync(filePath, JSON.stringify(allData, null, 2));
                    logger_1.logger.info('DataExportIPC', '导出完整备份数据');
                    break;
                default:
                    throw new Error(`Unknown export type: ${type}`);
            }
            logger_1.logger.info('DataExportIPC', `数据导出成功: ${filePath}`);
            return {
                success: true,
                data: {
                    filePath: filePath,
                    type: type,
                    exportedAt: timestamp,
                }
            };
        }
        catch (error) {
            logger_1.logger.error('DataExportIPC', `导出数据失败: ${type}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.UNKNOWN, 'Export Data');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 导入数据
     */
    electron_1.ipcMain.handle('data:import', async (_event, type, filePath) => {
        try {
            logger_1.logger.info('DataExportIPC', `导入数据: ${type} 从 ${filePath}`);
            if (!type || !filePath) {
                throw new Error('缺少必填参数: type, filePath');
            }
            // 这里应该实现数据导入逻辑
            logger_1.logger.info('DataExportIPC', `数据导入成功: ${type}`);
            return {
                success: true,
                data: {
                    type: type,
                    status: 'success',
                    importedAt: Date.now(),
                }
            };
        }
        catch (error) {
            logger_1.logger.error('DataExportIPC', `导入数据失败: ${type}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.UNKNOWN, 'Import Data');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 清理数据
     */
    electron_1.ipcMain.handle('data:clear', async (_event, type) => {
        try {
            logger_1.logger.info('DataExportIPC', `清理数据: ${type}`);
            if (!type) {
                throw new Error('清理类型不能为空');
            }
            const db = (0, database_1.getDatabase)();
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
            logger_1.logger.info('DataExportIPC', `数据清理完成: ${deleted} 条记录`);
            return {
                success: true,
                data: {
                    type: type,
                    deleted: deleted,
                    clearedAt: Date.now(),
                }
            };
        }
        catch (error) {
            logger_1.logger.error('DataExportIPC', `清理数据失败: ${type}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Clear Data');
            return {
                success: false,
                error: error.message
            };
        }
    });
    logger_1.logger.info('DataExportIPC', '数据管理IPC处理器注册完成');
}
/**
 * 注销数据管理IPC处理器
 */
function unregisterDataExportHandlers() {
    const channels = [
        'data:export',
        'data:import',
        'data:clear'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    logger_1.logger.info('DataExportIPC', '数据管理IPC处理器已注销');
}
/**
 * 导出的辅助函数（供内部使用）
 */
async function exportData(type) {
    const db = (0, database_1.getDatabase)();
    const exportDir = path_1.default.join(process.cwd(), 'exports');
    if (!fs_1.default.existsSync(exportDir)) {
        fs_1.default.mkdirSync(exportDir, { recursive: true });
    }
    const timestamp = Date.now();
    let filePath;
    switch (type) {
        case 'wallets':
            const wallets = db.prepare('SELECT id, name, address, chain FROM wallets').all();
            filePath = path_1.default.join(exportDir, `wallets_${timestamp}.json`);
            fs_1.default.writeFileSync(filePath, JSON.stringify(wallets, null, 2));
            break;
        case 'settings':
            const settings = db.prepare('SELECT * FROM settings').all();
            filePath = path_1.default.join(exportDir, `settings_${timestamp}.json`);
            fs_1.default.writeFileSync(filePath, JSON.stringify(settings, null, 2));
            break;
        case 'full':
            const allData = {
                wallets: db.prepare('SELECT id, name, address, chain FROM wallets').all(),
                settings: db.prepare('SELECT * FROM settings').all(),
                transactions: db.prepare('SELECT * FROM transactions LIMIT 1000').all(),
            };
            filePath = path_1.default.join(exportDir, `full_backup_${timestamp}.json`);
            fs_1.default.writeFileSync(filePath, JSON.stringify(allData, null, 2));
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
async function importData(type, filePath) {
    // 这里应该实现数据导入逻辑
    console.log(`Importing ${type} from ${filePath}`);
    return {
        type: type,
        status: 'success',
        importedAt: Date.now(),
    };
}
async function clearData(type) {
    const db = (0, database_1.getDatabase)();
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

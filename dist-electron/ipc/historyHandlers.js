"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHistoryHandlers = registerHistoryHandlers;
exports.unregisterHistoryHandlers = unregisterHistoryHandlers;
exports.getTransactions = getTransactions;
exports.exportTransactions = exportTransactions;
const electron_1 = require("electron");
const database_1 = require("../data/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
/**
 * 注册交易历史IPC处理器
 */
function registerHistoryHandlers() {
    logger_1.logger.info('HistoryIPC', '注册交易历史IPC处理器...');
    /**
     * 获取交易历史
     */
    electron_1.ipcMain.handle('history:getTransactions', async (_event, filters) => {
        try {
            logger_1.logger.debug('HistoryIPC', '获取交易历史', filters);
            const db = (0, database_1.getDatabase)();
            let query = 'SELECT * FROM transactions';
            const params = [];
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
            logger_1.logger.debug('HistoryIPC', `获取交易历史: ${transactions.length} 条记录`);
            return {
                success: true,
                data: transactions
            };
        }
        catch (error) {
            logger_1.logger.error('HistoryIPC', '获取交易历史失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get Transactions');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 导出交易记录
     */
    electron_1.ipcMain.handle('history:export', async (_event, format) => {
        try {
            logger_1.logger.info('HistoryIPC', `导出交易记录: ${format} 格式`);
            if (!format || !['csv', 'json'].includes(format)) {
                throw new Error('不支持的导出格式');
            }
            const db = (0, database_1.getDatabase)();
            const transactions = db.prepare(`
        SELECT * FROM transactions
        ORDER BY created_at DESC
      `).all();
            const exportDir = path_1.default.join(process.cwd(), 'exports');
            if (!fs_1.default.existsSync(exportDir)) {
                fs_1.default.mkdirSync(exportDir, { recursive: true });
            }
            const timestamp = Date.now();
            let filePath;
            if (format === 'csv') {
                filePath = path_1.default.join(exportDir, `transactions_${timestamp}.csv`);
                if (transactions.length > 0) {
                    const headers = Object.keys(transactions[0]).join(',');
                    const rows = transactions.map((t) => Object.values(t).map((v) => `"${v}"`).join(','));
                    fs_1.default.writeFileSync(filePath, [headers, ...rows].join('\n'));
                }
                else {
                    fs_1.default.writeFileSync(filePath, '');
                }
            }
            else {
                filePath = path_1.default.join(exportDir, `transactions_${timestamp}.json`);
                fs_1.default.writeFileSync(filePath, JSON.stringify(transactions, null, 2));
            }
            logger_1.logger.info('HistoryIPC', `交易记录已导出: ${filePath}`);
            return {
                success: true,
                data: {
                    filePath: filePath,
                    recordCount: transactions.length,
                    format: format,
                    exportedAt: timestamp,
                }
            };
        }
        catch (error) {
            logger_1.logger.error('HistoryIPC', '导出交易记录失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.UNKNOWN, 'Export Transactions');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 清除交易历史
     */
    electron_1.ipcMain.handle('history:clear', async (_event, beforeDate) => {
        try {
            logger_1.logger.info('HistoryIPC', '清除交易历史');
            const db = (0, database_1.getDatabase)();
            let result;
            if (beforeDate) {
                result = db.prepare(`
          DELETE FROM transactions
          WHERE created_at < ?
        `).run(beforeDate);
            }
            else {
                result = db.prepare('DELETE FROM transactions').run();
            }
            logger_1.logger.info('HistoryIPC', `已清除 ${result.changes} 条交易记录`);
            return {
                success: true,
                data: {
                    deleted: result.changes
                }
            };
        }
        catch (error) {
            logger_1.logger.error('HistoryIPC', '清除交易历史失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Clear History');
            return {
                success: false,
                error: error.message
            };
        }
    });
    logger_1.logger.info('HistoryIPC', '交易历史IPC处理器注册完成');
}
/**
 * 注销交易历史IPC处理器
 */
function unregisterHistoryHandlers() {
    const channels = [
        'history:getTransactions',
        'history:export',
        'history:clear'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    logger_1.logger.info('HistoryIPC', '交易历史IPC处理器已注销');
}
/**
 * 导出的辅助函数（供内部使用）
 */
async function getTransactions(filters) {
    const db = (0, database_1.getDatabase)();
    let query = 'SELECT * FROM transactions';
    const params = [];
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
async function exportTransactions(format) {
    const db = (0, database_1.getDatabase)();
    const transactions = db.prepare(`
    SELECT * FROM transactions
    ORDER BY created_at DESC
  `).all();
    const exportDir = path_1.default.join(process.cwd(), 'exports');
    if (!fs_1.default.existsSync(exportDir)) {
        fs_1.default.mkdirSync(exportDir, { recursive: true });
    }
    const timestamp = Date.now();
    let filePath;
    if (format === 'csv') {
        filePath = path_1.default.join(exportDir, `transactions_${timestamp}.csv`);
        const headers = Object.keys(transactions[0] || {}).join(',');
        const rows = transactions.map((t) => Object.values(t).join(','));
        fs_1.default.writeFileSync(filePath, [headers, ...rows].join('\n'));
    }
    else {
        filePath = path_1.default.join(exportDir, `transactions_${timestamp}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(transactions, null, 2));
    }
    return {
        filePath: filePath,
        recordCount: transactions.length,
        format: format,
        exportedAt: timestamp,
    };
}

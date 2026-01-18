"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFlashSellHandlers = registerFlashSellHandlers;
exports.unregisterFlashSellHandlers = unregisterFlashSellHandlers;
exports.executeQuickSell = executeQuickSell;
exports.getSellSettings = getSellSettings;
const electron_1 = require("electron");
const database_1 = require("../data/database");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
let sellSettings = {
    maxSlippage: 5,
    minPrice: 0,
    sellStrategy: 'market',
};
/**
 * 注册快速卖出IPC处理器
 */
function registerFlashSellHandlers() {
    logger_1.logger.info('FlashSellIPC', '注册快速卖出IPC处理器...');
    /**
     * 执行快速卖出
     */
    electron_1.ipcMain.handle('flashSell:execute', async (_event, params) => {
        try {
            logger_1.logger.info('FlashSellIPC', `执行快速卖出: ${params.amount} ${params.token}`);
            // 验证参数
            if (!params.token || !params.amount) {
                throw new Error('缺少必填参数: token, amount');
            }
            // 这里应该执行实际的卖出操作
            // 目前返回模拟数据
            const sellResult = {
                transactionId: `0x${Math.random().toString(16).substring(2, 66)}`,
                soldAmount: params.amount,
                receivedAmount: (parseFloat(params.amount) * Math.random()).toFixed(4),
                slippage: (Math.random() * 2).toFixed(2),
                status: 'completed',
                timestamp: Date.now(),
            };
            // 记录到数据库
            const db = (0, database_1.getDatabase)();
            db.prepare(`
        INSERT INTO flash_sell_history (token, amount, received, transaction_id, slippage, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(params.token, params.amount, sellResult.receivedAmount, sellResult.transactionId, sellResult.slippage, Date.now());
            logger_1.logger.info('FlashSellIPC', `快速卖出完成: ${sellResult.transactionId}`);
            return {
                success: true,
                data: sellResult
            };
        }
        catch (error) {
            logger_1.logger.error('FlashSellIPC', '执行快速卖出失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.TRANSACTION, 'Execute Flash Sell');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取卖出设置
     */
    electron_1.ipcMain.handle('flashSell:getSettings', async () => {
        try {
            logger_1.logger.debug('FlashSellIPC', '获取快速卖出设置');
            return {
                success: true,
                data: sellSettings
            };
        }
        catch (error) {
            logger_1.logger.error('FlashSellIPC', '获取快速卖出设置失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.CONFIGURATION, 'Get Flash Sell Settings');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 更新卖出设置
     */
    electron_1.ipcMain.handle('flashSell:updateSettings', async (_event, settings) => {
        try {
            logger_1.logger.info('FlashSellIPC', '更新快速卖出设置', settings);
            if (!settings) {
                throw new Error('设置参数无效');
            }
            sellSettings = { ...sellSettings, ...settings };
            // 保存到数据库
            const db = (0, database_1.getDatabase)();
            db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES ('flash_sell_settings', ?, strftime('%s', 'now'))
      `).run(JSON.stringify(sellSettings));
            logger_1.logger.info('FlashSellIPC', '快速卖出设置已更新');
            return {
                success: true,
                data: sellSettings,
                message: 'Settings updated'
            };
        }
        catch (error) {
            logger_1.logger.error('FlashSellIPC', '更新快速卖出设置失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.CONFIGURATION, 'Update Flash Sell Settings');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取快速卖出历史
     */
    electron_1.ipcMain.handle('flashSell:getHistory', async (_event, limit = 50) => {
        try {
            logger_1.logger.debug('FlashSellIPC', '获取快速卖出历史');
            const db = (0, database_1.getDatabase)();
            const history = db.prepare(`
        SELECT * FROM flash_sell_history
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit);
            logger_1.logger.debug('FlashSellIPC', `获取快速卖出历史: ${history.length} 条记录`);
            return {
                success: true,
                data: history
            };
        }
        catch (error) {
            logger_1.logger.error('FlashSellIPC', '获取快速卖出历史失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get Flash Sell History');
            return {
                success: false,
                error: error.message
            };
        }
    });
    logger_1.logger.info('FlashSellIPC', '快速卖出IPC处理器注册完成');
}
/**
 * 注销快速卖出IPC处理器
 */
function unregisterFlashSellHandlers() {
    const channels = [
        'flashSell:execute',
        'flashSell:getSettings',
        'flashSell:updateSettings',
        'flashSell:getHistory'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    logger_1.logger.info('FlashSellIPC', '快速卖出IPC处理器已注销');
}
/**
 * 导出的辅助函数（供内部使用）
 */
async function executeQuickSell(params) {
    // 这里应该执行实际的卖出操作
    // 目前返回模拟数据
    const sellResult = {
        transactionId: `0x${Math.random().toString(16).substring(2, 66)}`,
        soldAmount: params.amount,
        receivedAmount: (parseFloat(params.amount) * Math.random()).toFixed(4),
        slippage: (Math.random() * 2).toFixed(2),
        status: 'completed',
        timestamp: Date.now(),
    };
    return sellResult;
}
async function getSellSettings() {
    return sellSettings;
}

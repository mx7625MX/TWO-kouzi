"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProfitHandlers = registerProfitHandlers;
exports.unregisterProfitHandlers = unregisterProfitHandlers;
exports.getProfitReport = getProfitReport;
exports.getROIStats = getROIStats;
const electron_1 = require("electron");
const database_1 = require("../data/database");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
/**
 * 注册盈利分析IPC处理器
 */
function registerProfitHandlers() {
    logger_1.logger.info('ProfitIPC', '注册盈利分析IPC处理器...');
    /**
     * 获取盈利报告
     */
    electron_1.ipcMain.handle('profit:getReport', async (_event, walletId) => {
        try {
            logger_1.logger.debug('ProfitIPC', `获取盈利报告: 钱包ID ${walletId}`);
            // 这里应该从数据库查询交易记录并计算盈利
            // 目前返回模拟数据
            const report = {
                walletId: walletId,
                totalProfit: (Math.random() * 10000).toFixed(2),
                totalLoss: (Math.random() * 5000).toFixed(2),
                netProfit: (Math.random() * 5000).toFixed(2),
                winRate: (Math.random() * 100).toFixed(1),
                totalTrades: Math.floor(Math.random() * 100),
                profitableTrades: Math.floor(Math.random() * 60),
                averageProfitPerTrade: (Math.random() * 100).toFixed(2),
                reportGeneratedAt: Date.now(),
            };
            logger_1.logger.debug('ProfitIPC', `盈利报告已生成: ${walletId}`);
            return {
                success: true,
                data: report
            };
        }
        catch (error) {
            logger_1.logger.error('ProfitIPC', `获取盈利报告失败: ${walletId}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get Profit Report');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取ROI统计
     */
    electron_1.ipcMain.handle('profit:getROI', async (_event, walletId) => {
        try {
            logger_1.logger.debug('ProfitIPC', `获取ROI统计: 钱包ID ${walletId}`);
            const stats = {
                walletId: walletId,
                overallROI: (Math.random() * 200 - 50).toFixed(2),
                monthlyROI: (Math.random() * 50 - 10).toFixed(2),
                weeklyROI: (Math.random() * 20 - 5).toFixed(2),
                dailyROI: (Math.random() * 10 - 2).toFixed(2),
                topPerformingAsset: 'BTC',
                bestTradeROI: (Math.random() * 500).toFixed(2),
                worstTradeROI: (Math.random() * -50).toFixed(2),
            };
            logger_1.logger.debug('ProfitIPC', `ROI统计已生成: ${walletId}`);
            return {
                success: true,
                data: stats
            };
        }
        catch (error) {
            logger_1.logger.error('ProfitIPC', `获取ROI统计失败: ${walletId}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get ROI Stats');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取交易明细
     */
    electron_1.ipcMain.handle('profit:getTradeDetails', async (_event, walletId, limit = 50) => {
        try {
            logger_1.logger.debug('ProfitIPC', `获取交易明细: 钱包ID ${walletId}`);
            const db = (0, database_1.getDatabase)();
            const trades = db.prepare(`
        SELECT * FROM trade_records
        WHERE wallet_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(walletId, limit);
            logger_1.logger.debug('ProfitIPC', `获取交易明细: ${trades.length} 条记录`);
            return {
                success: true,
                data: trades
            };
        }
        catch (error) {
            logger_1.logger.error('ProfitIPC', `获取交易明细失败: ${walletId}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get Trade Details');
            return {
                success: false,
                error: error.message
            };
        }
    });
    logger_1.logger.info('ProfitIPC', '盈利分析IPC处理器注册完成');
}
/**
 * 注销盈利分析IPC处理器
 */
function unregisterProfitHandlers() {
    const channels = [
        'profit:getReport',
        'profit:getROI',
        'profit:getTradeDetails'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    logger_1.logger.info('ProfitIPC', '盈利分析IPC处理器已注销');
}
/**
 * 导出的辅助函数（供内部使用）
 */
async function getProfitReport(walletId) {
    // 这里应该从数据库查询交易记录并计算盈利
    // 目前返回模拟数据
    return {
        walletId: walletId,
        totalProfit: (Math.random() * 10000).toFixed(2),
        totalLoss: (Math.random() * 5000).toFixed(2),
        netProfit: (Math.random() * 5000).toFixed(2),
        winRate: (Math.random() * 100).toFixed(1),
        totalTrades: Math.floor(Math.random() * 100),
        profitableTrades: Math.floor(Math.random() * 60),
        averageProfitPerTrade: (Math.random() * 100).toFixed(2),
        reportGeneratedAt: Date.now(),
    };
}
async function getROIStats(walletId) {
    return {
        walletId: walletId,
        overallROI: (Math.random() * 200 - 50).toFixed(2),
        monthlyROI: (Math.random() * 50 - 10).toFixed(2),
        weeklyROI: (Math.random() * 20 - 5).toFixed(2),
        dailyROI: (Math.random() * 10 - 2).toFixed(2),
        topPerformingAsset: 'BTC',
        bestTradeROI: (Math.random() * 500).toFixed(2),
        worstTradeROI: (Math.random() * -50).toFixed(2),
    };
}

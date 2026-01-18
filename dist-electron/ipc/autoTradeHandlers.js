"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAutoTradeHandlers = registerAutoTradeHandlers;
exports.unregisterAutoTradeHandlers = unregisterAutoTradeHandlers;
exports.enableTrading = enableTrading;
exports.setStrategy = setStrategy;
exports.getTradingStatus = getTradingStatus;
const electron_1 = require("electron");
const database_1 = require("../data/database");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
let autoTradingEnabled = false;
let currentStrategy = null;
/**
 * 注册自动交易IPC处理器
 */
function registerAutoTradeHandlers() {
    logger_1.logger.info('AutoTradeIPC', '注册自动交易IPC处理器...');
    /**
     * 启用/禁用自动交易
     */
    electron_1.ipcMain.handle('autoTrade:enable', async (_event, enabled) => {
        try {
            logger_1.logger.info('AutoTradeIPC', `${enabled ? '启用' : '禁用'}自动交易`);
            autoTradingEnabled = enabled;
            // 更新数据库设置
            const db = (0, database_1.getDatabase)();
            db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES ('auto_trading_enabled', ?, strftime('%s', 'now'))
      `).run(enabled ? 'true' : 'false');
            if (enabled && currentStrategy) {
                startAutoTrading();
            }
            logger_1.logger.info('AutoTradeIPC', `自动交易已${enabled ? '启用' : '禁用'}`);
            return {
                success: true,
                enabled: enabled,
                message: enabled ? 'Auto trading enabled' : 'Auto trading disabled',
            };
        }
        catch (error) {
            logger_1.logger.error('AutoTradeIPC', `${enabled ? '启用' : '禁用'}自动交易失败`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.TRANSACTION, 'Toggle Auto Trading');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 设置交易策略
     */
    electron_1.ipcMain.handle('autoTrade:setStrategy', async (_event, strategy) => {
        try {
            logger_1.logger.info('AutoTradeIPC', '设置交易策略', strategy);
            if (!strategy || !strategy.type) {
                throw new Error('策略参数无效');
            }
            currentStrategy = strategy;
            // 保存策略到数据库
            const db = (0, database_1.getDatabase)();
            db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES ('auto_trading_strategy', ?, strftime('%s', 'now'))
      `).run(JSON.stringify(strategy));
            logger_1.logger.info('AutoTradeIPC', '交易策略已更新');
            return {
                success: true,
                strategy: strategy,
                message: 'Trading strategy updated',
            };
        }
        catch (error) {
            logger_1.logger.error('AutoTradeIPC', '设置交易策略失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.CONFIGURATION, 'Set Trading Strategy');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取交易状态
     */
    electron_1.ipcMain.handle('autoTrade:getStatus', async () => {
        try {
            logger_1.logger.debug('AutoTradeIPC', '获取自动交易状态');
            const db = (0, database_1.getDatabase)();
            // 获取最近的交易记录
            const recentTrades = db.prepare(`
        SELECT * FROM auto_trade_history
        ORDER BY timestamp DESC
        LIMIT 10
      `).all();
            // 计算盈亏
            const profitLoss = db.prepare(`
        SELECT
          SUM(CASE WHEN type = 'buy' THEN -amount ELSE amount END) as total_pnl
        FROM auto_trade_history
        WHERE status = 'completed'
      `).get();
            const status = {
                enabled: autoTradingEnabled,
                strategy: currentStrategy,
                activeOrders: 0,
                profitLoss: profitLoss?.total_pnl || '0',
                lastTrade: recentTrades.length > 0 ? recentTrades[0].timestamp : null,
                recentTrades: recentTrades,
            };
            logger_1.logger.debug('AutoTradeIPC', `自动交易状态: ${status.enabled ? '运行中' : '已停止'}`);
            return {
                success: true,
                data: status
            };
        }
        catch (error) {
            logger_1.logger.error('AutoTradeIPC', '获取自动交易状态失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.UNKNOWN, 'Get Auto Trading Status');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 执行手动买入
     */
    electron_1.ipcMain.handle('autoTrade:buy', async (_event, params) => {
        try {
            logger_1.logger.info('AutoTradeIPC', `执行买入: ${params.amount} ${params.token}`);
            // 验证参数
            if (!params.token || !params.amount) {
                throw new Error('缺少必填参数: token, amount');
            }
            const db = (0, database_1.getDatabase)();
            // 插入交易记录
            const result = db.prepare(`
        INSERT INTO auto_trade_history (type, token, amount, price, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('buy', params.token, params.amount, params.price || 0, 'completed', Date.now());
            logger_1.logger.info('AutoTradeIPC', `买入完成: 记录ID ${result.lastInsertRowid}`);
            return {
                success: true,
                data: {
                    tradeId: result.lastInsertRowid,
                    type: 'buy',
                    token: params.token,
                    amount: params.amount,
                    timestamp: Date.now(),
                }
            };
        }
        catch (error) {
            logger_1.logger.error('AutoTradeIPC', '执行买入失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.TRANSACTION, 'Manual Buy');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 执行手动卖出
     */
    electron_1.ipcMain.handle('autoTrade:sell', async (_event, params) => {
        try {
            logger_1.logger.info('AutoTradeIPC', `执行卖出: ${params.amount} ${params.token}`);
            // 验证参数
            if (!params.token || !params.amount) {
                throw new Error('缺少必填参数: token, amount');
            }
            const db = (0, database_1.getDatabase)();
            // 插入交易记录
            const result = db.prepare(`
        INSERT INTO auto_trade_history (type, token, amount, price, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('sell', params.token, params.amount, params.price || 0, 'completed', Date.now());
            logger_1.logger.info('AutoTradeIPC', `卖出完成: 记录ID ${result.lastInsertRowid}`);
            return {
                success: true,
                data: {
                    tradeId: result.lastInsertRowid,
                    type: 'sell',
                    token: params.token,
                    amount: params.amount,
                    timestamp: Date.now(),
                }
            };
        }
        catch (error) {
            logger_1.logger.error('AutoTradeIPC', '执行卖出失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.TRANSACTION, 'Manual Sell');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取交易历史
     */
    electron_1.ipcMain.handle('autoTrade:getHistory', async (_event, limit = 50) => {
        try {
            logger_1.logger.debug('AutoTradeIPC', '获取交易历史');
            const db = (0, database_1.getDatabase)();
            const history = db.prepare(`
        SELECT * FROM auto_trade_history
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(limit);
            logger_1.logger.debug('AutoTradeIPC', `获取交易历史: ${history.length} 条记录`);
            return {
                success: true,
                data: history
            };
        }
        catch (error) {
            logger_1.logger.error('AutoTradeIPC', '获取交易历史失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get Trade History');
            return {
                success: false,
                error: error.message
            };
        }
    });
    logger_1.logger.info('AutoTradeIPC', '自动交易IPC处理器注册完成');
}
/**
 * 注销自动交易IPC处理器
 */
function unregisterAutoTradeHandlers() {
    const channels = [
        'autoTrade:enable',
        'autoTrade:setStrategy',
        'autoTrade:getStatus',
        'autoTrade:buy',
        'autoTrade:sell',
        'autoTrade:getHistory'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    logger_1.logger.info('AutoTradeIPC', '自动交易IPC处理器已注销');
}
/**
 * 导出的辅助函数（供内部使用）
 */
async function enableTrading(enabled) {
    autoTradingEnabled = enabled;
    // 更新数据库设置
    const db = (0, database_1.getDatabase)();
    db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES ('auto_trading_enabled', ?, strftime('%s', 'now'))
  `).run(enabled ? 'true' : 'false');
    if (enabled && currentStrategy) {
        startAutoTrading();
    }
    return {
        enabled: enabled,
        message: enabled ? 'Auto trading enabled' : 'Auto trading disabled',
    };
}
async function setStrategy(strategy) {
    currentStrategy = strategy;
    return {
        strategy: strategy,
        message: 'Trading strategy updated',
    };
}
async function getTradingStatus() {
    return {
        enabled: autoTradingEnabled,
        strategy: currentStrategy,
        activeOrders: 0,
        profitLoss: '0',
        lastTrade: null,
    };
}
/**
 * 启动自动交易（内部函数）
 */
function startAutoTrading() {
    // 这里应该实现自动交易逻辑
    logger_1.logger.info('AutoTradeIPC', '自动交易已启动', currentStrategy);
}

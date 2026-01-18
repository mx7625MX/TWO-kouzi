"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMarketHandlers = registerMarketHandlers;
exports.unregisterMarketHandlers = unregisterMarketHandlers;
exports.getMarketData = getMarketData;
exports.getWatchlist = getWatchlist;
exports.addToWatchlist = addToWatchlist;
const electron_1 = require("electron");
const database_1 = require("../data/database");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
/**
 * 注册市场监控IPC处理器
 */
function registerMarketHandlers() {
    logger_1.logger.info('MarketIPC', '注册市场监控IPC处理器...');
    /**
     * 获取市场数据
     */
    electron_1.ipcMain.handle('market:getData', async (_event, token) => {
        try {
            logger_1.logger.debug('MarketIPC', `获取市场数据: ${token}`);
            if (!token) {
                throw new Error('代币符号不能为空');
            }
            // 这里应该调用实际的市场数据API
            // 目前返回模拟数据
            const data = {
                token: token,
                price: (Math.random() * 1000).toFixed(4),
                change24h: (Math.random() * 20 - 10).toFixed(2),
                volume24h: (Math.random() * 1000000).toFixed(0),
                marketCap: (Math.random() * 100000000).toFixed(0),
                updatedAt: Date.now(),
            };
            logger_1.logger.debug('MarketIPC', `获取市场数据成功: ${token}`);
            return {
                success: true,
                data: data
            };
        }
        catch (error) {
            logger_1.logger.error('MarketIPC', `获取市场数据失败: ${token}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.NETWORK, 'Get Market Data');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取监控列表
     */
    electron_1.ipcMain.handle('market:getWatchlist', async () => {
        try {
            logger_1.logger.debug('MarketIPC', '获取监控列表');
            const db = (0, database_1.getDatabase)();
            const watchlist = db.prepare(`
        SELECT * FROM market_watchlist
        ORDER BY added_at DESC
      `).all();
            logger_1.logger.debug('MarketIPC', `获取监控列表: ${watchlist.length} 个代币`);
            return {
                success: true,
                data: watchlist
            };
        }
        catch (error) {
            logger_1.logger.error('MarketIPC', '获取监控列表失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get Watchlist');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 添加到监控列表
     */
    electron_1.ipcMain.handle('market:addToWatchlist', async (_event, token) => {
        try {
            logger_1.logger.info('MarketIPC', `添加到监控列表: ${token}`);
            if (!token) {
                throw new Error('代币地址不能为空');
            }
            const db = (0, database_1.getDatabase)();
            const result = db.prepare(`
        INSERT OR REPLACE INTO market_watchlist (token_address, token_name, token_symbol, chain, added_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(token, `Token ${token}`, token.toUpperCase().substring(0, 6), 'BSC', Date.now());
            logger_1.logger.info('MarketIPC', `代币已添加到监控列表: ${token}`);
            return {
                success: true,
                data: {
                    id: result.lastInsertRowid,
                    token: token,
                    message: 'Token added to watchlist',
                }
            };
        }
        catch (error) {
            logger_1.logger.error('MarketIPC', `添加到监控列表失败: ${token}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Add to Watchlist');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 从监控列表移除
     */
    electron_1.ipcMain.handle('market:removeFromWatchlist', async (_event, token) => {
        try {
            logger_1.logger.info('MarketIPC', `从监控列表移除: ${token}`);
            const db = (0, database_1.getDatabase)();
            const result = db.prepare('DELETE FROM market_watchlist WHERE token_address = ?').run(token);
            if (result.changes === 0) {
                throw new Error('代币不在监控列表中');
            }
            logger_1.logger.info('MarketIPC', `代币已从监控列表移除: ${token}`);
            return {
                success: true,
                message: 'Token removed from watchlist'
            };
        }
        catch (error) {
            logger_1.logger.error('MarketIPC', `从监控列表移除失败: ${token}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Remove from Watchlist');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取市场概览
     */
    electron_1.ipcMain.handle('market:getOverview', async () => {
        try {
            logger_1.logger.debug('MarketIPC', '获取市场概览');
            // 返回模拟的市场概览数据
            const overview = {
                totalMarketCap: '2000000000',
                totalVolume24h: '150000000',
                topGainers: [
                    { token: 'PEPE', change: '+45.2%' },
                    { token: 'DOGE', change: '+23.8%' },
                    { token: 'SHIB', change: '+18.5%' },
                ],
                topLosers: [
                    { token: 'FLOKI', change: '-12.3%' },
                    { token: 'BONK', change: '-8.7%' },
                    { token: 'MEME', change: '-5.2%' },
                ],
            };
            logger_1.logger.debug('MarketIPC', '获取市场概览成功');
            return {
                success: true,
                data: overview
            };
        }
        catch (error) {
            logger_1.logger.error('MarketIPC', '获取市场概览失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.NETWORK, 'Get Market Overview');
            return {
                success: false,
                error: error.message
            };
        }
    });
    logger_1.logger.info('MarketIPC', '市场监控IPC处理器注册完成');
}
/**
 * 注销市场监控IPC处理器
 */
function unregisterMarketHandlers() {
    const channels = [
        'market:getData',
        'market:getWatchlist',
        'market:addToWatchlist',
        'market:removeFromWatchlist',
        'market:getOverview'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    logger_1.logger.info('MarketIPC', '市场监控IPC处理器已注销');
}
/**
 * 导出的辅助函数（供内部使用）
 */
async function getMarketData(token) {
    // 这里应该调用实际的市场数据API
    // 目前返回模拟数据
    return {
        token: token,
        price: (Math.random() * 1000).toFixed(4),
        change24h: (Math.random() * 20 - 10).toFixed(2),
        volume24h: (Math.random() * 1000000).toFixed(0),
        marketCap: (Math.random() * 100000000).toFixed(0),
        updatedAt: Date.now(),
    };
}
async function getWatchlist() {
    const db = (0, database_1.getDatabase)();
    const watchlist = db.prepare(`
    SELECT * FROM market_watchlist
    ORDER BY added_at DESC
  `).all();
    return watchlist;
}
async function addToWatchlist(token) {
    const db = (0, database_1.getDatabase)();
    const result = db.prepare(`
    INSERT OR REPLACE INTO market_watchlist (token_address, token_name, token_symbol, chain)
    VALUES (?, ?, ?, ?)
  `).run(token, `Token ${token}`, token.toUpperCase().substring(0, 6), 'BSC');
    return {
        id: result.lastInsertRowid,
        token: token,
        message: 'Token added to watchlist',
    };
}

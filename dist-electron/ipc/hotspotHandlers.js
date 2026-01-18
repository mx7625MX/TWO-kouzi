"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHotspotHandlers = registerHotspotHandlers;
exports.unregisterHotspotHandlers = unregisterHotspotHandlers;
exports.getHotTokens = getHotTokens;
exports.getTrendingData = getTrendingData;
const electron_1 = require("electron");
const database_1 = require("../data/database");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
/**
 * 注册热点监控IPC处理器
 */
function registerHotspotHandlers() {
    logger_1.logger.info('HotspotIPC', '注册热点监控IPC处理器...');
    /**
     * 获取热点代币
     */
    electron_1.ipcMain.handle('hotspot:getTokens', async () => {
        try {
            logger_1.logger.debug('HotspotIPC', '获取热点代币列表');
            // 这里应该调用实际的热点检测算法
            // 目前返回模拟数据
            const hotTokens = Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                name: `HotToken${i + 1}`,
                symbol: `HOT${i + 1}`,
                price: (Math.random() * 100).toFixed(4),
                change24h: (Math.random() * 50 - 25).toFixed(2),
                volume24h: (Math.random() * 500000).toFixed(0),
                socialScore: Math.floor(Math.random() * 100),
                trend: Math.random() > 0.5 ? 'up' : 'down',
                detectedAt: Date.now(),
            }));
            logger_1.logger.debug('HotspotIPC', `获取热点代币: ${hotTokens.length} 个`);
            return {
                success: true,
                data: hotTokens
            };
        }
        catch (error) {
            logger_1.logger.error('HotspotIPC', '获取热点代币失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.UNKNOWN, 'Get Hot Tokens');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取趋势数据
     */
    electron_1.ipcMain.handle('hotspot:getTrending', async () => {
        try {
            logger_1.logger.debug('HotspotIPC', '获取趋势数据');
            // 这里应该分析社交媒体趋势
            // 目前返回模拟数据
            const trending = [
                { topic: 'Meme Coin Season', mentions: 15234, sentiment: 0.75, change: '+23%' },
                { topic: 'DeFi Governance', mentions: 8456, sentiment: 0.62, change: '+15%' },
                { topic: 'Layer 2 Solutions', mentions: 6789, sentiment: 0.58, change: '+8%' },
                { topic: 'NFT Gaming', mentions: 5432, sentiment: 0.45, change: '-5%' },
                { topic: 'Cross-chain Bridges', mentions: 4321, sentiment: 0.52, change: '+2%' },
            ];
            logger_1.logger.debug('HotspotIPC', `获取趋势数据: ${trending.length} 个话题`);
            return {
                success: true,
                data: trending
            };
        }
        catch (error) {
            logger_1.logger.error('HotspotIPC', '获取趋势数据失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.UNKNOWN, 'Get Trending Data');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 添加热点监控
     */
    electron_1.ipcMain.handle('hotspot:addMonitor', async (_event, token) => {
        try {
            logger_1.logger.info('HotspotIPC', `添加热点监控: ${token}`);
            if (!token) {
                throw new Error('代币符号不能为空');
            }
            const db = (0, database_1.getDatabase)();
            const result = db.prepare(`
        INSERT INTO hotspot_monitors (token, enabled, created_at)
        VALUES (?, 1, ?)
      `).run(token, Date.now());
            logger_1.logger.info('HotspotIPC', `热点监控已添加: ${token}`);
            return {
                success: true,
                data: {
                    id: result.lastInsertRowid,
                    token: token,
                    message: 'Hotspot monitor added',
                }
            };
        }
        catch (error) {
            logger_1.logger.error('HotspotIPC', `添加热点监控失败: ${token}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Add Hotspot Monitor');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取热点监控列表
     */
    electron_1.ipcMain.handle('hotspot:getMonitors', async () => {
        try {
            logger_1.logger.debug('HotspotIPC', '获取热点监控列表');
            const db = (0, database_1.getDatabase)();
            const monitors = db.prepare(`
        SELECT * FROM hotspot_monitors
        WHERE enabled = 1
        ORDER BY created_at DESC
      `).all();
            logger_1.logger.debug('HotspotIPC', `获取热点监控: ${monitors.length} 个`);
            return {
                success: true,
                data: monitors
            };
        }
        catch (error) {
            logger_1.logger.error('HotspotIPC', '获取热点监控列表失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get Hotspot Monitors');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 移除热点监控
     */
    electron_1.ipcMain.handle('hotspot:removeMonitor', async (_event, monitorId) => {
        try {
            logger_1.logger.info('HotspotIPC', `移除热点监控: ${monitorId}`);
            const db = (0, database_1.getDatabase)();
            const result = db.prepare(`
        UPDATE hotspot_monitors
        SET enabled = 0
        WHERE id = ?
      `).run(monitorId);
            if (result.changes === 0) {
                throw new Error('监控不存在');
            }
            logger_1.logger.info('HotspotIPC', `热点监控已移除: ${monitorId}`);
            return {
                success: true,
                message: 'Hotspot monitor removed'
            };
        }
        catch (error) {
            logger_1.logger.error('HotspotIPC', `移除热点监控失败: ${monitorId}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Remove Hotspot Monitor');
            return {
                success: false,
                error: error.message
            };
        }
    });
    logger_1.logger.info('HotspotIPC', '热点监控IPC处理器注册完成');
}
/**
 * 注销热点监控IPC处理器
 */
function unregisterHotspotHandlers() {
    const channels = [
        'hotspot:getTokens',
        'hotspot:getTrending',
        'hotspot:addMonitor',
        'hotspot:getMonitors',
        'hotspot:removeMonitor'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    logger_1.logger.info('HotspotIPC', '热点监控IPC处理器已注销');
}
/**
 * 导出的辅助函数（供内部使用）
 */
async function getHotTokens() {
    // 这里应该调用实际的热点检测算法
    // 目前返回模拟数据
    const hotTokens = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `HotToken${i + 1}`,
        symbol: `HOT${i + 1}`,
        price: (Math.random() * 100).toFixed(4),
        change24h: (Math.random() * 50 - 25).toFixed(2),
        volume24h: (Math.random() * 500000).toFixed(0),
        socialScore: Math.floor(Math.random() * 100),
        trend: Math.random() > 0.5 ? 'up' : 'down',
    }));
    return hotTokens;
}
async function getTrendingData() {
    // 这里应该分析社交媒体趋势
    // 目前返回模拟数据
    const trending = [
        { topic: 'Meme Coin Season', mentions: 15234, sentiment: 0.75, change: '+23%' },
        { topic: 'DeFi Governance', mentions: 8456, sentiment: 0.62, change: '+15%' },
        { topic: 'Layer 2 Solutions', mentions: 6789, sentiment: 0.58, change: '+8%' },
        { topic: 'NFT Gaming', mentions: 5432, sentiment: 0.45, change: '-5%' },
        { topic: 'Cross-chain Bridges', mentions: 4321, sentiment: 0.52, change: '+2%' },
    ];
    return trending;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAISentimentHandlers = registerAISentimentHandlers;
exports.unregisterAISentimentHandlers = unregisterAISentimentHandlers;
exports.analyzeSentiment = analyzeSentiment;
exports.getSentimentData = getSentimentData;
const electron_1 = require("electron");
const database_1 = require("../data/database");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
/**
 * 注册AI情绪分析IPC处理器
 */
function registerAISentimentHandlers() {
    logger_1.logger.info('AIIPC', '注册AI情绪分析IPC处理器...');
    /**
     * 分析情绪
     */
    electron_1.ipcMain.handle('ai:analyze', async (_event, text) => {
        try {
            logger_1.logger.info('AIIPC', '分析文本情绪');
            if (!text || text.trim().length === 0) {
                throw new Error('文本不能为空');
            }
            // 这里应该调用实际的AI服务分析情绪
            // 目前返回模拟数据
            // 实际实现可以使用 integration-doubao-seed 的 HTTP API
            const mockSentiment = Math.random() * 2 - 1; // -1 到 1
            let sentimentLabel = 'neutral';
            if (mockSentiment > 0.3)
                sentimentLabel = 'positive';
            else if (mockSentiment < -0.3)
                sentimentLabel = 'negative';
            // 存储到数据库
            const db = (0, database_1.getDatabase)();
            db.prepare(`
        INSERT INTO sentiments (token, source, sentiment, content)
        VALUES (?, ?, ?, ?)
      `).run('unknown', 'manual', mockSentiment, text);
            logger_1.logger.info('AIIPC', `情绪分析完成: ${sentimentLabel} (${mockSentiment.toFixed(2)})`);
            return {
                success: true,
                data: {
                    sentiment: mockSentiment,
                    label: sentimentLabel,
                    confidence: 0.85,
                    keyPhrases: extractKeyPhrases(text),
                    timestamp: Date.now(),
                }
            };
        }
        catch (error) {
            logger_1.logger.error('AIIPC', '分析情绪失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.UNKNOWN, 'Analyze Sentiment');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取代币情绪数据
     */
    electron_1.ipcMain.handle('ai:getSentiment', async (_event, token) => {
        try {
            logger_1.logger.debug('AIIPC', `获取代币情绪数据: ${token}`);
            if (!token) {
                throw new Error('代币符号不能为空');
            }
            const db = (0, database_1.getDatabase)();
            const sentiments = db.prepare(`
        SELECT * FROM sentiments
        WHERE token = ?
        ORDER BY created_at DESC
        LIMIT 100
      `).all(token);
            if (sentiments.length === 0) {
                return {
                    success: true,
                    data: {
                        token: token,
                        averageSentiment: 0,
                        trend: 'neutral',
                        dataPoints: [],
                    }
                };
            }
            const avgSentiment = sentiments.reduce((sum, s) => sum + s.sentiment, 0) / sentiments.length;
            let trend = 'neutral';
            if (avgSentiment > 0.2)
                trend = 'positive';
            else if (avgSentiment < -0.2)
                trend = 'negative';
            logger_1.logger.info('AIIPC', `获取代币情绪数据: ${token}, 趋势: ${trend}`);
            return {
                success: true,
                data: {
                    token: token,
                    averageSentiment: avgSentiment,
                    trend: trend,
                    dataPoints: sentiments,
                    lastUpdated: Date.now(),
                }
            };
        }
        catch (error) {
            logger_1.logger.error('AIIPC', `获取代币情绪数据失败: ${token}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get Sentiment Data');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 批量分析情绪
     */
    electron_1.ipcMain.handle('ai:batchAnalyze', async (_event, texts) => {
        try {
            logger_1.logger.info('AIIPC', `批量分析情绪: ${texts.length} 条文本`);
            if (!texts || texts.length === 0) {
                throw new Error('文本列表不能为空');
            }
            const results = [];
            for (const text of texts) {
                try {
                    const mockSentiment = Math.random() * 2 - 1;
                    let sentimentLabel = 'neutral';
                    if (mockSentiment > 0.3)
                        sentimentLabel = 'positive';
                    else if (mockSentiment < -0.3)
                        sentimentLabel = 'negative';
                    results.push({
                        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                        sentiment: mockSentiment,
                        label: sentimentLabel,
                        keyPhrases: extractKeyPhrases(text),
                    });
                }
                catch (error) {
                    results.push({
                        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                        sentiment: 0,
                        label: 'error',
                        error: '分析失败'
                    });
                }
            }
            logger_1.logger.info('AIIPC', `批量分析完成: ${results.length} 条`);
            return {
                success: true,
                data: results
            };
        }
        catch (error) {
            logger_1.logger.error('AIIPC', '批量分析情绪失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.UNKNOWN, 'Batch Analyze Sentiment');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取情感趋势
     */
    electron_1.ipcMain.handle('ai:getTrend', async (_event, token, days = 7) => {
        try {
            logger_1.logger.debug('AIIPC', `获取情感趋势: ${token}, ${days} 天`);
            const db = (0, database_1.getDatabase)();
            const timestamp = Date.now() - (days * 24 * 60 * 60 * 1000);
            const sentiments = db.prepare(`
        SELECT
          DATE(created_at / 1000, 'unixepoch', 'localtime') as date,
          AVG(sentiment) as avg_sentiment,
          COUNT(*) as count
        FROM sentiments
        WHERE token = ? AND created_at >= ?
        GROUP BY date
        ORDER BY date DESC
      `).all(token, timestamp);
            logger_1.logger.info('AIIPC', `获取情感趋势: ${sentiments.length} 个数据点`);
            return {
                success: true,
                data: sentiments
            };
        }
        catch (error) {
            logger_1.logger.error('AIIPC', `获取情感趋势失败: ${token}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get Sentiment Trend');
            return {
                success: false,
                error: error.message
            };
        }
    });
    logger_1.logger.info('AIIPC', 'AI情绪分析IPC处理器注册完成');
}
/**
 * 注销AI情绪分析IPC处理器
 */
function unregisterAISentimentHandlers() {
    const channels = [
        'ai:analyze',
        'ai:getSentiment',
        'ai:batchAnalyze',
        'ai:getTrend'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    logger_1.logger.info('AIIPC', 'AI情绪分析IPC处理器已注销');
}
/**
 * 分析情绪
 */
async function analyzeSentiment(text) {
    // 这里应该调用实际的AI服务分析情绪
    // 目前返回模拟数据
    // 实际实现可以使用 integration-doubao-seed 的 HTTP API
    const mockSentiment = Math.random() * 2 - 1; // -1 到 1
    let sentimentLabel = 'neutral';
    if (mockSentiment > 0.3)
        sentimentLabel = 'positive';
    else if (mockSentiment < -0.3)
        sentimentLabel = 'negative';
    // 存储到数据库
    const db = (0, database_1.getDatabase)();
    db.prepare(`
    INSERT INTO sentiments (token, source, sentiment, content)
    VALUES (?, ?, ?, ?)
  `).run('unknown', 'manual', mockSentiment, text);
    return {
        sentiment: mockSentiment,
        label: sentimentLabel,
        confidence: 0.85,
        keyPhrases: extractKeyPhrases(text),
        timestamp: Date.now(),
    };
}
/**
 * 获取代币情绪数据
 */
async function getSentimentData(token) {
    const db = (0, database_1.getDatabase)();
    const sentiments = db.prepare(`
    SELECT * FROM sentiments
    WHERE token = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(token);
    if (sentiments.length === 0) {
        return {
            token: token,
            averageSentiment: 0,
            trend: 'neutral',
            dataPoints: [],
        };
    }
    const avgSentiment = sentiments.reduce((sum, s) => sum + s.sentiment, 0) / sentiments.length;
    let trend = 'neutral';
    if (avgSentiment > 0.2)
        trend = 'positive';
    else if (avgSentiment < -0.2)
        trend = 'negative';
    return {
        token: token,
        averageSentiment: avgSentiment,
        trend: trend,
        dataPoints: sentiments,
        lastUpdated: Date.now(),
    };
}
/**
 * 提取关键短语（简化版）
 */
function extractKeyPhrases(text) {
    // 这里应该使用NLP工具提取关键词
    // 简化实现：提取常见加密货币相关词汇
    const cryptoKeywords = ['bullish', 'bearish', 'moon', 'pump', 'dump', 'hodl', 'rekt', 'gem', 'shitcoin', 'meme'];
    const found = cryptoKeywords.filter(keyword => text.toLowerCase().includes(keyword));
    return found.length > 0 ? found : ['market', 'trading'];
}

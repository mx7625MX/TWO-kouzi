"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLaunchHandlers = registerLaunchHandlers;
exports.unregisterLaunchHandlers = unregisterLaunchHandlers;
const electron_1 = require("electron");
const database_1 = require("../data/database");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
const crypto_1 = require("crypto");
/**
 * 生成UUID
 */
function uuidv4() {
    return (0, crypto_1.randomUUID)();
}
/**
 * 注册发币相关IPC处理器
 */
function registerLaunchHandlers() {
    logger_1.logger.info('LaunchIPC', '注册发币IPC处理器...');
    /**
     * 发行代币
     */
    electron_1.ipcMain.handle('launch:token', async (_event, params) => {
        try {
            logger_1.logger.info('LaunchIPC', `创建发币任务: ${params.tokenName} (${params.tokenSymbol})`);
            // 验证参数
            if (!params.tokenName || !params.tokenSymbol || !params.chain) {
                throw new Error('缺少必填参数: tokenName, tokenSymbol, chain');
            }
            const db = (0, database_1.getDatabase)();
            const taskId = uuidv4();
            // 插入发行任务
            const result = db.prepare(`
        INSERT INTO launch_tasks (task_id, token_name, token_symbol, chain, total_supply, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(taskId, params.tokenName, params.tokenSymbol, params.chain, params.totalSupply, 'pending');
            logger_1.logger.info('LaunchIPC', `发币任务已创建: ${taskId}`);
            // 这里应该调用实际的区块链部署逻辑
            // 模拟部署成功
            setTimeout(() => {
                try {
                    db.prepare(`
            UPDATE launch_tasks
            SET status = ?, contract_address = ?
            WHERE task_id = ?
          `).run('completed', `0x${Math.random().toString(16).substring(2, 42)}`, taskId);
                    logger_1.logger.info('LaunchIPC', `发币任务完成: ${taskId}`);
                }
                catch (error) {
                    logger_1.logger.error('LaunchIPC', `更新发币任务状态失败: ${taskId}`, error);
                }
            }, 2000);
            return {
                success: true,
                taskId: taskId,
                status: 'pending',
                message: 'Token launch task created',
                estimatedTime: 30, // seconds
            };
        }
        catch (error) {
            logger_1.logger.error('LaunchIPC', '创建发币任务失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.TRANSACTION, 'Launch Token');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 批量购买
     */
    electron_1.ipcMain.handle('launch:bundleBuy', async (_event, params) => {
        try {
            logger_1.logger.info('LaunchIPC', `创建批量购买任务: ${params.amount} ${params.tokenSymbol}`);
            const db = (0, database_1.getDatabase)();
            const taskId = uuidv4();
            // 插入批量购买任务
            db.prepare(`
        INSERT INTO launch_tasks (task_id, token_name, token_symbol, chain, total_supply, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(taskId, params.tokenName || 'Unknown', params.tokenSymbol || 'UNK', params.chain, params.amount || '0', 'pending');
            logger_1.logger.info('LaunchIPC', `批量购买任务已创建: ${taskId}`);
            // 这里应该执行实际的批量购买逻辑
            // 模拟购买成功
            setTimeout(() => {
                try {
                    db.prepare(`
            UPDATE launch_tasks
            SET status = 'completed'
            WHERE task_id = ?
          `).run(taskId);
                    logger_1.logger.info('LaunchIPC', `批量购买任务完成: ${taskId}`);
                }
                catch (error) {
                    logger_1.logger.error('LaunchIPC', `更新批量购买任务状态失败: ${taskId}`, error);
                }
            }, 3000);
            return {
                success: true,
                taskId: taskId,
                status: 'pending',
                message: 'Bundle buy task created',
                estimatedTime: 45,
            };
        }
        catch (error) {
            logger_1.logger.error('LaunchIPC', '创建批量购买任务失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.TRANSACTION, 'Bundle Buy');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 获取所有发行任务
     */
    electron_1.ipcMain.handle('launch:getTasks', async () => {
        try {
            logger_1.logger.debug('LaunchIPC', '获取所有发行任务');
            const db = (0, database_1.getDatabase)();
            const tasks = db.prepare(`
        SELECT * FROM launch_tasks
        ORDER BY created_at DESC
      `).all();
            return {
                success: true,
                data: tasks
            };
        }
        catch (error) {
            logger_1.logger.error('LaunchIPC', '获取发行任务失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.DATABASE, 'Get Launch Tasks');
            return {
                success: false,
                error: error.message
            };
        }
    });
    /**
     * 取消任务
     */
    electron_1.ipcMain.handle('launch:cancelTask', async (_event, taskId) => {
        try {
            logger_1.logger.info('LaunchIPC', `取消任务: ${taskId}`);
            const db = (0, database_1.getDatabase)();
            const result = db.prepare(`
        UPDATE launch_tasks
        SET status = 'cancelled'
        WHERE task_id = ? AND status IN ('pending', 'running')
      `).run(taskId);
            if (result.changes === 0) {
                throw new Error('任务不存在或无法取消');
            }
            logger_1.logger.info('LaunchIPC', `任务已取消: ${taskId}`);
            return {
                success: true,
                message: 'Task cancelled successfully'
            };
        }
        catch (error) {
            logger_1.logger.error('LaunchIPC', `取消任务失败: ${taskId}`, error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.TRANSACTION, 'Cancel Task');
            return {
                success: false,
                error: error.message
            };
        }
    });
    logger_1.logger.info('LaunchIPC', '发币IPC处理器注册完成');
}
/**
 * 注销发币相关IPC处理器
 */
function unregisterLaunchHandlers() {
    const channels = [
        'launch:token',
        'launch:bundleBuy',
        'launch:getTasks',
        'launch:cancelTask'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    logger_1.logger.info('LaunchIPC', '发币IPC处理器已注销');
}

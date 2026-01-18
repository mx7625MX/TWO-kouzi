"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWalletHandlers = registerWalletHandlers;
exports.unregisterWalletHandlers = unregisterWalletHandlers;
const electron_1 = require("electron");
const walletManager_1 = require("../utils/walletManager");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
const cryptoUtils_1 = require("../utils/cryptoUtils");
// 全局钱包管理器实例
let walletManager = null;
/**
 * 注册钱包相关IPC处理器
 */
function registerWalletHandlers() {
    // 初始化钱包管理器
    electron_1.ipcMain.handle('wallet:init', async (_event, password) => {
        try {
            logger_1.logger.info('WalletIPC', '初始化钱包管理器');
            // 验证密码强度
            const strength = (0, cryptoUtils_1.validatePasswordStrength)(password);
            if (strength.score < 2) {
                throw new Error(`密码强度不足：${strength.description}`);
            }
            walletManager = new walletManager_1.WalletManager(password);
            logger_1.logger.info('WalletIPC', '钱包管理器初始化成功');
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('WalletIPC', '初始化钱包管理器失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Init Wallet Manager');
            return { success: false, error: error.message };
        }
    });
    // 创建钱包
    electron_1.ipcMain.handle('wallet:create', async (_event, name, network) => {
        try {
            if (!walletManager) {
                throw new Error('钱包管理器未初始化，请先设置密码');
            }
            logger_1.logger.info('WalletIPC', `创建${network}钱包: ${name}`);
            const wallet = await walletManager.createWallet(name, network);
            // 返回钱包信息（不包含私钥）
            const { private_key, ...walletInfo } = wallet;
            return { success: true, data: walletInfo };
        }
        catch (error) {
            logger_1.logger.error('WalletIPC', '创建钱包失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Create Wallet');
            return { success: false, error: error.message };
        }
    });
    // 导入钱包
    electron_1.ipcMain.handle('wallet:import', async (_event, name, network, privateKey, type) => {
        try {
            if (!walletManager) {
                throw new Error('钱包管理器未初始化，请先设置密码');
            }
            logger_1.logger.info('WalletIPC', `导入${network}钱包: ${name}`);
            const wallet = await walletManager.importWallet(name, network, privateKey, type);
            // 返回钱包信息（不包含私钥）
            const { private_key, ...walletInfo } = wallet;
            return { success: true, data: walletInfo };
        }
        catch (error) {
            logger_1.logger.error('WalletIPC', '导入钱包失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Import Wallet');
            return { success: false, error: error.message };
        }
    });
    // 获取所有钱包
    electron_1.ipcMain.handle('wallet:getAll', async () => {
        try {
            if (!walletManager) {
                throw new Error('钱包管理器未初始化');
            }
            logger_1.logger.debug('WalletIPC', '获取钱包列表');
            const wallets = await walletManager.getWallets();
            return { success: true, data: wallets };
        }
        catch (error) {
            logger_1.logger.error('WalletIPC', '获取钱包列表失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Get Wallets');
            return { success: false, error: error.message };
        }
    });
    // 获取钱包余额
    electron_1.ipcMain.handle('wallet:getBalance', async (_event, walletId) => {
        try {
            if (!walletManager) {
                throw new Error('钱包管理器未初始化');
            }
            logger_1.logger.debug('WalletIPC', `获取钱包余额: ID ${walletId}`);
            const balance = await walletManager.getBalance(walletId);
            return { success: true, data: balance };
        }
        catch (error) {
            logger_1.logger.error('WalletIPC', '获取钱包余额失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Get Balance');
            return { success: false, error: error.message };
        }
    });
    // 签名交易
    electron_1.ipcMain.handle('wallet:signTransaction', async (_event, walletId, txData) => {
        try {
            if (!walletManager) {
                throw new Error('钱包管理器未初始化');
            }
            logger_1.logger.info('WalletIPC', `签名交易: 钱包ID ${walletId}`);
            const result = await walletManager.signTransaction(walletId, txData);
            return { success: true, data: result };
        }
        catch (error) {
            logger_1.logger.error('WalletIPC', '签名交易失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Sign Transaction');
            return { success: false, error: error.message };
        }
    });
    // 删除钱包
    electron_1.ipcMain.handle('wallet:delete', async (_event, walletId) => {
        try {
            if (!walletManager) {
                throw new Error('钱包管理器未初始化');
            }
            logger_1.logger.info('WalletIPC', `删除钱包: ID ${walletId}`);
            await walletManager.deleteWallet(walletId);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('WalletIPC', '删除钱包失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Delete Wallet');
            return { success: false, error: error.message };
        }
    });
    // 更改钱包密码
    electron_1.ipcMain.handle('wallet:changePassword', async (_event, walletId, newPassword) => {
        try {
            if (!walletManager) {
                throw new Error('钱包管理器未初始化');
            }
            logger_1.logger.info('WalletIPC', `更改钱包密码: ID ${walletId}`);
            await walletManager.changeWalletPassword(walletId, newPassword);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('WalletIPC', '更改钱包密码失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Change Password');
            return { success: false, error: error.message };
        }
    });
    logger_1.logger.info('WalletIPC', '钱包IPC处理器已注册');
}
/**
 * 注销钱包相关IPC处理器
 */
function unregisterWalletHandlers() {
    const channels = [
        'wallet:init',
        'wallet:create',
        'wallet:import',
        'wallet:getAll',
        'wallet:getBalance',
        'wallet:signTransaction',
        'wallet:delete',
        'wallet:changePassword'
    ];
    channels.forEach(channel => {
        electron_1.ipcMain.removeHandler(channel);
    });
    walletManager = null;
    logger_1.logger.info('WalletIPC', '钱包IPC处理器已注销');
}

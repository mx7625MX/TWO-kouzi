import { ipcMain } from 'electron';
import { WalletManager } from '../utils/walletManager';
import { logger } from '../utils/logger';
import { errorHandler, ErrorCategory } from '../utils/errorHandler';
import { validatePasswordStrength } from '../utils/cryptoUtils';

// 全局钱包管理器实例
let walletManager: WalletManager | null = null;

/**
 * 注册钱包相关IPC处理器
 */
export function registerWalletHandlers() {
  // 初始化钱包管理器
  ipcMain.handle('wallet:init', async (_event, password: string) => {
    try {
      logger.info('WalletIPC', '初始化钱包管理器');

      // 验证密码强度
      const strength = validatePasswordStrength(password);
      if (strength.score < 2) {
        throw new Error(`密码强度不足：${strength.description}`);
      }

      walletManager = new WalletManager(password);
      logger.info('WalletIPC', '钱包管理器初始化成功');
      return { success: true };
    } catch (error: any) {
      logger.error('WalletIPC', '初始化钱包管理器失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Init Wallet Manager');
      return { success: false, error: error.message };
    }
  });

  // 创建钱包
  ipcMain.handle('wallet:create', async (_event, name: string, network: string) => {
    try {
      if (!walletManager) {
        throw new Error('钱包管理器未初始化，请先设置密码');
      }

      logger.info('WalletIPC', `创建${network}钱包: ${name}`);
      const wallet = await walletManager.createWallet(name, network as 'BSC' | 'Solana');

      // 返回钱包信息（不包含私钥）
      const { private_key, ...walletInfo } = wallet;
      return { success: true, data: walletInfo };
    } catch (error: any) {
      logger.error('WalletIPC', '创建钱包失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Create Wallet');
      return { success: false, error: error.message };
    }
  });

  // 导入钱包
  ipcMain.handle('wallet:import', async (_event, name: string, network: string, privateKey: string, type: string) => {
    try {
      if (!walletManager) {
        throw new Error('钱包管理器未初始化，请先设置密码');
      }

      logger.info('WalletIPC', `导入${network}钱包: ${name}`);
      const wallet = await walletManager.importWallet(
        name,
        network as 'BSC' | 'Solana',
        privateKey,
        type as 'privateKey' | 'mnemonic'
      );

      // 返回钱包信息（不包含私钥）
      const { private_key, ...walletInfo } = wallet;
      return { success: true, data: walletInfo };
    } catch (error: any) {
      logger.error('WalletIPC', '导入钱包失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Import Wallet');
      return { success: false, error: error.message };
    }
  });

  // 获取所有钱包
  ipcMain.handle('wallet:getAll', async () => {
    try {
      if (!walletManager) {
        throw new Error('钱包管理器未初始化');
      }

      logger.debug('WalletIPC', '获取钱包列表');
      const wallets = await walletManager.getWallets();
      return { success: true, data: wallets };
    } catch (error: any) {
      logger.error('WalletIPC', '获取钱包列表失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Get Wallets');
      return { success: false, error: error.message };
    }
  });

  // 获取钱包余额
  ipcMain.handle('wallet:getBalance', async (_event, walletId: number) => {
    try {
      if (!walletManager) {
        throw new Error('钱包管理器未初始化');
      }

      logger.debug('WalletIPC', `获取钱包余额: ID ${walletId}`);
      const balance = await walletManager.getBalance(walletId);
      return { success: true, data: balance };
    } catch (error: any) {
      logger.error('WalletIPC', '获取钱包余额失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Get Balance');
      return { success: false, error: error.message };
    }
  });

  // 签名交易
  ipcMain.handle('wallet:signTransaction', async (_event, walletId: number, txData: any) => {
    try {
      if (!walletManager) {
        throw new Error('钱包管理器未初始化');
      }

      logger.info('WalletIPC', `签名交易: 钱包ID ${walletId}`);
      const result = await walletManager.signTransaction(walletId, txData);
      return { success: true, data: result };
    } catch (error: any) {
      logger.error('WalletIPC', '签名交易失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Sign Transaction');
      return { success: false, error: error.message };
    }
  });

  // 删除钱包
  ipcMain.handle('wallet:delete', async (_event, walletId: number) => {
    try {
      if (!walletManager) {
        throw new Error('钱包管理器未初始化');
      }

      logger.info('WalletIPC', `删除钱包: ID ${walletId}`);
      await walletManager.deleteWallet(walletId);
      return { success: true };
    } catch (error: any) {
      logger.error('WalletIPC', '删除钱包失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Delete Wallet');
      return { success: false, error: error.message };
    }
  });

  // 更改钱包密码
  ipcMain.handle('wallet:changePassword', async (_event, walletId: number, newPassword: string) => {
    try {
      if (!walletManager) {
        throw new Error('钱包管理器未初始化');
      }

      logger.info('WalletIPC', `更改钱包密码: ID ${walletId}`);
      await walletManager.changeWalletPassword(walletId, newPassword);
      return { success: true };
    } catch (error: any) {
      logger.error('WalletIPC', '更改钱包密码失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Change Password');
      return { success: false, error: error.message };
    }
  });

  logger.info('WalletIPC', '钱包IPC处理器已注册');
}

/**
 * 注销钱包相关IPC处理器
 */
export function unregisterWalletHandlers() {
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
    ipcMain.removeHandler(channel);
  });

  walletManager = null;
  logger.info('WalletIPC', '钱包IPC处理器已注销');
}

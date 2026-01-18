import { Wallet } from 'ethers';
import * as bs58 from 'bs58';
import { getDatabase } from '../data/database';
import { encrypt, decrypt, generateRandomPassword } from './cryptoUtils';
import { logger } from './logger';
import { errorHandler, ErrorCategory } from './errorHandler';

/**
 * 钱包信息接口
 */
export interface WalletInfo {
  id: number;
  name: string;
  address: string;
  chain: 'BSC' | 'Solana';
  private_key: string;
  encrypted_key: string;
  created_at: number;
}

/**
 * 钱包管理器类
 * 负责钱包的创建、导入、加密存储和解密
 */
export class WalletManager {
  private password: string;

  constructor(password: string) {
    if (!password) {
      throw new Error('钱包密码不能为空');
    }
    this.password = password;
  }

  /**
   * 创建钱包（从助记词）
   */
  public async createWallet(name: string, network: 'BSC' | 'Solana'): Promise<WalletInfo> {
    try {
      logger.info('WalletManager', `创建${network}钱包: ${name}`);

      let wallet: WalletInfo;

      if (network === 'BSC') {
        // 从随机助记词创建BSC钱包
        const mnemonic = Wallet.createRandom().mnemonic?.phrase || '';
        const ethersWallet = Wallet.fromPhrase(mnemonic);

        // 加密私钥
        const encryptedKey = encrypt(ethersWallet.privateKey, this.password);

        wallet = {
          name,
          address: ethersWallet.address,
          chain: network,
          private_key: ethersWallet.privateKey, // 临时保存，返回后应删除
          encrypted_key: encryptedKey,
          created_at: Date.now()
        };
      } else if (network === 'Solana') {
        // 使用@solana/web3.js创建Solana钱包
        const { Keypair } = await import('@solana/web3.js');
        const keypair = Keypair.generate();

        // 私钥转换为Base58
        const privateKey = bs58.encode(keypair.secretKey);
        const address = keypair.publicKey.toBase58();

        // 加密私钥
        const encryptedKey = encrypt(privateKey, this.password);

        wallet = {
          name,
          address,
          chain: network,
          private_key: privateKey,
          encrypted_key: encryptedKey,
          created_at: Date.now()
        };
      } else {
        throw new Error(`不支持的网络类型: ${network}`);
      }

      // 保存到数据库（只保存加密后的私钥）
      const db = getDatabase();
      const result = db.prepare(`
        INSERT INTO wallets (name, private_key, address, chain, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        wallet.name,
        wallet.encrypted_key, // 保存加密后的私钥
        wallet.address,
        wallet.chain,
        wallet.created_at
      );

      wallet.id = result.lastInsertRowid as number;

      logger.info('WalletManager', `钱包创建成功: ${wallet.address}`);
      return wallet;
    } catch (error: any) {
      logger.error('WalletManager', '创建钱包失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Create Wallet');
      throw error;
    }
  }

  /**
   * 导入钱包（从私钥）
   */
  public async importWallet(
    name: string,
    network: 'BSC' | 'Solana',
    privateKey: string,
    type: 'privateKey' | 'mnemonic'
  ): Promise<WalletInfo> {
    try {
      logger.info('WalletManager', `导入${network}钱包: ${name}`);

      let wallet: WalletInfo;
      let address: string;

      if (network === 'BSC') {
        if (type === 'mnemonic') {
          const ethersWallet = Wallet.fromPhrase(privateKey);
          address = ethersWallet.address;
          privateKey = ethersWallet.privateKey;
        } else {
          // 从私钥导入
          const ethersWallet = new Wallet(privateKey);
          address = ethersWallet.address;
        }

        // 加密私钥
        const encryptedKey = encrypt(privateKey, this.password);

        wallet = {
          name,
          address,
          chain: network,
          private_key: privateKey,
          encrypted_key: encryptedKey,
          created_at: Date.now()
        };
      } else if (network === 'Solana') {
        if (type === 'mnemonic') {
          // Solana助记词导入（这里简化处理）
          throw new Error('Solana助记词导入功能待实现');
        } else {
          // 从私钥导入
          const decoded = bs58.decode(privateKey);
          if (decoded.length !== 64) {
            throw new Error('Solana私钥长度不正确，应为64字节');
          }
          const { Keypair } = await import('@solana/web3.js');
          const keypair = Keypair.fromSecretKey(decoded);
          address = keypair.publicKey.toBase58();
        }

        // 加密私钥
        const encryptedKey = encrypt(privateKey, this.password);

        wallet = {
          name,
          address,
          chain: network,
          private_key: privateKey,
          encrypted_key: encryptedKey,
          created_at: Date.now()
        };
      } else {
        throw new Error(`不支持的网络类型: ${network}`);
      }

      // 检查钱包是否已存在
      const db = getDatabase();
      const existing = db.prepare(
        'SELECT id FROM wallets WHERE address = ?'
      ).get(wallet.address);

      if (existing) {
        throw new Error('钱包地址已存在');
      }

      // 保存到数据库（只保存加密后的私钥）
      const result = db.prepare(`
        INSERT INTO wallets (name, private_key, address, chain, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        wallet.name,
        wallet.encrypted_key,
        wallet.address,
        wallet.chain,
        wallet.created_at
      );

      wallet.id = result.lastInsertRowid as number;

      logger.info('WalletManager', `钱包导入成功: ${wallet.address}`);
      return wallet;
    } catch (error: any) {
      logger.error('WalletManager', '导入钱包失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Import Wallet');
      throw error;
    }
  }

  /**
   * 获取所有钱包（不包含私钥）
   */
  public async getWallets(): Promise<Omit<WalletInfo, 'private_key'>[]> {
    try {
      const db = getDatabase();
      const wallets = db.prepare(`
        SELECT id, name, address, chain, created_at
        FROM wallets
        ORDER BY created_at DESC
      `).all() as Omit<WalletInfo, 'private_key'>[];

      logger.debug('WalletManager', `获取钱包列表: ${wallets.length}个钱包`);
      return wallets;
    } catch (error: any) {
      logger.error('WalletManager', '获取钱包列表失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Get Wallets');
      throw error;
    }
  }

  /**
   * 获取钱包余额
   */
  public async getBalance(walletId: number): Promise<any> {
    try {
      const db = getDatabase();
      const wallet = db.prepare(
        'SELECT * FROM wallets WHERE id = ?'
      ).get(walletId) as WalletInfo | undefined;

      if (!wallet) {
        throw new Error('钱包不存在');
      }

      // 这里应该调用实际的区块链API获取余额
      // 目前返回模拟数据
      const balance = {
        walletId: walletId,
        chain: wallet.chain,
        address: wallet.address,
        balance: '0.5',
        usdValue: '1500',
        updatedAt: Date.now()
      };

      logger.debug('WalletManager', `获取钱包余额: ${wallet.address}`);
      return balance;
    } catch (error: any) {
      logger.error('WalletManager', '获取钱包余额失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Get Balance');
      throw error;
    }
  }

  /**
   * 解密私钥
   */
  public decryptPrivateKey(encryptedKey: string): string {
    try {
      return decrypt(encryptedKey, this.password);
    } catch (error: any) {
      logger.error('WalletManager', '解密私钥失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Decrypt Private Key');
      throw error;
    }
  }

  /**
   * 签名交易
   */
  public async signTransaction(walletId: number, txData: any): Promise<any> {
    try {
      const db = getDatabase();
      const wallet = db.prepare(
        'SELECT * FROM wallets WHERE id = ?'
      ).get(walletId) as WalletInfo | undefined;

      if (!wallet) {
        throw new Error('钱包不存在');
      }

      // 解密私钥
      const privateKey = this.decryptPrivateKey(wallet.private_key);

      // 这里应该使用实际的区块链SDK签名交易
      // 目前返回模拟签名
      const result = {
        signed: true,
        txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        message: 'Transaction signed successfully'
      };

      logger.info('WalletManager', `交易签名成功: ${result.txHash}`);
      return result;
    } catch (error: any) {
      logger.error('WalletManager', '签名交易失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Sign Transaction');
      throw error;
    }
  }

  /**
   * 删除钱包
   */
  public async deleteWallet(walletId: number): Promise<void> {
    try {
      const db = getDatabase();
      db.prepare('DELETE FROM wallets WHERE id = ?').run(walletId);

      logger.info('WalletManager', `钱包已删除: ID ${walletId}`);
    } catch (error: any) {
      logger.error('WalletManager', '删除钱包失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Delete Wallet');
      throw error;
    }
  }

  /**
   * 更改钱包密码
   */
  public async changeWalletPassword(walletId: number, newPassword: string): Promise<void> {
    try {
      const db = getDatabase();
      const wallet = db.prepare(
        'SELECT * FROM wallets WHERE id = ?'
      ).get(walletId) as WalletInfo | undefined;

      if (!wallet) {
        throw new Error('钱包不存在');
      }

      // 解密私钥（使用旧密码）
      const privateKey = decrypt(wallet.private_key, this.password);

      // 使用新密码重新加密
      const newEncryptedKey = encrypt(privateKey, newPassword);

      // 更新数据库
      db.prepare(
        'UPDATE wallets SET private_key = ? WHERE id = ?'
      ).run(newEncryptedKey, walletId);

      // 更新管理器密码
      this.password = newPassword;

      logger.info('WalletManager', `钱包密码已更改: ID ${walletId}`);
    } catch (error: any) {
      logger.error('WalletManager', '更改钱包密码失败', error);
      errorHandler.handleError(error, ErrorCategory.WALLET, 'Change Password');
      throw error;
    }
  }
}

/**
 * 生成钱包管理器（用于IPC调用）
 */
export function createWalletManager(password: string): WalletManager {
  return new WalletManager(password);
}

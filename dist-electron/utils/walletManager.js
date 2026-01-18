"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletManager = void 0;
exports.createWalletManager = createWalletManager;
const ethers_1 = require("ethers");
const bs58 = __importStar(require("bs58"));
const database_1 = require("../data/database");
const cryptoUtils_1 = require("./cryptoUtils");
const logger_1 = require("./logger");
const errorHandler_1 = require("./errorHandler");
/**
 * 钱包管理器类
 * 负责钱包的创建、导入、加密存储和解密
 */
class WalletManager {
    constructor(password) {
        if (!password) {
            throw new Error('钱包密码不能为空');
        }
        this.password = password;
    }
    /**
     * 创建钱包（从助记词）
     */
    async createWallet(name, network) {
        try {
            logger_1.logger.info('WalletManager', `创建${network}钱包: ${name}`);
            let wallet;
            if (network === 'BSC') {
                // 从随机助记词创建BSC钱包
                const mnemonic = ethers_1.Wallet.createRandom().mnemonic?.phrase || '';
                const ethersWallet = ethers_1.Wallet.fromPhrase(mnemonic);
                // 加密私钥
                const encryptedKey = (0, cryptoUtils_1.encrypt)(ethersWallet.privateKey, this.password);
                wallet = {
                    id: 0, // 临时ID，保存后会更新
                    name,
                    address: ethersWallet.address,
                    chain: network,
                    private_key: ethersWallet.privateKey, // 临时保存，返回后应删除
                    encrypted_key: encryptedKey,
                    created_at: Date.now()
                };
            }
            else if (network === 'Solana') {
                // 使用@solana/web3.js创建Solana钱包
                const { Keypair } = await Promise.resolve().then(() => __importStar(require('@solana/web3.js')));
                const keypair = Keypair.generate();
                // 私钥转换为Base58
                const privateKey = bs58.encode(keypair.secretKey);
                const address = keypair.publicKey.toBase58();
                // 加密私钥
                const encryptedKey = (0, cryptoUtils_1.encrypt)(privateKey, this.password);
                wallet = {
                    id: 0, // 临时ID，保存后会更新
                    name,
                    address,
                    chain: network,
                    private_key: privateKey,
                    encrypted_key: encryptedKey,
                    created_at: Date.now()
                };
            }
            else {
                throw new Error(`不支持的网络类型: ${network}`);
            }
            // 保存到数据库（只保存加密后的私钥）
            const db = (0, database_1.getDatabase)();
            const result = db.prepare(`
        INSERT INTO wallets (name, private_key, address, chain, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(wallet.name, wallet.encrypted_key, // 保存加密后的私钥
            wallet.address, wallet.chain, wallet.created_at);
            wallet.id = result.lastInsertRowid;
            logger_1.logger.info('WalletManager', `钱包创建成功: ${wallet.address}`);
            return wallet;
        }
        catch (error) {
            logger_1.logger.error('WalletManager', '创建钱包失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Create Wallet');
            throw error;
        }
    }
    /**
     * 导入钱包（从私钥）
     */
    async importWallet(name, network, privateKey, type) {
        try {
            logger_1.logger.info('WalletManager', `导入${network}钱包: ${name}`);
            let wallet;
            let address;
            if (network === 'BSC') {
                if (type === 'mnemonic') {
                    const ethersWallet = ethers_1.Wallet.fromPhrase(privateKey);
                    address = ethersWallet.address;
                    privateKey = ethersWallet.privateKey;
                }
                else {
                    // 从私钥导入
                    const ethersWallet = new ethers_1.Wallet(privateKey);
                    address = ethersWallet.address;
                }
                // 加密私钥
                const encryptedKey = (0, cryptoUtils_1.encrypt)(privateKey, this.password);
                wallet = {
                    id: 0, // 临时ID，保存后会更新
                    name,
                    address,
                    chain: network,
                    private_key: privateKey,
                    encrypted_key: encryptedKey,
                    created_at: Date.now()
                };
            }
            else if (network === 'Solana') {
                if (type === 'mnemonic') {
                    // Solana助记词导入（这里简化处理）
                    throw new Error('Solana助记词导入功能待实现');
                }
                else {
                    // 从私钥导入
                    const decoded = bs58.decode(privateKey);
                    if (decoded.length !== 64) {
                        throw new Error('Solana私钥长度不正确，应为64字节');
                    }
                    const { Keypair } = await Promise.resolve().then(() => __importStar(require('@solana/web3.js')));
                    const keypair = Keypair.fromSecretKey(decoded);
                    address = keypair.publicKey.toBase58();
                }
                // 加密私钥
                const encryptedKey = (0, cryptoUtils_1.encrypt)(privateKey, this.password);
                wallet = {
                    id: 0, // 临时ID，保存后会更新
                    name,
                    address,
                    chain: network,
                    private_key: privateKey,
                    encrypted_key: encryptedKey,
                    created_at: Date.now()
                };
            }
            else {
                throw new Error(`不支持的网络类型: ${network}`);
            }
            // 检查钱包是否已存在
            const db = (0, database_1.getDatabase)();
            const existing = db.prepare('SELECT id FROM wallets WHERE address = ?').get(wallet.address);
            if (existing) {
                throw new Error('钱包地址已存在');
            }
            // 保存到数据库（只保存加密后的私钥）
            const result = db.prepare(`
        INSERT INTO wallets (name, private_key, address, chain, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(wallet.name, wallet.encrypted_key, wallet.address, wallet.chain, wallet.created_at);
            wallet.id = result.lastInsertRowid;
            logger_1.logger.info('WalletManager', `钱包导入成功: ${wallet.address}`);
            return wallet;
        }
        catch (error) {
            logger_1.logger.error('WalletManager', '导入钱包失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Import Wallet');
            throw error;
        }
    }
    /**
     * 获取所有钱包（不包含私钥）
     */
    async getWallets() {
        try {
            const db = (0, database_1.getDatabase)();
            const wallets = db.prepare(`
        SELECT id, name, address, chain, created_at
        FROM wallets
        ORDER BY created_at DESC
      `).all();
            logger_1.logger.debug('WalletManager', `获取钱包列表: ${wallets.length}个钱包`);
            return wallets;
        }
        catch (error) {
            logger_1.logger.error('WalletManager', '获取钱包列表失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Get Wallets');
            throw error;
        }
    }
    /**
     * 获取钱包余额
     */
    async getBalance(walletId) {
        try {
            const db = (0, database_1.getDatabase)();
            const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(walletId);
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
            logger_1.logger.debug('WalletManager', `获取钱包余额: ${wallet.address}`);
            return balance;
        }
        catch (error) {
            logger_1.logger.error('WalletManager', '获取钱包余额失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Get Balance');
            throw error;
        }
    }
    /**
     * 解密私钥
     */
    decryptPrivateKey(encryptedKey) {
        try {
            return (0, cryptoUtils_1.decrypt)(encryptedKey, this.password);
        }
        catch (error) {
            logger_1.logger.error('WalletManager', '解密私钥失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Decrypt Private Key');
            throw error;
        }
    }
    /**
     * 签名交易
     */
    async signTransaction(walletId, txData) {
        try {
            const db = (0, database_1.getDatabase)();
            const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(walletId);
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
            logger_1.logger.info('WalletManager', `交易签名成功: ${result.txHash}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('WalletManager', '签名交易失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Sign Transaction');
            throw error;
        }
    }
    /**
     * 删除钱包
     */
    async deleteWallet(walletId) {
        try {
            const db = (0, database_1.getDatabase)();
            db.prepare('DELETE FROM wallets WHERE id = ?').run(walletId);
            logger_1.logger.info('WalletManager', `钱包已删除: ID ${walletId}`);
        }
        catch (error) {
            logger_1.logger.error('WalletManager', '删除钱包失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Delete Wallet');
            throw error;
        }
    }
    /**
     * 更改钱包密码
     */
    async changeWalletPassword(walletId, newPassword) {
        try {
            const db = (0, database_1.getDatabase)();
            const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(walletId);
            if (!wallet) {
                throw new Error('钱包不存在');
            }
            // 解密私钥（使用旧密码）
            const privateKey = (0, cryptoUtils_1.decrypt)(wallet.private_key, this.password);
            // 使用新密码重新加密
            const newEncryptedKey = (0, cryptoUtils_1.encrypt)(privateKey, newPassword);
            // 更新数据库
            db.prepare('UPDATE wallets SET private_key = ? WHERE id = ?').run(newEncryptedKey, walletId);
            // 更新管理器密码
            this.password = newPassword;
            logger_1.logger.info('WalletManager', `钱包密码已更改: ID ${walletId}`);
        }
        catch (error) {
            logger_1.logger.error('WalletManager', '更改钱包密码失败', error);
            errorHandler_1.errorHandler.handleError(error, errorHandler_1.ErrorCategory.WALLET, 'Change Password');
            throw error;
        }
    }
}
exports.WalletManager = WalletManager;
/**
 * 生成钱包管理器（用于IPC调用）
 */
function createWalletManager(password) {
    return new WalletManager(password);
}

import { getDatabase } from '../data/database';
import { Wallet } from 'ethers';
import * as bs58 from 'bs58';

/**
 * 创建钱包（从助记词）
 */
export async function createWallet(mnemonic: string): Promise<any> {
  const db = getDatabase();

  // 从助记词创建钱包
  const wallet = Wallet.fromPhrase(mnemonic);

  const result = db.prepare(`
    INSERT INTO wallets (name, private_key, address, chain)
    VALUES (?, ?, ?, ?)
  `).run(
    `Wallet ${wallet.address.substring(0, 8)}`,
    wallet.privateKey,
    wallet.address,
    'BSC'
  );

  return {
    id: result.lastInsertRowid,
    name: `Wallet ${wallet.address.substring(0, 8)}`,
    address: wallet.address,
    chain: 'BSC',
    createdAt: Date.now(),
  };
}

/**
 * 导入钱包（从私钥）
 */
export async function importWallet(privateKey: string): Promise<any> {
  const db = getDatabase();

  let address: string;
  let chain = 'BSC';

  // 尝试判断是EVM还是Solana钱包
  if (privateKey.length === 64 || privateKey.startsWith('0x')) {
    // EVM钱包
    const wallet = new Wallet(privateKey);
    address = wallet.address;
  } else {
    // Solana钱包（这里简化处理，实际需要使用@solana/web3.js）
    try {
      const decoded = bs58.decode(privateKey);
      if (decoded.length === 64) {
        // Solana私钥
        chain = 'Solana';
        address = privateKey.substring(0, 8); // 简化处理
      } else {
        throw new Error('Invalid private key format');
      }
    } catch {
      // 回退到EVM
      const wallet = new Wallet(privateKey);
      address = wallet.address;
    }
  }

  // 检查钱包是否已存在
  const existing = db.prepare(
    'SELECT id FROM wallets WHERE private_key = ?'
  ).get(privateKey);

  if (existing) {
    throw new Error('Wallet already exists');
  }

  const result = db.prepare(`
    INSERT INTO wallets (name, private_key, address, chain)
    VALUES (?, ?, ?, ?)
  `).run(
    `Wallet ${address.substring(0, 8)}`,
    privateKey,
    address,
    chain
  );

  return {
    id: result.lastInsertRowid,
    name: `Wallet ${address.substring(0, 8)}`,
    address: address,
    chain: chain,
    createdAt: Date.now(),
  };
}

/**
 * 获取所有钱包
 */
export async function getWallets(): Promise<any[]> {
  const db = getDatabase();

  const wallets = db.prepare(`
    SELECT id, name, address, chain, created_at
    FROM wallets
    ORDER BY created_at DESC
  `).all();

  return wallets;
}

/**
 * 获取钱包余额
 */
export async function getBalance(walletId: string, chain: string): Promise<any> {
  const db = getDatabase();

  const wallet = db.prepare(
    'SELECT * FROM wallets WHERE id = ? AND chain = ?'
  ).get(walletId);

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  // 这里应该调用实际的区块链API获取余额
  // 目前返回模拟数据
  return {
    walletId: walletId,
    chain: chain,
    balance: '0.5', // ETH/SOL
    usdValue: '1500',
    updatedAt: Date.now(),
  };
}

/**
 * 签名交易
 */
export async function signTransaction(
  walletId: string,
  chain: string,
  txData: any
): Promise<any> {
  const db = getDatabase();

  const wallet = db.prepare(
    'SELECT * FROM wallets WHERE id = ? AND chain = ?'
  ).get(walletId);

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  // 这里应该使用实际的区块链SDK签名交易
  // 目前返回模拟签名
  return {
    signed: true,
    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    message: 'Transaction signed successfully',
  };
}

/**
 * 删除钱包
 */
export async function deleteWallet(walletId: string): Promise<void> {
  const db = getDatabase();

  db.prepare('DELETE FROM wallets WHERE id = ?').run(walletId);

  console.log(`Wallet ${walletId} deleted`);
}

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { errorHandler, ErrorCategory } from '../utils/errorHandler';

let db: Database.Database | null = null;

const DB_PATH = path.join(process.cwd(), 'meme-master-pro.db');

/**
 * 初始化数据库
 */
export async function initializeDatabase(): Promise<void> {
  if (db) {
    logger.warn('Database', '数据库已初始化，跳过');
    return;
  }

  try {
    logger.info('Database', '开始初始化数据库...');

    // 确保数据目录存在
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      logger.debug('Database', `创建数据库目录: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // 启用WAL模式以提高性能

    logger.info('Database', 'WAL模式已启用');

    // 创建所有表
    createTables();

    logger.info('Database', `数据库初始化成功: ${DB_PATH}`);
  } catch (error: any) {
    logger.error('Database', '数据库初始化失败', error);
    errorHandler.handleError(error, ErrorCategory.DATABASE, 'Initialize Database');
    throw error;
  }
}

/**
 * 创建数据库表
 */
function createTables(): void {
  if (!db) {
    logger.error('Database', '数据库实例为空，无法创建表');
    return;
  }

  logger.debug('Database', '开始创建数据库表...');

  try {
    // 钱包表
    db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      private_key TEXT NOT NULL,
      address TEXT NOT NULL,
      chain TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 发行任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS launch_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT UNIQUE NOT NULL,
      token_name TEXT NOT NULL,
      token_symbol TEXT NOT NULL,
      chain TEXT NOT NULL,
      total_supply TEXT NOT NULL,
      status TEXT NOT NULL,
      contract_address TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 交易记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT UNIQUE NOT NULL,
      wallet_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      chain TEXT NOT NULL,
      amount TEXT NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      status TEXT NOT NULL,
      gas_used TEXT,
      gas_price TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
    )
  `);

  // 风险预警表
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      is_read INTEGER NOT NULL DEFAULT 0
    )
  `);

  // 情绪分析表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sentiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL,
      source TEXT NOT NULL,
      sentiment REAL NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // MEV防护统计表
  db.exec(`
    CREATE TABLE IF NOT EXISTS mev_protection_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attack_type TEXT NOT NULL,
      blocked INTEGER NOT NULL,
      detected_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 市场监控表
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT UNIQUE NOT NULL,
      token_name TEXT NOT NULL,
      token_symbol TEXT NOT NULL,
      chain TEXT NOT NULL,
      added_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_chain ON transactions(chain);
    CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level);
    CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
    CREATE INDEX IF NOT EXISTS idx_sentiments_token ON sentiments(token);
    CREATE INDEX IF NOT EXISTS idx_launch_tasks_status ON launch_tasks(status);
  `);

  // 插入默认设置
  const defaultSettings = [
    { key: 'theme', value: 'dark' },
    { key: 'language', value: 'zh-CN' },
    { key: 'auto_trading_enabled', value: 'false' },
    { key: 'mev_protection_enabled', value: 'true' },
  ];

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );

  const insertMany = db.transaction((settings) => {
    for (const setting of settings) {
      insertSetting.run(setting.key, setting.value);
    }
  });

  insertMany(defaultSettings);

    logger.info('Database', '所有数据库表创建完成');
  } catch (error: any) {
    logger.error('Database', '创建数据库表失败', error);
    throw error;
  }
}

/**
 * 获取数据库实例
 */
export function getDatabase(): Database.Database {
  if (!db) {
    const error = new Error('Database not initialized. Call initializeDatabase() first.');
    logger.error('Database', '获取数据库实例失败：数据库未初始化');
    errorHandler.handleError(error, ErrorCategory.DATABASE, 'Get Database Instance');
    throw error;
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
      db = null;
      logger.info('Database', '数据库连接已关闭');
    } catch (error: any) {
      logger.error('Database', '关闭数据库连接失败', error);
      errorHandler.handleError(error, ErrorCategory.DATABASE, 'Close Database');
    }
  }
}

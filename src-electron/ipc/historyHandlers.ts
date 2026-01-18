import { getDatabase } from '../data/database';
import fs from 'fs';
import path from 'path';

/**
 * 获取交易历史
 */
export async function getTransactions(filters?: any): Promise<any[]> {
  const db = getDatabase();

  let query = 'SELECT * FROM transactions';
  const params: any[] = [];

  if (filters?.chain) {
    query += ' WHERE chain = ?';
    params.push(filters.chain);
  }

  if (filters?.walletId) {
    query += params.length > 0 ? ' AND wallet_id = ?' : ' WHERE wallet_id = ?';
    params.push(filters.walletId);
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const transactions = db.prepare(query).all(...params);

  return transactions;
}

/**
 * 导出交易记录
 */
export async function exportTransactions(format: string): Promise<any> {
  const db = getDatabase();

  const transactions = db.prepare(`
    SELECT * FROM transactions
    ORDER BY created_at DESC
  `).all();

  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = Date.now();
  let filePath: string;

  if (format === 'csv') {
    filePath = path.join(exportDir, `transactions_${timestamp}.csv`);
    const headers = Object.keys(transactions[0] || {}).join(',');
    const rows = transactions.map((t: any) => Object.values(t).join(','));
    fs.writeFileSync(filePath, [headers, ...rows].join('\n'));
  } else {
    filePath = path.join(exportDir, `transactions_${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2));
  }

  return {
    filePath: filePath,
    recordCount: transactions.length,
    format: format,
    exportedAt: timestamp,
  };
}

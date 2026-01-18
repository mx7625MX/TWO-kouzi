import { getDatabase } from '../data/database';
import fs from 'fs';
import path from 'path';

/**
 * 导出数据
 */
export async function exportData(type: string): Promise<any> {
  const db = getDatabase();
  const exportDir = path.join(process.cwd(), 'exports');
  
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = Date.now();
  let filePath: string;

  switch (type) {
    case 'wallets':
      const wallets = db.prepare('SELECT id, name, address, chain FROM wallets').all();
      filePath = path.join(exportDir, `wallets_${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(wallets, null, 2));
      break;
    
    case 'settings':
      const settings = db.prepare('SELECT * FROM settings').all();
      filePath = path.join(exportDir, `settings_${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
      break;
    
    case 'full':
      const allData = {
        wallets: db.prepare('SELECT id, name, address, chain FROM wallets').all(),
        settings: db.prepare('SELECT * FROM settings').all(),
        transactions: db.prepare('SELECT * FROM transactions LIMIT 1000').all(),
      };
      filePath = path.join(exportDir, `full_backup_${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
      break;
    
    default:
      throw new Error(`Unknown export type: ${type}`);
  }

  return {
    filePath: filePath,
    type: type,
    exportedAt: timestamp,
  };
}

/**
 * 导入数据
 */
export async function importData(type: string, filePath: string): Promise<any> {
  // 这里应该实现数据导入逻辑
  console.log(`Importing ${type} from ${filePath}`);
  
  return {
    type: type,
    status: 'success',
    importedAt: Date.now(),
  };
}

/**
 * 清理数据
 */
export async function clearData(type: string): Promise<any> {
  const db = getDatabase();

  switch (type) {
    case 'alerts':
      db.prepare('DELETE FROM alerts').run();
      break;
    case 'transactions':
      db.prepare('DELETE FROM transactions').run();
      break;
    case 'sentiments':
      db.prepare('DELETE FROM sentiments').run();
      break;
    default:
      throw new Error(`Unknown clear type: ${type}`);
  }

  return {
    type: type,
    clearedAt: Date.now(),
  };
}

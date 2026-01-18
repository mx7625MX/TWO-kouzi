import { ipcMain } from 'electron';

// 存储所有注册的IPC处理器名称
const registeredHandlers: Set<string> = new Set();

/**
 * 注册IPC处理器并记录
 */
export function registerIpcHandler(channel: string, handler: (...args: any[]) => any) {
  if (registeredHandlers.has(channel)) {
    console.warn(`IPC handler already registered: ${channel}`);
    return;
  }

  ipcMain.handle(channel, handler);
  registeredHandlers.add(channel);
  console.log(`IPC handler registered: ${channel}`);
}

/**
 * 清理所有IPC处理器
 */
export function cleanupAllHandlers() {
  console.log('Cleaning up all IPC handlers...');
  registeredHandlers.forEach((channel) => {
    ipcMain.removeHandler(channel);
    console.log(`IPC handler removed: ${channel}`);
  });
  registeredHandlers.clear();
}

/**
 * 获取已注册的处理器列表
 */
export function getRegisteredHandlers(): string[] {
  return Array.from(registeredHandlers);
}

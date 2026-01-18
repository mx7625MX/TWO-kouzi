"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandler = registerIpcHandler;
exports.cleanupAllHandlers = cleanupAllHandlers;
exports.getRegisteredHandlers = getRegisteredHandlers;
const electron_1 = require("electron");
// 存储所有注册的IPC处理器名称
const registeredHandlers = new Set();
/**
 * 注册IPC处理器并记录
 */
function registerIpcHandler(channel, handler) {
    if (registeredHandlers.has(channel)) {
        console.warn(`IPC handler already registered: ${channel}`);
        return;
    }
    electron_1.ipcMain.handle(channel, handler);
    registeredHandlers.add(channel);
    console.log(`IPC handler registered: ${channel}`);
}
/**
 * 清理所有IPC处理器
 */
function cleanupAllHandlers() {
    console.log('Cleaning up all IPC handlers...');
    registeredHandlers.forEach((channel) => {
        electron_1.ipcMain.removeHandler(channel);
        console.log(`IPC handler removed: ${channel}`);
    });
    registeredHandlers.clear();
}
/**
 * 获取已注册的处理器列表
 */
function getRegisteredHandlers() {
    return Array.from(registeredHandlers);
}

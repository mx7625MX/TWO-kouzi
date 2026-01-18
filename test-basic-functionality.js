/**
 * 基本功能测试脚本
 * 测试加密、日志、错误处理等核心功能
 */

// 测试加密功能
console.log('=== 测试加密功能 ===');
try {
  const cryptoUtils = require('./src-electron/utils/cryptoUtils.ts');
  const testPassword = 'TestPassword123!@#';
  const testPrivateKey = '0x1234567890abcdef';

  // 测试加密
  const encrypted = cryptoUtils.encrypt(testPrivateKey, testPassword);
  console.log('✓ 加密成功:', encrypted.substring(0, 50) + '...');

  // 测试解密
  const decrypted = cryptoUtils.decrypt(encrypted, testPassword);
  console.log('✓ 解密成功:', decrypted === testPrivateKey ? '匹配' : '不匹配');

  // 测试密码强度
  const strength = cryptoUtils.validatePasswordStrength(testPassword);
  console.log('✓ 密码强度:', strength.description, '(分数:', strength.score + ')');
} catch (error) {
  console.error('✗ 加密功能测试失败:', error.message);
}

// 测试日志功能
console.log('\n=== 测试日志功能 ===');
try {
  const logger = require('./src-electron/utils/logger.ts');
  console.log('✓ 日志模块加载成功');
} catch (error) {
  console.error('✗ 日志功能测试失败:', error.message);
}

// 测试错误处理功能
console.log('\n=== 测试错误处理功能 ===');
try {
  const errorHandler = require('./src-electron/utils/errorHandler.ts');
  console.log('✓ 错误处理模块加载成功');
} catch (error) {
  console.error('✗ 错误处理功能测试失败:', error.message);
}

// 测试数据库功能
console.log('\n=== 测试数据库功能 ===');
try {
  const dbModule = require('./src-electron/data/database.ts');
  console.log('✓ 数据库模块加载成功');
} catch (error) {
  console.error('✗ 数据库功能测试失败:', error.message);
}

console.log('\n=== 所有测试完成 ===');

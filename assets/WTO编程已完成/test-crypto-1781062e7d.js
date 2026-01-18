#!/usr/bin/env node

/**
 * 加密功能快速测试脚本
 */

const { encrypt, decrypt, validatePasswordStrength } = require('../dist/shared/cryptoUtils')

console.log('=== 加密工具测试 ===\n')

// 测试1: 基本加密解密
console.log('测试1: 基本加密解密')
const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
const password = 'TestPassword123!'

try {
  const encrypted = encrypt(privateKey, password)
  console.log('✓ 加密成功')
  console.log('  加密结果:', encrypted.substring(0, 50) + '...')
  
  const decrypted = decrypt(encrypted, password)
  console.log('✓ 解密成功')
  console.log('  解密结果:', decrypted)
  console.log('  匹配:', decrypted === privateKey ? '✓ 是' : '✗ 否')
} catch (error) {
  console.error('✗ 测试失败:', error.message)
}

// 测试2: 错误密码
console.log('\n测试2: 错误密码解密')
try {
  const encrypted = encrypt(privateKey, password)
  decrypt(encrypted, 'WrongPassword')
  console.error('✗ 应该抛出错误但没有')
} catch (error) {
  console.log('✓ 正确捕获错误:', error.message.substring(0, 50))
}

// 测试3: 密码强度
console.log('\n测试3: 密码强度验证')
const testPasswords = [
  '123',
  'password',
  'Password123',
  'P@ssw0rd!123'
]

testPasswords.forEach(pwd => {
  const strength = validatePasswordStrength(pwd)
  console.log(`  "${pwd}" - ${strength.score}/4 (${strength.description})`)
})

console.log('\n=== 所有测试完成 ===')

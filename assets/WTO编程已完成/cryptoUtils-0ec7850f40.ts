/**
 * 加密工具使用示例
 * 演示如何使用cryptoUtils进行加密和解密
 */

import { 
  encrypt, 
  decrypt, 
  generateRandomPassword,
  validatePasswordStrength,
  hashPassword,
  verifyPasswordHash,
  encryptObject,
  decryptObject
} from '../shared/cryptoUtils'

// 示例1: 基本的字符串加密和解密
function example1() {
  console.log('=== 示例1: 基本加密解密 ===')
  
  const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  const password = 'MySecurePassword123!'
  
  // 加密
  const encrypted = encrypt(privateKey, password)
  console.log('加密后:', encrypted)
  
  // 解密
  const decrypted = decrypt(encrypted, password)
  console.log('解密后:', decrypted)
  console.log('是否匹配:', decrypted === privateKey)
}

// 示例2: 生成随机密码
function example2() {
  console.log('\n=== 示例2: 生成随机密码 ===')
  
  const password = generateRandomPassword(32)
  console.log('随机密码:', password)
  console.log('密码长度:', password.length)
}

// 示例3: 验证密码强度
function example3() {
  console.log('\n=== 示例3: 密码强度验证 ===')
  
  const passwords = [
    '123',
    'password',
    'Password123',
    'P@ssw0rd!123',
    'MyV3ry$tr0ng&C0mpl3xP@ssw0rd!'
  ]
  
  passwords.forEach(pwd => {
    const strength = validatePasswordStrength(pwd)
    console.log(`密码: "${pwd}" - 强度: ${strength.score}/4 (${strength.description})`)
  })
}

// 示例4: 密码哈希和验证
function example4() {
  console.log('\n=== 示例4: 密码哈希 ===')
  
  const password = 'MyPassword123'
  const hash = hashPassword(password)
  console.log('密码:', password)
  console.log('哈希:', hash)
  
  // 验证正确密码
  const isValid = verifyPasswordHash(password, hash)
  console.log('验证正确密码:', isValid)
  
  // 验证错误密码
  const isInvalid = verifyPasswordHash('WrongPassword', hash)
  console.log('验证错误密码:', isInvalid)
}

// 示例5: 对象加密和解密
function example5() {
  console.log('\n=== 示例5: 对象加密解密 ===')
  
  const walletData = {
    id: '123456',
    name: '主钱包',
    address: '0xabcdef1234567890',
    network: 'BSC',
    privateKey: '0x1234567890abcdef'
  }
  
  const password = 'SecurePassword123!'
  
  // 加密对象
  const encrypted = encryptObject(walletData, password)
  console.log('加密后:', encrypted.substring(0, 50) + '...')
  
  // 解密对象
  const decrypted = decryptObject(encrypted, password)
  console.log('解密后:', decrypted)
  console.log('数据匹配:', JSON.stringify(decrypted) === JSON.stringify(walletData))
}

// 示例6: 在WalletManager中的实际应用
function example6() {
  console.log('\n=== 示例6: WalletManager集成 ===')
  
  // 用户设置的密码
  const userPassword = 'MyWalletPassword123!'
  
  // 钱包的私钥（需要加密存储）
  const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  
  // 加密私钥（存储到数据库）
  const encryptedKey = encrypt(privateKey, userPassword)
  console.log('加密的私钥（存储到数据库）:', encryptedKey.substring(0, 50) + '...')
  
  // 需要使用私钥时解密
  const decryptedKey = decrypt(encryptedKey, userPassword)
  console.log('解密的私钥（用于交易）:', decryptedKey)
  console.log('私钥正确:', decryptedKey === privateKey)
}

// 运行所有示例
export function runAllExamples() {
  try {
    example1()
    example2()
    example3()
    example4()
    example5()
    example6()
    
    console.log('\n所有示例执行完成！')
  } catch (error: any) {
    console.error('示例执行失败:', error.message)
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples()
}

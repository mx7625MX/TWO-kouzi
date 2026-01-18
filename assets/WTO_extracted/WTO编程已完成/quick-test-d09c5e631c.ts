/**
 * 快速测试钱包管理核心功能
 * 不依赖网络的本地测试
 */

import { WalletManager } from '../main/WalletManager.js'
import { encrypt, decrypt, validatePasswordStrength } from '../shared/cryptoUtils.js'

async function runTests() {
console.log('🧪 开始钱包管理快速测试\n')

let passed = 0
let failed = 0

// 测试1: 创建BSC钱包
console.log('测试1: 创建BSC钱包')
try {
  const manager = new WalletManager('test_pass_123')
  const wallet = await manager.createWallet('测试BSC钱包', 'BSC')
  
  if (!wallet.address.startsWith('0x')) throw new Error('地址格式错误')
  if (wallet.address.length !== 42) throw new Error('地址长度错误')
  if (!wallet.privateKey.startsWith('0x')) throw new Error('私钥格式错误')
  if (wallet.privateKey.length !== 66) throw new Error('私钥长度错误')
  
  console.log('✅ 通过 - 地址:', wallet.address)
  console.log('   私钥长度:', wallet.privateKey.length)
  passed++
} catch (error: any) {
  console.error('❌ 失败:', error.message)
  failed++
}

// 测试2: 创建Solana钱包
console.log('\n测试2: 创建Solana钱包')
try {
  const manager = new WalletManager('test_pass_123')
  const wallet = await manager.createWallet('测试Solana钱包', 'Solana')
  
  if (!wallet.address) throw new Error('缺少地址')
  if (wallet.address.length < 32 || wallet.address.length > 44) {
    throw new Error('地址长度错误')
  }
  if (!wallet.privateKey) throw new Error('缺少私钥')
  
  console.log('✅ 通过 - 地址:', wallet.address)
  console.log('   地址长度:', wallet.address.length)
  passed++
} catch (error: any) {
  console.error('❌ 失败:', error.message)
  failed++
}

// 测试3: 私钥加密解密
console.log('\n测试3: 私钥加密和解密')
try {
  const password = 'TestPassword123!'
  const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  
  const encrypted = encrypt(privateKey, password)
  const decrypted = decrypt(encrypted, password)
  
  if (decrypted !== privateKey) throw new Error('解密结果不匹配')
  
  // 测试错误密码
  try {
    decrypt(encrypted, 'WrongPassword')
    throw new Error('应该抛出错误')
  } catch (e: any) {
    if (e.message === '应该抛出错误') throw e
    // 正确捕获解密错误
  }
  
  console.log('✅ 通过 - 加密长度:', encrypted.length)
  console.log('   解密成功，错误密码正确拒绝')
  passed++
} catch (error: any) {
  console.error('❌ 失败:', error.message)
  failed++
}

// 测试4: WalletManager加密解密
console.log('\n测试4: WalletManager加密解密')
try {
  const manager = new WalletManager('test_pass_123')
  const wallet = await manager.createWallet('加密测试', 'BSC')
  
  const decrypted = manager.decryptPrivateKey(wallet.encrypted_key)
  
  if (decrypted !== wallet.privateKey) {
    throw new Error('解密私钥不匹配')
  }
  
  console.log('✅ 通过 - 加密密钥长度:', wallet.encrypted_key.length)
  console.log('   解密成功')
  passed++
} catch (error: any) {
  console.error('❌ 失败:', error.message)
  failed++
}

// 测试5: 导入BSC私钥
console.log('\n测试5: 导入BSC私钥')
try {
  const manager = new WalletManager('test_pass_123')
  const testKey = '0x4c0883a69102937d6231471b5dbb6204fe512961708279f8c5c1e5d2e5b1c4f1'
  
  const wallet = await manager.importWallet(
    '导入的BSC钱包',
    'BSC',
    testKey,
    'privateKey'
  )
  
  if (!wallet.address.startsWith('0x')) throw new Error('地址格式错误')
  if (wallet.address.length !== 42) throw new Error('地址长度错误')
  
  console.log('✅ 通过 - 导入地址:', wallet.address)
  passed++
} catch (error: any) {
  console.error('❌ 失败:', error.message)
  failed++
}

// 测试6: 导入Solana私钥
console.log('\n测试6: 导入Solana私钥')
try {
  const manager = new WalletManager('test_pass_123')
  
  // 先创建一个来获取有效私钥
  const temp = await manager.createWallet('临时', 'Solana')
  
  const wallet = await manager.importWallet(
    '导入的Solana钱包',
    'Solana',
    temp.privateKey,
    'privateKey'
  )
  
  if (wallet.address !== temp.address) {
    throw new Error('导入后地址不匹配')
  }
  
  console.log('✅ 通过 - 导入地址:', wallet.address)
  console.log('   地址匹配')
  passed++
} catch (error: any) {
  console.error('❌ 失败:', error.message)
  failed++
}

// 测试7: 导入助记词
console.log('\n测试7: 导入助记词')
try {
  const manager = new WalletManager('test_pass_123')
  const mnemonic = 'test test test test test test test test test test test junk'
  
  const bscWallet = await manager.importWallet(
    '助记词BSC钱包',
    'BSC',
    mnemonic,
    'mnemonic'
  )
  
  const solanaWallet = await manager.importWallet(
    '助记词Solana钱包',
    'Solana',
    mnemonic,
    'mnemonic'
  )
  
  if (!bscWallet.address.startsWith('0x')) throw new Error('BSC地址错误')
  if (solanaWallet.address.length < 32) throw new Error('Solana地址错误')
  
  // 验证一致性
  const bscWallet2 = await manager.importWallet(
    '助记词BSC钱包2',
    'BSC',
    mnemonic,
    'mnemonic'
  )
  
  if (bscWallet.address !== bscWallet2.address) {
    throw new Error('相同助记词地址不一致')
  }
  
  console.log('✅ 通过 - BSC:', bscWallet.address)
  console.log('   Solana:', solanaWallet.address)
  console.log('   地址一致性验证通过')
  passed++
} catch (error: any) {
  console.error('❌ 失败:', error.message)
  failed++
}

// 测试8: 密码强度验证
console.log('\n测试8: 密码强度验证')
try {
  const tests = [
    { pwd: '123', minScore: 0 },
    { pwd: 'password', minScore: 0 },
    { pwd: 'Password1', minScore: 2 },
    { pwd: 'P@ssw0rd!', minScore: 3 },
  ]
  
  tests.forEach(({ pwd, minScore }) => {
    const result = validatePasswordStrength(pwd)
    console.log(`   "${pwd}" -> ${result.score}/4 (${result.description})`)
    if (result.score < minScore) {
      throw new Error(`密码 "${pwd}" 强度过低`)
    }
  })
  
  console.log('✅ 通过 - 密码强度验证正常')
  passed++
} catch (error: any) {
  console.error('❌ 失败:', error.message)
  failed++
}

// 测试9: 地址验证
console.log('\n测试9: 地址验证')
try {
  const manager = new WalletManager()
  
  // BSC
  if (!manager.validateAddress('0x8894E0a0c962CB723c1976a4421c95949bE2D4E3', 'BSC')) {
    throw new Error('有效BSC地址验证失败')
  }
  if (manager.validateAddress('0xinvalid', 'BSC')) {
    throw new Error('无效BSC地址未被拒绝')
  }
  
  // Solana
  if (!manager.validateAddress('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK', 'Solana')) {
    throw new Error('有效Solana地址验证失败')
  }
  if (manager.validateAddress('invalid', 'Solana')) {
    throw new Error('无效Solana地址未被拒绝')
  }
  
  console.log('✅ 通过 - BSC和Solana地址验证正常')
  passed++
} catch (error: any) {
  console.error('❌ 失败:', error.message)
  failed++
}

// 测试10: 余额格式化
console.log('\n测试10: 余额格式化')
try {
  const manager = new WalletManager()
  
  const tests = [
    { input: '123.456789', decimals: 4, expected: '123.4568' },
    { input: '0.000123', decimals: 6, expected: '0.000123' },
    { input: '0', decimals: 4, expected: '0.0000' },
  ]
  
  tests.forEach(({ input, decimals, expected }) => {
    const result = manager.formatBalance(input, decimals)
    console.log(`   "${input}" -> "${result}"`)
    if (result !== expected) {
      throw new Error(`格式化错误: 期望 "${expected}", 得到 "${result}"`)
    }
  })
  
  console.log('✅ 通过 - 余额格式化正常')
  passed++
} catch (error: any) {
  console.error('❌ 失败:', error.message)
  failed++
}

// 打印结果
console.log('\n' + '='.repeat(50))
console.log('📊 测试结果')
console.log('='.repeat(50))
console.log(`总计: ${passed + failed}`)
console.log(`通过: ${passed} ✅`)
console.log(`失败: ${failed} ❌`)
console.log(`成功率: ${((passed / (passed + failed)) * 100).toFixed(2)}%`)
console.log('='.repeat(50))

if (failed === 0) {
  console.log('🎉 所有本地测试通过！')
  console.log('\n注意: 余额查询功能需要网络连接，请在应用中手动测试。')
} else {
  console.log('⚠️  发现 Bug，请检查上述失败的测试')
  process.exit(1)
}
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行出错:', error)
  process.exit(1)
})

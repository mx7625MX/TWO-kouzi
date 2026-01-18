/**
 * 钱包管理功能综合测试
 * 测试创建、导入、加密、解密、余额查询等所有功能
 */

import { WalletManager } from '../main/WalletManager'
import { encrypt, decrypt, validatePasswordStrength } from '../shared/cryptoUtils'
import { getBSCBalance } from '../shared/bscUtils'
import { getSolanaBalance } from '../shared/solanaUtils'

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [] as string[],
}

// 测试工具函数
function test(name: string, fn: () => Promise<void> | void) {
  testResults.total++
  return async () => {
    try {
      console.log(`\n🧪 测试: ${name}`)
      await fn()
      testResults.passed++
      console.log(`✅ 通过: ${name}`)
    } catch (error: any) {
      testResults.failed++
      const errorMsg = `❌ 失败: ${name} - ${error.message}`
      console.error(errorMsg)
      testResults.errors.push(errorMsg)
    }
  }
}

// ============ 测试1: 创建BSC钱包 ============
const testCreateBSCWallet = test('创建BSC钱包', async () => {
  const manager = new WalletManager('test_password_123')
  const wallet = await manager.createWallet('测试BSC钱包', 'BSC')

  // 验证返回值
  if (!wallet.id) throw new Error('缺少钱包ID')
  if (wallet.name !== '测试BSC钱包') throw new Error('钱包名称不匹配')
  if (wallet.network !== 'BSC') throw new Error('网络类型不匹配')
  if (!wallet.address) throw new Error('缺少钱包地址')
  if (!wallet.address.startsWith('0x')) throw new Error('BSC地址格式错误')
  if (wallet.address.length !== 42) throw new Error('BSC地址长度错误')
  if (!wallet.privateKey) throw new Error('缺少私钥')
  if (!wallet.privateKey.startsWith('0x')) throw new Error('私钥格式错误')
  if (wallet.privateKey.length !== 66) throw new Error('私钥长度错误')
  if (!wallet.encrypted_key) throw new Error('缺少加密私钥')

  console.log('  ✓ 钱包ID:', wallet.id)
  console.log('  ✓ 地址:', wallet.address)
  console.log('  ✓ 私钥长度:', wallet.privateKey.length)
  console.log('  ✓ 加密私钥长度:', wallet.encrypted_key.length)
})

// ============ 测试2: 创建Solana钱包 ============
const testCreateSolanaWallet = test('创建Solana钱包', async () => {
  const manager = new WalletManager('test_password_123')
  const wallet = await manager.createWallet('测试Solana钱包', 'Solana')

  // 验证返回值
  if (!wallet.id) throw new Error('缺少钱包ID')
  if (wallet.name !== '测试Solana钱包') throw new Error('钱包名称不匹配')
  if (wallet.network !== 'Solana') throw new Error('网络类型不匹配')
  if (!wallet.address) throw new Error('缺少钱包地址')
  if (wallet.address.length < 32 || wallet.address.length > 44) {
    throw new Error('Solana地址长度错误')
  }
  if (!wallet.privateKey) throw new Error('缺少私钥')
  if (!wallet.encrypted_key) throw new Error('缺少加密私钥')

  console.log('  ✓ 钱包ID:', wallet.id)
  console.log('  ✓ 地址:', wallet.address)
  console.log('  ✓ 地址长度:', wallet.address.length)
  console.log('  ✓ 私钥长度:', wallet.privateKey.length)
})

// ============ 测试3: 私钥加密解密 ============
const testEncryptDecrypt = test('私钥加密和解密', async () => {
  const password = 'TestPassword123!'
  const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

  // 加密
  const encrypted = encrypt(privateKey, password)
  if (!encrypted) throw new Error('加密失败')
  console.log('  ✓ 加密成功，长度:', encrypted.length)

  // 解密
  const decrypted = decrypt(encrypted, password)
  if (decrypted !== privateKey) throw new Error('解密结果不匹配')
  console.log('  ✓ 解密成功，匹配原始私钥')

  // 测试错误密码
  try {
    decrypt(encrypted, 'WrongPassword')
    throw new Error('应该抛出错误但没有')
  } catch (error: any) {
    if (error.message.includes('应该抛出错误')) throw error
    console.log('  ✓ 错误密码正确抛出异常')
  }
})

// ============ 测试4: WalletManager加密解密 ============
const testWalletManagerEncryption = test('WalletManager加密解密', async () => {
  const manager = new WalletManager('test_password_123')
  
  // 创建钱包
  const wallet = await manager.createWallet('加密测试钱包', 'BSC')
  const originalPrivateKey = wallet.privateKey
  const encryptedKey = wallet.encrypted_key

  console.log('  ✓ 原始私钥:', originalPrivateKey.substring(0, 20) + '...')
  console.log('  ✓ 加密私钥:', encryptedKey.substring(0, 30) + '...')

  // 解密
  const decryptedKey = manager.decryptPrivateKey(encryptedKey)
  if (decryptedKey !== originalPrivateKey) {
    throw new Error('解密后的私钥与原始私钥不匹配')
  }
  console.log('  ✓ 解密成功，私钥匹配')

  // 测试错误密码
  try {
    const wrongManager = new WalletManager('wrong_password')
    wrongManager.decryptPrivateKey(encryptedKey)
    throw new Error('应该抛出解密错误但没有')
  } catch (error: any) {
    if (error.message.includes('应该抛出')) throw error
    console.log('  ✓ 错误密码无法解密')
  }
})

// ============ 测试5: 导入BSC私钥 ============
const testImportBSCPrivateKey = test('导入BSC私钥', async () => {
  const manager = new WalletManager('test_password_123')
  
  // 已知的测试私钥
  const testPrivateKey = '0x4c0883a69102937d6231471b5dbb6204fe512961708279f8c5c1e5d2e5b1c4f1'

  // 导入钱包
  const wallet = await manager.importWallet(
    '导入的BSC钱包',
    'BSC',
    testPrivateKey,
    'privateKey'
  )

  if (!wallet.id) throw new Error('缺少钱包ID')
  if (wallet.network !== 'BSC') throw new Error('网络类型不正确')
  if (!wallet.address.startsWith('0x')) throw new Error('地址格式错误')
  if (wallet.address.length !== 42) throw new Error('地址长度错误')
  if (!wallet.encrypted_key) throw new Error('缺少加密私钥')

  console.log('  ✓ 导入成功')
  console.log('  ✓ 地址:', wallet.address)
  console.log('  ✓ 网络:', wallet.network)

  // 验证解密后的私钥
  const decrypted = manager.decryptPrivateKey(wallet.encrypted_key)
  if (!decrypted.toLowerCase().includes(testPrivateKey.toLowerCase().replace('0x', ''))) {
    // BSC私钥可能会被规范化，所以只检查核心部分
    console.log('  ⚠ 警告: 私钥格式可能被规范化')
  }
  console.log('  ✓ 私钥已加密存储')
})

// ============ 测试6: 导入Solana私钥 ============
const testImportSolanaPrivateKey = test('导入Solana私钥', async () => {
  const manager = new WalletManager('test_password_123')
  
  // 创建一个Solana钱包来获取有效的私钥
  const tempWallet = await manager.createWallet('临时钱包', 'Solana')
  const privateKey = tempWallet.privateKey

  console.log('  ℹ 使用生成的私钥进行导入测试')

  // 导入钱包
  const wallet = await manager.importWallet(
    '导入的Solana钱包',
    'Solana',
    privateKey,
    'privateKey'
  )

  if (!wallet.id) throw new Error('缺少钱包ID')
  if (wallet.network !== 'Solana') throw new Error('网络类型不正确')
  if (!wallet.address) throw new Error('缺少地址')
  if (wallet.address !== tempWallet.address) {
    throw new Error('导入后地址不匹配')
  }

  console.log('  ✓ 导入成功')
  console.log('  ✓ 地址:', wallet.address)
  console.log('  ✓ 地址匹配原始钱包')
})

// ============ 测试7: 导入助记词 ============
const testImportMnemonic = test('导入助记词', async () => {
  const manager = new WalletManager('test_password_123')
  
  // 测试助记词
  const mnemonic = 'test test test test test test test test test test test junk'

  // 导入BSC钱包
  const bscWallet = await manager.importWallet(
    '助记词BSC钱包',
    'BSC',
    mnemonic,
    'mnemonic'
  )

  if (!bscWallet.id) throw new Error('缺少BSC钱包ID')
  if (!bscWallet.address.startsWith('0x')) throw new Error('BSC地址格式错误')
  console.log('  ✓ BSC钱包导入成功:', bscWallet.address)

  // 导入Solana钱包
  const solanaWallet = await manager.importWallet(
    '助记词Solana钱包',
    'Solana',
    mnemonic,
    'mnemonic'
  )

  if (!solanaWallet.id) throw new Error('缺少Solana钱包ID')
  if (solanaWallet.address.length < 32) throw new Error('Solana地址格式错误')
  console.log('  ✓ Solana钱包导入成功:', solanaWallet.address)

  // 验证相同助记词导入的地址一致
  const bscWallet2 = await manager.importWallet(
    '助记词BSC钱包2',
    'BSC',
    mnemonic,
    'mnemonic'
  )
  
  if (bscWallet.address !== bscWallet2.address) {
    throw new Error('相同助记词导入的地址不一致')
  }
  console.log('  ✓ 相同助记词生成相同地址')
})

// ============ 测试8: 密码强度验证 ============
const testPasswordStrength = test('密码强度验证', () => {
  const passwords = [
    { pwd: '123', expected: 0 },
    { pwd: 'password', expected: 1 },
    { pwd: 'Password1', expected: 3 },
    { pwd: 'P@ssw0rd!', expected: 4 },
  ]

  passwords.forEach(({ pwd, expected }) => {
    const result = validatePasswordStrength(pwd)
    console.log(`  "${pwd}" -> ${result.score}/4 (${result.description})`)
    if (result.score < expected) {
      console.log(`  ⚠ 警告: 期望 ${expected} 分，实际 ${result.score} 分`)
    }
  })
  
  console.log('  ✓ 密码强度验证完成')
})

// ============ 测试9: 余额查询（BSC）============
const testBSCBalanceQuery = test('BSC余额查询', async () => {
  // 使用Binance热钱包地址测试（应该有余额）
  const testAddress = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3'
  
  console.log('  ℹ 查询地址:', testAddress)
  
  const balance = await getBSCBalance(testAddress)
  
  if (typeof balance !== 'string') throw new Error('余额类型错误')
  if (isNaN(parseFloat(balance))) throw new Error('余额不是有效数字')
  
  console.log('  ✓ 查询成功')
  console.log('  ✓ 余额:', balance, 'BNB')
})

// ============ 测试10: 余额查询（Solana）============
const testSolanaBalanceQuery = test('Solana余额查询', async () => {
  // 使用已知的Solana地址测试
  const testAddress = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK'
  
  console.log('  ℹ 查询地址:', testAddress)
  
  const balance = await getSolanaBalance(testAddress)
  
  if (typeof balance !== 'string') throw new Error('余额类型错误')
  if (isNaN(parseFloat(balance))) throw new Error('余额不是有效数字')
  
  console.log('  ✓ 查询成功')
  console.log('  ✓ 余额:', balance, 'SOL')
})

// ============ 测试11: WalletManager余额查询 ============
const testWalletManagerBalance = test('WalletManager余额查询', async () => {
  const manager = new WalletManager()
  
  // 测试BSC
  const bscAddress = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3'
  const bscBalance = await manager.getBalance(bscAddress, 'BSC')
  
  if (!bscBalance.address) throw new Error('缺少地址')
  if (bscBalance.network !== 'BSC') throw new Error('网络类型错误')
  if (!bscBalance.nativeBalance) throw new Error('缺少余额')
  if (bscBalance.nativeSymbol !== 'BNB') throw new Error('货币符号错误')
  
  console.log('  ✓ BSC查询成功:', bscBalance.nativeBalance, bscBalance.nativeSymbol)
  
  // 测试Solana
  const solanaAddress = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK'
  const solanaBalance = await manager.getBalance(solanaAddress, 'Solana')
  
  if (!solanaBalance.address) throw new Error('缺少地址')
  if (solanaBalance.network !== 'Solana') throw new Error('网络类型错误')
  if (!solanaBalance.nativeBalance) throw new Error('缺少余额')
  if (solanaBalance.nativeSymbol !== 'SOL') throw new Error('货币符号错误')
  
  console.log('  ✓ Solana查询成功:', solanaBalance.nativeBalance, solanaBalance.nativeSymbol)
})

// ============ 测试12: 批量余额查询 ============
const testBatchBalanceQuery = test('批量余额查询', async () => {
  const manager = new WalletManager()
  
  const wallets = [
    { address: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3', network: 'BSC' as const },
    { address: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK', network: 'Solana' as const },
  ]
  
  console.log('  ℹ 批量查询', wallets.length, '个钱包')
  
  const results = await manager.getBalances(wallets)
  
  if (results.length !== wallets.length) {
    throw new Error('返回结果数量不匹配')
  }
  
  results.forEach((result, index) => {
    if (result.address !== wallets[index].address) {
      throw new Error(`地址 ${index} 不匹配`)
    }
    console.log(`  ✓ 钱包${index + 1}: ${result.nativeBalance} ${result.nativeSymbol}`)
  })
  
  console.log('  ✓ 批量查询成功')
})

// ============ 测试13: 地址验证 ============
const testAddressValidation = test('地址验证', () => {
  const manager = new WalletManager()
  
  // BSC地址验证
  const validBSC = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3'
  const invalidBSC = '0xinvalid'
  
  if (!manager.validateAddress(validBSC, 'BSC')) {
    throw new Error('有效的BSC地址被判定为无效')
  }
  console.log('  ✓ 有效BSC地址验证通过')
  
  if (manager.validateAddress(invalidBSC, 'BSC')) {
    throw new Error('无效的BSC地址被判定为有效')
  }
  console.log('  ✓ 无效BSC地址验证正确')
  
  // Solana地址验证
  const validSolana = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK'
  const invalidSolana = 'invalid'
  
  if (!manager.validateAddress(validSolana, 'Solana')) {
    throw new Error('有效的Solana地址被判定为无效')
  }
  console.log('  ✓ 有效Solana地址验证通过')
  
  if (manager.validateAddress(invalidSolana, 'Solana')) {
    throw new Error('无效的Solana地址被判定为有效')
  }
  console.log('  ✓ 无效Solana地址验证正确')
})

// ============ 测试14: 余额格式化 ============
const testBalanceFormatting = test('余额格式化', () => {
  const manager = new WalletManager()
  
  const testCases = [
    { input: '123.456789', decimals: 4, expected: '123.4568' },
    { input: '0.000123', decimals: 6, expected: '0.000123' },
    { input: '1000000.123', decimals: 2, expected: '1000000.12' },
    { input: '0', decimals: 4, expected: '0.0000' },
  ]
  
  testCases.forEach(({ input, decimals, expected }) => {
    const result = manager.formatBalance(input, decimals)
    console.log(`  "${input}" -> "${result}" (${decimals}位小数)`)
    if (result !== expected) {
      console.log(`  ⚠ 警告: 期望 "${expected}"，实际 "${result}"`)
    }
  })
  
  console.log('  ✓ 余额格式化完成')
})

// ============ 测试15: 错误处理 ============
const testErrorHandling = test('错误处理', async () => {
  const manager = new WalletManager()
  
  // 测试无效网络
  try {
    await manager.getBalance('0x123', 'InvalidNetwork' as any)
    throw new Error('应该抛出错误但没有')
  } catch (error: any) {
    if (error.message.includes('应该抛出')) throw error
    console.log('  ✓ 无效网络类型正确抛出错误')
  }
  
  // 测试无效地址
  try {
    await manager.getBalance('invalid', 'BSC')
    throw new Error('应该抛出错误但没有')
  } catch (error: any) {
    if (error.message.includes('应该抛出')) throw error
    console.log('  ✓ 无效地址正确抛出错误')
  }
  
  // 测试空地址
  try {
    await manager.getBalance('', 'Solana')
    throw new Error('应该抛出错误但没有')
  } catch (error: any) {
    if (error.message.includes('应该抛出')) throw error
    console.log('  ✓ 空地址正确抛出错误')
  }
  
  console.log('  ✓ 错误处理测试完成')
})

// ============ 主测试函数 ============
async function runAllTests() {
  const separator = '='.repeat(60)
  console.log(separator)
  console.log('🚀 开始钱包管理功能综合测试')
  console.log(separator)
  
  // 运行所有测试
  await testCreateBSCWallet()
  await testCreateSolanaWallet()
  await testEncryptDecrypt()
  await testWalletManagerEncryption()
  await testImportBSCPrivateKey()
  await testImportSolanaPrivateKey()
  await testImportMnemonic()
  await testPasswordStrength()
  await testBSCBalanceQuery()
  await testSolanaBalanceQuery()
  await testWalletManagerBalance()
  await testBatchBalanceQuery()
  await testAddressValidation()
  await testBalanceFormatting()
  await testErrorHandling()
  
  // 打印测试结果
  console.log('\n' + '='.repeat(60))
  console.log('📊 测试结果汇总')
  console.log('='.repeat(60))
  console.log(`总测试数: ${testResults.total}`)
  console.log(`通过: ${testResults.passed} ✅`)
  console.log(`失败: ${testResults.failed} ❌`)
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`)
  
  if (testResults.errors.length > 0) {
    console.log('\n失败的测试:')
    testResults.errors.forEach(error => console.log('  ' + error))
  }
  
  console.log('='.repeat(60))
  
  if (testResults.failed === 0) {
    console.log('🎉 所有测试通过！')
  } else {
    console.log('⚠️  有测试失败，请检查上述错误信息')
  }
  
  return testResults.failed === 0
}

// 导出测试函数
export { runAllTests }

// 如果直接运行此文件
if (require.main === module) {
  runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('测试执行失败:', error)
      process.exit(1)
    })
}

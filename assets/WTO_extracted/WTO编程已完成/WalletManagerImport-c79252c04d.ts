/**
 * WalletManager导入功能使用示例
 * 展示如何导入钱包（私钥和助记词）
 */

import { WalletManager } from './WalletManager'
import { walletDB } from './database'

/**
 * 示例1：通过私钥导入BSC钱包
 */
export async function exampleImportBSCByPrivateKey() {
  console.log('\n=== 示例1：通过私钥导入BSC钱包 ===')
  
  const manager = new WalletManager()
  
  // 测试私钥（示例，请勿在生产环境使用）
  const testPrivateKey = '0x1234567890123456789012345678901234567890123456789012345678901234'
  
  try {
    const wallet = await manager.importWallet(
      '导入的BSC钱包',
      'BSC',
      testPrivateKey,
      'privateKey'
    )
    
    console.log('✅ BSC钱包导入成功！')
    console.log('钱包ID:', wallet.id)
    console.log('钱包地址:', wallet.address)
    console.log('私钥:', wallet.privateKey)
    
    return wallet
  } catch (error: any) {
    console.error('❌ 导入失败:', error.message)
    throw error
  }
}

/**
 * 示例2：通过私钥导入Solana钱包
 */
export async function exampleImportSolanaByPrivateKey() {
  console.log('\n=== 示例2：通过私钥导入Solana钱包 ===')
  
  const manager = new WalletManager()
  
  // 首先创建一个测试钱包获取私钥
  const testWallet = await manager.createWallet('测试', 'Solana')
  console.log('生成测试私钥:', testWallet.privateKey.substring(0, 30) + '...')
  
  try {
    // 使用刚生成的私钥进行导入测试
    const wallet = await manager.importWallet(
      '导入的Solana钱包',
      'Solana',
      testWallet.privateKey,
      'privateKey'
    )
    
    console.log('✅ Solana钱包导入成功！')
    console.log('钱包ID:', wallet.id)
    console.log('钱包地址:', wallet.address)
    console.log('验证地址匹配:', wallet.address === testWallet.address ? '✅' : '❌')
    
    return wallet
  } catch (error: any) {
    console.error('❌ 导入失败:', error.message)
    throw error
  }
}

/**
 * 示例3：通过助记词导入BSC钱包
 */
export async function exampleImportBSCByMnemonic() {
  console.log('\n=== 示例3：通过助记词导入BSC钱包 ===')
  
  const manager = new WalletManager()
  
  // 生成新助记词
  const mnemonic = manager.generateMnemonic(12)
  console.log('生成的助记词:', mnemonic)
  
  try {
    const wallet = await manager.importWallet(
      '助记词导入的BSC钱包',
      'BSC',
      mnemonic,
      'mnemonic'
    )
    
    console.log('✅ BSC钱包（助记词）导入成功！')
    console.log('钱包ID:', wallet.id)
    console.log('钱包地址:', wallet.address)
    console.log('派生路径: m/44\'/60\'/0\'/0/0（默认）')
    
    return wallet
  } catch (error: any) {
    console.error('❌ 导入失败:', error.message)
    throw error
  }
}

/**
 * 示例4：通过助记词导入Solana钱包
 */
export async function exampleImportSolanaByMnemonic() {
  console.log('\n=== 示例4：通过助记词导入Solana钱包 ===')
  
  const manager = new WalletManager()
  
  // 生成新助记词
  const mnemonic = manager.generateMnemonic(24)
  console.log('生成的助记词（24个单词）:', mnemonic)
  
  try {
    const wallet = await manager.importWallet(
      '助记词导入的Solana钱包',
      'Solana',
      mnemonic,
      'mnemonic'
    )
    
    console.log('✅ Solana钱包（助记词）导入成功！')
    console.log('钱包ID:', wallet.id)
    console.log('钱包地址:', wallet.address)
    console.log('派生路径: m/44\'/501\'/0\'/0\'（默认）')
    
    return wallet
  } catch (error: any) {
    console.error('❌ 导入失败:', error.message)
    throw error
  }
}

/**
 * 示例5：使用自定义派生路径
 */
export async function exampleImportWithCustomPath() {
  console.log('\n=== 示例5：使用自定义派生路径 ===')
  
  const manager = new WalletManager()
  const mnemonic = manager.generateMnemonic(12)
  
  console.log('使用相同助记词，不同派生路径生成多个钱包')
  
  try {
    // 账户0
    const wallet1 = await manager.importWallet(
      'BSC账户0',
      'BSC',
      mnemonic,
      'mnemonic',
      "m/44'/60'/0'/0/0"
    )
    
    // 账户1
    const wallet2 = await manager.importWallet(
      'BSC账户1',
      'BSC',
      mnemonic,
      'mnemonic',
      "m/44'/60'/0'/0/1"
    )
    
    // 账户2
    const wallet3 = await manager.importWallet(
      'BSC账户2',
      'BSC',
      mnemonic,
      'mnemonic',
      "m/44'/60'/0'/0/2"
    )
    
    console.log('✅ 使用同一助记词生成了3个不同地址：')
    console.log('账户0:', wallet1.address)
    console.log('账户1:', wallet2.address)
    console.log('账户2:', wallet3.address)
    
    return [wallet1, wallet2, wallet3]
  } catch (error: any) {
    console.error('❌ 导入失败:', error.message)
    throw error
  }
}

/**
 * 示例6：验证助记词
 */
export function exampleValidateMnemonic() {
  console.log('\n=== 示例6：验证助记词 ===')
  
  const manager = new WalletManager()
  
  // 有效的助记词
  const validMnemonic = manager.generateMnemonic(12)
  console.log('有效助记词:', validMnemonic)
  console.log('验证结果:', manager.validateMnemonic(validMnemonic) ? '✅ 有效' : '❌ 无效')
  
  // 无效的助记词
  const invalidMnemonic = 'this is not a valid mnemonic phrase at all'
  console.log('\n无效助记词:', invalidMnemonic)
  console.log('验证结果:', manager.validateMnemonic(invalidMnemonic) ? '✅ 有效' : '❌ 无效')
  
  // 部分正确的助记词（单词数不对）
  const partialMnemonic = 'abandon abandon abandon abandon abandon'
  console.log('\n部分助记词:', partialMnemonic)
  console.log('验证结果:', manager.validateMnemonic(partialMnemonic) ? '✅ 有效' : '❌ 无效')
}

/**
 * 示例7：导入并保存到数据库
 */
export async function exampleImportAndSave() {
  console.log('\n=== 示例7：导入并保存到数据库 ===')
  
  const manager = new WalletManager()
  
  try {
    // 生成助记词
    const mnemonic = manager.generateMnemonic(12)
    console.log('助记词:', mnemonic)
    
    // 导入钱包
    const wallet = await manager.importWallet(
      '导入并保存的钱包',
      'BSC',
      mnemonic,
      'mnemonic'
    )
    
    console.log('✅ 钱包导入成功:', wallet.address)
    
    // 保存到数据库
    const dbInput = manager.toCreateWalletInput(wallet)
    const savedId = walletDB.insertWallet(dbInput)
    
    console.log('✅ 钱包已保存到数据库，ID:', savedId)
    
    // 验证
    const savedWallet = walletDB.getWalletById(savedId)
    console.log('✅ 从数据库读取验证:', savedWallet?.address)
    
    return { wallet, savedWallet }
  } catch (error: any) {
    console.error('❌ 操作失败:', error.message)
    throw error
  }
}

/**
 * 示例8：私钥格式容错测试
 */
export async function examplePrivateKeyFormats() {
  console.log('\n=== 示例8：私钥格式容错测试 ===')
  
  const manager = new WalletManager()
  
  // 先创建一个测试钱包
  const testWallet = await manager.createWallet('测试', 'BSC')
  const originalKey = testWallet.privateKey
  
  console.log('原始私钥:', originalKey)
  
  // 测试不同格式
  const formats = [
    { name: '带0x前缀', key: originalKey },
    { name: '不带0x前缀', key: originalKey.slice(2) },
    { name: '带空格', key: '  ' + originalKey + '  ' },
  ]
  
  for (const format of formats) {
    try {
      const wallet = await manager.importWallet(
        `测试-${format.name}`,
        'BSC',
        format.key,
        'privateKey'
      )
      console.log(`✅ ${format.name}: 导入成功 - ${wallet.address}`)
    } catch (error: any) {
      console.log(`❌ ${format.name}: 导入失败 - ${error.message}`)
    }
  }
}

/**
 * 示例9：错误处理测试
 */
export async function exampleErrorHandling() {
  console.log('\n=== 示例9：错误处理测试 ===')
  
  const manager = new WalletManager()
  
  // 测试各种错误情况
  const testCases = [
    {
      name: '无效的BSC私钥（长度错误）',
      network: 'BSC' as const,
      data: '0x123456',
      type: 'privateKey' as const,
    },
    {
      name: '无效的BSC私钥（非十六进制）',
      network: 'BSC' as const,
      data: '0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      type: 'privateKey' as const,
    },
    {
      name: '无效的助记词',
      network: 'BSC' as const,
      data: 'this is not a valid mnemonic',
      type: 'mnemonic' as const,
    },
    {
      name: '无效的Solana私钥（长度错误）',
      network: 'Solana' as const,
      data: 'invalid_base64',
      type: 'privateKey' as const,
    },
  ]
  
  for (const testCase of testCases) {
    try {
      await manager.importWallet(
        '测试钱包',
        testCase.network,
        testCase.data,
        testCase.type
      )
      console.log(`❌ ${testCase.name}: 应该失败但成功了`)
    } catch (error: any) {
      console.log(`✅ ${testCase.name}: 正确捕获错误 - ${error.message}`)
    }
  }
}

/**
 * 运行所有导入示例
 */
export async function runAllImportExamples() {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║   WalletManager 导入功能示例演示      ║')
  console.log('╚════════════════════════════════════════╝')
  
  try {
    await exampleImportBSCByPrivateKey()
    await exampleImportSolanaByPrivateKey()
    await exampleImportBSCByMnemonic()
    await exampleImportSolanaByMnemonic()
    await exampleImportWithCustomPath()
    exampleValidateMnemonic()
    await exampleImportAndSave()
    await examplePrivateKeyFormats()
    await exampleErrorHandling()
    
    console.log('\n✅ 所有导入示例运行完成！')
  } catch (error) {
    console.error('\n❌ 示例运行失败:', error)
  }
}

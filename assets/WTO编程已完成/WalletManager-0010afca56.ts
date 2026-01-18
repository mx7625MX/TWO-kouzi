/**
 * WalletManager使用示例
 * 展示如何使用WalletManager类创建和管理钱包
 */

import { WalletManager } from './WalletManager'
import { walletDB } from './database'

/**
 * 示例1：创建单个BSC钱包
 */
export async function exampleCreateBSCWallet() {
  console.log('\n=== 示例1：创建BSC钱包 ===')
  
  const manager = new WalletManager()
  
  try {
    // 创建BSC钱包
    const wallet = await manager.createWallet('我的BSC主钱包', 'BSC')
    
    console.log('钱包创建成功！')
    console.log('钱包ID:', wallet.id)
    console.log('钱包名称:', wallet.name)
    console.log('钱包地址:', wallet.address)
    console.log('网络:', wallet.network)
    console.log('私钥（请妥善保管）:', wallet.privateKey)
    console.log('加密私钥（存储用）:', wallet.encrypted_key.substring(0, 50) + '...')
    
    return wallet
  } catch (error) {
    console.error('创建钱包失败:', error)
    throw error
  }
}

/**
 * 示例2：创建单个Solana钱包
 */
export async function exampleCreateSolanaWallet() {
  console.log('\n=== 示例2：创建Solana钱包 ===')
  
  const manager = new WalletManager()
  
  try {
    // 创建Solana钱包
    const wallet = await manager.createWallet('我的Solana主钱包', 'Solana')
    
    console.log('钱包创建成功！')
    console.log('钱包ID:', wallet.id)
    console.log('钱包名称:', wallet.name)
    console.log('钱包地址:', wallet.address)
    console.log('网络:', wallet.network)
    console.log('私钥（Base64，请妥善保管）:', wallet.privateKey.substring(0, 50) + '...')
    
    return wallet
  } catch (error) {
    console.error('创建钱包失败:', error)
    throw error
  }
}

/**
 * 示例3：批量创建钱包
 */
export async function exampleCreateMultipleWallets() {
  console.log('\n=== 示例3：批量创建钱包 ===')
  
  const manager = new WalletManager()
  
  try {
    // 批量创建3个BSC钱包
    const bscWallets = await manager.createMultipleWallets(3, 'BSC', 'BSC交易钱包')
    console.log(`成功创建 ${bscWallets.length} 个BSC钱包`)
    
    // 批量创建2个Solana钱包
    const solanaWallets = await manager.createMultipleWallets(2, 'Solana', 'Solana钱包')
    console.log(`成功创建 ${solanaWallets.length} 个Solana钱包`)
    
    return [...bscWallets, ...solanaWallets]
  } catch (error) {
    console.error('批量创建钱包失败:', error)
    throw error
  }
}

/**
 * 示例4：创建钱包并保存到数据库
 */
export async function exampleCreateAndSaveWallet() {
  console.log('\n=== 示例4：创建钱包并保存到数据库 ===')
  
  const manager = new WalletManager()
  
  try {
    // 创建钱包
    const wallet = await manager.createWallet('数据库测试钱包', 'BSC')
    console.log('钱包创建成功:', wallet.address)
    
    // 转换为数据库输入格式
    const dbInput = manager.toCreateWalletInput(wallet)
    
    // 保存到数据库
    const savedId = walletDB.insertWallet(dbInput)
    console.log('钱包已保存到数据库，ID:', savedId)
    
    // 从数据库读取验证
    const savedWallet = walletDB.getWalletById(savedId)
    console.log('从数据库读取的钱包:', savedWallet)
    
    return { wallet, savedWallet }
  } catch (error) {
    console.error('创建并保存钱包失败:', error)
    throw error
  }
}

/**
 * 示例5：加密和解密私钥
 */
export async function exampleEncryptDecrypt() {
  console.log('\n=== 示例5：私钥加密和解密 ===')
  
  const manager = new WalletManager()
  
  try {
    // 创建钱包
    const wallet = await manager.createWallet('测试钱包', 'BSC')
    
    console.log('原始私钥:', wallet.privateKey)
    console.log('加密私钥:', wallet.encrypted_key)
    
    // 解密私钥
    const decryptedKey = manager.decryptPrivateKey(wallet.encrypted_key)
    console.log('解密私钥:', decryptedKey)
    
    // 验证
    const isMatch = wallet.privateKey === decryptedKey
    console.log('加密解密验证:', isMatch ? '✅ 通过' : '❌ 失败')
    
    return { wallet, decryptedKey, isMatch }
  } catch (error) {
    console.error('加密解密测试失败:', error)
    throw error
  }
}

/**
 * 示例6：从私钥恢复钱包
 */
export async function exampleRecoverWallet() {
  console.log('\n=== 示例6：从私钥恢复钱包 ===')
  
  const manager = new WalletManager()
  
  try {
    // 先创建一个钱包
    const originalWallet = await manager.createWallet('原始钱包', 'BSC')
    console.log('原始钱包地址:', originalWallet.address)
    console.log('原始私钥:', originalWallet.privateKey)
    
    // 从私钥恢复
    const recoveredAddress = manager.recoverBSCWallet(originalWallet.privateKey)
    console.log('恢复的钱包地址:', recoveredAddress)
    
    // 验证
    const isMatch = originalWallet.address === recoveredAddress
    console.log('恢复验证:', isMatch ? '✅ 通过' : '❌ 失败')
    
    return { originalWallet, recoveredAddress, isMatch }
  } catch (error) {
    console.error('恢复钱包失败:', error)
    throw error
  }
}

/**
 * 示例7：验证钱包地址
 */
export function exampleValidateAddress() {
  console.log('\n=== 示例7：验证钱包地址 ===')
  
  const manager = new WalletManager()
  
  // 测试BSC地址
  const bscAddress1 = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  const bscAddress2 = 'invalid_address'
  
  console.log(`BSC地址 "${bscAddress1}" 验证:`, 
    manager.validateAddress(bscAddress1, 'BSC') ? '✅ 有效' : '❌ 无效')
  console.log(`BSC地址 "${bscAddress2}" 验证:`, 
    manager.validateAddress(bscAddress2, 'BSC') ? '✅ 有效' : '❌ 无效')
  
  // 测试Solana地址
  const solanaAddress1 = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
  const solanaAddress2 = 'short'
  
  console.log(`Solana地址 "${solanaAddress1}" 验证:`, 
    manager.validateAddress(solanaAddress1, 'Solana') ? '✅ 有效' : '❌ 无效')
  console.log(`Solana地址 "${solanaAddress2}" 验证:`, 
    manager.validateAddress(solanaAddress2, 'Solana') ? '✅ 有效' : '❌ 无效')
}

/**
 * 示例8：完整工作流程
 * 创建钱包 -> 保存到数据库 -> 从数据库读取 -> 解密私钥 -> 恢复钱包
 */
export async function exampleCompleteWorkflow() {
  console.log('\n=== 示例8：完整工作流程 ===')
  
  const manager = new WalletManager()
  
  try {
    // 步骤1：创建钱包
    console.log('\n步骤1：创建钱包')
    const wallet = await manager.createWallet('完整流程测试钱包', 'BSC')
    console.log('✅ 钱包创建成功:', wallet.address)
    
    // 步骤2：保存到数据库
    console.log('\n步骤2：保存到数据库')
    const dbInput = manager.toCreateWalletInput(wallet)
    const walletId = walletDB.insertWallet(dbInput)
    console.log('✅ 钱包已保存，ID:', walletId)
    
    // 步骤3：从数据库读取
    console.log('\n步骤3：从数据库读取')
    const savedWallet = walletDB.getWalletById(walletId)
    console.log('✅ 从数据库读取成功:', savedWallet?.address)
    
    // 步骤4：解密私钥
    console.log('\n步骤4：解密私钥')
    const decryptedKey = manager.decryptPrivateKey(savedWallet!.encrypted_key)
    console.log('✅ 私钥解密成功')
    
    // 步骤5：验证恢复
    console.log('\n步骤5：验证钱包恢复')
    const recoveredAddress = manager.recoverBSCWallet(decryptedKey)
    const isMatch = recoveredAddress === wallet.address
    console.log('✅ 钱包恢复验证:', isMatch ? '成功' : '失败')
    
    console.log('\n=== 完整流程测试通过 ===')
    
    return {
      original: wallet,
      saved: savedWallet,
      recovered: recoveredAddress,
      success: isMatch,
    }
  } catch (error) {
    console.error('完整流程测试失败:', error)
    throw error
  }
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║   WalletManager 完整示例演示           ║')
  console.log('╚════════════════════════════════════════╝')
  
  try {
    // 运行所有示例
    await exampleCreateBSCWallet()
    await exampleCreateSolanaWallet()
    await exampleCreateMultipleWallets()
    await exampleCreateAndSaveWallet()
    await exampleEncryptDecrypt()
    await exampleRecoverWallet()
    exampleValidateAddress()
    await exampleCompleteWorkflow()
    
    console.log('\n✅ 所有示例运行完成！')
  } catch (error) {
    console.error('\n❌ 示例运行失败:', error)
  }
}

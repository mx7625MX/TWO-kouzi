/**
 * 钱包数据库使用示例
 * 
 * 此文件展示如何使用WalletDatabase类进行各种数据库操作
 */

import { walletDB } from './database'
import type { CreateWalletInput } from '../shared/types'

/**
 * 示例1：插入新钱包
 */
export function exampleInsertWallet() {
  const newWallet: CreateWalletInput = {
    name: '主钱包',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    network: 'BSC',
    encrypted_key: 'encrypted_private_key_here_base64_encoded',
  }

  try {
    const walletId = walletDB.insertWallet(newWallet)
    console.log('钱包创建成功，ID:', walletId)
    return walletId
  } catch (error) {
    console.error('创建钱包失败:', error)
    throw error
  }
}

/**
 * 示例2：查询所有钱包
 */
export function exampleGetAllWallets() {
  try {
    const wallets = walletDB.getAllWallets()
    console.log('查询到钱包总数:', wallets.length)
    
    wallets.forEach((wallet) => {
      console.log(`
        钱包ID: ${wallet.id}
        名称: ${wallet.name}
        地址: ${wallet.address}
        网络: ${wallet.network}
        创建时间: ${new Date(wallet.created_at).toLocaleString()}
      `)
    })
    
    return wallets
  } catch (error) {
    console.error('查询钱包失败:', error)
    throw error
  }
}

/**
 * 示例3：根据ID查询钱包
 */
export function exampleGetWalletById(id: string) {
  try {
    const wallet = walletDB.getWalletById(id)
    
    if (wallet) {
      console.log('找到钱包:', wallet)
    } else {
      console.log('钱包不存在')
    }
    
    return wallet
  } catch (error) {
    console.error('查询钱包失败:', error)
    throw error
  }
}

/**
 * 示例4：根据网络查询钱包
 */
export function exampleGetWalletsByNetwork(network: 'BSC' | 'Solana') {
  try {
    const wallets = walletDB.getWalletsByNetwork(network)
    console.log(`${network}网络钱包数量:`, wallets.length)
    return wallets
  } catch (error) {
    console.error('查询钱包失败:', error)
    throw error
  }
}

/**
 * 示例5：更新钱包名称
 */
export function exampleUpdateWalletName(id: string, newName: string) {
  try {
    const success = walletDB.updateWalletName(id, newName)
    
    if (success) {
      console.log('钱包名称更新成功')
    } else {
      console.log('钱包不存在或更新失败')
    }
    
    return success
  } catch (error) {
    console.error('更新钱包失败:', error)
    throw error
  }
}

/**
 * 示例6：删除钱包
 */
export function exampleDeleteWallet(id: string) {
  try {
    const success = walletDB.deleteWallet(id)
    
    if (success) {
      console.log('钱包删除成功')
    } else {
      console.log('钱包不存在或删除失败')
    }
    
    return success
  } catch (error) {
    console.error('删除钱包失败:', error)
    throw error
  }
}

/**
 * 示例7：批量插入钱包
 */
export function exampleBatchInsertWallets() {
  const wallets: CreateWalletInput[] = [
    {
      name: 'BSC主钱包',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      network: 'BSC',
      encrypted_key: 'encrypted_key_1',
    },
    {
      name: 'Solana主钱包',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      network: 'Solana',
      encrypted_key: 'encrypted_key_2',
    },
    {
      name: 'BSC交易钱包',
      address: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3',
      network: 'BSC',
      encrypted_key: 'encrypted_key_3',
    },
  ]

  const insertedIds: string[] = []

  try {
    wallets.forEach((wallet) => {
      const id = walletDB.insertWallet(wallet)
      insertedIds.push(id)
      console.log(`钱包 "${wallet.name}" 创建成功`)
    })

    console.log(`成功创建 ${insertedIds.length} 个钱包`)
    return insertedIds
  } catch (error) {
    console.error('批量创建钱包失败:', error)
    throw error
  }
}

/**
 * 示例8：获取统计信息
 */
export function exampleGetStatistics() {
  try {
    const totalCount = walletDB.getWalletCount()
    const bscWallets = walletDB.getWalletsByNetwork('BSC')
    const solanaWallets = walletDB.getWalletsByNetwork('Solana')

    const stats = {
      total: totalCount,
      bsc: bscWallets.length,
      solana: solanaWallets.length,
    }

    console.log('钱包统计信息:')
    console.log(`  总数: ${stats.total}`)
    console.log(`  BSC: ${stats.bsc}`)
    console.log(`  Solana: ${stats.solana}`)

    return stats
  } catch (error) {
    console.error('获取统计信息失败:', error)
    throw error
  }
}

/**
 * 完整的使用流程示例
 */
export function exampleFullWorkflow() {
  console.log('\n=== 开始完整示例流程 ===\n')

  try {
    // 1. 批量插入测试数据
    console.log('步骤1: 批量插入钱包...')
    const ids = exampleBatchInsertWallets()

    // 2. 查询所有钱包
    console.log('\n步骤2: 查询所有钱包...')
    exampleGetAllWallets()

    // 3. 按网络查询
    console.log('\n步骤3: 按网络查询...')
    exampleGetWalletsByNetwork('BSC')
    exampleGetWalletsByNetwork('Solana')

    // 4. 更新第一个钱包的名称
    if (ids.length > 0) {
      console.log('\n步骤4: 更新钱包名称...')
      exampleUpdateWalletName(ids[0], '更新后的钱包名称')
    }

    // 5. 查看统计信息
    console.log('\n步骤5: 查看统计信息...')
    exampleGetStatistics()

    console.log('\n=== 示例流程完成 ===\n')
  } catch (error) {
    console.error('示例流程执行失败:', error)
  }
}

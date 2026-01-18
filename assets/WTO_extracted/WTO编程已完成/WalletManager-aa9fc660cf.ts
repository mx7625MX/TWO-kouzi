/**
 * WalletManager余额查询功能使用示例
 */

import { WalletManager } from './WalletManager'

/**
 * 示例1：查询单个钱包余额
 */
async function example1() {
  console.log('\n=== 示例1：查询单个钱包余额 ===')
  
  const manager = new WalletManager()
  
  try {
    // 查询BSC钱包余额
    const bscBalance = await manager.getBalance(
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      'BSC'
    )
    console.log('BSC钱包余额:', bscBalance)
    console.log('  地址:', bscBalance.address)
    console.log('  网络:', bscBalance.network)
    console.log('  原生币余额:', bscBalance.nativeBalance, bscBalance.nativeSymbol)
    console.log('  代币数量:', bscBalance.tokenBalances?.length || 0)
    
    // 查询Solana钱包余额
    const solanaBalance = await manager.getBalance(
      'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
      'Solana'
    )
    console.log('\nSolana钱包余额:', solanaBalance)
    console.log('  地址:', solanaBalance.address)
    console.log('  网络:', solanaBalance.network)
    console.log('  原生币余额:', solanaBalance.nativeBalance, solanaBalance.nativeSymbol)
    console.log('  代币数量:', solanaBalance.tokenBalances?.length || 0)
  } catch (error: any) {
    console.error('查询余额失败:', error.message)
  }
}

/**
 * 示例2：批量查询钱包余额
 */
async function example2() {
  console.log('\n=== 示例2：批量查询钱包余额 ===')
  
  const manager = new WalletManager()
  
  const wallets = [
    { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', network: 'BSC' as const },
    { address: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3', network: 'BSC' as const },
    { address: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK', network: 'Solana' as const },
  ]
  
  try {
    console.log('开始批量查询...')
    const results = await manager.getBalances(wallets)
    
    console.log(`\n成功查询 ${results.length} 个钱包余额:`)
    results.forEach((result, index) => {
      console.log(`\n钱包 ${index + 1}:`)
      console.log('  地址:', result.address.substring(0, 10) + '...')
      console.log('  网络:', result.network)
      console.log('  余额:', result.nativeBalance, result.nativeSymbol)
    })
    
    // 计算总价值（需要汇率才能计算USD价值）
    const bscTotal = results
      .filter(r => r.network === 'BSC')
      .reduce((sum, r) => sum + parseFloat(r.nativeBalance), 0)
    
    const solanaTotal = results
      .filter(r => r.network === 'Solana')
      .reduce((sum, r) => sum + parseFloat(r.nativeBalance), 0)
    
    console.log('\n总计:')
    console.log('  BSC:', bscTotal.toFixed(4), 'BNB')
    console.log('  Solana:', solanaTotal.toFixed(4), 'SOL')
  } catch (error: any) {
    console.error('批量查询失败:', error.message)
  }
}

/**
 * 示例3：格式化余额显示
 */
async function example3() {
  console.log('\n=== 示例3：格式化余额显示 ===')
  
  const manager = new WalletManager()
  
  const balances = [
    '123.456789012345',
    '0.000000123456',
    '1234567.89',
    '0',
  ]
  
  console.log('原始余额 -> 格式化余额 (4位小数):')
  balances.forEach(balance => {
    const formatted = manager.formatBalance(balance, 4)
    console.log(`  ${balance} -> ${formatted}`)
  })
  
  console.log('\n原始余额 -> 格式化余额 (2位小数):')
  balances.forEach(balance => {
    const formatted = manager.formatBalance(balance, 2)
    console.log(`  ${balance} -> ${formatted}`)
  })
}

/**
 * 示例4：错误处理
 */
async function example4() {
  console.log('\n=== 示例4：错误处理 ===')
  
  const manager = new WalletManager()
  
  // 测试无效地址
  try {
    console.log('测试无效的BSC地址...')
    await manager.getBalance('invalid-address', 'BSC')
  } catch (error: any) {
    console.log('✓ 正确捕获错误:', error.message)
  }
  
  // 测试空地址
  try {
    console.log('\n测试空地址...')
    await manager.getBalance('', 'Solana')
  } catch (error: any) {
    console.log('✓ 正确捕获错误:', error.message)
  }
}

/**
 * 示例5：在实际应用中使用
 */
async function example5() {
  console.log('\n=== 示例5：实际应用场景 ===')
  
  const manager = new WalletManager()
  
  // 模拟从数据库获取的钱包列表
  const walletsFromDB = [
    { id: '1', name: '主钱包', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', network: 'BSC' as const },
    { id: '2', name: '交易钱包', address: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK', network: 'Solana' as const },
  ]
  
  console.log('获取钱包列表并查询余额...\n')
  
  // 为每个钱包查询余额
  for (const wallet of walletsFromDB) {
    try {
      const balance = await manager.getBalance(wallet.address, wallet.network)
      
      console.log(`钱包名称: ${wallet.name}`)
      console.log(`  地址: ${wallet.address}`)
      console.log(`  网络: ${wallet.network}`)
      console.log(`  余额: ${manager.formatBalance(balance.nativeBalance)} ${balance.nativeSymbol}`)
      console.log('')
      
      // 在实际应用中，可以将余额保存到数据库或更新UI
      // await updateWalletBalance(wallet.id, balance.nativeBalance)
    } catch (error: any) {
      console.error(`查询 ${wallet.name} 余额失败:`, error.message)
    }
  }
}

/**
 * 示例6：余额变化监控
 */
async function example6() {
  console.log('\n=== 示例6：余额变化监控 ===')
  
  const manager = new WalletManager()
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  
  console.log('模拟监控钱包余额变化...')
  console.log('地址:', address)
  
  let previousBalance = '0'
  
  // 模拟每5秒检查一次余额
  for (let i = 0; i < 3; i++) {
    try {
      const balance = await manager.getBalance(address, 'BSC')
      const currentBalance = balance.nativeBalance
      
      console.log(`\n检查 ${i + 1}:`)
      console.log('  当前余额:', currentBalance, 'BNB')
      
      if (i > 0) {
        const change = parseFloat(currentBalance) - parseFloat(previousBalance)
        if (change !== 0) {
          console.log('  变化:', change > 0 ? '+' : '', change.toFixed(4), 'BNB')
        } else {
          console.log('  余额未变化')
        }
      }
      
      previousBalance = currentBalance
      
      // 等待5秒（实际应用中）
      // await new Promise(resolve => setTimeout(resolve, 5000))
    } catch (error: any) {
      console.error('  查询失败:', error.message)
    }
  }
}

// 运行所有示例
export async function runAllExamples() {
  try {
    await example1()
    await example2()
    await example3()
    await example4()
    await example5()
    await example6()
    
    console.log('\n=== 所有示例执行完成 ===')
  } catch (error: any) {
    console.error('示例执行失败:', error.message)
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples()
}

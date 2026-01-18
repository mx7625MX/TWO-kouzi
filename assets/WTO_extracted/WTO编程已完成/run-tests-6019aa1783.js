#!/usr/bin/env node

/**
 * 运行钱包管理测试脚本
 */

// 设置测试环境
process.env.NODE_ENV = 'test'

// 导入测试
const { runAllTests } = require('../dist/tests/wallet-manager.test.js')

console.log('准备运行测试...\n')

// 运行测试
runAllTests()
  .then(success => {
    console.log('\n测试完成！')
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('\n测试执行出错:', error)
    process.exit(1)
  })

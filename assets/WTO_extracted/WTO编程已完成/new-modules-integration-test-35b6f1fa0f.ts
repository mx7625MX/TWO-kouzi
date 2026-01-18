/**
 * 新功能模块集成测试
 * 测试MEV防护、AI情绪分析、自动交易和风险预警的IPC通信
 */

const { ipcRenderer } = window

// 测试结果记录
const testResults = {
  mevProtection: {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  },
  aiSentiment: {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  },
  autoTrading: {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  },
  riskAlerts: {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  }
}

/**
 * 记录测试结果
 */
function recordTest(module, testName, passed, message = '') {
  testResults[module].total++
  if (passed) {
    testResults[module].passed++
    testResults[module].tests.push({
      name: testName,
      status: 'passed',
      message
    })
    console.log(`✅ [${module}] ${testName}: ${message}`)
  } else {
    testResults[module].failed++
    testResults[module].tests.push({
      name: testName,
      status: 'failed',
      message
    })
    console.error(`❌ [${module}] ${testName}: ${message}`)
  }
}

/**
 * 测试MEV防护IPC通信
 */
async function testMEVProtection() {
  console.log('\n🛡️ 开始测试MEV防护IPC通信...')

  try {
    // 测试1: 获取MEV防护状态
    const statusResult = await ipcRenderer.invoke('mev-protection:get-status')
    recordTest(
      'mevProtection',
      '获取MEV防护状态',
      statusResult.success,
      statusResult.success ? '成功获取状态' : statusResult.error
    )

    // 测试2: 获取防护统计
    const statsResult = await ipcRenderer.invoke('mev-protection:get-statistics')
    recordTest(
      'mevProtection',
      '获取防护统计',
      statsResult.success,
      statsResult.success ? '成功获取统计数据' : statsResult.error
    )

    // 测试3: 获取交易防护历史
    const historyResult = await ipcRenderer.invoke('mev-protection:get-transaction-history', { limit: 10 })
    recordTest(
      'mevProtection',
      '获取交易防护历史',
      historyResult.success,
      historyResult.success ? '成功获取历史记录' : historyResult.error
    )

    // 测试4: 获取攻击统计
    const attackStatsResult = await ipcRenderer.invoke('mev-protection:get-attack-statistics', { days: 7 })
    recordTest(
      'mevProtection',
      '获取攻击统计',
      attackStatsResult.success,
      attackStatsResult.success ? '成功获取攻击统计' : attackStatsResult.error
    )

    // 测试5: 获取风险评分
    const riskScoreResult = await ipcRenderer.invoke('mev-protection:get-risk-score')
    recordTest(
      'mevProtection',
      '获取风险评分',
      riskScoreResult.success,
      riskScoreResult.success ? '成功获取风险评分' : riskScoreResult.error
    )

    // 测试6: 获取引擎连接状态
    const connectionResult = await ipcRenderer.invoke('mev-protection:get-connection-status')
    recordTest(
      'mevProtection',
      '获取引擎连接状态',
      connectionResult.success,
      connectionResult.success ? '成功获取连接状态' : connectionResult.error
    )

    // 测试7: 配置Flashbots
    const flashbotsConfigResult = await ipcRenderer.invoke('mev-protection:configure-flashbots', {
      enabled: true,
      network: 'mainnet'
    })
    recordTest(
      'mevProtection',
      '配置Flashbots',
      flashbotsConfigResult.success,
      flashbotsConfigResult.success ? '成功配置Flashbots' : flashbotsConfigResult.error
    )

    // 测试8: 配置Jito
    const jitoConfigResult = await ipcRenderer.invoke('mev-protection:configure-jito', {
      enabled: false
    })
    recordTest(
      'mevProtection',
      '配置Jito',
      jitoConfigResult.success,
      jitoConfigResult.success ? '成功配置Jito' : jitoConfigResult.error
    )

    // 测试9: 设置风险阈值
    const thresholdResult = await ipcRenderer.invoke('mev-protection:set-risk-threshold', {
      level: 'medium'
    })
    recordTest(
      'mevProtection',
      '设置风险阈值',
      thresholdResult.success,
      thresholdResult.success ? '成功设置风险阈值' : thresholdResult.error
    )

    // 测试10: 设置Gas策略
    const gasStrategyResult = await ipcRenderer.invoke('mev-protection:set-gas-strategy', {
      type: 'moderate'
    })
    recordTest(
      'mevProtection',
      '设置Gas策略',
      gasStrategyResult.success,
      gasStrategyResult.success ? '成功设置Gas策略' : gasStrategyResult.error
    )

  } catch (error) {
    console.error('MEV防护测试出错:', error)
    recordTest('mevProtection', '整体测试', false, '测试过程出错')
  }
}

/**
 * 测试AI情绪分析IPC通信
 */
async function testAISentiment() {
  console.log('\n🧠 开始测试AI情绪分析IPC通信...')

  try {
    // 测试1: 获取AI情绪分析状态
    const statusResult = await ipcRenderer.invoke('ai-sentiment:get-status')
    recordTest(
      'aiSentiment',
      '获取AI情绪分析状态',
      statusResult.success,
      statusResult.success ? '成功获取状态' : statusResult.error
    )

    // 测试2: 获取情绪概览
    const overviewResult = await ipcRenderer.invoke('ai-sentiment:get-overview')
    recordTest(
      'aiSentiment',
      '获取情绪概览',
      overviewResult.success,
      overviewResult.success ? '成功获取情绪概览' : overviewResult.error
    )

    // 测试3: 获取热点情感分析
    const hotspotSentimentResult = await ipcRenderer.invoke('ai-sentiment:get-hotspot-sentiment', { limit: 10 })
    recordTest(
      'aiSentiment',
      '获取热点情感分析',
      hotspotSentimentResult.success,
      hotspotSentimentResult.success ? '成功获取热点情感' : hotspotSentimentResult.error
    )

    // 测试4: 获取情绪分布
    const distributionResult = await ipcRenderer.invoke('ai-sentiment:get-sentiment-distribution')
    recordTest(
      'aiSentiment',
      '获取情绪分布',
      distributionResult.success,
      distributionResult.success ? '成功获取情绪分布' : distributionResult.error
    )

    // 测试5: 获取多源数据对比
    const comparisonResult = await ipcRenderer.invoke('ai-sentiment:get-source-comparison', { days: 7 })
    recordTest(
      'aiSentiment',
      '获取多源数据对比',
      comparisonResult.success,
      comparisonResult.success ? '成功获取多源对比' : comparisonResult.error
    )

    // 测试6: 获取情绪预测
    const predictionResult = await ipcRenderer.invoke('ai-sentiment:get-prediction', { hours: 24 })
    recordTest(
      'aiSentiment',
      '获取情绪预测',
      predictionResult.success,
      predictionResult.success ? '成功获取情绪预测' : predictionResult.error
    )

    // 测试7: 获取虚假热点列表
    const fakeHotspotsResult = await ipcRenderer.invoke('ai-sentiment:get-fake-hotspots')
    recordTest(
      'aiSentiment',
      '获取虚假热点列表',
      fakeHotspotsResult.success,
      fakeHotspotsResult.success ? '成功获取虚假热点' : fakeHotspotsResult.error
    )

    // 测试8: 获取情绪趋势
    const trendResult = await ipcRenderer.invoke('ai-sentiment:get-trend', { hours: 24 })
    recordTest(
      'aiSentiment',
      '获取情绪趋势',
      trendResult.success,
      trendResult.success ? '成功获取情绪趋势' : trendResult.error
    )

    // 测试9: 配置数据源
    const sourceConfigResult = await ipcRenderer.invoke('ai-sentiment:configure-sources', {
      twitter: { enabled: true },
      news: { enabled: true }
    })
    recordTest(
      'aiSentiment',
      '配置数据源',
      sourceConfigResult.success,
      sourceConfigResult.success ? '成功配置数据源' : sourceConfigResult.error
    )

    // 测试10: 设置情绪阈值
    const thresholdsResult = await ipcRenderer.invoke('ai-sentiment:set-thresholds', {
      bullish: 0.7,
      bearish: 0.3
    })
    recordTest(
      'aiSentiment',
      '设置情绪阈值',
      thresholdsResult.success,
      thresholdsResult.success ? '成功设置情绪阈值' : thresholdsResult.error
    )

  } catch (error) {
    console.error('AI情绪分析测试出错:', error)
    recordTest('aiSentiment', '整体测试', false, '测试过程出错')
  }
}

/**
 * 测试自动交易IPC通信
 */
async function testAutoTrading() {
  console.log('\n🤖 开始测试自动交易IPC通信...')

  try {
    // 测试1: 获取自动交易状态
    const statusResult = await ipcRenderer.invoke('auto-trade:get-status')
    recordTest(
      'autoTrading',
      '获取自动交易状态',
      statusResult.success,
      statusResult.success ? '成功获取状态' : statusResult.error
    )

    // 测试2: 获取所有策略
    const strategiesResult = await ipcRenderer.invoke('auto-trade:get-strategies')
    recordTest(
      'autoTrading',
      '获取所有策略',
      strategiesResult.success,
      strategiesResult.success ? '成功获取策略列表' : strategiesResult.error
    )

    // 测试3: 获取交易历史
    const historyResult = await ipcRenderer.invoke('auto-trade:get-trade-history', { limit: 10 })
    recordTest(
      'autoTrading',
      '获取交易历史',
      historyResult.success,
      historyResult.success ? '成功获取交易历史' : historyResult.error
    )

    // 测试4: 获取当前交易
    const activeTradesResult = await ipcRenderer.invoke('auto-trade:get-active-trades')
    recordTest(
      'autoTrading',
      '获取当前交易',
      activeTradesResult.success,
      activeTradesResult.success ? '成功获取当前交易' : activeTradesResult.error
    )

    // 测试5: 获取实时监控数据
    const monitorDataResult = await ipcRenderer.invoke('auto-trade:get-monitor-data')
    recordTest(
      'autoTrading',
      '获取实时监控数据',
      monitorDataResult.success,
      monitorDataResult.success ? '成功获取监控数据' : monitorDataResult.error
    )

  } catch (error) {
    console.error('自动交易测试出错:', error)
    recordTest('autoTrading', '整体测试', false, '测试过程出错')
  }
}

/**
 * 测试风险预警IPC通信
 */
async function testRiskAlerts() {
  console.log('\n🚨 开始测试风险预警IPC通信...')

  try {
    // 测试1: 获取警报列表
    const alertsResult = await ipcRenderer.invoke('risk-alerts:get-alerts', { limit: 10 })
    recordTest(
      'riskAlerts',
      '获取警报列表',
      alertsResult.success,
      alertsResult.success ? '成功获取警报列表' : alertsResult.error
    )

    // 测试2: 创建测试警报
    const createAlertResult = await ipcRenderer.invoke('risk-alerts:create-alert', {
      type: 'info',
      severity: 'info',
      status: 'pending',
      title: '测试警报',
      message: '这是一个测试警报，用于验证IPC通信'
    })
    recordTest(
      'riskAlerts',
      '创建测试警报',
      createAlertResult.success,
      createAlertResult.success ? '成功创建测试警报' : createAlertResult.error
    )

    // 测试3: 获取警报统计
    const statsResult = await ipcRenderer.invoke('risk-alerts:get-statistics')
    recordTest(
      'riskAlerts',
      '获取警报统计',
      statsResult.success,
      statsResult.success ? '成功获取统计数据' : statsResult.error
    )

    // 测试4: 获取趋势数据
    const trendResult = await ipcRenderer.invoke('risk-alerts:get-trend', { days: 7 })
    recordTest(
      'riskAlerts',
      '获取趋势数据',
      trendResult.success,
      trendResult.success ? '成功获取趋势数据' : trendResult.error
    )

    // 测试5: 获取警报统计
    const stats2Result = await ipcRenderer.invoke('risk-alerts:get-statistics')
    recordTest(
      'riskAlerts',
      '获取警报统计（创建后）',
      stats2Result.success && stats2Result.data.totalAlerts > statsResult.data.totalAlerts,
      stats2Result.success ? '警报数量已增加' : stats2Result.error
    )

  } catch (error) {
    console.error('风险预警测试出错:', error)
    recordTest('riskAlerts', '整体测试', false, '测试过程出错')
  }
}

/**
 * 生成测试报告
 */
function generateTestReport() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 新功能模块集成测试报告')
  console.log('='.repeat(80))

  const modules = ['mevProtection', 'aiSentiment', 'autoTrading', 'riskAlerts']
  const moduleNames = {
    mevProtection: 'MEV防护',
    aiSentiment: 'AI情绪分析',
    autoTrading: '自动交易',
    riskAlerts: '风险预警'
  }

  let totalTests = 0
  let totalPassed = 0
  let totalFailed = 0

  modules.forEach(module => {
    const result = testResults[module]
    totalTests += result.total
    totalPassed += result.passed
    totalFailed += result.failed

    console.log(`\n${moduleNames[module]}:`)
    console.log(`  总测试数: ${result.total}`)
    console.log(`  通过: ${result.passed}`)
    console.log(`  失败: ${result.failed}`)
    console.log(`  通过率: ${result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : 0}%`)

    if (result.failed > 0) {
      console.log('\n  失败的测试:')
      result.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`    - ${test.name}: ${test.message}`)
        })
    }
  })

  console.log('\n' + '='.repeat(80))
  console.log('总体统计:')
  console.log(`  总测试数: ${totalTests}`)
  console.log(`  通过: ${totalPassed}`)
  console.log(`  失败: ${totalFailed}`)
  console.log(`  总通过率: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`)
  console.log('='.repeat(80))

  return {
    total: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    passRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0,
    details: testResults
  }
}

/**
 * 主测试函数
 */
export async function runNewModulesIntegrationTest() {
  console.log('🚀 开始执行新功能模块集成测试...')
  console.log('测试时间:', new Date().toISOString())

  try {
    // 执行所有模块的测试
    await testMEVProtection()
    await testAISentiment()
    await testAutoTrading()
    await testRiskAlerts()

    // 生成测试报告
    const report = generateTestReport()

    return report

  } catch (error) {
    console.error('集成测试执行失败:', error)
    return {
      total: 0,
      passed: 0,
      failed: 1,
      passRate: 0,
      error: error.message
    }
  }
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  (window as any).runNewModulesIntegrationTest = runNewModulesIntegrationTest
  console.log('💡 提示: 可以通过调用 runNewModulesIntegrationTest() 来运行测试')
}

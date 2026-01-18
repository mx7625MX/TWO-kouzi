let sellSettings = {
  maxSlippage: 5,
  minPrice: 0,
  sellStrategy: 'market',
};

/**
 * 执行快速卖出
 */
export async function executeQuickSell(params: any): Promise<any> {
  // 这里应该执行实际的卖出操作
  // 目前返回模拟数据
  const sellResult = {
    transactionId: `0x${Math.random().toString(16).substring(2, 66)}`,
    soldAmount: params.amount,
    receivedAmount: (parseFloat(params.amount) * Math.random()).toFixed(4),
    slippage: (Math.random() * 2).toFixed(2),
    status: 'completed',
    timestamp: Date.now(),
  };

  return sellResult;
}

/**
 * 获取卖出设置
 */
export async function getSellSettings(): Promise<any> {
  return sellSettings;
}

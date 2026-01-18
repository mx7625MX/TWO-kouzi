/**
 * 获取热点代币
 */
export async function getHotTokens(): Promise<any[]> {
  // 这里应该调用实际的热点检测算法
  // 目前返回模拟数据
  const hotTokens = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `HotToken${i + 1}`,
    symbol: `HOT${i + 1}`,
    price: (Math.random() * 100).toFixed(4),
    change24h: (Math.random() * 50 - 25).toFixed(2),
    volume24h: (Math.random() * 500000).toFixed(0),
    socialScore: Math.floor(Math.random() * 100),
    trend: Math.random() > 0.5 ? 'up' : 'down',
  }));

  return hotTokens;
}

/**
 * 获取趋势数据
 */
export async function getTrendingData(): Promise<any[]> {
  // 这里应该分析社交媒体趋势
  // 目前返回模拟数据
  const trending = [
    { topic: 'Meme Coin Season', mentions: 15234, sentiment: 0.75, change: '+23%' },
    { topic: 'DeFi Governance', mentions: 8456, sentiment: 0.62, change: '+15%' },
    { topic: 'Layer 2 Solutions', mentions: 6789, sentiment: 0.58, change: '+8%' },
    { topic: 'NFT Gaming', mentions: 5432, sentiment: 0.45, change: '-5%' },
    { topic: 'Cross-chain Bridges', mentions: 4321, sentiment: 0.52, change: '+2%' },
  ];

  return trending;
}

import { getDatabase } from '../data/database';

/**
 * 分析情绪
 */
export async function analyzeSentiment(text: string): Promise<any> {
  // 这里应该调用实际的AI服务分析情绪
  // 目前返回模拟数据
  // 实际实现可以使用 integration-doubao-seed 的 HTTP API
  
  const mockSentiment = Math.random() * 2 - 1; // -1 到 1
  
  let sentimentLabel = 'neutral';
  if (mockSentiment > 0.3) sentimentLabel = 'positive';
  else if (mockSentiment < -0.3) sentimentLabel = 'negative';

  // 存储到数据库
  const db = getDatabase();
  db.prepare(`
    INSERT INTO sentiments (token, source, sentiment, content)
    VALUES (?, ?, ?, ?)
  `).run('unknown', 'manual', mockSentiment, text);

  return {
    sentiment: mockSentiment,
    label: sentimentLabel,
    confidence: 0.85,
    keyPhrases: extractKeyPhrases(text),
    timestamp: Date.now(),
  };
}

/**
 * 获取代币情绪数据
 */
export async function getSentimentData(token: string): Promise<any> {
  const db = getDatabase();

  const sentiments = db.prepare(`
    SELECT * FROM sentiments
    WHERE token = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(token);

  if (sentiments.length === 0) {
    return {
      token: token,
      averageSentiment: 0,
      trend: 'neutral',
      dataPoints: [],
    };
  }

  const avgSentiment = sentiments.reduce((sum: number, s: any) => sum + s.sentiment, 0) / sentiments.length;
  
  let trend = 'neutral';
  if (avgSentiment > 0.2) trend = 'positive';
  else if (avgSentiment < -0.2) trend = 'negative';

  return {
    token: token,
    averageSentiment: avgSentiment,
    trend: trend,
    dataPoints: sentiments,
    lastUpdated: Date.now(),
  };
}

/**
 * 提取关键短语（简化版）
 */
function extractKeyPhrases(text: string): string[] {
  // 这里应该使用NLP工具提取关键词
  // 简化实现：提取常见加密货币相关词汇
  const cryptoKeywords = ['bullish', 'bearish', 'moon', 'pump', 'dump', 'hodl', 'rekt', 'gem', 'shitcoin', 'meme'];
  
  const found = cryptoKeywords.filter(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  return found.length > 0 ? found : ['market', 'trading'];
}

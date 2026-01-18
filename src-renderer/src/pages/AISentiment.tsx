import React, { useState } from 'react';

const AISentiment: React.FC = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!text) {
      alert('请输入要分析的文本');
      return;
    }

    try {
      const response = await (window as any).electronAPI.aiSentiment.analyzeSentiment(text);
      setResult(response);
    } catch (error) {
      alert('分析失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI情绪分析</h2>
        <p>使用AI分析社交媒体和市场情绪</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">文本分析</h3>
        </div>
        <label className="input-label">输入文本</label>
        <textarea
          className="input"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入要分析的文本内容..."
        />
        <button className="button button-primary" onClick={handleAnalyze}>
          🔍 分析情绪
        </button>
      </div>

      {result && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">分析结果</h3>
          </div>
          <div className="grid grid-2">
            <div>
              <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>情绪</p>
              <span className={`status status-${result.label === 'positive' ? 'success' : result.label === 'negative' ? 'danger' : 'neutral'}`}>
                {result.label}
              </span>
            </div>
            <div>
              <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>分数</p>
              <h3 style={{ fontSize: '24px' }}>{result.sentiment.toFixed(2)}</h3>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>关键短语</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {result.keyPhrases?.map((phrase: string, index: number) => (
                <span key={index} className="status status-neutral">
                  {phrase}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISentiment;

# Meme Master Pro - DeFi跨链操作平台

专业的DeFi跨链操作平台，集成钱包管理、代币发行、MEV防护、AI情绪分析、自动交易、风险预警等13个核心功能模块。

## 技术栈

- Electron 29.4.6
- React 18
- TypeScript 5.3.3
- Vite 5.1.0
- SQLite (better-sqlite3 9.6.0)
- ethers.js 6.10.0 (BSC)
- @solana/web3.js 1.98.4 (Solana)
- crypto-js 4.2.0 (AES-256-CBC)
- Ant Design 5.29.3

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

## 核心功能

1. 钱包管理 - BSC和Solana链钱包创建、导入、导出
2. 代币发行 - BSC和Solana链代币发行
3. MEV防护 - 防止三明治攻击和抢跑
4. AI情绪分析 - 基于Twitter和Reddit的代币情绪分析
5. 自动交易 - 基于策略的自动交易
6. 风险预警 - 实时监控和风险预警
7. 市场分析 - 市场数据分析和图表展示
8. 热点追踪 - 热门代币追踪
9. 利润分析 - 交易利润统计和分析
10. 闪电卖 - 快速卖出功能
11. 历史记录 - 交易历史查询
12. 数据导出 - 数据导出功能
13. 系统设置 - 系统配置管理

## 安全特性

- AES-256-CBC加密存储私钥
- PBKDF2密钥派生
- 完整的日志系统
- 错误处理机制

## License

MIT

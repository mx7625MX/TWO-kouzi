# Meme Master Pro

专业的DeFi跨链操作平台，支持BSC和Solana双链。

## 项目概览

Meme Master Pro是一个功能完整的DeFi操作桌面应用，集成了钱包管理、代币发行、MEV防护、AI情绪分析、自动交易、风险预警等13个核心模块。

## 技术栈

- **前端框架**: React 18 + TypeScript + Vite
- **桌面应用**: Electron
- **数据库**: SQLite (better-sqlite3)
- **区块链**: ethers.js (BSC), @solana/web3.js (Solana)
- **构建工具**: Vite + TypeScript

## 核心功能模块

### 1. 钱包管理
- 钱包创建与导入（私钥/助记词）
- 多钱包管理
- 余额查询（BSC/Solana）
- 交易签名与发送

### 2. 代币发行
- BSC代币部署
- Solana代币部署
- 批量购买功能
- 发行任务跟踪

### 3. MEV防护
- Flashbots私有交易池集成
- Jito集成（Solana）
- 实时MEV攻击检测
- 自动防护策略

### 4. AI情绪分析
- 多平台数据采集
- 自然语言处理
- 情感分析（正面/负面/中性）
- 热点Meme识别

### 5. 自动交易
- 策略配置管理
- 自动买入/卖出
- 止盈止损设置
- 回测系统

### 6. 风险预警
- 实时风险监控
- 多级预警系统
- 自定义风险规则
- 预警通知

### 7. 市场监控
- 实时市场数据
- 价格监控
- 交易量分析
- 市值跟踪

### 8. 热点监控
- 热点代币检测
- 快速上涨预警
- 社交热度分析
- 趋势识别

### 9. 盈利分析
- 投资组合分析
- 盈亏计算
- ROI统计
- 数据可视化

### 10. 快速卖出
- 快速卖出执行
- 批量卖出
- 滑点保护
- 卖出策略配置

### 11. 交易历史
- 交易记录查询
- 历史数据分析
- 交易筛选
- 数据导出（CSV/JSON）

### 12. 数据管理
- 数据导出
- 数据备份
- 数据恢复
- 数据清理

### 13. 设置管理
- 应用设置
- API密钥管理
- 主题切换
- 语言设置

## 项目结构

```
.
├── src-electron/              # Electron主进程代码
│   ├── main/                 # 主进程入口
│   │   ├── index.ts         # 主进程文件
│   │   └── preload.ts       # 预加载脚本
│   ├── ipc/                 # IPC处理器
│   │   ├── index.ts         # IPC注册
│   │   ├── walletHandlers.ts
│   │   ├── launchHandlers.ts
│   │   ├── mevProtectionHandlers.ts
│   │   ├── aiSentimentHandlers.ts
│   │   └── ...              # 其他处理器
│   ├── data/                # 数据库
│   │   └── database.ts      # SQLite数据库初始化
│   └── utils/               # 工具函数
│       └── ipc-cleanup.ts   # IPC清理工具
│
├── src-renderer/            # React前端代码
│   ├── src/
│   │   ├── components/      # React组件
│   │   │   └── Sidebar.tsx
│   │   ├── pages/           # 页面组件
│   │   │   ├── WalletManager.tsx
│   │   │   ├── LaunchToken.tsx
│   │   │   ├── MEVProtection.tsx
│   │   │   ├── AISentiment.tsx
│   │   │   ├── AutoTrading.tsx
│   │   │   ├── RiskAlert.tsx
│   │   │   ├── MarketMonitor.tsx
│   │   │   ├── HotspotMonitor.tsx
│   │   │   ├── ProfitAnalysis.tsx
│   │   │   ├── FlashSell.tsx
│   │   │   ├── TransactionHistory.tsx
│   │   │   ├── DataManagement.tsx
│   │   │   └── Settings.tsx
│   │   ├── styles/          # 样式文件
│   │   │   └── index.css
│   │   ├── App.tsx          # 主应用组件
│   │   └── main.tsx         # 入口文件
│   └── index.html
│
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript配置
├── tsconfig.electron.json   # Electron TypeScript配置
├── vite.config.ts           # Vite配置
└── README.md                # 项目文档
```

## 安装和运行

### 前置要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install --registry=https://registry.npmmirror.com
```

**注意**: `better-sqlite3` 是原生模块，可能需要编译环境。如果安装失败，可以使用以下方式：

1. 安装编译工具（Windows）
```bash
npm install --global windows-build-tools
```

2. 或者使用预编译版本
```bash
npm install better-sqlite3@9.4.3 --build-from-source
```

### 开发模式

```bash
npm run dev
```

### 构建应用

```bash
npm run build
```

### 打包应用

```bash
npm run build
npx electron-builder
```

## 数据库

应用使用SQLite作为本地数据库，包含以下表：

- `wallets` - 钱包信息
- `launch_tasks` - 代币发行任务
- `transactions` - 交易记录
- `alerts` - 风险预警
- `sentiments` - 情绪分析数据
- `mev_protection_stats` - MEV防护统计
- `market_watchlist` - 市场监控列表
- `settings` - 应用设置

## 安全说明

- 私钥存储在本地SQLite数据库中，需要加密处理
- 所有交易签名在主进程中进行
- 建议在生产环境中使用硬件钱包
- 定期备份数据库和钱包信息

## 开发状态

- ✅ 核心功能模块开发完成
- ✅ 前端UI组件完成
- ✅ IPC通信架构完成
- ⚠️ 需要集成实际的区块链API
- ⚠️ 需要集成AI服务API
- ⚠️ 需要进行完整的测试

## 后续优化

1. 集成真实的区块链API（BSC和Solana）
2. 集成AI情绪分析服务（OpenAI API或本地模型）
3. 实现Flashbots和Jito的完整集成
4. 添加单元测试和集成测试
5. 性能优化和代码重构
6. 完善错误处理和用户提示
7. 添加多语言支持
8. 实现主题切换功能

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系开发团队。

---

**注意**: 本项目仅供学习和研究使用，实际交易请谨慎操作，自行承担风险。

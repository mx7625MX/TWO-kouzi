import React from 'react';

interface SidebarProps {
  currentPage: string;
  onSelectPage: (page: string) => void;
}

const menuItems = [
  { id: 'wallet', label: '钱包管理', icon: '💼' },
  { id: 'launch', label: '代币发行', icon: '🚀' },
  { id: 'mev', label: 'MEV防护', icon: '🛡️' },
  { id: 'ai', label: 'AI情绪分析', icon: '🤖' },
  { id: 'trade', label: '自动交易', icon: '📈' },
  { id: 'risk', label: '风险预警', icon: '⚠️' },
  { id: 'market', label: '市场监控', icon: '📊' },
  { id: 'hotspot', label: '热点监控', icon: '🔥' },
  { id: 'profit', label: '盈利分析', icon: '💰' },
  { id: 'flash', label: '快速卖出', icon: '⚡' },
  { id: 'history', label: '交易历史', icon: '📝' },
  { id: 'data', label: '数据管理', icon: '💾' },
  { id: 'settings', label: '设置', icon: '⚙️' },
];

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Meme Master Pro</h1>
      </div>
      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onSelectPage(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;

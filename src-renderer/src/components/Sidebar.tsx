import React from 'react';
import { Layout, Menu, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  WalletOutlined,
  RocketOutlined,
  SafetyOutlined,
  RobotOutlined,
  LineChartOutlined,
  AlertOutlined,
  BarChartOutlined,
  FireOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  DatabaseOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

interface SidebarProps {
  currentPage: string;
  onSelectPage: (page: string) => void;
}

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
): MenuItem {
  return {
    key,
    icon,
    label,
  } as MenuItem;
}

const menuItems: MenuItem[] = [
  getItem('钱包管理', 'wallet', <WalletOutlined />),
  getItem('代币发行', 'launch', <RocketOutlined />),
  getItem('MEV防护', 'mev', <SafetyOutlined />),
  getItem('AI情绪分析', 'ai', <RobotOutlined />),
  getItem('自动交易', 'trade', <LineChartOutlined />),
  getItem('风险预警', 'risk', <AlertOutlined />),
  getItem('市场监控', 'market', <BarChartOutlined />),
  getItem('热点监控', 'hotspot', <FireOutlined />),
  getItem('盈利分析', 'profit', <DollarOutlined />),
  getItem('快速卖出', 'flash', <ThunderboltOutlined />),
  getItem('交易历史', 'history', <HistoryOutlined />),
  getItem('数据管理', 'data', <DatabaseOutlined />),
  getItem('设置', 'settings', <SettingOutlined />),
];

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    onSelectPage(key);
  };

  return (
    <Sider
      width={240}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: colorBgContainer,
      }}
    >
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 600,
          background: 'linear-gradient(90deg, #00d4ff, #7b2cbf)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Meme Master Pro
        </h2>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[currentPage]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
      />
    </Sider>
  );
};

export default Sidebar;

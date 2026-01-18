import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import WalletManager from './pages/WalletManager';
import LaunchToken from './pages/LaunchToken';
import MEVProtection from './pages/MEVProtection';
import AISentiment from './pages/AISentiment';
import AutoTrading from './pages/AutoTrading';
import RiskAlert from './pages/RiskAlert';
import MarketMonitor from './pages/MarketMonitor';
import HotspotMonitor from './pages/HotspotMonitor';
import ProfitAnalysis from './pages/ProfitAnalysis';
import FlashSell from './pages/FlashSell';
import TransactionHistory from './pages/TransactionHistory';
import DataManagement from './pages/DataManagement';
import Settings from './pages/Settings';

type Page = 'wallet' | 'launch' | 'mev' | 'ai' | 'trade' | 'risk' | 'market' | 'hotspot' | 'profit' | 'flash' | 'history' | 'data' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('wallet');

  const renderPage = () => {
    switch (currentPage) {
      case 'wallet':
        return <WalletManager />;
      case 'launch':
        return <LaunchToken />;
      case 'mev':
        return <MEVProtection />;
      case 'ai':
        return <AISentiment />;
      case 'trade':
        return <AutoTrading />;
      case 'risk':
        return <RiskAlert />;
      case 'market':
        return <MarketMonitor />;
      case 'hotspot':
        return <HotspotMonitor />;
      case 'profit':
        return <ProfitAnalysis />;
      case 'flash':
        return <FlashSell />;
      case 'history':
        return <TransactionHistory />;
      case 'data':
        return <DataManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <WalletManager />;
    }
  };

  return (
    <div className="app">
      <Sidebar currentPage={currentPage} onSelectPage={setCurrentPage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Spin } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  LogoutOutlined,
  SettingOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard/Dashboard';
import Customers from './pages/Customers/Customers';
import Staff from './pages/Staff/Staff';
import Payment from './pages/Payment/Payment';
import Inventory from './pages/Inventory/Inventory';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';
import { ThemeContext } from './context/ThemeContext';
import './styles/App.css';

const { Header, Sider, Content } = Layout;

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [spaName, setSpaName] = useState('SPA VIP');
  const { isUnlocked, lock, requireAuth } = useAuth();

  useEffect(() => {
    const loadSpaName = async () => {
      try {
        const ipc = window.electron || window.ipc;
        if (!ipc) return;
        const result = await ipc.invoke('db:settings:get', 'spa');
        if (result.success && result.data?.name) {
          setSpaName(result.data.name);
        }
      } catch {}
    };
    loadSpaName();
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
        <Layout style={{ minHeight: '100vh', background: isDarkMode ? '#0f0f0f' : '#f5f7fa' }}>
          <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            width={250}
            style={{
              background: isDarkMode ? '#1f1f1f' : '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRight: `1px solid ${isDarkMode ? '#333' : '#e8e8e8'}`,
              overflow: 'auto',
              height: '100vh',
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 100,
            }}
          >
            <div
              className="logo"
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                borderBottom: `1px solid ${isDarkMode ? '#333' : '#e8e8e8'}`,
                background: isDarkMode ? 'rgba(255,192,203,0.08)' : 'rgba(255,105,180,0.05)',
              }}
            >
              <h2 style={{ color: '#ff69b4', margin: 0, fontSize: '24px', fontWeight: '700' }}>{spaName}</h2>
              <p style={{ color: isDarkMode ? '#888' : '#666', margin: '4px 0 0 0', fontSize: '12px' }}>Quản Lý Chuyên Nghiệp</p>
            </div>
            <Menu
              theme={isDarkMode ? 'dark' : 'light'}
              mode="inline"
              selectedKeys={[currentPage]}
              onClick={(e) => setCurrentPage(e.key)}
              style={{
                border: 'none',
                background: isDarkMode ? '#1f1f1f' : '#fff',
                fontSize: '15px',
                fontWeight: 500,
              }}
              itemLabelColor={isDarkMode ? '#ccc' : '#1f1f1f'}
              selectedItemBg={isDarkMode ? 'rgba(255,105,180,0.15)' : 'rgba(255,105,180,0.1)'}
              selectedItemColor={'#ff69b4'}
              items={[
                {
                  key: 'dashboard',
                  icon: <DashboardOutlined />,
                  label: 'Bảng Điều Khiển',
                  onClick: () => setCurrentPage('dashboard'),
                },
                {
                  key: 'customers',
                  icon: <UserOutlined />,
                  label: 'Khách Hàng & Đặt Lịch',
                  onClick: () => setCurrentPage('customers'),
                },
                {
                  key: 'payment',
                  icon: <ShoppingCartOutlined />,
                  label: 'Thanh Toán',
                  onClick: () => setCurrentPage('payment'),
                },
                {
                  key: 'inventory',
                  icon: <BarChartOutlined />,
                  label: 'Tồn Kho',
                  onClick: () => setCurrentPage('inventory'),
                },
                {
                  key: 'reports',
                  icon: <BarChartOutlined />,
                  label: 'Báo Cáo',
                  onClick: () => setCurrentPage('reports'),
                },
                {
                  key: 'staff',
                  icon: <TeamOutlined />,
                  label: 'Nhân Viên',
                  onClick: () => setCurrentPage('staff'),
                },
                { type: 'divider' },
                {
                  key: 'settings',
                  icon: <SettingOutlined />,
                  label: 'Cài Đặt',
                  onClick: () => setCurrentPage('settings'),
                },
              ]}
            />
          </Sider>
          <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
            <Header
              style={{
                padding: '0 32px',
                background: isDarkMode ? '#1f1f1f' : '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${isDarkMode ? '#333' : '#e8e8e8'}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                height: '70px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Button
                  type="text"
                  size="large"
                  onClick={() => setCollapsed(!collapsed)}
                  style={{
                    color: isDarkMode ? '#ccc' : '#333',
                    fontSize: '18px',
                  }}
                  icon={collapsed ? '☰' : '✕'}
                />
                <div
                  style={{
                    color: isDarkMode ? '#fff' : '#1f1f1f',
                    fontSize: '16px',
                    fontWeight: '700',
                  }}
                >
                  Hệ Thống Quản Lý {spaName}
                </div>
              </div>
              <Button
                type="text"
                icon={isUnlocked ? <UnlockOutlined /> : <LockOutlined />}
                onClick={() => {
                  if (isUnlocked) {
                    lock();
                  } else {
                    requireAuth(null);
                  }
                }}
                style={{
                  color: isUnlocked ? '#52c41a' : (isDarkMode ? '#ccc' : '#333'),
                  fontSize: '16px',
                }}
              >
                {isUnlocked ? 'Đã Mở Khóa' : 'Đã Khóa'}
              </Button>
            </Header>
            <Content
              style={{
                margin: '24px 32px',
                padding: '32px',
                background: isDarkMode ? '#1f1f1f' : '#fff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                minHeight: 'calc(100vh - 134px)',
              }}
            >
              {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
              {currentPage === 'customers' && <Customers />}
              {currentPage === 'staff' && <Staff />}
              {currentPage === 'payment' && <Payment />}
              {currentPage === 'inventory' && <Inventory />}
              {currentPage === 'reports' && <Reports />}
              {currentPage === 'settings' && <Settings onSpaNameChange={setSpaName} />}
            </Content>
          </Layout>
        </Layout>
    </ThemeContext.Provider>
  );
};

export default App;

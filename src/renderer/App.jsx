import React, { useState } from 'react';
import { Layout, Menu, Button, Space, theme } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  ShoppingOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Dashboard from './pages/Dashboard/Dashboard';
import Booking from './pages/Booking/Booking';
import Payment from './pages/Payment/Payment';
import Inventory from './pages/Inventory/Inventory';
import Customers from './pages/Customers/Customers';
import Staff from './pages/Staff/Staff';
import Reports from './pages/Reports/Reports';

const { Header, Sider, Content } = Layout;

function AppContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const { isDark, toggleTheme } = useTheme();
  const { token } = theme.useToken();

  const renderContent = () => {
    switch (selectedMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'booking':
        return <Booking />;
      case 'payment':
        return <Payment />;
      case 'inventory':
        return <Inventory />;
      case 'customers':
        return <Customers />;
      case 'staff':
        return <Staff />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'booking',
      icon: <CalendarOutlined />,
      label: 'Dat Lich',
    },
    {
      key: 'payment',
      icon: <CreditCardOutlined />,
      label: 'Thanh Toan',
    },
    {
      key: 'inventory',
      icon: <ShoppingOutlined />,
      label: 'Kho Hang',
    },
    {
      key: 'customers',
      icon: <UserOutlined />,
      label: 'Khach Hang',
    },
    {
      key: 'staff',
      icon: <TeamOutlined />,
      label: 'Nhan Vien',
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: 'Bao Cao',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          backgroundColor: isDark ? '#141414' : '#fff',
        }}
      >
        <div style={{ padding: '16px', textAlign: 'center', color: token.colorPrimary }}>
          <h2>SPA VIP</h2>
        </div>
        <Menu
          theme={isDark ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[selectedMenu]}
          items={menuItems}
          onClick={(e) => setSelectedMenu(e.key)}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200 }}>
        <Header
          style={{
            padding: '0 24px',
            background: isDark ? '#141414' : '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${token.colorBorder}`,
          }}
        >
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px' }}
          >
            {collapsed ? '>' : '<'}
          </Button>
          <Space>
            <Button
              type="text"
              icon={<BgColorsOutlined />}
              onClick={toggleTheme}
              title={isDark ? 'Light Mode' : 'Dark Mode'}
            />
          </Space>
        </Header>

        <Content style={{ margin: '24px 16px', overflow: 'initial' }}>
          <div
            style={{
              padding: '24px',
              background: isDark ? '#1f1f1f' : '#fafafa',
              borderRadius: '8px',
              minHeight: 'calc(100vh - 112px)',
            }}
          >
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

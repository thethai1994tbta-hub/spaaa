import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Empty, Spin } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
import { useAPI } from '../../hooks/useAPI';

export default function Dashboard() {
  const { invoke, loading } = useAPI();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await invoke('db:dashboard:getStats');
      setStats(result.data || result);
      const bookingsResult = await invoke('db:bookings:getAll');
      setBookings(bookingsResult.data || bookingsResult || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  if (loading) return <Spin />;

  return (
    <div>
      <h1>Dashboard</h1>
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Doanh Thu Hom Nay" value={stats?.todayRevenue || 0} suffix="VND" /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Doanh Thu Thang Nay" value={stats?.monthRevenue || 0} suffix="VND" /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Lich Hen Hom Nay" value={stats?.todayBookings || 0} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Tong Khach Hang" value={stats?.totalCustomers || 0} /></Card>
        </Col>
      </Row>
      <Card title="Lich Hen Gan Day">
        {bookings.length > 0 ? (
          <Table dataSource={bookings.slice(0, 10)} columns={[
            { title: 'Khach Hang', dataIndex: 'customer_name', key: 'customer_name' },
            { title: 'Dich Vu', dataIndex: 'service_name', key: 'service_name' },
            { title: 'Trang Thai', dataIndex: 'status', key: 'status' },
          ]} pagination={false} size="small" />
        ) : (
          <Empty description="Khong co du lieu" />
        )}
      </Card>
    </div>
  );
}

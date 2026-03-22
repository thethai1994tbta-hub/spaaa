import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Empty, Spin, Tag, Badge, Tabs, Button, message, Tooltip } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, BellOutlined, SendOutlined } from '@ant-design/icons';
import { useAPI } from '../../hooks/useAPI';
import dayjs from 'dayjs';

export default function Dashboard() {
  const { invoke, loading } = useAPI();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [servicesList, setServicesList] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, bookingsRes, customersRes, staffRes, servicesRes] = await Promise.all([
        invoke('db:dashboard:getStats'),
        invoke('db:bookings:getAll'),
        invoke('db:customers:getAll'),
        invoke('db:staff:getAll'),
        invoke('db:services:getAll'),
      ]);
      setStats(statsRes.data || statsRes);
      setBookings(bookingsRes.data || bookingsRes || []);
      setCustomers(customersRes.data || customersRes || []);
      setStaffList(staffRes.data || staffRes || []);
      setServicesList(servicesRes.data || servicesRes || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  // Lookup name by ID (fallback for old bookings without stored names)
  const getCustomerName = (b) => b.customer_name || customers.find(c => c.id === (b.customer_id || b.customerId))?.name || '-';
  const getStaffName = (b) => b.staff_name || staffList.find(s => s.id === (b.staff_id || b.staffId))?.name || '';
  const getServiceName = (b) => b.service_name || servicesList.find(s => s.id === (b.service_id || b.serviceId))?.name || '';

  // Zalo reminder: open Zalo chat with pre-filled message
  const sendZaloReminder = (booking) => {
    const customer = customers.find(c => c.id === (booking.customer_id || booking.customerId));
    const phone = customer?.phone;
    if (!phone) {
      message.warning('Khách hàng chưa có số điện thoại');
      return;
    }
    const d = getBookingDate(booking);
    const dateStr = d ? d.format('DD/MM/YYYY') : '';
    const timeStr = d ? d.format('HH:mm') : '';
    const serviceName = getServiceName(booking);
    const text = `Xin chào ${getCustomerName(booking)}! Nhắc lịch hẹn spa ngày ${dateStr} lúc ${timeStr}${serviceName ? ` - Dịch vụ: ${serviceName}` : ''}. Xin cảm ơn!`;
    // Format phone: remove leading 0, add 84 country code
    let zaloPhone = phone.replace(/\s+/g, '');
    if (zaloPhone.startsWith('0')) zaloPhone = '84' + zaloPhone.slice(1);
    window.open(`https://zalo.me/${zaloPhone}`, '_blank');
    // Copy message to clipboard for quick paste
    navigator.clipboard.writeText(text).then(() => {
      message.success('Đã copy tin nhắn nhắc hẹn — Dán vào Zalo');
    });
  };

  // Categorize bookings
  const now = dayjs();
  const todayStr = now.format('YYYY-MM-DD');
  const tomorrowStr = now.add(1, 'day').format('YYYY-MM-DD');

  const getBookingDate = (b) => {
    const d = b.booking_date || b.bookingDate;
    return d ? dayjs(d) : null;
  };

  const upcomingBookings = bookings
    .filter((b) => {
      const d = getBookingDate(b);
      return d && d.isAfter(now.subtract(1, 'day')) && b.status !== 'cancelled' && b.status !== 'completed';
    })
    .sort((a, b) => {
      const da = getBookingDate(a);
      const db = getBookingDate(b);
      return (da?.valueOf() || 0) - (db?.valueOf() || 0);
    });

  const todayBookings = upcomingBookings.filter((b) => {
    const d = getBookingDate(b);
    return d && d.format('YYYY-MM-DD') === todayStr;
  });

  const tomorrowBookings = upcomingBookings.filter((b) => {
    const d = getBookingDate(b);
    return d && d.format('YYYY-MM-DD') === tomorrowStr;
  });

  const getReminderTag = (booking) => {
    const d = getBookingDate(booking);
    if (!d) return null;
    const dateStr = d.format('YYYY-MM-DD');
    if (dateStr === todayStr) {
      const diffMinutes = d.diff(now, 'minute');
      if (diffMinutes < 0) {
        return <Tag color="red">Quá giờ</Tag>;
      }
      if (diffMinutes <= 60) {
        return <Tag icon={<BellOutlined />} color="red">Sắp đến ({diffMinutes} phút)</Tag>;
      }
      return <Tag icon={<ClockCircleOutlined />} color="orange">Hôm nay</Tag>;
    }
    if (dateStr === tomorrowStr) {
      return <Tag icon={<CalendarOutlined />} color="blue">Ngày mai</Tag>;
    }
    return <Tag color="default">Sắp tới</Tag>;
  };

  const statusMap = { pending: 'Chờ xử lý', confirmed: 'Xác nhận', completed: 'Hoàn thành', cancelled: 'Hủy' };
  const statusColor = { pending: '#faad14', confirmed: '#1890ff', completed: '#52c41a', cancelled: '#f5222d' };

  const bookingColumns = [
    {
      title: 'Nhắc Hẹn',
      key: 'reminder',
      width: 150,
      render: (_, record) => (
        <span>
          {getReminderTag(record)}
          <Tooltip title="Nhắc qua Zalo">
            <Button
              type="link"
              size="small"
              icon={<SendOutlined />}
              onClick={() => sendZaloReminder(record)}
              style={{ color: '#0068ff', padding: '0 4px' }}
            />
          </Tooltip>
        </span>
      ),
    },
    {
      title: 'Khách Hàng',
      key: 'customer',
      width: 140,
      render: (_, record) => getCustomerName(record),
    },
    {
      title: 'Dịch Vụ',
      key: 'service',
      width: 140,
      render: (_, record) => getServiceName(record) || '-',
    },
    {
      title: 'Nhân Viên',
      key: 'staff',
      width: 130,
      render: (_, record) => getStaffName(record) || '-',
    },
    {
      title: 'Ngày Giờ',
      key: 'date',
      width: 160,
      render: (_, record) => {
        const d = getBookingDate(record);
        return d ? d.format('DD/MM/YYYY HH:mm') : '-';
      },
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => (
        <span style={{ color: statusColor[status] }}>{statusMap[status] || status}</span>
      ),
    },
  ];

  if (loading) return <Spin />;

  return (
    <div>
      <h1>Dashboard</h1>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Doanh Thu Hôm Nay" value={stats?.todayRevenue || 0} suffix="VND" /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Doanh Thu Tháng Này" value={stats?.monthRevenue || 0} suffix="VND" /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Lịch Hẹn Hôm Nay"
              value={todayBookings.length}
              valueStyle={{ color: todayBookings.length > 0 ? '#ff69b4' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Tổng Khách Hàng" value={stats?.totalCustomers || 0} /></Card>
        </Col>
      </Row>

      <Card title="Lịch Hẹn">
        <Tabs
          defaultActiveKey="today"
          items={[
            {
              key: 'today',
              label: (
                <Badge count={todayBookings.length} size="small" offset={[8, -2]} color="#ff69b4">
                  <span><BellOutlined /> Hôm Nay</span>
                </Badge>
              ),
              children: todayBookings.length > 0 ? (
                <Row gutter={[12, 12]}>
                  {todayBookings.map((b, i) => {
                    const d = getBookingDate(b);
                    const diffMinutes = d ? d.diff(now, 'minute') : 0;
                    const isUrgent = diffMinutes >= 0 && diffMinutes <= 60;
                    const isPast = diffMinutes < 0;
                    return (
                      <Col xs={24} sm={12} lg={8} key={b.id || i}>
                        <Card
                          size="small"
                          style={{
                            background: isPast ? '#fff1f0' : isUrgent ? '#fff7e6' : '#f6ffed',
                            border: `1px solid ${isPast ? '#ffa39e' : isUrgent ? '#ffd591' : '#b7eb8f'}`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>{getCustomerName(b)}</span>
                            <Tooltip title="Nhắc qua Zalo">
                              <Button type="link" size="small" icon={<SendOutlined />} onClick={() => sendZaloReminder(b)} style={{ color: '#0068ff', padding: 0 }} />
                            </Tooltip>
                          </div>
                          <div style={{ fontSize: 12, color: '#595959' }}>
                            {getServiceName(b) && <div>Dịch vụ: {getServiceName(b)}</div>}
                            {getStaffName(b) && <div>Nhân viên: {getStaffName(b)}</div>}
                            <div style={{ fontWeight: 500, marginTop: 4 }}>
                              {d ? d.format('HH:mm') : '-'}
                              {' '}{getReminderTag(b)}
                            </div>
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              ) : (
                <Empty description="Không có lịch hẹn hôm nay" />
              ),
            },
            {
              key: 'tomorrow',
              label: (
                <Badge count={tomorrowBookings.length} size="small" offset={[8, -2]} color="#1890ff">
                  <span><CalendarOutlined /> Ngày Mai</span>
                </Badge>
              ),
              children: tomorrowBookings.length > 0 ? (
                <Row gutter={[12, 12]}>
                  {tomorrowBookings.map((b, i) => {
                    const d = getBookingDate(b);
                    return (
                      <Col xs={24} sm={12} lg={8} key={b.id || i}>
                        <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>{getCustomerName(b)}</span>
                            <Tooltip title="Nhắc qua Zalo">
                              <Button type="link" size="small" icon={<SendOutlined />} onClick={() => sendZaloReminder(b)} style={{ color: '#0068ff', padding: 0 }} />
                            </Tooltip>
                          </div>
                          <div style={{ fontSize: 12, color: '#595959' }}>
                            {getServiceName(b) && <div>Dịch vụ: {getServiceName(b)}</div>}
                            {getStaffName(b) && <div>Nhân viên: {getStaffName(b)}</div>}
                            <div style={{ fontWeight: 500, marginTop: 4 }}>
                              {d ? d.format('HH:mm') : '-'}
                            </div>
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              ) : (
                <Empty description="Không có lịch hẹn ngày mai" />
              ),
            },
            {
              key: 'upcoming',
              label: (
                <Badge count={upcomingBookings.length} size="small" offset={[8, -2]}>
                  <span><ClockCircleOutlined /> Tất Cả Sắp Tới</span>
                </Badge>
              ),
              children: upcomingBookings.length > 0 ? (
                <Table
                  dataSource={upcomingBookings.slice(0, 15).map((b, i) => ({ ...b, key: b.id || i }))}
                  columns={bookingColumns}
                  pagination={false}
                  size="small"
                  scroll={{ x: 800 }}
                />
              ) : (
                <Empty description="Không có lịch hẹn" />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

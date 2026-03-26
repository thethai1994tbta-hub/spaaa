import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Empty, Spin, Tag, Badge, Tabs, Button, message, Tooltip, List, Avatar, Progress, Divider, Space } from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, BellOutlined, SendOutlined,
  UserOutlined, TeamOutlined, ShoppingCartOutlined, WarningOutlined,
  RiseOutlined, DollarOutlined, CheckCircleOutlined, MinusCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAPI } from '../../hooks/useAPI';
import dayjs from 'dayjs';

const COLORS = ['#ff69b4', '#36cfc9', '#597ef7', '#ffc53d', '#ff7a45', '#9254de', '#73d13d', '#f759ab'];

export default function Dashboard({ onNavigate, onGoToPayment }) {
  const { invoke, loading } = useAPI();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [
        statsRes,
        bookingsRes,
        customersRes,
        staffRes,
        servicesRes,
        txRes,
        invRes,
      ] = await Promise.allSettled([
        invoke('db:dashboard:getStats'),
        invoke('db:bookings:getAll'),
        invoke('db:customers:getAll'),
        invoke('db:staff:getAll'),
        invoke('db:services:getAll'),
        invoke('db:transactions:getAll'),
        invoke('db:inventory:getAll'),
      ]);

      const safeValue = (settled, fallback) => (
        settled.status === 'fulfilled' ? (settled.value?.data ?? settled.value) : fallback
      );

      setStats(safeValue(statsRes, null));
      setBookings(safeValue(bookingsRes, []) || []);
      setCustomers(safeValue(customersRes, []) || []);
      setStaffList((safeValue(staffRes, []) || []).filter(s => s.active !== false));
      setServicesList((safeValue(servicesRes, []) || []).filter(s => s.active !== false));
      const allTx = safeValue(txRes, []) || [];
      setTransactions(allTx.filter(t => {
        const type = t.transactionType || t.transaction_type;
        return !t.deleted && type !== 'commission' && type !== 'expense' && type !== 'expense_deleted' && type !== 'deleted' && (t.amount || 0) > 0;
      }));
      setInventory(safeValue(invRes, []) || []);

      // Load today's attendance
      try {
        const today = dayjs().startOf('day');
        const attRes = await invoke('db:query', 'attendance', [
          { field: 'date', operator: '>=', value: today.toDate() },
          { field: 'date', operator: '<=', value: today.endOf('day').toDate() },
        ]);
        setAttendanceRecords(attRes.data || attRes || []);
      } catch {}
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  // ============ HELPERS ============
  const getCustomerName = (b) => b.customer_name || customers.find(c => c.id === (b.customer_id || b.customerId))?.name || '-';
  const getStaffName = (b) => b.staff_name || staffList.find(s => s.id === (b.staff_id || b.staffId))?.name || '';
  const getServiceName = (b) => b.service_name || servicesList.find(s => s.id === (b.service_id || b.serviceId))?.name || '';

  const getBookingDate = (b) => {
    const d = b.booking_date || b.bookingDate;
    return d ? dayjs(d) : null;
  };

  // Zalo reminder
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
    let zaloPhone = phone.replace(/\s+/g, '');
    if (zaloPhone.startsWith('0')) zaloPhone = '84' + zaloPhone.slice(1);
    window.open(`https://zalo.me/${zaloPhone}`, '_blank');
    navigator.clipboard.writeText(text).then(() => {
      message.success('Đã copy tin nhắn nhắc hẹn — Dán vào Zalo');
    });
  };

  // ============ BOOKING CATEGORIES ============
  const now = dayjs();
  const todayStr = now.format('YYYY-MM-DD');
  const tomorrowStr = now.add(1, 'day').format('YYYY-MM-DD');

  const upcomingBookings = bookings
    .filter((b) => {
      const d = getBookingDate(b);
      return d && d.isAfter(now.subtract(1, 'day')) && b.status !== 'cancelled' && b.status !== 'completed';
    })
    .sort((a, b) => (getBookingDate(a)?.valueOf() || 0) - (getBookingDate(b)?.valueOf() || 0));

  const todayBookings = upcomingBookings.filter((b) => getBookingDate(b)?.format('YYYY-MM-DD') === todayStr);
  const tomorrowBookings = upcomingBookings.filter((b) => getBookingDate(b)?.format('YYYY-MM-DD') === tomorrowStr);

  const getReminderTag = (booking) => {
    const d = getBookingDate(booking);
    if (!d) return null;
    const dateStr = d.format('YYYY-MM-DD');
    if (dateStr === todayStr) {
      const diffMinutes = d.diff(now, 'minute');
      if (diffMinutes < 0) return <Tag color="red">Quá giờ</Tag>;
      if (diffMinutes <= 60) return <Tag icon={<BellOutlined />} color="red">Sắp đến ({diffMinutes} phút)</Tag>;
      return <Tag icon={<ClockCircleOutlined />} color="orange">Hôm nay</Tag>;
    }
    if (dateStr === tomorrowStr) return <Tag icon={<CalendarOutlined />} color="blue">Ngày mai</Tag>;
    return <Tag color="default">Sắp tới</Tag>;
  };

  // ============ REVENUE CHART (7 ngày) ============
  const revenueChartData = (() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = now.subtract(i, 'day');
      const dateStr = date.format('YYYY-MM-DD');
      const dayRevenue = transactions
        .filter(t => {
          if (t.transactionType === 'commission') return false;
          const txDate = t.date || t.createdAt;
          return txDate && dayjs(txDate).format('YYYY-MM-DD') === dateStr;
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      data.push({
        date: date.format('DD/MM'),
        revenue: dayRevenue,
      });
    }
    return data;
  })();

  // ============ SERVICE POPULARITY (PIE) ============
  const serviceChartData = (() => {
    const serviceCount = {};
    transactions
      .filter(t => t.transactionType !== 'commission' && t.items?.length > 0)
      .forEach(t => {
        t.items.forEach(item => {
          const name = item.name || 'Khác';
          serviceCount[name] = (serviceCount[name] || 0) + (item.quantity || 1);
        });
      });
    return Object.entries(serviceCount)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  })();

  // ============ STAFF STATUS TODAY ============
  const staffStatus = staffList.map(s => {
    const attendance = attendanceRecords.find(a => a.staffId === s.id);
    const hasBookingNow = todayBookings.some(b => {
      const staffId = b.staff_id || b.staffId;
      if (staffId !== s.id) return false;
      const d = getBookingDate(b);
      if (!d) return false;
      const diff = d.diff(now, 'minute');
      return diff >= -60 && diff <= 30; // within service window
    });

    let status = 'off'; // nghỉ
    let statusText = 'Nghỉ';
    let color = '#d9d9d9';
    if (attendance) {
      if (attendance.checkOutTime) {
        status = 'done';
        statusText = 'Đã về';
        color = '#8c8c8c';
      } else if (hasBookingNow) {
        status = 'busy';
        statusText = 'Đang phục vụ';
        color = '#ff69b4';
      } else {
        status = 'free';
        statusText = 'Rảnh';
        color = '#52c41a';
      }
    }
    return { ...s, status, statusText, color, attendance };
  });

  const freeStaff = staffStatus.filter(s => s.status === 'free');
  const busyStaff = staffStatus.filter(s => s.status === 'busy');
  const workingStaff = staffStatus.filter(s => s.status === 'free' || s.status === 'busy');

  // ============ LOW STOCK ALERTS ============
  const lowStockItems = inventory.filter(item => (item.quantity || 0) <= (item.reorderLevel || 10));

  // ============ RECENT TRANSACTIONS ============
  const recentTransactions = transactions
    .filter(t => t.transactionType !== 'commission')
    .slice(0, 5);

  // ============ RENDER ============
  // Calculate stats from filtered transactions (frontend, no backend dependency)
  const todayRevenue = transactions
    .filter(t => {
      const d = t.date || t.createdAt;
      return d && dayjs(d).format('YYYY-MM-DD') === todayStr;
    })
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const monthRevenue = transactions
    .filter(t => {
      const d = t.date || t.createdAt;
      return d && dayjs(d).format('YYYY-MM') === now.format('YYYY-MM');
    })
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  if (loading) return <Spin style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <Button icon={<ReloadOutlined />} onClick={loadDashboard} loading={loading}>Làm Mới</Button>
      </div>

      {/* ===== STATS ROW ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => onNavigate?.('reports')} style={{ borderLeft: '4px solid #ff69b4', cursor: 'pointer' }}>
            <Statistic
              title="Doanh Thu Hôm Nay"
              value={todayRevenue}
              suffix="₫"
              prefix={<DollarOutlined style={{ color: '#ff69b4' }} />}
              valueStyle={{ color: '#ff69b4' }}
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => onNavigate?.('reports')} style={{ borderLeft: '4px solid #597ef7', cursor: 'pointer' }}>
            <Statistic
              title="Doanh Thu Tháng Này"
              value={monthRevenue}
              suffix="₫"
              prefix={<RiseOutlined style={{ color: '#597ef7' }} />}
              valueStyle={{ color: '#597ef7' }}
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => onNavigate?.('customers')} style={{ borderLeft: '4px solid #36cfc9', cursor: 'pointer' }}>
            <Statistic
              title="Lịch Hẹn Hôm Nay"
              value={todayBookings.length}
              prefix={<CalendarOutlined style={{ color: '#36cfc9' }} />}
              valueStyle={{ color: '#36cfc9' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => onNavigate?.('customers')} style={{ borderLeft: '4px solid #ffc53d', cursor: 'pointer' }}>
            <Statistic
              title="Tổng Khách Hàng"
              value={customers.length}
              prefix={<UserOutlined style={{ color: '#ffc53d' }} />}
              valueStyle={{ color: '#ffc53d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ===== CHARTS ROW ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title={<span><RiseOutlined /> Doanh Thu 7 Ngày Gần Nhất</span>} size="small" extra={<Button type="link" size="small" onClick={() => onNavigate?.('reports')}>Báo cáo →</Button>}>
            {revenueChartData.some(d => d.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <RechartsTooltip formatter={(value) => [`${Number(value).toLocaleString('vi-VN')}₫`, 'Doanh thu']} />
                  <Bar dataKey="revenue" fill="#ff69b4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="Chưa có dữ liệu doanh thu" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<span><ShoppingCartOutlined /> Dịch Vụ Phổ Biến</span>} size="small" extra={<Button type="link" size="small" onClick={() => onNavigate?.('inventory')}>Dịch vụ →</Button>}>
            {serviceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={serviceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name.substring(0, 10)}${name.length > 10 ? '...' : ''} ${(percent * 100).toFixed(0)}%`}
                  >
                    {serviceChartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value, name) => [`${value} lần`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="Chưa có dữ liệu" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
      </Row>

      {/* ===== STAFF STATUS + LOW STOCK ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<span><TeamOutlined /> Nhân Viên Hôm Nay ({workingStaff.length}/{staffList.length} đang làm)</span>}
            size="small"
            extra={<Button type="link" size="small" onClick={() => onNavigate?.('staff')}>Xem tất cả →</Button>}
          >
            {staffList.length > 0 ? (
              <List
                dataSource={staffStatus}
                renderItem={(s) => (
                  <List.Item
                    style={{ padding: '8px 0' }}
                    extra={
                      <Tag color={s.color} style={{ minWidth: 90, textAlign: 'center' }}>
                        {s.status === 'free' && <CheckCircleOutlined />}
                        {s.status === 'busy' && <ClockCircleOutlined />}
                        {s.status === 'off' && <MinusCircleOutlined />}
                        {' '}{s.statusText}
                      </Tag>
                    }
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          style={{ backgroundColor: s.color }}
                          icon={<UserOutlined />}
                        />
                      }
                      title={s.name}
                      description={s.position || 'Nhân viên'}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Chưa có nhân viên" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Row gutter={[16, 16]}>
            {/* Low Stock */}
            <Col span={24}>
              <Card
                title={
                  <span style={{ color: lowStockItems.length > 0 ? '#ff4d4f' : undefined }}>
                    <WarningOutlined /> Cảnh Báo Tồn Kho
                    {lowStockItems.length > 0 && <Badge count={lowStockItems.length} style={{ marginLeft: 8 }} />}
                  </span>
                }
                size="small"
                extra={<Button type="link" size="small" onClick={() => onNavigate?.('inventory')}>Tồn kho →</Button>}
              >
                {lowStockItems.length > 0 ? (
                  <List
                    dataSource={lowStockItems}
                    renderItem={(item) => (
                      <List.Item style={{ padding: '6px 0' }}>
                        <List.Item.Meta
                          title={<span style={{ color: '#ff4d4f' }}>{item.name}</span>}
                          description={`Còn: ${item.quantity || 0} | Mức tái đặt: ${item.reorderLevel || 10}`}
                        />
                        <Progress
                          percent={Math.round(((item.quantity || 0) / (item.reorderLevel || 10)) * 100)}
                          size="small"
                          style={{ width: 100 }}
                          strokeColor={
                            (item.quantity || 0) === 0 ? '#ff4d4f' :
                            (item.quantity || 0) < (item.reorderLevel || 10) / 2 ? '#faad14' : '#52c41a'
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Tồn kho ổn định" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>

            {/* Recent Transactions */}
            <Col span={24}>
              <Card title={<span><DollarOutlined /> Giao Dịch Gần Đây</span>} size="small" extra={<Button type="link" size="small" onClick={() => onNavigate?.('payment')}>Xem tất cả →</Button>}>
                {recentTransactions.length > 0 ? (
                  <List
                    dataSource={recentTransactions}
                    renderItem={(t) => {
                      const txDate = t.date || t.createdAt;
                      return (
                        <List.Item style={{ padding: '6px 0' }}>
                          <List.Item.Meta
                            title={t.customerName || customers.find(c => c.id === t.customerId)?.name || 'Khách'}
                            description={txDate ? dayjs(txDate).format('DD/MM HH:mm') : '-'}
                          />
                          <span style={{ fontWeight: 600, color: '#ff69b4' }}>
                            {Number(t.amount || 0).toLocaleString('vi-VN')}₫
                          </span>
                        </List.Item>
                      );
                    }}
                  />
                ) : (
                  <Empty description="Chưa có giao dịch" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* ===== APPOINTMENTS ===== */}
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
                          hoverable
                          onClick={() => onNavigate && onNavigate('customers')}
                          style={{
                            background: isPast ? '#fff1f0' : isUrgent ? '#fff7e6' : '#f6ffed',
                            border: `1px solid ${isPast ? '#ffa39e' : isUrgent ? '#ffd591' : '#b7eb8f'}`,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>{getCustomerName(b)}</span>
                            <Space size={4}>
                              <Tooltip title="Thanh toán">
                                <Button type="link" size="small" icon={<DollarOutlined />} onClick={(e) => { e.stopPropagation(); onGoToPayment?.(b); }} style={{ color: '#52c41a', padding: 0 }} />
                              </Tooltip>
                              <Tooltip title="Nhắc qua Zalo">
                                <Button type="link" size="small" icon={<SendOutlined />} onClick={(e) => { e.stopPropagation(); sendZaloReminder(b); }} style={{ color: '#0068ff', padding: 0 }} />
                              </Tooltip>
                            </Space>
                          </div>
                          <div style={{ fontSize: 12, color: '#595959' }}>
                            {getServiceName(b) && <div>Dịch vụ: {getServiceName(b)}</div>}
                            {getStaffName(b) && <div>Nhân viên: {getStaffName(b)}</div>}
                            <div style={{ fontWeight: 500, marginTop: 4 }}>
                              {d ? d.format('HH:mm') : '-'} {getReminderTag(b)}
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
                        <Card size="small" hoverable onClick={() => onNavigate && onNavigate('customers')} style={{ background: '#e6f7ff', border: '1px solid #91d5ff', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>{getCustomerName(b)}</span>
                            <Tooltip title="Nhắc qua Zalo">
                              <Button type="link" size="small" icon={<SendOutlined />} onClick={(e) => { e.stopPropagation(); sendZaloReminder(b); }} style={{ color: '#0068ff', padding: 0 }} />
                            </Tooltip>
                          </div>
                          <div style={{ fontSize: 12, color: '#595959' }}>
                            {getServiceName(b) && <div>Dịch vụ: {getServiceName(b)}</div>}
                            {getStaffName(b) && <div>Nhân viên: {getStaffName(b)}</div>}
                            <div style={{ fontWeight: 500, marginTop: 4 }}>{d ? d.format('HH:mm') : '-'}</div>
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
                  columns={[
                    {
                      title: 'Nhắc Hẹn',
                      key: 'reminder',
                      width: 150,
                      render: (_, record) => (
                        <span>
                          {getReminderTag(record)}
                          <Tooltip title="Nhắc qua Zalo">
                            <Button type="link" size="small" icon={<SendOutlined />} onClick={() => sendZaloReminder(record)} style={{ color: '#0068ff', padding: '0 4px' }} />
                          </Tooltip>
                        </span>
                      ),
                    },
                    { title: 'Khách Hàng', key: 'customer', width: 140, render: (_, r) => getCustomerName(r) },
                    { title: 'Dịch Vụ', key: 'service', width: 140, render: (_, r) => getServiceName(r) || '-' },
                    { title: 'Nhân Viên', key: 'staff', width: 130, render: (_, r) => getStaffName(r) || '-' },
                    { title: 'Ngày Giờ', key: 'date', width: 160, render: (_, r) => { const d = getBookingDate(r); return d ? d.format('DD/MM/YYYY HH:mm') : '-'; } },
                    {
                      title: 'Trạng Thái', dataIndex: 'status', key: 'status', width: 110,
                      render: (status) => {
                        const map = { pending: 'Chờ xử lý', confirmed: 'Xác nhận', completed: 'Hoàn thành', cancelled: 'Hủy' };
                        const colors = { pending: '#faad14', confirmed: '#1890ff', completed: '#52c41a', cancelled: '#f5222d' };
                        return <span style={{ color: colors[status] }}>{map[status] || status}</span>;
                      },
                    },
                  ]}
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

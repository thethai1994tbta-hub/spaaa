import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Table, Space, Button, Spin, Empty, Tabs, DatePicker,
  Row, Col, Statistic, Tag, Select, message, Descriptions,
} from 'antd';
import {
  DownloadOutlined, DollarOutlined, BarChartOutlined,
  TeamOutlined, ShoppingCartOutlined, CalendarOutlined,
  RiseOutlined, FallOutlined, WalletOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useAPI } from '../../hooks/useAPI';

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;
const COLORS = ['#ff69b4', '#36cfc9', '#597ef7', '#ffc53d', '#ff7a45', '#9254de', '#73d13d', '#f759ab', '#40a9ff', '#ff4d4f'];

const parseDate = (val) => {
  if (!val) return null;
  if (val._seconds !== undefined) return dayjs(val._seconds * 1000);
  if (val.seconds !== undefined) return dayjs(val.seconds * 1000);
  return dayjs(val);
};

export default function Reports() {
  const { invoke } = useAPI();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('revenue');
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('day')]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txRes, bkRes, custRes, staffRes, svcRes, invRes] = await Promise.all([
        invoke('db:transactions:getAll'),
        invoke('db:bookings:getAll'),
        invoke('db:customers:getAll'),
        invoke('db:staff:getAll'),
        invoke('db:services:getAll'),
        invoke('db:inventory:getAll'),
      ]);
      setTransactions(txRes.data || txRes || []);
      setBookings(bkRes.data || bkRes || []);
      setCustomers(custRes.data || custRes || []);
      setStaffList(staffRes.data || staffRes || []);
      setServicesList(svcRes.data || svcRes || []);
      setInventory(invRes.data || invRes || []);
    } catch (error) {
      message.error('Lỗi tải dữ liệu báo cáo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions by date range (exclude deleted)
  const filteredTx = useMemo(() => {
    const active = transactions.filter(t => {
      const type = t.transactionType || t.transaction_type;
      return type !== 'deleted' && !t.deleted;
    });
    if (!dateRange || dateRange.length < 2) return active;
    const [start, end] = dateRange;
    return active.filter(t => {
      const d = parseDate(t.date || t.created_at);
      return d && d.isBetween(start.startOf('day'), end.endOf('day'), null, '[]');
    });
  }, [transactions, dateRange]);

  const filteredBookings = useMemo(() => {
    if (!dateRange || dateRange.length < 2) return bookings;
    const [start, end] = dateRange;
    return bookings.filter(b => {
      const d = parseDate(b.booking_date || b.bookingDate);
      return d && d.isBetween(start.startOf('day'), end.endOf('day'), null, '[]');
    });
  }, [bookings, dateRange]);

  // Helper: only income transactions (exclude commission & expense)
  const incomeTx = useMemo(() => {
    return filteredTx.filter(t => {
      const type = t.transactionType || t.transaction_type;
      return type !== 'commission' && type !== 'expense' && type !== 'expense_deleted';
    });
  }, [filteredTx]);

  // ========== REVENUE STATS ==========
  const revenueStats = useMemo(() => {
    const serviceTx = incomeTx;
    const totalRevenue = serviceTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalTx = serviceTx.length;

    // By payment method
    const byMethod = {};
    serviceTx.forEach(t => {
      const m = t.paymentMethod || t.payment_method || 'other';
      byMethod[m] = (byMethod[m] || 0) + (Number(t.amount) || 0);
    });

    // Daily revenue for chart
    const dailyMap = {};
    serviceTx.forEach(t => {
      const d = parseDate(t.date || t.created_at);
      if (!d) return;
      const key = d.format('DD/MM');
      dailyMap[key] = (dailyMap[key] || 0) + (Number(t.amount) || 0);
    });

    // Build daily chart data for date range
    const chartData = [];
    if (dateRange && dateRange.length === 2) {
      let current = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const key = current.format('DD/MM');
        chartData.push({ date: key, revenue: dailyMap[key] || 0 });
        current = current.add(1, 'day');
      }
    }

    // By transaction type
    const byType = {};
    serviceTx.forEach(t => {
      const type = t.transactionType || t.transaction_type || 'other';
      byType[type] = (byType[type] || 0) + (Number(t.amount) || 0);
    });

    return { totalRevenue, totalTx, byMethod, chartData, byType };
  }, [incomeTx, dateRange]);

  // ========== SERVICE STATS ==========
  const serviceStats = useMemo(() => {
    const svcCount = {};
    const svcRevenue = {};
    incomeTx.forEach(t => {
      const items = t.items || [];
      items.forEach(item => {
        if (item.type === 'service') {
          const name = item.name || 'Không rõ';
          svcCount[name] = (svcCount[name] || 0) + (item.quantity || 1);
          svcRevenue[name] = (svcRevenue[name] || 0) + ((Number(item.price) || 0) * (item.quantity || 1));
        }
      });
    });

    const data = Object.keys(svcCount).map(name => ({
      name,
      count: svcCount[name],
      revenue: svcRevenue[name] || 0,
    })).sort((a, b) => b.count - a.count);

    return data;
  }, [incomeTx]);

  // ========== STAFF PERFORMANCE ==========
  const staffStats = useMemo(() => {
    const staffMap = {};
    incomeTx.forEach(t => {
      const items = t.items || [];
      items.forEach(item => {
        const sid = item.staffId || item.staff_id;
        const sname = item.staffName || item.staff_name || staffList.find(s => s.id === sid)?.name || 'Chưa gán';
        if (!staffMap[sname]) staffMap[sname] = { services: 0, revenue: 0 };
        staffMap[sname].services += (item.quantity || 1);
        staffMap[sname].revenue += ((Number(item.price) || 0) * (item.quantity || 1));
      });
    });

    // Commission from commission transactions (use commissionAmount, NOT amount)
    const commissions = filteredTx.filter(t => (t.transactionType || t.transaction_type) === 'commission');
    commissions.forEach(t => {
      const sname = t.staffName || t.staff_name || staffList.find(s => s.id === (t.staffId || t.staff_id))?.name || 'Chưa gán';
      if (!staffMap[sname]) staffMap[sname] = { services: 0, revenue: 0 };
      const commAmt = Number(t.commissionAmount ?? t.commission_amount) || 0;
      staffMap[sname].commission = (staffMap[sname].commission || 0) + commAmt;
    });

    return Object.keys(staffMap).map(name => ({
      name,
      services: staffMap[name].services,
      revenue: staffMap[name].revenue,
      commission: staffMap[name].commission || 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [incomeTx, filteredTx, staffList]);

  // ========== BOOKING STATS ==========
  const bookingStats = useMemo(() => {
    const total = filteredBookings.length;
    const completed = filteredBookings.filter(b => b.status === 'completed').length;
    const cancelled = filteredBookings.filter(b => b.status === 'cancelled').length;
    const pending = filteredBookings.filter(b => b.status === 'pending').length;
    const confirmed = filteredBookings.filter(b => b.status === 'confirmed').length;

    return { total, completed, cancelled, pending, confirmed };
  }, [filteredBookings]);

  // ========== EXPENSE STATS ==========
  const EXPENSE_CATEGORIES = [
    { label: 'Tiền Điện', value: 'electricity', icon: '⚡' },
    { label: 'Tiền Nước', value: 'water', icon: '💧' },
    { label: 'Tiền Thuê Mặt Bằng', value: 'rent', icon: '🏠' },
    { label: 'Internet / Wifi', value: 'internet', icon: '📡' },
    { label: 'Lương Nhân Viên', value: 'salary', icon: '👤' },
    { label: 'Vật Tư / Nguyên Liệu', value: 'supplies', icon: '📦' },
    { label: 'Bảo Trì / Sửa Chữa', value: 'maintenance', icon: '🔧' },
    { label: 'Quảng Cáo / Marketing', value: 'marketing', icon: '📢' },
    { label: 'Thuế / Phí', value: 'tax', icon: '📋' },
    { label: 'Khác', value: 'other', icon: '📌' },
  ];

  const expenseStats = useMemo(() => {
    const expenseTx = filteredTx.filter(t => (t.transactionType || t.transaction_type) === 'expense');
    const totalExpense = expenseTx.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

    // By category
    const byCategory = {};
    expenseTx.forEach(t => {
      const cat = t.expenseCategory || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + Math.abs(Number(t.amount) || 0);
    });

    const categoryData = Object.entries(byCategory).map(([key, val]) => {
      const cat = EXPENSE_CATEGORIES.find(c => c.value === key);
      return { name: cat ? `${cat.icon} ${cat.label}` : key, value: val, key };
    }).sort((a, b) => b.value - a.value);

    // Daily expense for chart
    const dailyMap = {};
    expenseTx.forEach(t => {
      const d = parseDate(t.date || t.created_at);
      if (!d) return;
      const key = d.format('DD/MM');
      dailyMap[key] = (dailyMap[key] || 0) + Math.abs(Number(t.amount) || 0);
    });

    const chartData = [];
    if (dateRange && dateRange.length === 2) {
      let current = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const key = current.format('DD/MM');
        chartData.push({ date: key, expense: dailyMap[key] || 0 });
        current = current.add(1, 'day');
      }
    }

    // By payment method
    const byMethod = {};
    expenseTx.forEach(t => {
      const m = t.paymentMethod || t.payment_method || 'cash';
      byMethod[m] = (byMethod[m] || 0) + Math.abs(Number(t.amount) || 0);
    });

    return { totalExpense, count: expenseTx.length, byCategory, categoryData, chartData, byMethod, transactions: expenseTx };
  }, [filteredTx, dateRange]);

  // ========== PROFIT ==========
  const totalCommission = staffStats.reduce((sum, s) => sum + (s.commission || 0), 0);
  const profit = revenueStats.totalRevenue - expenseStats.totalExpense - totalCommission;

  // ========== EXPORT CSV ==========
  const handleExport = (type) => {
    let headers, rows, filename;

    if (type === 'revenue') {
      headers = ['Ngày', 'Khách Hàng', 'Loại', 'Phương Thức', 'Số Tiền', 'Ghi Chú'];
      rows = incomeTx.map(t => {
          const d = parseDate(t.date || t.created_at);
          const cust = customers.find(c => c.id === (t.customerId || t.customer_id));
          const typeMap = { service: 'Dịch vụ', package: 'Gói', product: 'Sản phẩm', mixed: 'Hỗn hợp' };
          const methodMap = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', combined: 'Kết hợp' };
          const tt = t.transactionType || t.transaction_type || '';
          const pm = t.paymentMethod || t.payment_method || '';
          return [
            d ? d.format('DD/MM/YYYY HH:mm') : '',
            cust?.name || t.customerName || t.customer_name || '',
            typeMap[tt] || tt,
            methodMap[pm] || pm,
            Number(t.amount) || 0,
            t.notes || '',
          ];
        });
      filename = `doanh-thu-${dayjs().format('YYYYMMDD')}`;
    } else if (type === 'services') {
      headers = ['Dịch Vụ', 'Số Lần', 'Doanh Thu'];
      rows = serviceStats.map(s => [s.name, s.count, s.revenue]);
      filename = `dich-vu-${dayjs().format('YYYYMMDD')}`;
    } else if (type === 'staff') {
      headers = ['Nhân Viên', 'Số DV', 'Doanh Thu', 'Hoa Hồng'];
      rows = staffStats.map(s => [s.name, s.services, s.revenue, s.commission]);
      filename = `nhan-vien-${dayjs().format('YYYYMMDD')}`;
    } else if (type === 'expenses') {
      headers = ['Ngày', 'Danh Mục', 'Số Tiền', 'Phương Thức', 'Ghi Chú'];
      rows = expenseStats.transactions.map(t => {
        const d = parseDate(t.date || t.created_at);
        const cat = EXPENSE_CATEGORIES.find(c => c.value === t.expenseCategory);
        const methodMap = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' };
        return [
          d ? d.format('DD/MM/YYYY HH:mm') : '',
          cat?.label || t.expenseCategory || 'Khác',
          Math.abs(Number(t.amount) || 0),
          methodMap[t.paymentMethod || t.payment_method] || '',
          t.notes || '',
        ];
      });
      filename = `chi-phi-${dayjs().format('YYYYMMDD')}`;
    } else {
      return;
    }

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Xuất dữ liệu thành công');
  };

  const methodMap = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', combined: 'Kết hợp' };
  const typeMap = { service: 'Dịch vụ', package: 'Gói', product: 'Sản phẩm', mixed: 'Hỗn hợp' };

  // Quick date presets
  const presets = [
    { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
    { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('day')] },
    { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('day')] },
    { label: '30 ngày', value: [dayjs().subtract(30, 'day'), dayjs().endOf('day')] },
    { label: 'Quý này', value: [dayjs().startOf('quarter'), dayjs().endOf('day')] },
  ];

  return (
    <Card title="Báo Cáo & Thống Kê">
      {/* Date Range Filter */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600 }}>Khoảng thời gian:</span>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="DD/MM/YYYY"
          presets={presets}
          allowClear={false}
          style={{ width: 280 }}
        />
        <Button onClick={loadData} type="link">Làm mới dữ liệu</Button>
      </div>

      <Spin spinning={loading}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'revenue',
              label: <span><DollarOutlined /> Doanh Thu</span>,
              children: (
                <div>
                  {/* Summary Cards */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: '4px solid #ff69b4' }}>
                        <Statistic
                          title="Tổng Doanh Thu"
                          value={revenueStats.totalRevenue}
                          suffix="₫"
                          valueStyle={{ color: '#ff69b4', fontWeight: 700 }}
                          formatter={(v) => Number(v).toLocaleString('vi-VN')}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: '4px solid #597ef7' }}>
                        <Statistic
                          title="Số Giao Dịch"
                          value={revenueStats.totalTx}
                          valueStyle={{ color: '#597ef7', fontWeight: 700 }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: '4px solid #36cfc9' }}>
                        <Statistic
                          title="Trung Bình / GD"
                          value={revenueStats.totalTx > 0 ? Math.round(revenueStats.totalRevenue / revenueStats.totalTx) : 0}
                          suffix="₫"
                          valueStyle={{ color: '#36cfc9', fontWeight: 700 }}
                          formatter={(v) => Number(v).toLocaleString('vi-VN')}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: `4px solid ${profit >= 0 ? '#52c41a' : '#f5222d'}` }}>
                        <Statistic
                          title="Lợi Nhuận (Thu - Chi - HH)"
                          value={profit}
                          suffix="₫"
                          valueStyle={{ color: profit >= 0 ? '#52c41a' : '#f5222d', fontWeight: 700 }}
                          formatter={(v) => Number(v).toLocaleString('vi-VN')}
                        />
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                          Chi phí: {expenseStats.totalExpense.toLocaleString('vi-VN')}₫
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {/* Revenue Chart */}
                  <Card size="small" title="Biểu Đồ Doanh Thu" style={{ marginBottom: 24 }}
                    extra={<Button icon={<DownloadOutlined />} size="small" onClick={() => handleExport('revenue')}>Xuất CSV</Button>}
                  >
                    {revenueStats.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueStats.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" fontSize={12} />
                          <YAxis fontSize={12} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                          <RechartsTooltip formatter={(v) => [`${Number(v).toLocaleString('vi-VN')}₫`, 'Doanh thu']} />
                          <Bar dataKey="revenue" fill="#ff69b4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty description="Chưa có dữ liệu" />
                    )}
                  </Card>

                  {/* Payment Method Breakdown */}
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Card size="small" title="Theo Phương Thức Thanh Toán">
                        {Object.keys(revenueStats.byMethod).length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={Object.entries(revenueStats.byMethod).map(([key, val]) => ({ name: methodMap[key] || key, value: val }))}
                                cx="50%" cy="50%"
                                innerRadius={50} outerRadius={90}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {Object.keys(revenueStats.byMethod).map((_, i) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(v) => `${Number(v).toLocaleString('vi-VN')}₫`} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <Empty description="Chưa có dữ liệu" />}
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card size="small" title="Theo Loại Giao Dịch">
                        {Object.keys(revenueStats.byType).length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={Object.entries(revenueStats.byType).map(([key, val]) => ({ name: typeMap[key] || key, value: val }))}
                                cx="50%" cy="50%"
                                innerRadius={50} outerRadius={90}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {Object.keys(revenueStats.byType).map((_, i) => (
                                  <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(v) => `${Number(v).toLocaleString('vi-VN')}₫`} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <Empty description="Chưa có dữ liệu" />}
                      </Card>
                    </Col>
                  </Row>

                  {/* Transaction Table */}
                  <Card size="small" title="Chi Tiết Giao Dịch" style={{ marginTop: 16 }}>
                    <Table
                      columns={[
                        {
                          title: 'Ngày', key: 'date', width: 140,
                          render: (_, r) => { const d = parseDate(r.date || r.created_at); return d ? d.format('DD/MM/YYYY HH:mm') : '-'; },
                          sorter: (a, b) => {
                            const da = parseDate(a.date || a.created_at);
                            const db = parseDate(b.date || b.created_at);
                            return (da?.valueOf() || 0) - (db?.valueOf() || 0);
                          },
                          defaultSortOrder: 'descend',
                        },
                        {
                          title: 'Khách Hàng', key: 'customer', width: 140,
                          render: (_, r) => r.customerName || r.customer_name || customers.find(c => c.id === (r.customerId || r.customer_id))?.name || '-',
                        },
                        {
                          title: 'Loại', key: 'type', width: 100,
                          render: (_, r) => {
                            const t = r.transactionType || r.transaction_type;
                            const colors = { service: 'blue', package: 'purple', product: 'green', mixed: 'orange' };
                            return <Tag color={colors[t]}>{typeMap[t] || t || '-'}</Tag>;
                          },
                        },
                        {
                          title: 'Số Tiền', dataIndex: 'amount', key: 'amount', width: 130,
                          render: (v) => <span style={{ color: '#ff69b4', fontWeight: 600 }}>{Number(v || 0).toLocaleString('vi-VN')}₫</span>,
                          sorter: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0),
                        },
                        {
                          title: 'Phương Thức', key: 'method', width: 120,
                          render: (_, r) => methodMap[r.paymentMethod || r.payment_method] || r.paymentMethod || '-',
                        },
                        {
                          title: 'Ghi Chú', dataIndex: 'notes', key: 'notes',
                          render: (t) => t || '-', ellipsis: true,
                        },
                      ]}
                      dataSource={incomeTx.map((t, i) => ({ ...t, key: t.id || i }))}
                      pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} giao dịch` }}
                      scroll={{ x: 800 }}
                      size="small"
                    />
                  </Card>
                </div>
              ),
            },
            {
              key: 'services',
              label: <span><ShoppingCartOutlined /> Dịch Vụ</span>,
              children: (
                <div>
                  <Card size="small" title="Thống Kê Dịch Vụ" style={{ marginBottom: 16 }}
                    extra={<Button icon={<DownloadOutlined />} size="small" onClick={() => handleExport('services')}>Xuất CSV</Button>}
                  >
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      <Col xs={24} md={12}>
                        {serviceStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={serviceStats.slice(0, 8)}
                                cx="50%" cy="50%"
                                innerRadius={60} outerRadius={100}
                                dataKey="count"
                                label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 12) + '...' : name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {serviceStats.slice(0, 8).map((_, i) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(v, name, props) => [`${v} lần`, props.payload.name]} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <Empty description="Chưa có dữ liệu" />}
                      </Col>
                      <Col xs={24} md={12}>
                        {serviceStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={serviceStats.slice(0, 8)} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" fontSize={12} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                              <YAxis type="category" dataKey="name" width={120} fontSize={12} tickFormatter={v => v.length > 15 ? v.slice(0, 15) + '...' : v} />
                              <RechartsTooltip formatter={(v) => [`${Number(v).toLocaleString('vi-VN')}₫`, 'Doanh thu']} />
                              <Bar dataKey="revenue" fill="#36cfc9" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <Empty description="Chưa có dữ liệu" />}
                      </Col>
                    </Row>

                    <Table
                      columns={[
                        { title: 'Dịch Vụ', dataIndex: 'name', key: 'name' },
                        {
                          title: 'Số Lần Sử Dụng', dataIndex: 'count', key: 'count', width: 150,
                          sorter: (a, b) => a.count - b.count,
                          defaultSortOrder: 'descend',
                          render: (v) => <Tag color="blue">{v} lần</Tag>,
                        },
                        {
                          title: 'Doanh Thu', dataIndex: 'revenue', key: 'revenue', width: 160,
                          sorter: (a, b) => a.revenue - b.revenue,
                          render: (v) => <span style={{ color: '#ff69b4', fontWeight: 600 }}>{Number(v).toLocaleString('vi-VN')}₫</span>,
                        },
                        {
                          title: 'TB / Lần', key: 'avg', width: 140,
                          render: (_, r) => r.count > 0 ? `${Math.round(r.revenue / r.count).toLocaleString('vi-VN')}₫` : '-',
                        },
                      ]}
                      dataSource={serviceStats.map((s, i) => ({ ...s, key: i }))}
                      pagination={false}
                      size="small"
                    />
                  </Card>
                </div>
              ),
            },
            {
              key: 'staff',
              label: <span><TeamOutlined /> Nhân Viên</span>,
              children: (
                <div>
                  <Card size="small" title="Hiệu Suất Nhân Viên"
                    extra={<Button icon={<DownloadOutlined />} size="small" onClick={() => handleExport('staff')}>Xuất CSV</Button>}
                  >
                    {staffStats.length > 0 ? (
                      <Row gutter={16} style={{ marginBottom: 24 }}>
                        <Col xs={24} md={24}>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={staffStats}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" fontSize={12} />
                              <YAxis fontSize={12} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                              <RechartsTooltip formatter={(v, name) => [`${Number(v).toLocaleString('vi-VN')}₫`, name === 'revenue' ? 'Doanh thu' : 'Hoa hồng']} />
                              <Legend formatter={(v) => v === 'revenue' ? 'Doanh Thu' : 'Hoa Hồng'} />
                              <Bar dataKey="revenue" fill="#ff69b4" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="commission" fill="#ffc53d" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Col>
                      </Row>
                    ) : <Empty description="Chưa có dữ liệu" style={{ margin: '20px 0' }} />}

                    <Table
                      columns={[
                        { title: 'Nhân Viên', dataIndex: 'name', key: 'name' },
                        {
                          title: 'Số Dịch Vụ', dataIndex: 'services', key: 'services', width: 120,
                          sorter: (a, b) => a.services - b.services,
                          render: (v) => <Tag color="blue">{v}</Tag>,
                        },
                        {
                          title: 'Doanh Thu', dataIndex: 'revenue', key: 'revenue', width: 160,
                          sorter: (a, b) => a.revenue - b.revenue,
                          defaultSortOrder: 'descend',
                          render: (v) => <span style={{ color: '#ff69b4', fontWeight: 600 }}>{Number(v).toLocaleString('vi-VN')}₫</span>,
                        },
                        {
                          title: 'Hoa Hồng', dataIndex: 'commission', key: 'commission', width: 140,
                          sorter: (a, b) => a.commission - b.commission,
                          render: (v) => <span style={{ color: '#ffc53d', fontWeight: 600 }}>{Number(v).toLocaleString('vi-VN')}₫</span>,
                        },
                      ]}
                      dataSource={staffStats.map((s, i) => ({ ...s, key: i }))}
                      pagination={false}
                      size="small"
                    />
                  </Card>
                </div>
              ),
            },
            {
              key: 'bookings',
              label: <span><CalendarOutlined /> Đặt Lịch</span>,
              children: (
                <div>
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: '4px solid #597ef7' }}>
                        <Statistic title="Tổng Đặt Lịch" value={bookingStats.total} valueStyle={{ color: '#597ef7', fontWeight: 700 }} />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
                        <Statistic title="Hoàn Thành" value={bookingStats.completed} valueStyle={{ color: '#52c41a', fontWeight: 700 }} />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: '4px solid #faad14' }}>
                        <Statistic title="Chờ Xử Lý" value={bookingStats.pending + bookingStats.confirmed} valueStyle={{ color: '#faad14', fontWeight: 700 }} />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: '4px solid #f5222d' }}>
                        <Statistic
                          title="Tỷ Lệ Hoàn Thành"
                          value={bookingStats.total > 0 ? Math.round((bookingStats.completed / bookingStats.total) * 100) : 0}
                          suffix="%"
                          valueStyle={{ color: bookingStats.total > 0 && (bookingStats.completed / bookingStats.total) >= 0.7 ? '#52c41a' : '#faad14', fontWeight: 700 }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Booking Status Pie */}
                  <Card size="small" title="Phân Bố Trạng Thái" style={{ marginBottom: 16 }}>
                    {bookingStats.total > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Hoàn thành', value: bookingStats.completed },
                              { name: 'Chờ xử lý', value: bookingStats.pending },
                              { name: 'Xác nhận', value: bookingStats.confirmed },
                              { name: 'Đã hủy', value: bookingStats.cancelled },
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%"
                            innerRadius={60} outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill="#52c41a" />
                            <Cell fill="#faad14" />
                            <Cell fill="#1890ff" />
                            <Cell fill="#f5222d" />
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <Empty description="Chưa có dữ liệu đặt lịch" />}
                  </Card>

                  {/* Booking Table */}
                  <Card size="small" title="Chi Tiết Đặt Lịch">
                    <Table
                      columns={[
                        {
                          title: 'Ngày', key: 'date', width: 140,
                          render: (_, r) => { const d = parseDate(r.booking_date || r.bookingDate); return d ? d.format('DD/MM/YYYY HH:mm') : '-'; },
                          sorter: (a, b) => {
                            const da = parseDate(a.booking_date || a.bookingDate);
                            const db = parseDate(b.booking_date || b.bookingDate);
                            return (da?.valueOf() || 0) - (db?.valueOf() || 0);
                          },
                          defaultSortOrder: 'descend',
                        },
                        { title: 'Khách Hàng', key: 'customer', width: 140, render: (_, r) => r.customer_name || customers.find(c => c.id === r.customer_id)?.name || '-' },
                        { title: 'Dịch Vụ', key: 'service', width: 140, render: (_, r) => r.service_name || servicesList.find(s => s.id === r.service_id)?.name || '-' },
                        { title: 'Nhân Viên', key: 'staff', width: 120, render: (_, r) => r.staff_name || staffList.find(s => s.id === r.staff_id)?.name || '-' },
                        {
                          title: 'Trạng Thái', dataIndex: 'status', key: 'status', width: 120,
                          filters: [
                            { text: 'Chờ xử lý', value: 'pending' },
                            { text: 'Xác nhận', value: 'confirmed' },
                            { text: 'Hoàn thành', value: 'completed' },
                            { text: 'Đã hủy', value: 'cancelled' },
                          ],
                          onFilter: (value, record) => record.status === value,
                          render: (status) => {
                            const map = { pending: 'Chờ xử lý', confirmed: 'Xác nhận', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
                            const colors = { pending: 'orange', confirmed: 'blue', completed: 'green', cancelled: 'red' };
                            return <Tag color={colors[status]}>{map[status] || status}</Tag>;
                          },
                        },
                      ]}
                      dataSource={filteredBookings.map((b, i) => ({ ...b, key: b.id || i }))}
                      pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} lịch hẹn` }}
                      scroll={{ x: 800 }}
                      size="small"
                    />
                  </Card>
                </div>
              ),
            },
            {
              key: 'expenses',
              label: <span><WalletOutlined /> Chi Phí</span>,
              children: (
                <div>
                  {/* Summary */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: '4px solid #f5222d' }}>
                        <Statistic
                          title="Tổng Chi Phí"
                          value={expenseStats.totalExpense}
                          suffix="₫"
                          valueStyle={{ color: '#f5222d', fontWeight: 700 }}
                          formatter={(v) => Number(v).toLocaleString('vi-VN')}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: '4px solid #597ef7' }}>
                        <Statistic
                          title="Số Khoản Chi"
                          value={expenseStats.count}
                          valueStyle={{ color: '#597ef7', fontWeight: 700 }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: '4px solid #ff69b4' }}>
                        <Statistic
                          title="Doanh Thu"
                          value={revenueStats.totalRevenue}
                          suffix="₫"
                          valueStyle={{ color: '#ff69b4', fontWeight: 700 }}
                          formatter={(v) => Number(v).toLocaleString('vi-VN')}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" style={{ borderLeft: `4px solid ${profit >= 0 ? '#52c41a' : '#f5222d'}` }}>
                        <Statistic
                          title="Lợi Nhuận"
                          value={profit}
                          suffix="₫"
                          valueStyle={{ color: profit >= 0 ? '#52c41a' : '#f5222d', fontWeight: 700 }}
                          formatter={(v) => Number(v).toLocaleString('vi-VN')}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    {/* Expense by Category Pie */}
                    <Col xs={24} md={12}>
                      <Card size="small" title="Chi Phí Theo Danh Mục">
                        {expenseStats.categoryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={expenseStats.categoryData}
                                cx="50%" cy="50%"
                                innerRadius={60} outerRadius={100}
                                dataKey="value"
                                label={({ name, percent }) => `${name.length > 15 ? name.slice(0, 15) + '...' : name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {expenseStats.categoryData.map((_, i) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(v) => `${Number(v).toLocaleString('vi-VN')}₫`} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <Empty description="Chưa có chi phí" />}
                      </Card>
                    </Col>

                    {/* Expense Bar Chart */}
                    <Col xs={24} md={12}>
                      <Card size="small" title="Chi Phí Theo Ngày">
                        {expenseStats.chartData.some(d => d.expense > 0) ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={expenseStats.chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" fontSize={12} />
                              <YAxis fontSize={12} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                              <RechartsTooltip formatter={(v) => [`${Number(v).toLocaleString('vi-VN')}₫`, 'Chi phí']} />
                              <Bar dataKey="expense" fill="#f5222d" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <Empty description="Chưa có chi phí" />}
                      </Card>
                    </Col>
                  </Row>

                  {/* Category Breakdown Table */}
                  <Card size="small" title="Tổng Hợp Theo Danh Mục" style={{ marginBottom: 16 }}
                    extra={<Button icon={<DownloadOutlined />} size="small" onClick={() => handleExport('expenses')}>Xuất CSV</Button>}
                  >
                    <Table
                      columns={[
                        { title: 'Danh Mục', dataIndex: 'name', key: 'name' },
                        {
                          title: 'Số Tiền', dataIndex: 'value', key: 'value', width: 160,
                          sorter: (a, b) => a.value - b.value,
                          defaultSortOrder: 'descend',
                          render: (v) => <span style={{ color: '#f5222d', fontWeight: 600 }}>{Number(v).toLocaleString('vi-VN')}₫</span>,
                        },
                        {
                          title: 'Tỷ Lệ', key: 'percent', width: 100,
                          render: (_, r) => expenseStats.totalExpense > 0 ? `${Math.round((r.value / expenseStats.totalExpense) * 100)}%` : '-',
                        },
                      ]}
                      dataSource={expenseStats.categoryData.map((d, i) => ({ ...d, key: i }))}
                      pagination={false}
                      size="small"
                    />
                  </Card>

                  {/* Detail Table */}
                  <Card size="small" title="Chi Tiết Khoản Chi">
                    <Table
                      columns={[
                        {
                          title: 'Ngày', key: 'date', width: 140,
                          render: (_, r) => { const d = parseDate(r.date || r.created_at); return d ? d.format('DD/MM/YYYY HH:mm') : '-'; },
                          sorter: (a, b) => {
                            const da = parseDate(a.date || a.created_at);
                            const db = parseDate(b.date || b.created_at);
                            return (da?.valueOf() || 0) - (db?.valueOf() || 0);
                          },
                          defaultSortOrder: 'descend',
                        },
                        {
                          title: 'Danh Mục', key: 'category', width: 180,
                          render: (_, r) => {
                            const cat = EXPENSE_CATEGORIES.find(c => c.value === r.expenseCategory);
                            return <Tag color="red">{cat ? `${cat.icon} ${cat.label}` : r.expenseCategory || 'Khác'}</Tag>;
                          },
                          filters: EXPENSE_CATEGORIES.map(c => ({ text: `${c.icon} ${c.label}`, value: c.value })),
                          onFilter: (value, record) => (record.expenseCategory || 'other') === value,
                        },
                        {
                          title: 'Số Tiền', key: 'amount', width: 140,
                          render: (_, r) => <span style={{ color: '#f5222d', fontWeight: 600 }}>{Math.abs(Number(r.amount) || 0).toLocaleString('vi-VN')}₫</span>,
                          sorter: (a, b) => Math.abs(Number(a.amount) || 0) - Math.abs(Number(b.amount) || 0),
                        },
                        {
                          title: 'Phương Thức', key: 'method', width: 120,
                          render: (_, r) => methodMap[r.paymentMethod || r.payment_method] || '-',
                        },
                        {
                          title: 'Ghi Chú', dataIndex: 'notes', key: 'notes',
                          render: (t) => t || '-', ellipsis: true,
                        },
                      ]}
                      dataSource={expenseStats.transactions.map((t, i) => ({ ...t, key: t.id || i }))}
                      pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} khoản chi` }}
                      scroll={{ x: 700 }}
                      size="small"
                    />
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </Spin>
    </Card>
  );
}

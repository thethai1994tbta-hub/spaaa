import React, { useState, useEffect } from 'react';
import {
  Card, Button, Form, InputNumber, Row, Col, Select, Table, Space,
  Divider, Tag, message, Spin, Empty, Modal, Input, Radio, Descriptions,
  Statistic, Tabs, DatePicker, Popconfirm, Badge, Tooltip,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ShoppingCartOutlined,
  PrinterOutlined, CheckCircleOutlined, SearchOutlined,
  WalletOutlined, DollarOutlined, HistoryOutlined,
  UserOutlined, TeamOutlined, GiftOutlined,
  InboxOutlined, AppstoreOutlined, ReloadOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../context/AuthContext';

const getVietQRUrl = (bankConfig, amount, description) => {
  if (!bankConfig?.bankId || !bankConfig?.accountNo) return null;
  const params = new URLSearchParams({
    amount: String(amount || 0),
    addInfo: description || 'Thanh toan',
    accountName: bankConfig.accountName || '',
  });
  return `https://img.vietqr.io/image/${bankConfig.bankId}-${bankConfig.accountNo}-compact2.png?${params.toString()}`;
};

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

export default function Payment({ pendingBooking, onClearPending }) {
  const { invoke } = useAPI();
  const { guardAction } = useAuth();

  // Data
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bankConfig, setBankConfig] = useState(null);
  const [pointRate, setPointRate] = useState(10000);

  // Cart
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [linkedBookingId, setLinkedBookingId] = useState(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [activeTab, setActiveTab] = useState('new');
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateRange, setHistoryDateRange] = useState(null);

  // Expenses
  const [expenseForm] = Form.useForm();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  // Auto-fill from pending booking
  useEffect(() => {
    if (pendingBooking && servicesList.length > 0 && customers.length > 0) {
      const custId = pendingBooking.customer_id || pendingBooking.customerId;
      const svcId = pendingBooking.service_id || pendingBooking.serviceId;
      const staffId = pendingBooking.staff_id || pendingBooking.staffId;
      if (custId) setSelectedCustomer(custId);
      const svc = servicesList.find(s => s.id === svcId);
      if (svc) {
        const staff = staffList.find(s => s.id === staffId);
        setCartItems([{
          key: Date.now(), type: 'service', id: svc.id,
          name: svc.name, price: Number(svc.price) || 0, quantity: 1,
          staffId: staffId || null, staffName: staff?.name || '',
        }]);
      }
      setNotes(pendingBooking.notes ? `Từ lịch hẹn: ${pendingBooking.notes}` : 'Từ lịch hẹn');
      setLinkedBookingId(pendingBooking.id);
      setActiveTab('new');
      onClearPending?.();
    }
  }, [pendingBooking, servicesList, customers]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, staffRes, svcRes, pkgRes, invRes, txRes] = await Promise.allSettled([
        invoke('db:customers:getAll'), invoke('db:staff:getAll'),
        invoke('db:services:getAll'), invoke('db:packages:getAll'),
        invoke('db:inventory:getAll'), invoke('db:transactions:getAll'),
      ]);
      const safe = (r) => {
        const d = r.status === 'fulfilled' ? (r.value?.data || r.value || []) : [];
        return Array.isArray(d) ? d : [];
      };

      try {
        const bankRes = await invoke('db:settings:get', 'bank');
        if (bankRes.success && bankRes.data) setBankConfig(bankRes.data);
      } catch {}
      try {
        const workTimeRes = await invoke('db:settings:get', 'workTime');
        if (workTimeRes.success && workTimeRes.data?.pointRate)
          setPointRate(Number(workTimeRes.data.pointRate) || 10000);
      } catch {}

      setCustomers(safe(custRes));
      setStaffList(safe(staffRes));
      setServicesList(safe(svcRes).filter(s => s.active !== false && s.active !== 0));
      setPackagesList(safe(pkgRes).filter(p => p.status !== 'inactive'));
      setInventoryList(safe(invRes).filter(i => (i.quantity || 0) > 0));
      setTransactions(safe(txRes));
    } catch (error) {
      console.error('[Payment] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============ CART LOGIC ============
  const addToCart = (type, id) => {
    const defaultStaff = selectedStaff ? staffList.find(s => s.id === selectedStaff) : null;
    const staffInfo = { staffId: selectedStaff || null, staffName: defaultStaff?.name || '' };

    if (type === 'service') {
      const svc = servicesList.find(s => s.id === id);
      if (!svc) return;
      setCartItems(prev => [...prev, {
        key: Date.now(), type: 'service', id: svc.id,
        name: svc.name, price: Number(svc.price) || 0, quantity: 1, ...staffInfo,
      }]);
    } else if (type === 'package') {
      const pkg = packagesList.find(p => p.id === id);
      if (!pkg) return;
      setCartItems(prev => [...prev, {
        key: Date.now(), type: 'package', id: pkg.id,
        name: `[Goi] ${pkg.name}`, price: Number(pkg.price) || 0,
        quantity: 1, sessions: pkg.sessions || 1, ...staffInfo,
      }]);
    } else if (type === 'product') {
      const product = inventoryList.find(p => p.id === id);
      if (!product) return;
      if ((product.quantity || 0) <= 0) { message.warning(`${product.name} da het hang`); return; }
      setCartItems(prev => [...prev, {
        key: Date.now(), type: 'product', id: product.id,
        name: product.name, price: Number(product.unit_price || product.unitPrice || 0) || 0,
        quantity: 1, maxQuantity: product.quantity || 999, ...staffInfo,
      }]);
    }
  };

  const updateCartItem = (key, field, value) => {
    setCartItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };
      if (field === 'staffId') {
        updated.staffName = staffList.find(s => s.id === value)?.name || '';
      }
      return updated;
    }));
  };

  const removeCartItem = (key) => setCartItems(prev => prev.filter(item => item.key !== key));

  const applyStaffToAll = (staffId) => {
    setSelectedStaff(staffId);
    if (staffId) {
      const staff = staffList.find(s => s.id === staffId);
      setCartItems(prev => prev.map(item => ({ ...item, staffId, staffName: staff?.name || '' })));
    }
  };

  // ============ CALCULATIONS ============
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === 'percent' ? Math.round(subtotal * (discountValue / 100)) : (discountValue || 0);
  const pointsDiscount = pointsUsed * 1000;
  const total = Math.max(0, subtotal - discountAmount - pointsDiscount);

  const totalCommission = cartItems.reduce((sum, item) => {
    if (!item.staffId) return sum;
    const staff = staffList.find(s => s.id === item.staffId);
    const rate = staff?.commission_rate ?? staff?.commissionRate ?? 0;
    return sum + Math.round((item.price * item.quantity * rate) / 100);
  }, 0);

  // ============ SUBMIT PAYMENT ============
  const handlePayment = async () => {
    if (!selectedCustomer) { message.warning('Vui long chon khach hang'); return; }
    if (cartItems.length === 0) { message.warning('Vui long them san pham / dich vu'); return; }

    try {
      const isWalkIn = selectedCustomer === 'walk-in';
      const customer = isWalkIn ? null : customers.find(c => c.id === selectedCustomer);
      const pointsEarned = isWalkIn ? 0 : Math.floor(total / pointRate);

      const txData = {
        customer_id: isWalkIn ? null : selectedCustomer,
        customer_name: isWalkIn ? 'Khach Vang Lai' : (customer?.name || ''),
        items: cartItems.map(item => ({
          type: item.type, id: item.id, name: item.name,
          price: item.price, quantity: item.quantity,
          staffId: item.staffId, staffName: item.staffName,
        })),
        subtotal, discount: discountAmount, discount_type: discountType,
        amount: total, payment_method: paymentMethod,
        transaction_type: cartItems.some(i => i.type === 'package') ? 'package'
          : cartItems.some(i => i.type === 'product') ? 'mixed' : 'service',
        commission_amount: totalCommission,
        points_used: pointsUsed, points_earned: pointsEarned,
        notes, date: new Date().toISOString(),
      };

      // Group cart items by staff for commission
      const staffItems = {};
      cartItems.forEach(item => {
        if (item.staffId) {
          if (!staffItems[item.staffId]) staffItems[item.staffId] = [];
          staffItems[item.staffId].push(item);
        }
      });

      const result = await invoke('db:transactions:add', txData);

      if (result.success || result.id) {
        // Update customer points
        if (customer && !isWalkIn) {
          const newPoints = (customer.points || 0) - pointsUsed + pointsEarned;
          await invoke('db:customers:update', customer.id, {
            name: customer.name, phone: customer.phone || null,
            email: customer.email || null, address: customer.address || null,
            points: newPoints, notes: customer.notes || null,
          });
        }

        // Commission entries per staff
        for (const [staffIdStr, items] of Object.entries(staffItems)) {
          const staffIdNum = Number(staffIdStr);
          const staff = staffList.find(s => s.id === staffIdNum);
          const rate = staff?.commission_rate ?? staff?.commissionRate ?? 0;
          const staffTotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
          const commission = Math.round((staffTotal * rate) / 100);
          await invoke('db:transactions:add', {
            customer_id: isWalkIn ? null : selectedCustomer,
            customer_name: isWalkIn ? 'Khach Vang Lai' : (customer?.name || ''),
            staff_id: staffIdNum, staff_name: staff?.name || '',
            amount: staffTotal, commission_amount: commission,
            transaction_type: 'commission', date: new Date().toISOString(),
            notes: 'Hoa hong tu giao dich',
          });
        }

        // Receipt
        setLastReceipt({
          ...txData, id: result.id, pointsEarned,
          createdAt: new Date().toISOString(),
          customerPhone: isWalkIn ? '' : (customer?.phone || ''),
        });

        // Deduct inventory for products
        for (const item of cartItems) {
          if (item.type === 'product' && item.id) {
            try {
              const prod = inventoryList.find(p => p.id === item.id);
              if (prod) {
                const newQty = Math.max(0, (prod.quantity || 0) - (item.quantity || 1));
                await invoke('db:inventory:update', item.id, {
                  name: prod.name, category: prod.category, quantity: newQty,
                  unit_price: prod.unit_price || prod.unitPrice,
                  reorder_level: prod.reorder_level || prod.reorderLevel,
                  supplier: prod.supplier,
                });
              }
            } catch (e) { console.error('Loi tru ton kho:', e); }
          }
        }

        // Mark linked booking completed
        if (linkedBookingId) {
          try { await invoke('db:bookings:update', linkedBookingId, { status: 'completed' }); } catch {}
          setLinkedBookingId(null);
        }

        message.success('Thanh toan thanh cong!');
        setReceiptModal(true);
        resetForm();
        loadData();
      } else {
        message.error('Loi thanh toan');
      }
    } catch (error) {
      message.error('Loi: ' + error.message);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setCartItems([]);
    setDiscountType('fixed');
    setDiscountValue(0);
    setPointsUsed(0);
    setPaymentMethod('cash');
    setNotes('');
    setLinkedBookingId(null);
  };

  // ============ EXPENSE ============
  const handleAddExpense = async (values) => {
    try {
      const category = EXPENSE_CATEGORIES.find(c => c.value === values.category);
      await invoke('db:transactions:add', {
        transaction_type: 'expense',
        expense_category: values.category,
        expense_category_label: category?.label || values.category,
        amount: -(Number(values.amount) || 0),
        notes: values.notes || '',
        payment_method: values.payment_method || 'cash',
        date: values.date ? dayjs(values.date).toISOString() : new Date().toISOString(),
      });
      message.success('Them chi phi thanh cong');
      expenseForm.resetFields();
      setIsExpenseModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Loi: ' + error.message);
    }
  };

  // ============ COMPUTED DATA ============
  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  // Revenue transactions (exclude commission, expense, deleted)
  const revenueTransactions = transactions.filter(t => {
    if (t.deleted) return false;
    const type = t.transaction_type || t.transactionType;
    return type !== 'commission' && type !== 'expense' && type !== 'expense_deleted' && type !== 'deleted';
  });

  const todayStr = dayjs().format('YYYY-MM-DD');
  const monthStr = dayjs().format('YYYY-MM');
  const todayRevenue = revenueTransactions
    .filter(t => { const d = t.date || t.created_at; return d && dayjs(d).format('YYYY-MM-DD') === todayStr; })
    .reduce((s, t) => s + Math.max(0, Number(t.amount) || 0), 0);
  const monthRevenue = revenueTransactions
    .filter(t => { const d = t.date || t.created_at; return d && dayjs(d).format('YYYY-MM') === monthStr; })
    .reduce((s, t) => s + Math.max(0, Number(t.amount) || 0), 0);
  const todayTxCount = revenueTransactions
    .filter(t => { const d = t.date || t.created_at; return d && dayjs(d).format('YYYY-MM-DD') === todayStr; }).length;

  // History filter
  const filteredTransactions = revenueTransactions.filter(t => {
    const search = historySearch.toLowerCase();
    const matchSearch = !search ||
      (t.customer_name || t.customerName || '').toLowerCase().includes(search) ||
      (t.staff_name || t.staffName || '').toLowerCase().includes(search) ||
      (t.notes || '').toLowerCase().includes(search);
    if (!matchSearch) return false;
    if (historyDateRange && historyDateRange.length === 2) {
      const d = dayjs(t.date || t.created_at);
      return d.isAfter(historyDateRange[0].startOf('day')) && d.isBefore(historyDateRange[1].endOf('day'));
    }
    return true;
  });

  // Expense data
  const expenseTransactions = transactions.filter(t => {
    if (t.deleted) return false;
    const type = t.transaction_type || t.transactionType;
    return type === 'expense';
  });
  const filteredExpenses = expenseFilter === 'all'
    ? expenseTransactions
    : expenseTransactions.filter(t => (t.expense_category || t.expenseCategory || 'other') === expenseFilter);
  const totalExpenses = expenseTransactions.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const expenseByCategory = {};
  expenseTransactions.forEach(t => {
    const cat = t.expense_category || t.expenseCategory || 'other';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Math.abs(Number(t.amount) || 0);
  });

  // ============ CART COLUMNS ============
  const cartColumns = [
    {
      title: 'San Pham / Dich Vu', dataIndex: 'name', key: 'name', width: 180,
      render: (name, record) => (
        <span>
          {record.type === 'package' && <Tag color="purple">Goi</Tag>}
          {record.type === 'product' && <Tag color="green">SP</Tag>}
          {record.type === 'service' && <Tag color="blue">DV</Tag>}
          {name}
        </span>
      ),
    },
    {
      title: 'Nhan Vien', key: 'staff', width: 150,
      render: (_, record) => (
        <Select placeholder="Chon NV" allowClear size="small" style={{ width: '100%' }}
          value={record.staffId} onChange={(v) => updateCartItem(record.key, 'staffId', v)}
          options={staffList.map(s => ({ label: s.name, value: s.id }))} />
      ),
    },
    {
      title: 'Don Gia', dataIndex: 'price', key: 'price', width: 120, align: 'right',
      render: (v) => `${Number(v).toLocaleString('vi-VN')}₫`,
    },
    {
      title: 'SL', key: 'quantity', width: 70, align: 'center',
      render: (_, record) => (
        <InputNumber min={1} max={record.maxQuantity || 99} size="small"
          value={record.quantity} onChange={(v) => updateCartItem(record.key, 'quantity', v || 1)} />
      ),
    },
    {
      title: 'Thanh Tien', key: 'total', width: 130, align: 'right',
      render: (_, r) => <strong style={{ color: '#ff69b4' }}>{(r.price * r.quantity).toLocaleString('vi-VN')}₫</strong>,
    },
    {
      title: '', key: 'action', width: 40,
      render: (_, record) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeCartItem(record.key)} />
      ),
    },
  ];

  // ============ HISTORY COLUMNS ============
  const historyColumns = [
    {
      title: 'Ngay', key: 'date', width: 150,
      render: (_, r) => { const d = r.date || r.created_at; return d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-'; },
      sorter: (a, b) => dayjs(a.date || a.created_at).valueOf() - dayjs(b.date || b.created_at).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Khach Hang', key: 'customer', width: 150,
      render: (_, r) => r.customer_name || r.customerName || customers.find(c => c.id === (r.customer_id || r.customerId))?.name || 'Khach',
    },
    {
      title: 'Nhan Vien', key: 'staff', width: 130,
      render: (_, r) => {
        // Show staff from items
        const items = typeof r.items === 'string' ? (() => { try { return JSON.parse(r.items); } catch { return []; } })() : (r.items || []);
        const staffNames = [...new Set(items.map(i => i.staffName).filter(Boolean))];
        return staffNames.length > 0 ? staffNames.join(', ') : (r.staff_name || r.staffName || '-');
      },
    },
    {
      title: 'Tong Tien', key: 'amount', width: 130, align: 'right',
      render: (_, r) => <strong style={{ color: '#ff69b4' }}>{Number(r.amount || 0).toLocaleString('vi-VN')}₫</strong>,
      sorter: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0),
    },
    {
      title: 'Phuong Thuc', key: 'method', width: 120,
      render: (_, r) => {
        const v = r.payment_method || r.paymentMethod;
        const map = { cash: 'Tien mat', transfer: 'Chuyen khoan', card: 'The', combined: 'Ket hop' };
        const colors = { cash: 'green', transfer: 'blue', card: 'purple', combined: 'orange' };
        return <Tag color={colors[v]}>{map[v] || v || '-'}</Tag>;
      },
      filters: [
        { text: 'Tien mat', value: 'cash' }, { text: 'Chuyen khoan', value: 'transfer' },
        { text: 'The', value: 'card' }, { text: 'Ket hop', value: 'combined' },
      ],
      onFilter: (v, r) => (r.payment_method || r.paymentMethod) === v,
    },
    {
      title: 'Loai', key: 'type', width: 100,
      render: (_, r) => {
        const v = r.transaction_type || r.transactionType;
        const map = { service: 'Dich vu', package: 'Goi', product: 'San pham', mixed: 'Hon hop' };
        const colors = { service: 'blue', package: 'purple', product: 'green', mixed: 'orange' };
        return <Tag color={colors[v]}>{map[v] || v}</Tag>;
      },
    },
    {
      title: 'Hoa Hong', key: 'commission', width: 110, align: 'right',
      render: (_, r) => {
        const c = Number(r.commission_amount || r.commissionAmount || 0);
        return c > 0 ? <span style={{ color: '#722ed1' }}>{c.toLocaleString('vi-VN')}₫</span> : '-';
      },
    },
    {
      title: 'Ghi Chu', key: 'notes', render: (_, r) => r.notes || '-', ellipsis: true,
    },
    {
      title: '', key: 'action', width: 50, fixed: 'right',
      render: (_, r) => (
        <Popconfirm title="Xoa giao dich nay?"
          description="Hanh dong nay khong the hoan tac."
          onConfirm={guardAction(async () => {
            try {
              await invoke('db:transactions:update', r.id, { deleted: true, transaction_type: 'deleted' });
              message.success('Da xoa giao dich');
              loadData();
            } catch (error) { message.error('Loi: ' + error.message); }
          })}
          okText="Xoa" cancelText="Huy" okButtonProps={{ danger: true }}>
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // ============ RENDER ============
  if (loading) return <Spin style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Thanh Toan & Ban Hang</h2>
        <Button icon={<ReloadOutlined />} onClick={loadData}>Lam Moi</Button>
      </div>

      {/* ===== STATS ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '4px solid #ff69b4' }}>
            <Statistic title="Doanh Thu Hom Nay" value={todayRevenue} suffix="₫"
              prefix={<DollarOutlined style={{ color: '#ff69b4' }} />}
              valueStyle={{ color: '#ff69b4' }}
              formatter={(v) => Number(v).toLocaleString('vi-VN')} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '4px solid #597ef7' }}>
            <Statistic title="Doanh Thu Thang" value={monthRevenue} suffix="₫"
              prefix={<DollarOutlined style={{ color: '#597ef7' }} />}
              valueStyle={{ color: '#597ef7' }}
              formatter={(v) => Number(v).toLocaleString('vi-VN')} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
            <Statistic title="So Giao Dich Hom Nay" value={todayTxCount}
              prefix={<ShoppingCartOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '4px solid #f5222d' }}>
            <Statistic title="Tong Chi Phi" value={totalExpenses} suffix="₫"
              prefix={<WalletOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d' }}
              formatter={(v) => Number(v).toLocaleString('vi-VN')} />
          </Card>
        </Col>
      </Row>

      {/* ===== MAIN TABS ===== */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'new',
            label: <span><ShoppingCartOutlined /> Thanh Toan Moi {cartItems.length > 0 && <Badge count={cartItems.length} size="small" style={{ marginLeft: 4 }} />}</span>,
            children: (
              <Row gutter={24}>
                {/* LEFT: Cart builder */}
                <Col xs={24} lg={15}>
                  {/* Step 1: Customer */}
                  <Card size="small" style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><UserOutlined /> 1. Khach Hang</span>
                      <Button size="small"
                        type={selectedCustomer === 'walk-in' ? 'primary' : 'default'}
                        onClick={() => setSelectedCustomer(selectedCustomer === 'walk-in' ? null : 'walk-in')}
                        style={selectedCustomer === 'walk-in' ? { background: '#ff69b4', borderColor: '#ff69b4' } : {}}>
                        Khach Vang Lai
                      </Button>
                    </div>
                    {selectedCustomer !== 'walk-in' ? (
                      <>
                        <Select placeholder="Tim va chon khach hang..." showSearch allowClear
                          optionFilterProp="label" style={{ width: '100%' }}
                          value={selectedCustomer} onChange={setSelectedCustomer}
                          options={customers.map(c => ({
                            label: `${c.name}${c.phone ? ` — ${c.phone}` : ''}`, value: c.id,
                          }))} />
                        {selectedCustomerData && (
                          <div style={{ marginTop: 8, fontSize: 12, color: '#595959' }}>
                            <Tag color="gold">Diem: {selectedCustomerData.points || 0}</Tag>
                            {selectedCustomerData.phone && <span>SDT: {selectedCustomerData.phone}</span>}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ padding: '8px 0', fontSize: 13 }}>
                        <Tag color="orange">Khach Vang Lai</Tag>
                        <span style={{ color: '#888' }}>— Khong tich diem</span>
                      </div>
                    )}
                  </Card>

                  {/* Step 2: Staff */}
                  <Card size="small" style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}><TeamOutlined /> 2. Nhan Vien Phuc Vu</div>
                    <Select placeholder="Chon nhan vien..." showSearch allowClear optionFilterProp="label"
                      style={{ width: '100%' }} value={selectedStaff} onChange={applyStaffToAll}
                      options={staffList.map(s => ({
                        label: `${s.name} (${s.commission_rate ?? s.commissionRate ?? 0}%)`, value: s.id,
                      }))} />
                  </Card>

                  {/* Step 3: Add items */}
                  <Card size="small" style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}><PlusOutlined /> 3. Them Vao Don</div>
                    <Row gutter={8}>
                      <Col flex="1">
                        <Select placeholder="+ Dich vu" showSearch optionFilterProp="label"
                          style={{ width: '100%' }} value={null} onChange={(id) => addToCart('service', id)}
                          options={servicesList.map(s => ({
                            label: `${s.name} — ${Number(s.price || 0).toLocaleString('vi-VN')}₫`, value: s.id,
                          }))} />
                      </Col>
                      {packagesList.length > 0 && (
                        <Col flex="1">
                          <Select placeholder="+ Goi" showSearch optionFilterProp="label"
                            style={{ width: '100%' }} value={null} onChange={(id) => addToCart('package', id)}
                            options={packagesList.map(p => ({
                              label: `${p.name} — ${Number(p.price || 0).toLocaleString('vi-VN')}₫ (${p.sessions} buoi)`, value: p.id,
                            }))} />
                        </Col>
                      )}
                      {inventoryList.length > 0 && (
                        <Col flex="1">
                          <Select placeholder="+ San pham" showSearch optionFilterProp="label"
                            style={{ width: '100%' }} value={null} onChange={(id) => addToCart('product', id)}
                            options={inventoryList.map(p => ({
                              label: `${p.name} — ${Number(p.unit_price || p.unitPrice || 0).toLocaleString('vi-VN')}₫ (Kho: ${p.quantity || 0})`, value: p.id,
                            }))} />
                        </Col>
                      )}
                    </Row>
                  </Card>

                  {/* Cart table */}
                  <Card size="small">
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      <ShoppingCartOutlined /> Don Hang ({cartItems.length} muc)
                    </div>
                    {cartItems.length > 0 ? (
                      <Table columns={cartColumns} dataSource={cartItems} pagination={false} size="small" scroll={{ x: 600 }} />
                    ) : (
                      <Empty description="Chua co san pham / dich vu nao" style={{ padding: '20px 0' }} />
                    )}
                  </Card>
                </Col>

                {/* RIGHT: Payment summary */}
                <Col xs={24} lg={9}>
                  <Card size="small" style={{ position: 'sticky', top: 16 }} title={<span><DollarOutlined /> Thanh Toan</span>}>
                    {/* Subtotal */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span>Tam tinh:</span>
                      <strong>{subtotal.toLocaleString('vi-VN')}₫</strong>
                    </div>

                    {/* Discount */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Giam gia:</div>
                      <Space.Compact style={{ width: '100%' }}>
                        <Select value={discountType} onChange={setDiscountType} style={{ width: 100 }}
                          options={[{ label: 'VND', value: 'fixed' }, { label: '%', value: 'percent' }]} />
                        <InputNumber min={0} max={discountType === 'percent' ? 100 : subtotal}
                          value={discountValue} onChange={setDiscountValue} style={{ flex: 1 }}
                          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={v => v.replace(/,/g, '')} />
                      </Space.Compact>
                      {discountAmount > 0 && (
                        <div style={{ fontSize: 12, color: '#f5222d', marginTop: 2 }}>-{discountAmount.toLocaleString('vi-VN')}₫</div>
                      )}
                    </div>

                    {/* Points */}
                    {selectedCustomerData && (selectedCustomerData.points || 0) > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                          Dung diem (co: {selectedCustomerData.points}, 1 diem = 1.000₫):
                        </div>
                        <InputNumber min={0}
                          max={Math.min(selectedCustomerData.points || 0, Math.floor((subtotal - discountAmount) / 1000))}
                          value={pointsUsed} onChange={setPointsUsed} style={{ width: '100%' }} />
                        {pointsUsed > 0 && (
                          <div style={{ fontSize: 12, color: '#f5222d', marginTop: 2 }}>-{pointsDiscount.toLocaleString('vi-VN')}₫</div>
                        )}
                      </div>
                    )}

                    <Divider style={{ margin: '12px 0' }} />

                    {/* Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>TONG:</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: '#ff69b4' }}>{total.toLocaleString('vi-VN')}₫</span>
                    </div>

                    {/* Commission */}
                    <div style={{ fontSize: 12, color: totalCommission > 0 ? '#722ed1' : '#ccc', marginBottom: 12 }}>
                      Hoa hong NV: {totalCommission.toLocaleString('vi-VN')}₫
                      {cartItems.length > 0 && !cartItems.some(i => i.staffId) && (
                        <span style={{ color: '#ff4d4f', marginLeft: 8 }}>Chua chon NV!</span>
                      )}
                    </div>

                    {/* Payment method */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Phuong thuc:</div>
                      <Radio.Group value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%' }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value="cash">Tien mat</Radio>
                          <Radio value="transfer">Chuyen khoan</Radio>
                          <Radio value="card">The</Radio>
                          <Radio value="combined">Ket hop</Radio>
                        </Space>
                      </Radio.Group>
                    </div>

                    {/* QR */}
                    {(paymentMethod === 'transfer' || paymentMethod === 'combined') && total > 0 && bankConfig && (
                      <div style={{ textAlign: 'center', marginBottom: 12, padding: 8, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>QR Chuyen khoan</div>
                        <img src={getVietQRUrl(bankConfig, total, 'Thanh toan')} alt="QR"
                          style={{ width: 180, height: 'auto', borderRadius: 6 }} />
                        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{bankConfig.bankId} — {bankConfig.accountNo}</div>
                      </div>
                    )}
                    {(paymentMethod === 'transfer' || paymentMethod === 'combined') && !bankConfig && (
                      <div style={{ fontSize: 12, color: '#faad14', marginBottom: 12 }}>Chua cai dat ngan hang. Vao Cai Dat.</div>
                    )}

                    {/* Notes */}
                    <div style={{ marginBottom: 16 }}>
                      <Input.TextArea placeholder="Ghi chu..." rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    {/* Actions */}
                    <Button type="primary" size="large" block icon={<CheckCircleOutlined />}
                      onClick={handlePayment} disabled={!selectedCustomer || cartItems.length === 0}
                      style={{ background: '#ff69b4', borderColor: '#ff69b4', height: 48, fontSize: 16 }}>
                      Xac Nhan Thanh Toan
                    </Button>
                    <Button block style={{ marginTop: 8 }} onClick={resetForm}>Huy Don</Button>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'history',
            label: <span><HistoryOutlined /> Lich Su Giao Dich <Badge count={revenueTransactions.length} size="small" style={{ marginLeft: 4 }} /></span>,
            children: (
              <div>
                {/* Stats row */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ borderLeft: '4px solid #ff69b4' }}>
                      <Statistic title="Tong Doanh Thu" value={revenueTransactions.reduce((s, t) => s + Math.max(0, Number(t.amount) || 0), 0)}
                        suffix="₫" valueStyle={{ color: '#ff69b4', fontWeight: 700 }}
                        formatter={(v) => Number(v).toLocaleString('vi-VN')} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ borderLeft: '4px solid #597ef7' }}>
                      <Statistic title="So Giao Dich" value={revenueTransactions.length}
                        valueStyle={{ color: '#597ef7', fontWeight: 700 }} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ borderLeft: '4px solid #722ed1' }}>
                      <Statistic title="Tong Hoa Hong"
                        value={revenueTransactions.reduce((s, t) => s + (Number(t.commission_amount || t.commissionAmount) || 0), 0)}
                        suffix="₫" valueStyle={{ color: '#722ed1', fontWeight: 700 }}
                        formatter={(v) => Number(v).toLocaleString('vi-VN')} />
                    </Card>
                  </Col>
                </Row>

                {/* Filters */}
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Input placeholder="Tim theo khach, NV, ghi chu..." prefix={<SearchOutlined />}
                    style={{ width: 300 }} value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                  <DatePicker.RangePicker format="DD/MM/YYYY" value={historyDateRange}
                    onChange={setHistoryDateRange} placeholder={['Tu ngay', 'Den ngay']} />
                </div>

                <Table columns={historyColumns}
                  dataSource={filteredTransactions.map((t, i) => ({ ...t, key: t.id || i }))}
                  pagination={{ pageSize: 20, showTotal: (total) => `${total} giao dich` }}
                  size="small" scroll={{ x: 1200 }}
                  locale={{ emptyText: 'Chua co giao dich' }}
                  summary={(data) => {
                    if (data.length === 0) return null;
                    const sumAmount = data.reduce((s, r) => s + Math.max(0, Number(r.amount) || 0), 0);
                    const sumCommission = data.reduce((s, r) => s + (Number(r.commission_amount || r.commissionAmount) || 0), 0);
                    return (
                      <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                        <Table.Summary.Cell index={0} colSpan={3}>Tong Cong</Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right" style={{ color: '#ff69b4' }}>
                          {sumAmount.toLocaleString('vi-VN')}₫
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} colSpan={2} />
                        <Table.Summary.Cell index={6} align="right" style={{ color: '#722ed1' }}>
                          {sumCommission.toLocaleString('vi-VN')}₫
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={7} colSpan={2} />
                      </Table.Summary.Row>
                    );
                  }}
                />
              </div>
            ),
          },
          {
            key: 'expenses',
            label: <span><WalletOutlined /> Chi Phi <Badge count={expenseTransactions.length} size="small" style={{ marginLeft: 4 }} /></span>,
            children: (
              <div>
                {/* Summary */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ borderLeft: '4px solid #f5222d' }}>
                      <Statistic title="Tong Chi Phi" value={totalExpenses} suffix="₫"
                        valueStyle={{ color: '#f5222d', fontWeight: 700 }}
                        formatter={(v) => Number(v).toLocaleString('vi-VN')} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ borderLeft: '4px solid #597ef7' }}>
                      <Statistic title="So Khoan Chi" value={expenseTransactions.length}
                        valueStyle={{ color: '#597ef7', fontWeight: 700 }} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Theo danh muc</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {Object.entries(expenseByCategory).map(([cat, amount]) => {
                          const category = EXPENSE_CATEGORIES.find(c => c.value === cat);
                          return (
                            <Tag key={cat} color="default" style={{ fontSize: 11 }}>
                              {category?.icon} {category?.label || cat}: {Number(amount).toLocaleString('vi-VN')}₫
                            </Tag>
                          );
                        })}
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Actions */}
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Select value={expenseFilter} onChange={setExpenseFilter} style={{ width: 220 }}
                    options={[
                      { label: 'Tat ca danh muc', value: 'all' },
                      ...EXPENSE_CATEGORIES.map(c => ({ label: `${c.icon} ${c.label}`, value: c.value })),
                    ]} />
                  <Button type="primary" icon={<PlusOutlined />}
                    onClick={() => { expenseForm.resetFields(); expenseForm.setFieldsValue({ date: dayjs(), payment_method: 'cash', category: 'other' }); setIsExpenseModalOpen(true); }}
                    style={{ background: '#ff69b4', borderColor: '#ff69b4' }}>
                    Them Chi Phi
                  </Button>
                </div>

                {/* Expense Table */}
                <Table
                  columns={[
                    {
                      title: 'Ngay', key: 'date', width: 140,
                      render: (_, r) => { const d = r.date || r.created_at; return d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-'; },
                      sorter: (a, b) => dayjs(a.date || a.created_at).valueOf() - dayjs(b.date || b.created_at).valueOf(),
                      defaultSortOrder: 'descend',
                    },
                    {
                      title: 'Danh Muc', key: 'category', width: 180,
                      render: (_, r) => {
                        const cat = r.expense_category || r.expenseCategory || 'other';
                        const category = EXPENSE_CATEGORIES.find(c => c.value === cat);
                        return <Tag color="red">{category?.icon} {category?.label || cat}</Tag>;
                      },
                      filters: EXPENSE_CATEGORIES.map(c => ({ text: `${c.icon} ${c.label}`, value: c.value })),
                      onFilter: (value, record) => (record.expense_category || record.expenseCategory || 'other') === value,
                    },
                    {
                      title: 'So Tien', key: 'amount', width: 140, align: 'right',
                      render: (_, r) => <span style={{ color: '#f5222d', fontWeight: 600 }}>-{Math.abs(Number(r.amount) || 0).toLocaleString('vi-VN')}₫</span>,
                      sorter: (a, b) => Math.abs(Number(a.amount) || 0) - Math.abs(Number(b.amount) || 0),
                    },
                    {
                      title: 'Phuong Thuc', key: 'method', width: 120,
                      render: (_, r) => {
                        const m = r.payment_method || r.paymentMethod;
                        const map = { cash: 'Tien mat', transfer: 'Chuyen khoan', card: 'The' };
                        return map[m] || m || '-';
                      },
                    },
                    {
                      title: 'Ghi Chu', key: 'notes', render: (_, r) => r.notes || '-', ellipsis: true,
                    },
                    {
                      title: '', key: 'action', width: 50,
                      render: (_, r) => (
                        <Popconfirm title="Xoa khoan chi nay?"
                          onConfirm={async () => {
                            try {
                              await invoke('db:transactions:update', r.id, { deleted: true, transaction_type: 'expense_deleted' });
                              message.success('Da xoa');
                              loadData();
                            } catch (error) { message.error('Loi: ' + error.message); }
                          }}
                          okText="Co" cancelText="Khong">
                          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                        </Popconfirm>
                      ),
                    },
                  ]}
                  dataSource={filteredExpenses.map((t, i) => ({ ...t, key: t.id || i }))}
                  pagination={{ pageSize: 15, showTotal: (total) => `Tong ${total} khoan chi` }}
                  size="small" scroll={{ x: 700 }}
                  locale={{ emptyText: 'Chua co chi phi nao' }}
                  summary={(data) => {
                    if (data.length === 0) return null;
                    const sumAmount = data.reduce((s, r) => s + Math.abs(Number(r.amount) || 0), 0);
                    return (
                      <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                        <Table.Summary.Cell index={0} colSpan={2}>Tong Cong</Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right" style={{ color: '#f5222d' }}>
                          -{sumAmount.toLocaleString('vi-VN')}₫
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} colSpan={3} />
                      </Table.Summary.Row>
                    );
                  }}
                />
              </div>
            ),
          },
        ]} />
      </Card>

      {/* ===== EXPENSE MODAL ===== */}
      <Modal title="Them Chi Phi" open={isExpenseModalOpen}
        onOk={() => expenseForm.submit()}
        onCancel={() => { setIsExpenseModalOpen(false); expenseForm.resetFields(); }}
        okText="Them" cancelText="Huy" destroyOnClose>
        <Form form={expenseForm} layout="vertical" onFinish={handleAddExpense}
          initialValues={{ payment_method: 'cash', date: dayjs() }}>
          <Form.Item label="Danh Muc" name="category" rules={[{ required: true, message: 'Vui long chon danh muc' }]}>
            <Select placeholder="Chon loai chi phi"
              options={EXPENSE_CATEGORIES.map(c => ({ label: `${c.icon} ${c.label}`, value: c.value }))} />
          </Form.Item>
          <Form.Item label="So Tien (₫)" name="amount" rules={[{ required: true, message: 'Vui long nhap so tien' }]}>
            <InputNumber min={1000} step={10000} style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/,/g, '')} placeholder="Nhap so tien" />
          </Form.Item>
          <Form.Item label="Ngay" name="date">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Phuong Thuc" name="payment_method">
            <Select options={[
              { label: 'Tien mat', value: 'cash' },
              { label: 'Chuyen khoan', value: 'transfer' },
              { label: 'The', value: 'card' },
            ]} />
          </Form.Item>
          <Form.Item label="Ghi Chu" name="notes">
            <Input.TextArea placeholder="Ghi chu chi tiet..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== RECEIPT MODAL ===== */}
      <Modal title="Hoa Don Thanh Toan" open={receiptModal}
        onCancel={() => setReceiptModal(false)}
        footer={[
          <Button key="close" onClick={() => setReceiptModal(false)}>Dong</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}
            style={{ background: '#ff69b4', borderColor: '#ff69b4' }}>In Hoa Don</Button>,
        ]}
        width={500}>
        {lastReceipt && (
          <div style={{ fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>HOA DON THANH TOAN</div>
              <div style={{ fontSize: 12, color: '#888' }}>{dayjs(lastReceipt.createdAt).format('DD/MM/YYYY HH:mm')}</div>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ marginBottom: 8 }}>
              <strong>Khach hang:</strong> {lastReceipt.customer_name}
              {lastReceipt.customerPhone && ` — ${lastReceipt.customerPhone}`}
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #ccc' }}>
                  <th style={{ textAlign: 'left', paddingBottom: 4 }}>Muc</th>
                  <th style={{ textAlign: 'right', paddingBottom: 4 }}>SL</th>
                  <th style={{ textAlign: 'right', paddingBottom: 4 }}>Gia</th>
                </tr>
              </thead>
              <tbody>
                {lastReceipt.items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 0' }}>
                      {item.name}
                      {item.staffName && <div style={{ fontSize: 11, color: '#888' }}>NV: {item.staffName}</div>}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>{(item.price * item.quantity).toLocaleString('vi-VN')}₫</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Tam tinh:</span><span>{lastReceipt.subtotal.toLocaleString('vi-VN')}₫</span>
            </div>
            {lastReceipt.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#f5222d' }}>
                <span>Giam gia:</span><span>-{lastReceipt.discount.toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            {lastReceipt.points_used > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#f5222d' }}>
                <span>Dung diem ({lastReceipt.points_used}):</span><span>-{(lastReceipt.points_used * 1000).toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700 }}>
              <span>TONG:</span>
              <span style={{ color: '#ff69b4' }}>{lastReceipt.amount.toLocaleString('vi-VN')}₫</span>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Phuong thuc: {{ cash: 'Tien mat', transfer: 'Chuyen khoan', card: 'The', combined: 'Ket hop' }[lastReceipt.payment_method]}
            </div>
            {lastReceipt.pointsEarned > 0 && (
              <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>+{lastReceipt.pointsEarned} diem tich luy</div>
            )}
            {/* QR */}
            {(lastReceipt.payment_method === 'transfer' || lastReceipt.payment_method === 'combined') && bankConfig && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Quet ma QR de chuyen khoan</div>
                  <img src={getVietQRUrl(bankConfig, lastReceipt.amount, `HD ${dayjs(lastReceipt.createdAt).format('DDMMYYHHmm')} ${lastReceipt.customer_name}`)}
                    alt="QR" style={{ width: 250, height: 'auto', borderRadius: 8 }} />
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{bankConfig.bankId} — {bankConfig.accountNo} — {bankConfig.accountName}</div>
                </div>
              </>
            )}
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ textAlign: 'center', fontSize: 12, color: '#888' }}>Cam on quy khach!</div>
          </div>
        )}
      </Modal>
    </div>
  );
}

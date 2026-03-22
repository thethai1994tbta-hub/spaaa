import React, { useState, useEffect } from 'react';
import {
  Card, Button, Form, InputNumber, Row, Col, Select, Table, Space,
  Divider, Tag, message, Spin, Empty, Modal, Input, Radio, Descriptions,
  Statistic, Tabs, DatePicker, Popconfirm,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ShoppingCartOutlined,
  PrinterOutlined, CheckCircleOutlined, SearchOutlined,
  WalletOutlined, ThunderboltOutlined,
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

export default function Payment({ pendingBooking, onClearPending }) {
  const { invoke } = useAPI();
  const { guardAction } = useAuth();

  // Data lists
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bankConfig, setBankConfig] = useState(null);

  // Current transaction
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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

  // Expenses
  const [expenseForm] = Form.useForm();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState('all');

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

  useEffect(() => {
    loadData();
  }, []);

  // Auto-fill from pending booking
  useEffect(() => {
    if (pendingBooking && servicesList.length > 0 && customers.length > 0) {
      const custId = pendingBooking.customer_id || pendingBooking.customerId;
      const svcId = pendingBooking.service_id || pendingBooking.serviceId;
      const staffId = pendingBooking.staff_id || pendingBooking.staffId;

      // Set customer
      if (custId) setSelectedCustomer(custId);

      // Add service to cart
      const svc = servicesList.find(s => s.id === svcId);
      if (svc) {
        const staff = staffList.find(s => s.id === staffId);
        setCartItems([{
          key: Date.now(),
          type: 'service',
          id: svc.id,
          name: svc.name,
          price: Number(svc.price) || 0,
          quantity: 1,
          staffId: staffId || null,
          staffName: staff?.name || '',
        }]);
      }

      // Set notes
      const bookingNotes = pendingBooking.notes || '';
      setNotes(bookingNotes ? `Từ lịch hẹn: ${bookingNotes}` : 'Từ lịch hẹn');

      // Track booking ID to mark completed after payment
      setLinkedBookingId(pendingBooking.id);
      setActiveTab('new');
      onClearPending?.();
    }
  }, [pendingBooking, servicesList, customers]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, staffRes, svcRes, pkgRes, invRes, txRes] = await Promise.all([
        invoke('db:customers:getAll'),
        invoke('db:staff:getAll'),
        invoke('db:services:getAll'),
        invoke('db:packages:getAll'),
        invoke('db:inventory:getAll'),
        invoke('db:transactions:getAll'),
      ]);
      // Bank config is optional - don't let it break loading
      try {
        const bankRes = await invoke('db:settings:get', 'bank');
        setBankConfig(bankRes);
      } catch { /* not configured yet */ }
      setCustomers(custRes.data || custRes || []);
      setStaffList(staffRes.data || staffRes || []);
      const svcs = svcRes.data || svcRes || [];
      setServicesList(svcs.filter(s => s.active !== false));
      const pkgs = pkgRes.data || pkgRes || [];
      setPackagesList(pkgs.filter(p => p.status !== 'inactive'));
      const inv = invRes.data || invRes || [];
      setInventoryList(inv.filter(i => (i.quantity || 0) > 0));
      setTransactions(txRes.data || txRes || []);
    } catch (error) {
      console.error('[Payment] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============ CART LOGIC ============
  const addServiceToCart = (serviceId) => {
    const svc = servicesList.find(s => s.id === serviceId);
    if (!svc) return;
    setCartItems(prev => [...prev, {
      key: Date.now(),
      type: 'service',
      id: svc.id,
      name: svc.name,
      price: Number(svc.price) || 0,
      quantity: 1,
      staffId: null,
      staffName: '',
    }]);
  };

  const addPackageToCart = (packageId) => {
    const pkg = packagesList.find(p => p.id === packageId);
    if (!pkg) return;
    setCartItems(prev => [...prev, {
      key: Date.now(),
      type: 'package',
      id: pkg.id,
      name: `[Gói] ${pkg.name}`,
      price: Number(pkg.price) || 0,
      quantity: 1,
      sessions: pkg.sessions || 1,
      staffId: null,
      staffName: '',
    }]);
  };

  const addProductToCart = (productId) => {
    const product = inventoryList.find(p => p.id === productId);
    if (!product) return;
    setCartItems(prev => [...prev, {
      key: Date.now(),
      type: 'product',
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity: 1,
      maxQuantity: product.quantity || 999,
      staffId: null,
      staffName: '',
    }]);
  };

  const updateCartItem = (key, field, value) => {
    setCartItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };
      if (field === 'staffId') {
        const staff = staffList.find(s => s.id === value);
        updated.staffName = staff?.name || '';
      }
      return updated;
    }));
  };

  const removeCartItem = (key) => {
    setCartItems(prev => prev.filter(item => item.key !== key));
  };

  // ============ CALCULATIONS ============
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const discountAmount = discountType === 'percent'
    ? Math.round(subtotal * (discountValue / 100))
    : (discountValue || 0);

  const pointsDiscount = pointsUsed * 1000; // 1 point = 1,000 VND

  const total = Math.max(0, subtotal - discountAmount - pointsDiscount);

  const totalCommission = cartItems.reduce((sum, item) => {
    if (!item.staffId) return sum;
    const staff = staffList.find(s => s.id === item.staffId);
    const rate = staff?.commissionRate ?? staff?.commission_rate ?? 0;
    return sum + Math.round((item.price * item.quantity * rate) / 100);
  }, 0);

  // ============ SUBMIT ============
  const handlePayment = async () => {
    if (!selectedCustomer) {
      message.warning('Vui lòng chọn khách hàng');
      return;
    }
    if (cartItems.length === 0) {
      message.warning('Vui lòng thêm dịch vụ / gói');
      return;
    }

    try {
      const isWalkIn = selectedCustomer === 'walk-in';
      const customer = isWalkIn ? null : customers.find(c => c.id === selectedCustomer);
      const pointsEarned = isWalkIn ? 0 : Math.floor(total / 10000); // 10,000 VND = 1 point

      const txData = {
        customer_id: isWalkIn ? null : selectedCustomer,
        customer_name: isWalkIn ? 'Khách Vãng Lai' : (customer?.name || ''),
        items: cartItems.map(item => ({
          type: item.type,
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          staffId: item.staffId,
          staffName: item.staffName,
        })),
        subtotal,
        discount: discountAmount,
        discount_type: discountType,
        amount: total,
        payment_method: paymentMethod,
        transaction_type: cartItems.some(i => i.type === 'package') ? 'package' : cartItems.some(i => i.type === 'product') ? 'mixed' : 'service',
        commission_amount: totalCommission,
        points_used: pointsUsed,
        points_earned: pointsEarned,
        notes,
        date: new Date().toISOString(),
      };

      // Save for each staff (commission tracking)
      const staffItems = {};
      cartItems.forEach(item => {
        if (item.staffId) {
          if (!staffItems[item.staffId]) staffItems[item.staffId] = [];
          staffItems[item.staffId].push(item);
        }
      });

      // Create main transaction
      const result = await invoke('db:transactions:add', txData);

      if (result.success || result.id) {
        // Update customer points (skip walk-in)
        if (customer && !isWalkIn) {
          const newPoints = (customer.points || 0) - pointsUsed + pointsEarned;
          await invoke('db:customers:update', customer.id, { points: newPoints });
        }

        // Create commission entries per staff
        for (const [staffId, items] of Object.entries(staffItems)) {
          const staff = staffList.find(s => s.id === staffId);
          const rate = staff?.commissionRate ?? staff?.commission_rate ?? 0;
          const staffTotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
          const commission = Math.round((staffTotal * rate) / 100);

          await invoke('db:transactions:add', {
            customer_id: selectedCustomer,
            customer_name: customer?.name || '',
            staff_id: staffId,
            staff_name: staff?.name || '',
            amount: staffTotal,
            commission_amount: commission,
            transaction_type: 'commission',
            payment_method: paymentMethod,
            date: new Date().toISOString(),
            notes: `Hoa hồng từ giao dịch`,
          });
        }

        // Build receipt
        setLastReceipt({
          ...txData,
          id: result.id,
          pointsEarned,
          createdAt: new Date().toISOString(),
          customerPhone: isWalkIn ? '' : (customer?.phone || ''),
        });

        // Mark linked booking as completed
        if (linkedBookingId) {
          try {
            await invoke('db:bookings:update', linkedBookingId, { status: 'completed' });
          } catch {}
          setLinkedBookingId(null);
        }

        message.success('Thanh toán thành công!');
        setReceiptModal(true);
        resetForm();
        loadData();
      } else {
        message.error('Lỗi thanh toán');
      }
    } catch (error) {
      message.error('Lỗi: ' + error.message);
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

  // ============ EXPENSE LOGIC ============
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
      message.success('Thêm chi phí thành công');
      expenseForm.resetFields();
      setIsExpenseModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Lỗi thêm chi phí: ' + error.message);
    }
  };

  const expenseTransactions = transactions.filter(t => {
    const type = t.transactionType || t.transaction_type;
    return type === 'expense';
  });

  const filteredExpenses = expenseFilter === 'all'
    ? expenseTransactions
    : expenseTransactions.filter(t => (t.expenseCategory || 'other') === expenseFilter);

  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const expenseByCategory = {};
  expenseTransactions.forEach(t => {
    const cat = t.expenseCategory || 'other';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Math.abs(Number(t.amount) || 0);
  });

  // ============ CART TABLE ============
  const cartColumns = [
    {
      title: 'Dịch Vụ / Gói',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name, record) => (
        <span>
          {record.type === 'package' && <Tag color="purple">Gói</Tag>}
          {record.type === 'product' && <Tag color="green">SP</Tag>}
          {name}
        </span>
      ),
    },
    {
      title: 'Nhân Viên',
      key: 'staff',
      width: 150,
      render: (_, record) => (
        <Select
          placeholder="Chọn NV"
          allowClear
          size="small"
          style={{ width: '100%' }}
          value={record.staffId}
          onChange={(v) => updateCartItem(record.key, 'staffId', v)}
          options={staffList.map(s => ({ label: s.name, value: s.id }))}
        />
      ),
    },
    {
      title: 'Đơn Giá',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (v) => `${Number(v).toLocaleString('vi-VN')}₫`,
    },
    {
      title: 'SL',
      key: 'quantity',
      width: 70,
      render: (_, record) => (
        <InputNumber
          min={1}
          max={record.maxQuantity || 10}
          size="small"
          value={record.quantity}
          onChange={(v) => updateCartItem(record.key, 'quantity', v || 1)}
        />
      ),
    },
    {
      title: 'Thành Tiền',
      key: 'total',
      width: 120,
      render: (_, record) => (
        <strong>{(record.price * record.quantity).toLocaleString('vi-VN')}₫</strong>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 40,
      render: (_, record) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => removeCartItem(record.key)}
        />
      ),
    },
  ];

  // ============ HISTORY ============
  const filteredTransactions = transactions.filter(t => {
    const type = t.transactionType || t.transaction_type;
    if (type === 'commission' || type === 'expense') return false;
    const search = historySearch.toLowerCase();
    return (t.customerName || t.customer_name || '').toLowerCase().includes(search) ||
      (t.notes || '').toLowerCase().includes(search);
  });

  const historyColumns = [
    {
      title: 'Ngày',
      key: 'date',
      width: 150,
      render: (_, r) => {
        const d = r.date || r.createdAt;
        return d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-';
      },
    },
    {
      title: 'Khách Hàng',
      key: 'customer',
      width: 140,
      render: (_, r) => r.customerName || customers.find(c => c.id === r.customerId)?.name || '-',
    },
    {
      title: 'Tổng Tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (v) => <strong style={{ color: '#ff69b4' }}>{Number(v || 0).toLocaleString('vi-VN')}₫</strong>,
    },
    {
      title: 'Phương Thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (v) => {
        const map = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', combined: 'Kết hợp' };
        return map[v] || v || '-';
      },
    },
    {
      title: 'Loại',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 100,
      render: (v) => {
        const map = { service: 'Dịch vụ', package: 'Gói', product: 'Sản phẩm' };
        const colors = { service: 'blue', package: 'purple', product: 'green' };
        return <Tag color={colors[v]}>{map[v] || v}</Tag>;
      },
    },
    {
      title: 'Ghi Chú',
      dataIndex: 'notes',
      key: 'notes',
      render: (v) => v || '-',
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, r) => (
        <Popconfirm
          title="Xóa giao dịch này?"
          description="Hành động này không thể hoàn tác."
          onConfirm={guardAction(async () => {
            try {
              await invoke('db:transactions:delete', r.id);
              message.success('Đã xóa giao dịch');
              loadData();
            } catch (error) {
              message.error('Lỗi: ' + error.message);
            }
          })}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  // ============ RENDER ============
  if (loading) return <Spin style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  return (
    <div>
      <Card title="Thanh Toán">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'new',
              label: <span><ShoppingCartOutlined /> Thanh Toán Mới</span>,
              children: (
                <Row gutter={24}>
                  {/* LEFT: Cart */}
                  <Col xs={24} lg={15}>
                    {/* Customer select */}
                    <Card size="small" style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>1. Chọn Khách Hàng</span>
                        <Button
                          size="small"
                          type={selectedCustomer === 'walk-in' ? 'primary' : 'default'}
                          onClick={() => setSelectedCustomer(selectedCustomer === 'walk-in' ? null : 'walk-in')}
                          style={selectedCustomer === 'walk-in' ? { background: '#ff69b4', borderColor: '#ff69b4' } : {}}
                        >
                          Khách Vãng Lai
                        </Button>
                      </div>
                      {selectedCustomer !== 'walk-in' ? (
                        <>
                          <Select
                            placeholder="Tìm và chọn khách hàng..."
                            showSearch
                            allowClear
                            optionFilterProp="label"
                            style={{ width: '100%' }}
                            value={selectedCustomer}
                            onChange={setSelectedCustomer}
                            options={customers.map(c => ({
                              label: `${c.name}${c.phone ? ` — ${c.phone}` : ''}`,
                              value: c.id,
                            }))}
                          />
                          {selectedCustomerData && (
                            <div style={{ marginTop: 8, fontSize: 12, color: '#595959' }}>
                              <Tag color="gold">Điểm: {selectedCustomerData.points || 0}</Tag>
                              {selectedCustomerData.phone && <span>SĐT: {selectedCustomerData.phone}</span>}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ padding: '8px 0', fontSize: 13 }}>
                          <Tag color="orange">Khách Vãng Lai</Tag>
                          <span style={{ color: '#888' }}>— Không tích điểm</span>
                        </div>
                      )}
                    </Card>

                    {/* Add items */}
                    <Card size="small" style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>2. Thêm Dịch Vụ / Gói</div>
                      <Row gutter={8}>
                        <Col flex="1">
                          <Select
                            placeholder="+ Thêm dịch vụ"
                            showSearch
                            optionFilterProp="label"
                            style={{ width: '100%' }}
                            value={null}
                            onChange={addServiceToCart}
                            options={servicesList.map(s => ({
                              label: `${s.name} — ${Number(s.price || 0).toLocaleString('vi-VN')}₫`,
                              value: s.id,
                            }))}
                          />
                        </Col>
                        <Col flex="1">
                          <Select
                            placeholder="+ Thêm gói liệu trình"
                            showSearch
                            optionFilterProp="label"
                            style={{ width: '100%' }}
                            value={null}
                            onChange={addPackageToCart}
                            options={packagesList.map(p => ({
                              label: `${p.name} — ${Number(p.price || 0).toLocaleString('vi-VN')}₫ (${p.sessions} buổi)`,
                              value: p.id,
                            }))}
                          />
                        </Col>
                        <Col flex="1">
                          <Select
                            placeholder="+ Thêm sản phẩm"
                            showSearch
                            optionFilterProp="label"
                            style={{ width: '100%' }}
                            value={null}
                            onChange={addProductToCart}
                            options={inventoryList.map(p => ({
                              label: `${p.name} — ${Number(p.price || 0).toLocaleString('vi-VN')}₫ (Kho: ${p.quantity || 0})`,
                              value: p.id,
                            }))}
                          />
                        </Col>
                      </Row>
                    </Card>

                    {/* Cart table */}
                    <Card size="small">
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>
                        Đơn Hàng ({cartItems.length} mục)
                      </div>
                      {cartItems.length > 0 ? (
                        <Table
                          columns={cartColumns}
                          dataSource={cartItems}
                          pagination={false}
                          size="small"
                          scroll={{ x: 600 }}
                        />
                      ) : (
                        <Empty description="Chưa có dịch vụ nào" style={{ padding: '20px 0' }} />
                      )}
                    </Card>
                  </Col>

                  {/* RIGHT: Summary */}
                  <Col xs={24} lg={9}>
                    <Card
                      size="small"
                      style={{ position: 'sticky', top: 16 }}
                      title="Thanh Toán"
                    >
                      {/* Subtotal */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span>Tạm tính:</span>
                        <strong>{subtotal.toLocaleString('vi-VN')}₫</strong>
                      </div>

                      {/* Discount */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Giảm giá:</div>
                        <Space.Compact style={{ width: '100%' }}>
                          <Select
                            value={discountType}
                            onChange={setDiscountType}
                            style={{ width: 100 }}
                            options={[
                              { label: 'VNĐ', value: 'fixed' },
                              { label: '%', value: 'percent' },
                            ]}
                          />
                          <InputNumber
                            min={0}
                            max={discountType === 'percent' ? 100 : subtotal}
                            value={discountValue}
                            onChange={setDiscountValue}
                            style={{ flex: 1 }}
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={v => v.replace(/,/g, '')}
                          />
                        </Space.Compact>
                        {discountAmount > 0 && (
                          <div style={{ fontSize: 12, color: '#f5222d', marginTop: 2 }}>
                            -{ discountAmount.toLocaleString('vi-VN')}₫
                          </div>
                        )}
                      </div>

                      {/* Points */}
                      {selectedCustomerData && (selectedCustomerData.points || 0) > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                            Dùng điểm (có: {selectedCustomerData.points}, 1 điểm = 1.000₫):
                          </div>
                          <InputNumber
                            min={0}
                            max={Math.min(selectedCustomerData.points || 0, Math.floor((subtotal - discountAmount) / 1000))}
                            value={pointsUsed}
                            onChange={setPointsUsed}
                            style={{ width: '100%' }}
                          />
                          {pointsUsed > 0 && (
                            <div style={{ fontSize: 12, color: '#f5222d', marginTop: 2 }}>
                              -{pointsDiscount.toLocaleString('vi-VN')}₫
                            </div>
                          )}
                        </div>
                      )}

                      <Divider style={{ margin: '12px 0' }} />

                      {/* Total */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>TỔNG:</span>
                        <span style={{ fontSize: 22, fontWeight: 700, color: '#ff69b4' }}>
                          {total.toLocaleString('vi-VN')}₫
                        </span>
                      </div>

                      {/* Commission info */}
                      {totalCommission > 0 && (
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                          Hoa hồng NV: {totalCommission.toLocaleString('vi-VN')}₫
                        </div>
                      )}

                      {/* Payment method */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Phương thức:</div>
                        <Radio.Group value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%' }}>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Radio value="cash">Tiền mặt</Radio>
                            <Radio value="transfer">Chuyển khoản</Radio>
                            <Radio value="card">Thẻ</Radio>
                            <Radio value="combined">Kết hợp</Radio>
                          </Space>
                        </Radio.Group>
                      </div>

                      {/* QR preview for transfer */}
                      {(paymentMethod === 'transfer' || paymentMethod === 'combined') && total > 0 && bankConfig && (
                        <div style={{ textAlign: 'center', marginBottom: 12, padding: 8, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>QR Chuyển khoản</div>
                          <img
                            src={getVietQRUrl(bankConfig, total, `Thanh toan SPA VIP`)}
                            alt="QR"
                            style={{ width: 180, height: 'auto', borderRadius: 6 }}
                          />
                          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                            {bankConfig.bankId} — {bankConfig.accountNo}
                          </div>
                        </div>
                      )}
                      {(paymentMethod === 'transfer' || paymentMethod === 'combined') && !bankConfig && (
                        <div style={{ fontSize: 12, color: '#faad14', marginBottom: 12 }}>
                          Chưa cài đặt ngân hàng. Vào Cài Đặt → Ngân Hàng.
                        </div>
                      )}

                      {/* Notes */}
                      <div style={{ marginBottom: 16 }}>
                        <Input.TextArea
                          placeholder="Ghi chú..."
                          rows={2}
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                        />
                      </div>

                      {/* Actions */}
                      <Button
                        type="primary"
                        size="large"
                        block
                        icon={<CheckCircleOutlined />}
                        onClick={handlePayment}
                        disabled={!selectedCustomer || cartItems.length === 0}
                        style={{ background: '#ff69b4', borderColor: '#ff69b4', height: 48, fontSize: 16 }}
                      >
                        Xác Nhận Thanh Toán
                      </Button>
                      <Button
                        block
                        style={{ marginTop: 8 }}
                        onClick={resetForm}
                      >
                        Hủy Đơn
                      </Button>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'history',
              label: <span><SearchOutlined /> Lịch Sử Giao Dịch</span>,
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Input
                      placeholder="Tìm theo tên khách hàng..."
                      prefix={<SearchOutlined />}
                      style={{ width: 300 }}
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                    />
                  </div>
                  <Table
                    columns={historyColumns}
                    dataSource={filteredTransactions.map((t, i) => ({ ...t, key: t.id || i }))}
                    pagination={{ pageSize: 15 }}
                    size="small"
                    scroll={{ x: 800 }}
                    locale={{ emptyText: 'Chưa có giao dịch' }}
                  />
                </div>
              ),
            },
            {
              key: 'expenses',
              label: <span><WalletOutlined /> Chi Phí Sinh Hoạt</span>,
              children: (
                <div>
                  {/* Summary */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={{ borderLeft: '4px solid #f5222d' }}>
                        <Statistic
                          title="Tổng Chi Phí"
                          value={totalExpenses}
                          suffix="₫"
                          valueStyle={{ color: '#f5222d', fontWeight: 700 }}
                          formatter={(v) => Number(v).toLocaleString('vi-VN')}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={{ borderLeft: '4px solid #597ef7' }}>
                        <Statistic
                          title="Số Khoản Chi"
                          value={expenseTransactions.length}
                          valueStyle={{ color: '#597ef7', fontWeight: 700 }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Theo danh mục</div>
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
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <Select
                      value={expenseFilter}
                      onChange={setExpenseFilter}
                      style={{ width: 220 }}
                      options={[
                        { label: 'Tất cả danh mục', value: 'all' },
                        ...EXPENSE_CATEGORIES.map(c => ({ label: `${c.icon} ${c.label}`, value: c.value })),
                      ]}
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        expenseForm.resetFields();
                        expenseForm.setFieldsValue({ date: dayjs(), payment_method: 'cash', category: 'other' });
                        setIsExpenseModalOpen(true);
                      }}
                      style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
                    >
                      Thêm Chi Phí
                    </Button>
                  </div>

                  {/* Expense Table */}
                  <Table
                    columns={[
                      {
                        title: 'Ngày', key: 'date', width: 140,
                        render: (_, r) => {
                          const d = r.date || r.createdAt;
                          return d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-';
                        },
                        sorter: (a, b) => {
                          const da = dayjs(a.date || a.createdAt);
                          const db = dayjs(b.date || b.createdAt);
                          return da.valueOf() - db.valueOf();
                        },
                        defaultSortOrder: 'descend',
                      },
                      {
                        title: 'Danh Mục', key: 'category', width: 180,
                        render: (_, r) => {
                          const cat = r.expenseCategory || 'other';
                          const category = EXPENSE_CATEGORIES.find(c => c.value === cat);
                          return (
                            <Tag color="red">
                              {category?.icon} {category?.label || cat}
                            </Tag>
                          );
                        },
                        filters: EXPENSE_CATEGORIES.map(c => ({ text: `${c.icon} ${c.label}`, value: c.value })),
                        onFilter: (value, record) => (record.expenseCategory || 'other') === value,
                      },
                      {
                        title: 'Số Tiền', key: 'amount', width: 140,
                        render: (_, r) => (
                          <span style={{ color: '#f5222d', fontWeight: 600 }}>
                            -{Math.abs(Number(r.amount) || 0).toLocaleString('vi-VN')}₫
                          </span>
                        ),
                        sorter: (a, b) => Math.abs(Number(a.amount) || 0) - Math.abs(Number(b.amount) || 0),
                      },
                      {
                        title: 'Phương Thức', key: 'method', width: 120,
                        render: (_, r) => {
                          const m = r.paymentMethod || r.payment_method;
                          const map = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' };
                          return map[m] || m || '-';
                        },
                      },
                      {
                        title: 'Ghi Chú', dataIndex: 'notes', key: 'notes',
                        render: (v) => v || '-', ellipsis: true,
                      },
                      {
                        title: '', key: 'action', width: 50,
                        render: (_, r) => (
                          <Popconfirm
                            title="Xóa khoản chi này?"
                            onConfirm={async () => {
                              try {
                                await invoke('db:transactions:update', r.id, { deleted: true, transaction_type: 'expense_deleted' });
                                message.success('Đã xóa');
                                loadData();
                              } catch (error) {
                                message.error('Lỗi: ' + error.message);
                              }
                            }}
                            okText="Có"
                            cancelText="Không"
                          >
                            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                    dataSource={filteredExpenses.map((t, i) => ({ ...t, key: t.id || i }))}
                    pagination={{ pageSize: 15, showTotal: (total) => `Tổng ${total} khoản chi` }}
                    size="small"
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'Chưa có chi phí nào' }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Expense Modal */}
      <Modal
        title="Thêm Chi Phí Sinh Hoạt"
        open={isExpenseModalOpen}
        onOk={() => expenseForm.submit()}
        onCancel={() => {
          setIsExpenseModalOpen(false);
          expenseForm.resetFields();
        }}
        okText="Thêm"
        cancelText="Hủy"
      >
        <Form
          form={expenseForm}
          layout="vertical"
          onFinish={handleAddExpense}
          initialValues={{ payment_method: 'cash', date: dayjs() }}
        >
          <Form.Item
            label="Danh Mục"
            name="category"
            rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
          >
            <Select
              placeholder="Chọn loại chi phí"
              options={EXPENSE_CATEGORIES.map(c => ({
                label: `${c.icon} ${c.label}`,
                value: c.value,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="Số Tiền (₫)"
            name="amount"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
          >
            <InputNumber
              min={1000}
              step={10000}
              style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/,/g, '')}
              placeholder="Nhập số tiền"
            />
          </Form.Item>
          <Form.Item label="Ngày" name="date">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Phương Thức" name="payment_method">
            <Select
              options={[
                { label: 'Tiền mặt', value: 'cash' },
                { label: 'Chuyển khoản', value: 'transfer' },
                { label: 'Thẻ', value: 'card' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Ghi Chú" name="notes">
            <Input.TextArea placeholder="Ghi chú chi tiết..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        title="Hóa Đơn Thanh Toán"
        open={receiptModal}
        onCancel={() => setReceiptModal(false)}
        footer={[
          <Button key="close" onClick={() => setReceiptModal(false)}>Đóng</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}
            style={{ background: '#ff69b4', borderColor: '#ff69b4' }}>
            In Hóa Đơn
          </Button>,
        ]}
        width={500}
      >
        {lastReceipt && (
          <div style={{ fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>SPA VIP</div>
              <div style={{ fontSize: 12, color: '#888' }}>Hóa đơn thanh toán</div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {dayjs(lastReceipt.createdAt).format('DD/MM/YYYY HH:mm')}
              </div>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ marginBottom: 8 }}>
              <strong>Khách hàng:</strong> {lastReceipt.customer_name}
              {lastReceipt.customerPhone && ` — ${lastReceipt.customerPhone}`}
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #ccc' }}>
                  <th style={{ textAlign: 'left', paddingBottom: 4 }}>Mục</th>
                  <th style={{ textAlign: 'right', paddingBottom: 4 }}>SL</th>
                  <th style={{ textAlign: 'right', paddingBottom: 4 }}>Giá</th>
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
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>
                      {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Tạm tính:</span>
              <span>{lastReceipt.subtotal.toLocaleString('vi-VN')}₫</span>
            </div>
            {lastReceipt.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#f5222d' }}>
                <span>Giảm giá:</span>
                <span>-{lastReceipt.discount.toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            {lastReceipt.points_used > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#f5222d' }}>
                <span>Dùng điểm ({lastReceipt.points_used}):</span>
                <span>-{(lastReceipt.points_used * 1000).toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700 }}>
              <span>TỔNG:</span>
              <span style={{ color: '#ff69b4' }}>{lastReceipt.amount.toLocaleString('vi-VN')}₫</span>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Phương thức: {{ cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', combined: 'Kết hợp' }[lastReceipt.payment_method]}
            </div>
            {lastReceipt.pointsEarned > 0 && (
              <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                +{lastReceipt.pointsEarned} điểm tích lũy
              </div>
            )}
            {/* QR Code chuyển khoản */}
            {(lastReceipt.payment_method === 'transfer' || lastReceipt.payment_method === 'combined') && bankConfig && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Quét mã QR để chuyển khoản</div>
                  <img
                    src={getVietQRUrl(bankConfig, lastReceipt.amount, `HD ${dayjs(lastReceipt.createdAt).format('DDMMYYHHmm')} ${lastReceipt.customer_name}`)}
                    alt="QR Chuyển khoản"
                    style={{ width: 250, height: 'auto', borderRadius: 8 }}
                  />
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                    {bankConfig.bankId} — {bankConfig.accountNo} — {bankConfig.accountName}
                  </div>
                </div>
              </>
            )}
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ textAlign: 'center', fontSize: 12, color: '#888' }}>
              Cảm ơn quý khách!
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

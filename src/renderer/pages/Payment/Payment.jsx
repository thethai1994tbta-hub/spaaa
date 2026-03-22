import React, { useState, useEffect } from 'react';
import {
  Card, Button, Form, InputNumber, Row, Col, Select, Table, Space,
  Divider, Tag, message, Spin, Empty, Modal, Input, Radio, Descriptions,
  Statistic, Tabs, DatePicker, Popconfirm,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ShoppingCartOutlined,
  PrinterOutlined, CheckCircleOutlined, SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAPI } from '../../hooks/useAPI';

export default function Payment() {
  const { invoke } = useAPI();

  // Data lists
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Current transaction
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // UI
  const [loading, setLoading] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [activeTab, setActiveTab] = useState('new');
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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
  };

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
    if (t.transactionType === 'commission') return false;
    const search = historySearch.toLowerCase();
    return (t.customerName || '').toLowerCase().includes(search) ||
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
          ]}
        />
      </Card>

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

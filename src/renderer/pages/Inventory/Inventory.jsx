import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, message, Spin,
  Space, Popconfirm, Empty, InputNumber, Tag, Tabs, Select,
  Row, Col, Statistic, Badge, Divider, DatePicker,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined,
  SearchOutlined, ImportOutlined, ExportOutlined,
  ShoppingOutlined, AppstoreOutlined, GiftOutlined,
  DollarOutlined, WarningOutlined, HistoryOutlined,
  InboxOutlined, BarChartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../context/AuthContext';

// Helper to read snake_case fields from SQLite
const f = (record, camel, snake) => record[snake] ?? record[camel] ?? null;

export default function Inventory() {
  const { invoke } = useAPI();
  const { guardAction } = useAuth();

  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [searchText, setSearchText] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('products');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [form] = Form.useForm();
  const [importForm] = Form.useForm();
  const [exportForm] = Form.useForm();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prodRes, svcRes, pkgRes] = await Promise.allSettled([
        invoke('db:inventory:getAll'),
        invoke('db:services:getAll'),
        invoke('db:packages:getAll'),
      ]);
      const safe = (r) => {
        const d = r.status === 'fulfilled' ? (r.value?.data || r.value || []) : [];
        return Array.isArray(d) ? d : [];
      };
      setProducts(safe(prodRes));
      setServices(safe(svcRes).filter(s => s.active !== false && s.active !== 0));
      setPackages(safe(pkgRes).filter(p => p.status !== 'inactive'));

      // Load stock movements
      try {
        const mvRes = await invoke('db:query', 'stock_movements', []);
        setStockMovements(mvRes?.data || mvRes || []);
      } catch { setStockMovements([]); }
    } catch (e) {
      console.error('[Inventory] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // ============ STATS ============
  const totalProducts = products.length;
  const totalQuantity = products.reduce((s, p) => s + (p.quantity || 0), 0);
  const totalStockValue = products.reduce((s, p) => s + (p.quantity || 0) * (p.unit_price || p.unitPrice || 0), 0);
  const lowStockItems = products.filter(p => (p.quantity || 0) <= (p.reorder_level || p.reorderLevel || 10));
  const outOfStockItems = products.filter(p => (p.quantity || 0) === 0);

  // ============ PRODUCT HANDLERS ============
  const handleSaveProduct = async (values) => {
    try {
      const data = {
        name: values.name,
        category: values.category || '',
        quantity: values.quantity || 0,
        unit_price: Number(values.sellPrice) || 0,
        reorder_level: values.reorderLevel || 10,
        supplier: values.supplier || '',
      };
      if (isEditMode && selectedItem) {
        await invoke('db:inventory:update', selectedItem.id, data);
        message.success('Cập nhật thành công');
      } else {
        await invoke('db:inventory:add', data);
        message.success('Thêm sản phẩm thành công');
      }
      form.resetFields();
      setIsModalOpen(false);
      setIsEditMode(false);
      loadAll();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await invoke('db:inventory:delete', id);
      message.success('Xóa thành công');
      loadAll();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  // ============ IMPORT STOCK ============
  const handleImportStock = async (values) => {
    try {
      const product = products.find(p => p.id === values.productId);
      if (!product) { message.error('Không tìm thấy sản phẩm'); return; }
      const newQuantity = (product.quantity || 0) + (values.quantity || 0);
      const unitCost = Number(values.unitCost) || 0;
      const totalCost = unitCost * (values.quantity || 0);

      await invoke('db:inventory:update', product.id, {
        name: product.name,
        category: product.category,
        quantity: newQuantity,
        unit_price: product.unit_price || product.unitPrice,
        reorder_level: product.reorder_level || product.reorderLevel,
        supplier: product.supplier,
      });

      try {
        await invoke('db:stock-movements:add', {
          itemId: product.id, itemName: product.name,
          date: new Date().toISOString(), quantity: values.quantity,
          type: 'import', unitCost, totalCost,
          notes: values.notes || `Nhập ${values.quantity} ${product.name}`,
          user: 'Admin',
        });
      } catch {}

      if (totalCost > 0) {
        try {
          await invoke('db:transactions:add', {
            transaction_type: 'expense', expense_category: 'supplies',
            expense_category_label: 'Vật Tư / Nguyên Liệu',
            amount: -totalCost,
            notes: `Nhập hàng: ${values.quantity} ${product.name}${values.notes ? ` - ${values.notes}` : ''}`,
            payment_method: values.payment_method || 'cash',
            date: new Date().toISOString(),
          });
        } catch {}
      }

      message.success(`Nhập ${values.quantity} ${product.name} thành công (Tổng: ${newQuantity})`);
      importForm.resetFields();
      setIsImportModalOpen(false);
      loadAll();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  // ============ EXPORT STOCK ============
  const handleExportStock = async (values) => {
    try {
      const product = products.find(p => p.id === values.productId);
      if (!product) { message.error('Không tìm thấy sản phẩm'); return; }
      const currentQty = product.quantity || 0;
      if (values.quantity > currentQty) {
        message.error(`Không đủ hàng. Kho hiện có: ${currentQty}`);
        return;
      }
      const newQuantity = currentQty - values.quantity;

      await invoke('db:inventory:update', product.id, {
        name: product.name, category: product.category,
        quantity: newQuantity,
        unit_price: product.unit_price || product.unitPrice,
        reorder_level: product.reorder_level || product.reorderLevel,
        supplier: product.supplier,
      });

      try {
        await invoke('db:stock-movements:add', {
          itemId: product.id, itemName: product.name,
          date: new Date().toISOString(), quantity: -values.quantity,
          type: 'export', unitCost: 0, totalCost: 0,
          notes: values.notes || `Xuất ${values.quantity} ${product.name} — ${values.reason || 'Khác'}`,
          user: 'Admin',
        });
      } catch {}

      message.success(`Xuất ${values.quantity} ${product.name} thành công (Còn: ${newQuantity})`);
      exportForm.resetFields();
      setIsExportModalOpen(false);
      loadAll();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  // ============ SERVICE HANDLERS ============
  const handleSaveService = async (values) => {
    try {
      const data = {
        name: values.name,
        category: values.category || '',
        price: Number(values.price) || 0,
        duration: Number(values.duration) || 60,
        description: values.description || '',
        steps: values.steps || '',
        commissionRate: Number(values.commissionRate) || 0,
      };
      if (isEditMode && selectedItem) {
        await invoke('db:services:update', selectedItem.id, data);
        message.success('Cập nhật thành công');
      } else {
        await invoke('db:services:add', data);
        message.success('Thêm dịch vụ thành công');
      }
      form.resetFields();
      setIsModalOpen(false);
      setIsEditMode(false);
      loadAll();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteService = async (id) => {
    try {
      await invoke('db:services:delete', id);
      message.success('Xóa thành công');
      loadAll();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  // ============ PACKAGE HANDLERS ============
  const handleSavePackage = async (values) => {
    try {
      const data = {
        name: values.name,
        category: values.category || '',
        description: values.description || '',
        price: Number(values.price) || 0,
        sessions: Number(values.sessions) || 1,
        validityDays: Number(values.validityDays) || 30,
        services: values.services || [],
      };
      if (isEditMode && selectedItem) {
        await invoke('db:packages:update', selectedItem.id, data);
        message.success('Cập nhật thành công');
      } else {
        await invoke('db:packages:add', data);
        message.success('Thêm gói thành công');
      }
      form.resetFields();
      setIsModalOpen(false);
      setIsEditMode(false);
      loadAll();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleDeletePackage = async (id) => {
    try {
      await invoke('db:packages:delete', id);
      message.success('Xóa thành công');
      loadAll();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  // ============ SEARCH FILTER ============
  const filterData = (data) => {
    if (!searchText) return data;
    const s = searchText.toLowerCase();
    return data.filter(item =>
      (item.name || '').toLowerCase().includes(s) ||
      (item.category || '').toLowerCase().includes(s) ||
      (item.supplier || '').toLowerCase().includes(s)
    );
  };

  // ============ OPEN EDIT MODAL ============
  const openEdit = (type, record) => {
    setSelectedType(type);
    setSelectedItem(record);
    setIsEditMode(true);
    setIsModalOpen(true);
    if (type === 'products') {
      form.setFieldsValue({
        name: record.name,
        category: record.category,
        quantity: record.quantity,
        sellPrice: record.unit_price || record.unitPrice || 0,
        reorderLevel: record.reorder_level || record.reorderLevel || 10,
        supplier: record.supplier,
      });
    } else if (type === 'services') {
      form.setFieldsValue({
        name: record.name,
        category: record.category,
        price: record.price,
        duration: record.duration,
        description: record.description,
        steps: record.steps,
        commissionRate: record.commission_rate || record.commissionRate || 0,
      });
    } else {
      form.setFieldsValue({
        name: record.name,
        category: record.category,
        price: record.price,
        sessions: record.sessions,
        validityDays: record.validity_days || record.validityDays || 30,
        description: record.description,
        services: record.services,
      });
    }
  };

  const openAdd = (type) => {
    setSelectedType(type);
    setSelectedItem(null);
    setIsEditMode(false);
    form.resetFields();
    setIsModalOpen(true);
  };

  // ============ COLUMNS ============
  const productColumns = [
    {
      title: 'Tên Sản Phẩm', dataIndex: 'name', key: 'name', width: 180,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Danh Mục', dataIndex: 'category', key: 'category', width: 120,
      render: (v) => v ? <Tag>{v}</Tag> : '-',
      filters: [...new Set(products.map(p => p.category).filter(Boolean))].map(c => ({ text: c, value: c })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: 'Tồn Kho', key: 'quantity', width: 100, align: 'center',
      render: (_, r) => {
        const qty = r.quantity || 0;
        const level = r.reorder_level || r.reorderLevel || 10;
        const color = qty === 0 ? '#f5222d' : qty <= level ? '#faad14' : '#52c41a';
        return <Tag color={color} style={{ fontWeight: 600 }}>{qty}</Tag>;
      },
      sorter: (a, b) => (a.quantity || 0) - (b.quantity || 0),
    },
    {
      title: 'Giá Bán', key: 'price', width: 120, align: 'right',
      render: (_, r) => `${Number(r.unit_price || r.unitPrice || 0).toLocaleString('vi-VN')}₫`,
      sorter: (a, b) => (a.unit_price || a.unitPrice || 0) - (b.unit_price || b.unitPrice || 0),
    },
    {
      title: 'Giá Trị Kho', key: 'value', width: 130, align: 'right',
      render: (_, r) => {
        const v = (r.quantity || 0) * (r.unit_price || r.unitPrice || 0);
        return <strong>{v.toLocaleString('vi-VN')}₫</strong>;
      },
      sorter: (a, b) => {
        const va = (a.quantity || 0) * (a.unit_price || a.unitPrice || 0);
        const vb = (b.quantity || 0) * (b.unit_price || b.unitPrice || 0);
        return va - vb;
      },
    },
    {
      title: 'Mức Cảnh Báo', key: 'reorderLevel', width: 110, align: 'center',
      render: (_, r) => r.reorder_level || r.reorderLevel || 10,
    },
    {
      title: 'NCC', key: 'supplier', width: 120,
      render: (_, r) => r.supplier || '-',
      ellipsis: true,
    },
    {
      title: 'Thao Tác', key: 'action', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => openEdit('products', record)} />
          <Popconfirm title="Xóa sản phẩm này?" onConfirm={guardAction(() => handleDeleteProduct(record.id))}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const serviceColumns = [
    {
      title: 'Tên Dịch Vụ', dataIndex: 'name', key: 'name', width: 180,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Danh Mục', dataIndex: 'category', key: 'category', width: 120,
      render: (v) => v ? <Tag color="blue">{v}</Tag> : '-',
    },
    {
      title: 'Giá', key: 'price', width: 130, align: 'right',
      render: (_, r) => <strong style={{ color: '#ff69b4' }}>{Number(r.price || 0).toLocaleString('vi-VN')}₫</strong>,
      sorter: (a, b) => (a.price || 0) - (b.price || 0),
    },
    {
      title: 'Thời Lượng', key: 'duration', width: 100, align: 'center',
      render: (_, r) => `${r.duration || 60} phút`,
    },
    {
      title: 'Hoa Hồng', key: 'commission', width: 100, align: 'center',
      render: (_, r) => {
        const rate = r.commission_rate || r.commissionRate || 0;
        return rate > 0 ? <Tag color="gold">{rate}%</Tag> : <span style={{ color: '#ccc' }}>0%</span>;
      },
    },
    {
      title: 'Mô Tả', dataIndex: 'description', key: 'description',
      render: (v) => v || '-', ellipsis: true,
    },
    {
      title: 'Thao Tác', key: 'action', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => openEdit('services', record)} />
          <Popconfirm title="Xóa dịch vụ này?" onConfirm={guardAction(() => handleDeleteService(record.id))}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const packageColumns = [
    {
      title: 'Tên Gói', dataIndex: 'name', key: 'name', width: 180,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Danh Mục', dataIndex: 'category', key: 'category', width: 120,
      render: (v) => v ? <Tag color="purple">{v}</Tag> : '-',
    },
    {
      title: 'Số Buổi', dataIndex: 'sessions', key: 'sessions', width: 90, align: 'center',
      render: (v) => <Tag color="cyan">{v || 1} buổi</Tag>,
    },
    {
      title: 'Thời Hạn', key: 'validity', width: 100, align: 'center',
      render: (_, r) => `${r.validity_days || r.validityDays || 30} ngày`,
    },
    {
      title: 'Giá Gói', key: 'price', width: 130, align: 'right',
      render: (_, r) => <strong style={{ color: '#722ed1' }}>{Number(r.price || 0).toLocaleString('vi-VN')}₫</strong>,
      sorter: (a, b) => (a.price || 0) - (b.price || 0),
    },
    {
      title: 'Mô Tả', dataIndex: 'description', key: 'description',
      render: (v) => v || '-', ellipsis: true,
    },
    {
      title: 'Thao Tác', key: 'action', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => openEdit('packages', record)} />
          <Popconfirm title="Xóa gói này?" onConfirm={guardAction(() => handleDeletePackage(record.id))}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const movementColumns = [
    {
      title: 'Ngày', key: 'date', width: 150,
      render: (_, r) => {
        const d = r.date || r.created_at;
        return d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-';
      },
      sorter: (a, b) => dayjs(a.date || a.created_at).valueOf() - dayjs(b.date || b.created_at).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Sản Phẩm', key: 'item', width: 180,
      render: (_, r) => r.item_name || r.itemName || '-',
    },
    {
      title: 'Loại', key: 'type', width: 100, align: 'center',
      render: (_, r) => {
        const t = r.type;
        return t === 'import'
          ? <Tag color="green" icon={<ImportOutlined />}>Nhập</Tag>
          : <Tag color="red" icon={<ExportOutlined />}>Xuất</Tag>;
      },
      filters: [{ text: 'Nhập', value: 'import' }, { text: 'Xuất', value: 'export' }],
      onFilter: (v, r) => r.type === v,
    },
    {
      title: 'Số Lượng', key: 'quantity', width: 100, align: 'center',
      render: (_, r) => {
        const qty = r.quantity || 0;
        return <span style={{ color: qty > 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }}>
          {qty > 0 ? '+' : ''}{qty}
        </span>;
      },
    },
    {
      title: 'Đơn Giá', key: 'unitCost', width: 120, align: 'right',
      render: (_, r) => {
        const cost = r.unit_cost || r.unitCost || 0;
        return cost > 0 ? `${Number(cost).toLocaleString('vi-VN')}₫` : '-';
      },
    },
    {
      title: 'Tổng Tiền', key: 'totalCost', width: 130, align: 'right',
      render: (_, r) => {
        const cost = r.total_cost || r.totalCost || 0;
        return cost > 0 ? <strong>{Number(cost).toLocaleString('vi-VN')}₫</strong> : '-';
      },
    },
    {
      title: 'Ghi Chú', key: 'notes', render: (_, r) => r.notes || '-', ellipsis: true,
    },
    {
      title: 'Người Thực Hiện', key: 'user', width: 120,
      render: (_, r) => r.user || '-',
    },
  ];

  // ============ FORM SUBMIT ============
  const handleFormSubmit = (values) => {
    if (selectedType === 'products') return handleSaveProduct(values);
    if (selectedType === 'services') return handleSaveService(values);
    return handleSavePackage(values);
  };

  const typeLabels = { products: 'Sản Phẩm', services: 'Dịch Vụ', packages: 'Gói' };

  // ============ RENDER ============
  if (loading) return <Spin style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Quản Lý Kho & Dịch Vụ</h2>
        <Button icon={<BarChartOutlined />} onClick={loadAll} loading={loading}>Làm Mới</Button>
      </div>

      {/* ===== STATS ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '4px solid #1890ff' }}>
            <Statistic title="Tổng Sản Phẩm" value={totalProducts}
              prefix={<InboxOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
            <Statistic title="Tổng Tồn Kho" value={totalQuantity}
              prefix={<ShoppingOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '4px solid #ff69b4' }}>
            <Statistic title="Giá Trị Kho" value={totalStockValue} suffix="₫"
              prefix={<DollarOutlined style={{ color: '#ff69b4' }} />}
              valueStyle={{ color: '#ff69b4' }}
              formatter={(v) => Number(v).toLocaleString('vi-VN')} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: `4px solid ${lowStockItems.length > 0 ? '#faad14' : '#d9d9d9'}` }}>
            <Statistic title="Sắp Hết Hàng" value={lowStockItems.length}
              prefix={<WarningOutlined style={{ color: lowStockItems.length > 0 ? '#faad14' : '#d9d9d9' }} />}
              valueStyle={{ color: lowStockItems.length > 0 ? '#faad14' : '#d9d9d9' }} />
            {outOfStockItems.length > 0 && (
              <div style={{ fontSize: 12, color: '#f5222d', marginTop: 4 }}>
                {outOfStockItems.length} hết hàng
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ===== TABS ===== */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => { setActiveTab(key); setSearchText(''); }}
          items={[
            {
              key: 'products',
              label: <span><InboxOutlined /> Sản Phẩm <Badge count={totalProducts} style={{ backgroundColor: '#1890ff', marginLeft: 4 }} size="small" /></span>,
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <Input placeholder="Tìm sản phẩm, danh mục, NCC..." prefix={<SearchOutlined />}
                      style={{ width: 300 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                    <Space wrap>
                      <Button icon={<ExportOutlined />} onClick={() => { exportForm.resetFields(); setIsExportModalOpen(true); }}
                        style={{ borderColor: '#faad14', color: '#faad14' }}>
                        Xuất Kho
                      </Button>
                      <Button icon={<ImportOutlined />} onClick={() => { importForm.resetFields(); setIsImportModalOpen(true); }}
                        style={{ borderColor: '#52c41a', color: '#52c41a' }}>
                        Nhập Hàng
                      </Button>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd('products')}
                        style={{ background: '#ff69b4', borderColor: '#ff69b4' }}>
                        Thêm Sản Phẩm
                      </Button>
                    </Space>
                  </div>

                  {/* Low stock warning */}
                  {lowStockItems.length > 0 && (
                    <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffe58f', borderRadius: 6 }}>
                      <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                      <strong style={{ color: '#d48806' }}>Cảnh báo:</strong>{' '}
                      {lowStockItems.map(item => (
                        <Tag key={item.id} color={item.quantity === 0 ? 'red' : 'orange'} style={{ margin: '2px' }}>
                          {item.name}: {item.quantity || 0}
                        </Tag>
                      ))}
                    </div>
                  )}

                  <Table
                    columns={productColumns}
                    dataSource={filterData(products).map((p, i) => ({ ...p, key: p.id || i }))}
                    pagination={{ pageSize: 15, showTotal: (total) => `${total} sản phẩm` }}
                    scroll={{ x: 1100 }}
                    size="small"
                    locale={{ emptyText: <Empty description="Chưa có sản phẩm nào" /> }}
                    summary={(data) => {
                      if (data.length === 0) return null;
                      const totalVal = data.reduce((s, r) => s + (r.quantity || 0) * (r.unit_price || r.unitPrice || 0), 0);
                      const totalQty = data.reduce((s, r) => s + (r.quantity || 0), 0);
                      return (
                        <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                          <Table.Summary.Cell index={0} colSpan={2}>Tổng Cộng</Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="center">{totalQty}</Table.Summary.Cell>
                          <Table.Summary.Cell index={3} />
                          <Table.Summary.Cell index={4} align="right">{totalVal.toLocaleString('vi-VN')}₫</Table.Summary.Cell>
                          <Table.Summary.Cell index={5} colSpan={3} />
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'services',
              label: <span><AppstoreOutlined /> Dịch Vụ <Badge count={services.length} style={{ backgroundColor: '#ff69b4', marginLeft: 4 }} size="small" /></span>,
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <Input placeholder="Tìm dịch vụ..." prefix={<SearchOutlined />}
                      style={{ width: 300 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd('services')}
                      style={{ background: '#ff69b4', borderColor: '#ff69b4' }}>
                      Thêm Dịch Vụ
                    </Button>
                  </div>
                  <Table
                    columns={serviceColumns}
                    dataSource={filterData(services).map((s, i) => ({ ...s, key: s.id || i }))}
                    pagination={{ pageSize: 15, showTotal: (total) => `${total} dịch vụ` }}
                    scroll={{ x: 900 }}
                    size="small"
                    locale={{ emptyText: <Empty description="Chưa có dịch vụ nào" /> }}
                  />
                </div>
              ),
            },
            {
              key: 'packages',
              label: <span><GiftOutlined /> Gói <Badge count={packages.length} style={{ backgroundColor: '#722ed1', marginLeft: 4 }} size="small" /></span>,
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <Input placeholder="Tìm gói..." prefix={<SearchOutlined />}
                      style={{ width: 300 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd('packages')}
                      style={{ background: '#722ed1', borderColor: '#722ed1' }}>
                      Thêm Gói
                    </Button>
                  </div>
                  <Table
                    columns={packageColumns}
                    dataSource={filterData(packages).map((p, i) => ({ ...p, key: p.id || i }))}
                    pagination={{ pageSize: 15, showTotal: (total) => `${total} gói` }}
                    scroll={{ x: 900 }}
                    size="small"
                    locale={{ emptyText: <Empty description="Chưa có gói nào" /> }}
                  />
                </div>
              ),
            },
            {
              key: 'movements',
              label: <span><HistoryOutlined /> Lịch Sử Nhập/Xuất <Badge count={stockMovements.length} style={{ marginLeft: 4 }} size="small" /></span>,
              children: (
                <div>
                  <Table
                    columns={movementColumns}
                    dataSource={stockMovements.map((m, i) => ({ ...m, key: m.id || i }))}
                    pagination={{ pageSize: 20, showTotal: (total) => `${total} lượt` }}
                    scroll={{ x: 1000 }}
                    size="small"
                    locale={{ emptyText: <Empty description="Chưa có lịch sử nhập/xuất" /> }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* ===== ADD/EDIT MODAL ===== */}
      <Modal
        title={`${isEditMode ? 'Chỉnh Sửa' : 'Thêm'} ${typeLabels[selectedType]}`}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        okText={isEditMode ? 'Cập Nhật' : 'Thêm'}
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item label="Tên" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder={`Nhập tên ${typeLabels[selectedType].toLowerCase()}...`} />
          </Form.Item>
          <Form.Item label="Danh Mục" name="category">
            <Input placeholder="VD: Mỹ phẩm, Đồ uống, Chăm sóc da..." />
          </Form.Item>

          {selectedType === 'products' && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Số Lượng Ban Đầu" name="quantity">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Giá Bán (₫)" name="sellPrice" rules={[{ required: true, message: 'Nhập giá bán' }]}>
                    <InputNumber min={0} style={{ width: '100%' }}
                      formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                      parser={(v) => v.replace(/,/g, '')} placeholder="VD: 100,000" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Mức Cảnh Báo Hết Hàng" name="reorderLevel">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="10" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Nhà Cung Cấp" name="supplier">
                    <Input placeholder="Tên NCC..." />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {selectedType === 'services' && (
            <>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Giá (₫)" name="price" rules={[{ required: true, message: 'Nhập giá' }]}>
                    <InputNumber min={0} style={{ width: '100%' }}
                      formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                      parser={(v) => v.replace(/,/g, '')} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Thời Lượng (phút)" name="duration">
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="60" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Hoa Hồng (%)" name="commissionRate">
                    <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} placeholder="10" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Mô Tả" name="description">
                <Input.TextArea rows={2} placeholder="Mô tả dịch vụ..." />
              </Form.Item>
              <Form.Item label="Các Bước Thực Hiện" name="steps">
                <Input.TextArea rows={3} placeholder="Bước 1: ...&#10;Bước 2: ..." />
              </Form.Item>
            </>
          )}

          {selectedType === 'packages' && (
            <>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Giá Gói (₫)" name="price" rules={[{ required: true, message: 'Nhập giá' }]}>
                    <InputNumber min={0} style={{ width: '100%' }}
                      formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                      parser={(v) => v.replace(/,/g, '')} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Số Buổi" name="sessions">
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Thời Hạn (ngày)" name="validityDays">
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="30" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Mô Tả" name="description">
                <Input.TextArea rows={3} placeholder="Mô tả gói..." />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* ===== IMPORT MODAL ===== */}
      <Modal
        title={<span><ImportOutlined style={{ color: '#52c41a' }} /> Nhập Hàng Vào Kho</span>}
        open={isImportModalOpen}
        onOk={() => importForm.submit()}
        onCancel={() => { setIsImportModalOpen(false); importForm.resetFields(); }}
        okText="Xác Nhận Nhập"
        cancelText="Hủy"
        okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
        destroyOnClose
      >
        <Form form={importForm} layout="vertical" onFinish={handleImportStock}>
          <Form.Item label="Sản Phẩm" name="productId" rules={[{ required: true, message: 'Chọn sản phẩm' }]}>
            <Select placeholder="Chọn sản phẩm cần nhập..." showSearch optionFilterProp="label"
              options={products.map(p => ({ label: `${p.name} (Kho: ${p.quantity || 0})`, value: p.id }))} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Số Lượng Nhập" name="quantity" rules={[{ required: true, message: 'Nhập SL' }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập số lượng" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Đơn Giá Nhập (₫)" name="unitCost"
                extra="Nếu nhập sẽ tự ghi vào chi phí">
                <InputNumber min={0} style={{ width: '100%' }}
                  formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(v) => v.replace(/,/g, '')} placeholder="VD: 50,000" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Phương Thức Thanh Toán" name="payment_method" initialValue="cash">
            <Select options={[
              { label: 'Tiền mặt', value: 'cash' },
              { label: 'Chuyển khoản', value: 'transfer' },
              { label: 'Thẻ', value: 'card' },
            ]} />
          </Form.Item>
          <Form.Item label="Ghi Chú" name="notes">
            <Input.TextArea rows={2} placeholder="Ghi chú nhập hàng..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== EXPORT MODAL ===== */}
      <Modal
        title={<span><ExportOutlined style={{ color: '#faad14' }} /> Xuất Kho</span>}
        open={isExportModalOpen}
        onOk={() => exportForm.submit()}
        onCancel={() => { setIsExportModalOpen(false); exportForm.resetFields(); }}
        okText="Xác Nhận Xuất"
        cancelText="Hủy"
        okButtonProps={{ style: { background: '#faad14', borderColor: '#faad14' } }}
        destroyOnClose
      >
        <Form form={exportForm} layout="vertical" onFinish={handleExportStock}>
          <Form.Item label="Sản Phẩm" name="productId" rules={[{ required: true, message: 'Chọn sản phẩm' }]}>
            <Select placeholder="Chọn sản phẩm cần xuất..." showSearch optionFilterProp="label"
              options={products.filter(p => (p.quantity || 0) > 0).map(p => ({
                label: `${p.name} (Kho: ${p.quantity || 0})`, value: p.id,
              }))} />
          </Form.Item>
          <Form.Item label="Số Lượng Xuất" name="quantity" rules={[{ required: true, message: 'Nhập SL' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập số lượng xuất" />
          </Form.Item>
          <Form.Item label="Lý Do Xuất" name="reason">
            <Select placeholder="Chọn lý do..." allowClear options={[
              { label: 'Hư hỏng / Hết hạn', value: 'Hư hỏng / Hết hạn' },
              { label: 'Trả nhà cung cấp', value: 'Trả NCC' },
              { label: 'Sử dụng nội bộ', value: 'Nội bộ' },
              { label: 'Mất mát / Thất thoát', value: 'Thất thoát' },
              { label: 'Khác', value: 'Khác' },
            ]} />
          </Form.Item>
          <Form.Item label="Ghi Chú" name="notes">
            <Input.TextArea rows={2} placeholder="Ghi chú xuất kho..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

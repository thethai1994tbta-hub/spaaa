import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Spin,
  Drawer,
  Space,
  Popconfirm,
  Empty,
  InputNumber,
  Tag,
  Descriptions,
  Tabs,
  Select,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  SearchOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../context/AuthContext';

export default function Inventory() {
  const { invoke } = useAPI();
  const { guardAction } = useAuth();

  // Product states
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Selection states
  const [selectedType, setSelectedType] = useState('products'); // products, services, packages
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Search states
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('products');

  // Forms
  const [form] = Form.useForm();
  const [importForm] = Form.useForm();

  useEffect(() => {
    loadProducts();
    loadServices();
    loadPackages();
  }, []);

  // ============ LOAD DATA ============
  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const result = await invoke('db:inventory:getAll');
      const data = result.data || result || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Inventory] Error:', error);
      message.error('Lỗi tải sản phẩm: ' + error.message);
    } finally {
      setProductsLoading(false);
    }
  };

  const loadServices = async () => {
    setServicesLoading(true);
    try {
      const result = await invoke('db:services:getAll');
      const data = result.data || result || [];
      setServices(Array.isArray(data) ? data.filter(s => s.active !== false) : []);
    } catch (error) {
      console.error('[Services] Error:', error);
      message.error('Lỗi tải dịch vụ: ' + error.message);
    } finally {
      setServicesLoading(false);
    }
  };

  const loadPackages = async () => {
    setPackagesLoading(true);
    try {
      const result = await invoke('db:packages:getAll');
      const data = result.data || result || [];
      setPackages(Array.isArray(data) ? data.filter(p => p.status !== 'inactive') : []);
    } catch (error) {
      console.error('[Packages] Error:', error);
      setPackages([]);
    } finally {
      setPackagesLoading(false);
    }
  };

  // ============ PRODUCT HANDLERS ============
  const handleAddProduct = async (values) => {
    try {
      await invoke('db:inventory:add', {
        name: values.name,
        category: values.category || '',
        quantity: values.quantity || 0,
        unitPrice: Number(values.unitPrice) || 0,
        reorderLevel: values.reorderLevel || 0,
        supplier: values.supplier || '',
      });
      message.success('Thêm sản phẩm thành công');
      form.resetFields();
      setIsModalOpen(false);
      loadProducts();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleUpdateProduct = async (values) => {
    try {
      await invoke('db:inventory:update', selectedItem.id, {
        name: values.name,
        category: values.category || '',
        quantity: values.quantity || 0,
        unitPrice: Number(values.unitPrice) || 0,
        reorderLevel: values.reorderLevel || 0,
        supplier: values.supplier || '',
      });
      message.success('Cập nhật thành công');
      setDetailDrawerOpen(false);
      setIsEditMode(false);
      form.resetFields();
      loadProducts();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await invoke('db:inventory:delete', id);
      message.success('Xóa thành công');
      setDetailDrawerOpen(false);
      loadProducts();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  // ============ IMPORT STOCK ============
  const handleImportStock = async (values) => {
    try {
      const product = products.find(p => p.id === values.productId);
      if (!product) {
        message.error('Không tìm thấy sản phẩm');
        return;
      }
      const newQuantity = (product.quantity || 0) + (values.quantity || 0);
      const totalCost = (Number(values.unitCost) || 0) * (values.quantity || 0);

      await invoke('db:inventory:update', product.id, {
        ...product,
        quantity: newQuantity,
      });

      // Log stock movement
      try {
        await invoke('db:stock-movements:add', {
          itemId: product.id,
          itemName: product.name,
          date: new Date().toISOString(),
          quantity: values.quantity,
          type: 'import',
          unitCost: Number(values.unitCost) || 0,
          totalCost,
          notes: values.notes || `Nhập ${values.quantity} ${product.name}`,
          user: 'Admin',
        });
      } catch {}

      // Ghi chi phí vào báo cáo nếu có nhập giá tiền
      if (totalCost > 0) {
        try {
          await invoke('db:transactions:add', {
            transaction_type: 'expense',
            expense_category: 'supplies',
            expense_category_label: 'Vật Tư / Nguyên Liệu',
            amount: -totalCost,
            notes: `Nhập hàng: ${values.quantity} ${product.name}${values.notes ? ` - ${values.notes}` : ''}`,
            payment_method: values.payment_method || 'cash',
            date: new Date().toISOString(),
          });
        } catch {}
      }

      message.success(`Nhập ${values.quantity} ${product.name} thành công (Tổng kho: ${newQuantity})${totalCost > 0 ? ` | Chi phí: ${totalCost.toLocaleString('vi-VN')}₫` : ''}`);
      importForm.resetFields();
      setIsImportModalOpen(false);
      loadProducts();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  // ============ SERVICE HANDLERS ============
  const handleAddService = async (values) => {
    try {
      await invoke('db:services:add', {
        name: values.name,
        category: values.category || '',
        price: Number(values.price) || 0,
        duration: Number(values.duration) || 60,
        description: values.description || '',
        steps: values.steps || '',
        commissionRate: Number(values.commissionRate) || 0,
      });
      message.success('Thêm dịch vụ thành công');
      form.resetFields();
      setIsModalOpen(false);
      loadServices();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleUpdateService = async (values) => {
    try {
      await invoke('db:services:update', selectedItem.id, {
        name: values.name,
        category: values.category || '',
        price: Number(values.price) || 0,
        duration: Number(values.duration) || 60,
        description: values.description || '',
        steps: values.steps || '',
        commissionRate: Number(values.commissionRate) || 0,
      });
      message.success('Cập nhật thành công');
      setIsEditMode(false);
      form.resetFields();
      setIsModalOpen(false);
      loadServices();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteService = async (id) => {
    try {
      await invoke('db:services:delete', id);
      message.success('Xóa thành công');
      loadServices();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  // ============ PACKAGE HANDLERS ============
  const handleAddPackage = async (values) => {
    try {
      await invoke('db:packages:add', {
        name: values.name,
        category: values.category || '',
        description: values.description || '',
        price: Number(values.price) || 0,
        sessions: Number(values.sessions) || 1,
        validityDays: Number(values.validityDays) || 30,
        services: values.services || [],
      });
      message.success('Thêm gói thành công');
      form.resetFields();
      setIsModalOpen(false);
      loadPackages();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleUpdatePackage = async (values) => {
    try {
      await invoke('db:packages:update', selectedItem.id, {
        name: values.name,
        category: values.category || '',
        description: values.description || '',
        price: Number(values.price) || 0,
        sessions: Number(values.sessions) || 1,
        validityDays: Number(values.validityDays) || 30,
        services: values.services || [],
      });
      message.success('Cập nhật thành công');
      setIsEditMode(false);
      form.resetFields();
      setIsModalOpen(false);
      loadPackages();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleDeletePackage = async (id) => {
    try {
      await invoke('db:packages:delete', id);
      message.success('Xóa thành công');
      loadPackages();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  // ============ COMPUTED ============
  const getFilteredData = () => {
    const data = activeTab === 'products' ? products : activeTab === 'services' ? services : packages;
    return data.filter((item) =>
      (item.name?.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.category?.toLowerCase().includes(searchText.toLowerCase()))
    );
  };

  // ============ COLUMNS ============
  const productColumns = [
    {
      title: 'Tên Sản Phẩm',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Danh Mục',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (qty) => qty || 0,
    },
    {
      title: 'Giá/Cái',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (price) => `${Number(price || 0).toLocaleString('vi-VN')} ₫`,
    },
    {
      title: 'Mục Tái Đặt',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      width: 100,
      render: (level) => level || 0,
    },
    {
      title: 'Nhà Cung Cấp',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 120,
    },
    {
      title: 'Giá Trị',
      key: 'value',
      width: 130,
      render: (_, record) => {
        const value = (record.quantity || 0) * (record.unitPrice || 0);
        return `${Number(value).toLocaleString('vi-VN')} ₫`;
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedItem(record);
              setSelectedType('products');
              setIsEditMode(true);
              setIsModalOpen(true);
              form.setFieldsValue(record);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa sản phẩm"
            description="Bạn có chắc chắn?"
            onConfirm={guardAction(() => handleDeleteProduct(record.id))}
            okText="Có"
            cancelText="Không"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const serviceColumns = [
    {
      title: 'Tên Dịch Vụ',
      dataIndex: 'name',
      key: 'name',
      width: 160,
    },
    {
      title: 'Danh Mục',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price) => `${Number(price || 0).toLocaleString('vi-VN')} ₫`,
    },
    {
      title: 'Thời Lượng',
      dataIndex: 'duration',
      key: 'duration',
      width: 110,
      render: (v) => `${v || 60} phút`,
    },
    {
      title: 'Hoa Hồng (%)',
      dataIndex: 'commissionRate',
      key: 'commissionRate',
      width: 110,
      render: (v) => `${v || 0}%`,
    },
    {
      title: 'Mô Tả',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-',
      ellipsis: true,
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedItem(record);
              setSelectedType('services');
              setIsEditMode(true);
              setIsModalOpen(true);
              form.setFieldsValue(record);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa dịch vụ"
            description="Bạn có chắc chắn?"
            onConfirm={guardAction(() => handleDeleteService(record.id))}
            okText="Có"
            cancelText="Không"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const packageColumns = [
    {
      title: 'Tên Gói Liệu Trình',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: 'Danh Mục',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Số Buổi',
      dataIndex: 'sessions',
      key: 'sessions',
      width: 90,
      render: (v) => `${v || 1} buổi`,
    },
    {
      title: 'Thời Hạn',
      dataIndex: 'validityDays',
      key: 'validityDays',
      width: 100,
      render: (v) => `${v || 30} ngày`,
    },
    {
      title: 'Giá Gói',
      dataIndex: 'price',
      key: 'price',
      width: 130,
      render: (price) => `${Number(price || 0).toLocaleString('vi-VN')} ₫`,
    },
    {
      title: 'Mô Tả',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-',
      ellipsis: true,
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedItem(record);
              setSelectedType('packages');
              setIsEditMode(true);
              setIsModalOpen(true);
              form.setFieldsValue(record);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa gói"
            description="Bạn có chắc chắn?"
            onConfirm={guardAction(() => handleDeletePackage(record.id))}
            okText="Có"
            cancelText="Không"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ============ RENDER ============
  return (
    <Card title="Quản Lý Kho">
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setSearchText('');
        }}
        items={[
          {
            key: 'products',
            label: 'Sản Phẩm',
            children: (
              <div>
                <div
                  style={{
                    marginBottom: 16,
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'space-between',
                  }}
                >
                  <Input
                    placeholder="Tìm kiếm sản phẩm..."
                    prefix={<SearchOutlined />}
                    style={{ width: 300 }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  <Space>
                    <Button
                      icon={<ImportOutlined />}
                      onClick={() => {
                        importForm.resetFields();
                        setIsImportModalOpen(true);
                      }}
                      style={{ borderColor: '#52c41a', color: '#52c41a' }}
                    >
                      Nhập Hàng
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setSelectedType('products');
                        setIsEditMode(false);
                        form.resetFields();
                        setIsModalOpen(true);
                      }}
                      style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
                    >
                      Thêm Sản Phẩm
                    </Button>
                  </Space>
                </div>
                <Spin spinning={productsLoading}>
                  {getFilteredData().length === 0 ? (
                    <Empty description="Không có sản phẩm" />
                  ) : (
                    <Table
                      columns={productColumns}
                      dataSource={getFilteredData().map((p, i) => ({
                        ...p,
                        key: p.id || i,
                      }))}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1200 }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },
          {
            key: 'services',
            label: 'Dịch Vụ',
            children: (
              <div>
                <div
                  style={{
                    marginBottom: 16,
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'space-between',
                  }}
                >
                  <Input
                    placeholder="Tìm kiếm dịch vụ..."
                    prefix={<SearchOutlined />}
                    style={{ width: 300 }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedType('services');
                      setIsEditMode(false);
                      form.resetFields();
                      setIsModalOpen(true);
                    }}
                    style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
                  >
                    Thêm Dịch Vụ
                  </Button>
                </div>
                <Spin spinning={servicesLoading}>
                  {getFilteredData().length === 0 ? (
                    <Empty description="Không có dịch vụ" />
                  ) : (
                    <Table
                      columns={serviceColumns}
                      dataSource={getFilteredData().map((s, i) => ({
                        ...s,
                        key: s.id || i,
                      }))}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1200 }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },
          {
            key: 'packages',
            label: 'Gói',
            children: (
              <div>
                <div
                  style={{
                    marginBottom: 16,
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'space-between',
                  }}
                >
                  <Input
                    placeholder="Tìm kiếm gói..."
                    prefix={<SearchOutlined />}
                    style={{ width: 300 }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedType('packages');
                      setIsEditMode(false);
                      form.resetFields();
                      setIsModalOpen(true);
                    }}
                    style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
                  >
                    Thêm Gói
                  </Button>
                </div>
                <Spin spinning={packagesLoading}>
                  {getFilteredData().length === 0 ? (
                    <Empty description="Không có gói" />
                  ) : (
                    <Table
                      columns={packageColumns}
                      dataSource={getFilteredData().map((pkg, i) => ({
                        ...pkg,
                        key: pkg.id || i,
                      }))}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1200 }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },
        ]}
      />

      {/* Add/Edit Modal */}
      <Modal
        title={
          isEditMode
            ? `Chỉnh Sửa ${
                selectedType === 'products'
                  ? 'Sản Phẩm'
                  : selectedType === 'services'
                  ? 'Dịch Vụ'
                  : 'Gói'
              }`
            : `Thêm ${
                selectedType === 'products'
                  ? 'Sản Phẩm'
                  : selectedType === 'services'
                  ? 'Dịch Vụ'
                  : 'Gói'
              } Mới`
        }
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText={isEditMode ? 'Cập Nhật' : 'Thêm'}
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={
            selectedType === 'products'
              ? isEditMode
                ? guardAction(handleUpdateProduct)
                : handleAddProduct
              : selectedType === 'services'
              ? isEditMode
                ? guardAction(handleUpdateService)
                : handleAddService
              : isEditMode
              ? guardAction(handleUpdatePackage)
              : handleAddPackage
          }
        >
          <Form.Item
            label={selectedType === 'services' ? 'Tên Dịch Vụ' : 'Tên'}
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Danh Mục" name="category">
            <Input />
          </Form.Item>

          {selectedType === 'products' && (
            <>
              <Form.Item label="Số Lượng" name="quantity">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Giá/Cái (₫)" name="unitPrice">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Mục Tái Đặt" name="reorderLevel">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Nhà Cung Cấp" name="supplier">
                <Input />
              </Form.Item>
            </>
          )}

          {selectedType === 'services' && (
            <>
              <Form.Item label="Giá (₫)" name="price">
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(v) => v.replace(/,/g, '')}
                />
              </Form.Item>
              <Form.Item label="Thời Lượng (phút)" name="duration">
                <InputNumber min={1} style={{ width: '100%' }} placeholder="60" />
              </Form.Item>
              <Form.Item label="Tỷ Lệ Hoa Hồng (%)" name="commissionRate">
                <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
              <Form.Item label="Mô Tả" name="description">
                <Input.TextArea rows={2} placeholder="Mô tả dịch vụ..." />
              </Form.Item>
              <Form.Item label="Các Bước Thực Hiện" name="steps">
                <Input.TextArea rows={3} placeholder="Bước 1: ...&#10;Bước 2: ...&#10;Bước 3: ..." />
              </Form.Item>
            </>
          )}

          {selectedType === 'packages' && (
            <>
              <Form.Item label="Số Buổi" name="sessions">
                <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập số buổi" />
              </Form.Item>
              <Form.Item label="Thời Hạn (ngày)" name="validityDays">
                <InputNumber min={1} style={{ width: '100%' }} placeholder="30" />
              </Form.Item>
              <Form.Item label="Giá Gói (₫)" name="price">
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(v) => v.replace(/,/g, '')}
                />
              </Form.Item>
              <Form.Item label="Mô Tả" name="description">
                <Input.TextArea rows={3} placeholder="Mô tả nội dung gói liệu trình..." />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Import Stock Modal */}
      <Modal
        title="Nhập Hàng"
        open={isImportModalOpen}
        onOk={() => importForm.submit()}
        onCancel={() => {
          setIsImportModalOpen(false);
          importForm.resetFields();
        }}
        okText="Nhập Hàng"
        cancelText="Hủy"
        okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
      >
        <Form
          form={importForm}
          layout="vertical"
          onFinish={handleImportStock}
        >
          <Form.Item
            label="Sản Phẩm"
            name="productId"
            rules={[{ required: true, message: 'Vui lòng chọn sản phẩm' }]}
          >
            <Select
              placeholder="Chọn sản phẩm cần nhập"
              showSearch
              optionFilterProp="label"
              options={products.map(p => ({
                label: `${p.name} (Kho: ${p.quantity || 0})`,
                value: p.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="Số Lượng Nhập"
            name="quantity"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập số lượng" />
          </Form.Item>
          <Form.Item
            label="Đơn Giá Nhập (₫)"
            name="unitCost"
            extra="Không bắt buộc. Nếu nhập sẽ tự ghi vào báo cáo chi phí."
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={(v) => v.replace(/,/g, '')}
              placeholder="Ví dụ: 50,000"
            />
          </Form.Item>
          <Form.Item label="Phương Thức Thanh Toán" name="payment_method" initialValue="cash">
            <Select
              options={[
                { label: 'Tiền mặt', value: 'cash' },
                { label: 'Chuyển khoản', value: 'transfer' },
                { label: 'Thẻ', value: 'card' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Ghi Chú"
            name="notes"
          >
            <Input.TextArea rows={2} placeholder="Ghi chú nhập hàng..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

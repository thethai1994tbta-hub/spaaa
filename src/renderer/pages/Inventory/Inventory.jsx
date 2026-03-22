import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Spin, Drawer, Space, Popconfirm, Empty, InputNumber, Tag, Descriptions, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, SearchOutlined, AlertOutlined } from '@ant-design/icons';
import { useAPI } from '../../hooks/useAPI';

export default function Inventory() {
  const { invoke } = useAPI();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [stockMovements, setStockMovements] = useState([]);
  const [form] = Form.useForm();
  const [stockInForm] = Form.useForm();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const result = await invoke('db:inventory:getAll');
      const data = result.data || result || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Inventory] Error:', error);
      message.error('Lỗi tải kho: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStockMovements = async (itemId) => {
    try {
      const result = await invoke('db:query', 'STOCK_MOVEMENTS', [
        { field: 'itemId', operator: '==', value: itemId }
      ]);
      setStockMovements((result.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error('[Inventory] Error loading movements:', error);
      setStockMovements([]);
    }
  };

  const handleAddItem = async (values) => {
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
      loadItems();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleUpdateItem = async (values) => {
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
      loadItems();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await invoke('db:inventory:delete', id);
      message.success('Xóa thành công');
      setDetailDrawerOpen(false);
      loadItems();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleStockIn = async (values) => {
    try {
      const newQuantity = (selectedItem.quantity || 0) + (values.quantity || 0);
      const now = new Date();

      // Update quantity
      await invoke('db:inventory:update', selectedItem.id, {
        name: selectedItem.name,
        category: selectedItem.category || '',
        quantity: newQuantity,
        unitPrice: selectedItem.unitPrice || 0,
        reorderLevel: selectedItem.reorderLevel || 0,
        supplier: selectedItem.supplier || '',
      });

      // Log movement
      const movementDoc = {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        date: now.toISOString(),
        quantity: values.quantity,
        notes: values.notes || '',
        type: 'import',
        user: 'Hệ Thống',
      };

      try {
        await invoke('db:stock-movements:add', movementDoc);
      } catch (e) {
        console.log('Stock movement log:', e.message);
      }

      message.success(`Nhập hàng thành công! SL mới: ${newQuantity}`);
      stockInForm.resetFields();
      setIsStockInModalOpen(false);
      loadItems();
      loadStockMovements(selectedItem.id);
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      message.warning('Không có dữ liệu');
      return;
    }

    const headers = ['Tên', 'Danh Mục', 'Số Lượng', 'Giá/Cái', 'Mức Tái Đặt', 'Nhà Cung Cấp', 'Giá Trị'];
    const rows = items.map(item => [
      item.name || '',
      item.category || '',
      item.quantity || 0,
      item.unitPrice || 0,
      item.reorderLevel || 0,
      item.supplier || '',
      ((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('vi-VN'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `kho-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Xuất dữ liệu thành công');
  };

  const isLowStock = (item) => item.quantity < item.reorderLevel;

  const openItemDetail = (item) => {
    setSelectedItem(item);
    setIsEditMode(false);
    setDetailDrawerOpen(true);
    form.setFieldsValue(item);
    loadStockMovements(item.id);
  };

  const filteredItems = items.filter(item =>
    (item.name?.toLowerCase().includes(searchText.toLowerCase())) ||
    (item.category?.toLowerCase().includes(searchText.toLowerCase())) ||
    (item.supplier?.toLowerCase().includes(searchText.toLowerCase()))
  );

  const columns = [
    {
      title: 'Tên Sản Phẩm',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text, record) => (
        <div>
          {text}
          {isLowStock(record) && <Tag color="red" style={{ marginLeft: 8 }}>Tồn Thấp</Tag>}
        </div>
      ),
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
    },
    {
      title: 'Giá/Cái',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 110,
      render: (price) => price ? `${Number(price).toLocaleString('vi-VN')} ₫` : '0 ₫',
    },
    {
      title: 'Mức Tái Đặt',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      width: 100,
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
      width: 120,
      render: (_, record) => {
        const value = (record.quantity || 0) * (record.unitPrice || 0);
        return `${value.toLocaleString('vi-VN')} ₫`;
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => openItemDetail(record)}
            style={{ color: '#ff69b4' }}
          >
            Chi Tiết
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedItem(record);
              setIsEditMode(true);
              setDetailDrawerOpen(true);
              form.setFieldsValue(record);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa?"
            description="Xác nhận xóa sản phẩm này?"
            onConfirm={() => handleDeleteItem(record.id)}
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

  return (
    <Card
      title="Quản Lý Kho"
      extra={
        <Space>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
            Xuất CSV
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setIsEditMode(false);
              form.resetFields();
              setIsModalOpen(true);
            }}
            style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
          >
            Thêm
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {filteredItems.length === 0 ? (
          <Empty description="Không có sản phẩm" style={{ marginTop: 50 }} />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredItems.map((item, i) => ({ ...item, key: item.id || i }))}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
          />
        )}
      </Spin>

      <Modal
        title={isEditMode ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={isEditMode ? 'Cập Nhật' : 'Thêm'}
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={isEditMode ? handleUpdateItem : handleAddItem}
        >
          <Form.Item
            label="Tên"
            name="name"
            rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Danh Mục" name="category">
            <Input />
          </Form.Item>
          <Form.Item
            label="Số Lượng"
            name="quantity"
            rules={[{ required: true, message: 'Nhập số lượng' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Giá/Cái (₫)"
            name="unitPrice"
            rules={[{ required: true, message: 'Nhập giá' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Mức Tái Đặt"
            name="reorderLevel"
            rules={[{ required: true, message: 'Nhập mức tái đặt' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Nhà Cung Cấp" name="supplier">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={selectedItem?.name}
        placement="right"
        width={600}
        onClose={() => {
          setDetailDrawerOpen(false);
          setIsEditMode(false);
          form.resetFields();
        }}
        open={detailDrawerOpen}
        extra={
          <Space>
            {!isEditMode && (
              <>
                <Button
                  onClick={() => setIsStockInModalOpen(true)}
                  style={{ color: '#ff69b4', borderColor: '#ff69b4' }}
                >
                  Nhập Hàng
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setIsEditMode(true)}
                  style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
                >
                  Sửa
                </Button>
              </>
            )}
            {isEditMode && (
              <>
                <Button onClick={() => setIsEditMode(false)}>Hủy</Button>
                <Button
                  type="primary"
                  onClick={() => form.submit()}
                  style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
                >
                  Lưu
                </Button>
              </>
            )}
          </Space>
        }
      >
        {isEditMode ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdateItem}
          >
            <Form.Item
              label="Tên"
              name="name"
              rules={[{ required: true, message: 'Nhập tên' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Danh Mục" name="category">
              <Input />
            </Form.Item>
            <Form.Item label="Số Lượng" name="quantity">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Giá/Cái (₫)" name="unitPrice">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Mức Tái Đặt" name="reorderLevel">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Nhà Cung Cấp" name="supplier">
              <Input />
            </Form.Item>
          </Form>
        ) : (
          selectedItem && (
            <Tabs
              items={[
                {
                  key: 'info',
                  label: 'Thông Tin',
                  children: (
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="Tên">{selectedItem.name}</Descriptions.Item>
                      <Descriptions.Item label="Danh Mục">{selectedItem.category || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Số Lượng">{selectedItem.quantity || 0}</Descriptions.Item>
                      <Descriptions.Item label="Mức Tái Đặt">{selectedItem.reorderLevel || 0}</Descriptions.Item>
                      <Descriptions.Item label="Giá/Cái">
                        {selectedItem.unitPrice ? `${Number(selectedItem.unitPrice).toLocaleString('vi-VN')} ₫` : '0 ₫'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Nhà Cung Cấp">{selectedItem.supplier || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Giá Trị Tồn Kho">
                        <strong>{((selectedItem.quantity || 0) * (selectedItem.unitPrice || 0)).toLocaleString('vi-VN')} ₫</strong>
                      </Descriptions.Item>
                      {isLowStock(selectedItem) && (
                        <Descriptions.Item label="Trạng Thái">
                          <Tag color="red">Tồn Thấp</Tag>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  ),
                },
                {
                  key: 'history',
                  label: 'Lịch Sử Nhập',
                  children: (
                    <Table
                      columns={[
                        {
                          title: 'Ngày Giờ',
                          dataIndex: 'date',
                          key: 'date',
                          width: 180,
                          render: (date) => date ? new Date(date).toLocaleString('vi-VN') : '-',
                        },
                        {
                          title: 'SL Nhập',
                          dataIndex: 'quantity',
                          key: 'quantity',
                          width: 80,
                        },
                        {
                          title: 'Ghi Chú',
                          dataIndex: 'notes',
                          key: 'notes',
                          render: (notes) => notes || '-',
                        },
                      ]}
                      dataSource={stockMovements.map((m, i) => ({ ...m, key: m.id || i }))}
                      pagination={false}
                      size="small"
                      locale={{ emptyText: 'Không có lịch sử' }}
                    />
                  ),
                },
              ]}
            />
          )
        )}
      </Drawer>

      <Modal
        title={`Nhập Hàng - ${selectedItem?.name}`}
        open={isStockInModalOpen}
        onCancel={() => {
          setIsStockInModalOpen(false);
          stockInForm.resetFields();
        }}
        onOk={() => stockInForm.submit()}
        okText="Nhập"
        cancelText="Hủy"
      >
        <Form
          form={stockInForm}
          layout="vertical"
          onFinish={handleStockIn}
        >
          <Form.Item
            label="Số Lượng Nhập"
            name="quantity"
            rules={[{ required: true, message: 'Nhập số lượng' }]}
          >
            <InputNumber min={1} placeholder="Số lượng" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Ghi Chú (Mã HĐ, Ngày, v.v)"
            name="notes"
          >
            <Input.TextArea rows={3} placeholder="Ghi chú nhập hàng" />
          </Form.Item>
          {selectedItem && (
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
              <p><strong>Tên:</strong> {selectedItem.name}</p>
              <p><strong>SL Hiện Tại:</strong> {selectedItem.quantity || 0}</p>
              <p><strong>Giá/Cái:</strong> {selectedItem.unitPrice ? `${Number(selectedItem.unitPrice).toLocaleString('vi-VN')} ₫` : '0 ₫'}</p>
            </div>
          )}
        </Form>
      </Modal>
    </Card>
  );
}

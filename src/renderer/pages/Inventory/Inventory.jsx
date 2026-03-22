import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Spin, Drawer, Tabs, Descriptions, Space, Popconfirm, Empty, InputNumber, Tag } from 'antd';
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
  const [form] = Form.useForm();

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const result = await invoke('db:inventory:getAll');
      console.log('[Inventory] Loaded data:', result);
      const data = result.data || result || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Inventory] Error:', error);
      message.error('Lỗi tải dữ liệu kho: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (values) => {
    try {
      await invoke('db:inventory:add', values);
      message.success('Thêm sản phẩm thành công');
      form.resetFields();
      setIsModalOpen(false);
      loadInventory();
    } catch (error) {
      message.error('Lỗi thêm sản phẩm: ' + error.message);
    }
  };

  const handleEditItem = async (values) => {
    try {
      await invoke('db:inventory:update', selectedItem.id, values);
      message.success('Cập nhật sản phẩm thành công');
      form.resetFields();
      setDetailDrawerOpen(false);
      setIsEditMode(false);
      loadInventory();
    } catch (error) {
      message.error('Lỗi cập nhật sản phẩm: ' + error.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await invoke('db:inventory:delete', itemId);
      message.success('Xóa sản phẩm thành công');
      setDetailDrawerOpen(false);
      loadInventory();
    } catch (error) {
      message.error('Lỗi xóa sản phẩm: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      message.warning('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['Tên Sản Phẩm', 'Danh Mục', 'Số Lượng', 'Giá Mỗi Cái', 'Mức Tái Đặt', 'Nhà Cung Cấp', 'Giá Trị Tồn Kho'];
    const rows = items.map(item => [
      item.name || '',
      item.category || '',
      item.quantity || 0,
      item.unitPrice || 0,
      item.reorderLevel || 0,
      item.supplier || '',
      (item.quantity || 0) * (item.unitPrice || 0),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kho-hang-${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Xuất dữ liệu thành công');
  };

  const handleViewItem = (item) => {
    setSelectedItem(item);
    setDetailDrawerOpen(true);
    setIsEditMode(false);
    form.setFieldsValue(item);
  };

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.supplier?.toLowerCase().includes(searchText.toLowerCase())
  );

  const isLowStock = (item) => item.quantity < item.reorderLevel;

  const columns = [
    {
      title: 'Tên Sản Phẩm',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text, record) => (
        <span>
          {text}
          {isLowStock(record) && (
            <Tag icon={<AlertOutlined />} color="red" style={{ marginLeft: '8px' }}>
              Tồn Thấp
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Danh Mục',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (text) => text || 0,
    },
    {
      title: 'Mức Tái Đặt',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      width: 100,
      render: (text) => text || 0,
    },
    {
      title: 'Giá/Cái',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (text) => text ? `${text.toLocaleString('vi-VN')} ₫` : '-',
    },
    {
      title: 'Nhà Cung Cấp',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Giá Trị TK',
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
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            style={{ color: '#ff69b4' }}
            onClick={() => handleViewItem(record)}
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
            title="Xóa sản phẩm"
            description="Bạn có chắc chắn muốn xóa sản phẩm này?"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Quản Lý Kho Hàng"
      extra={
        <Space>
          <Input
            placeholder="Tìm kiếm theo tên, danh mục, nhà cung cấp..."
            prefix={<SearchOutlined />}
            style={{ width: 350 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportCSV}
          >
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
            Thêm Sản Phẩm
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {filteredItems.length === 0 ? (
          <Empty description="Không có sản phẩm" style={{ marginTop: '50px' }} />
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
        title={isEditMode ? "Chỉnh Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText={isEditMode ? "Cập Nhật" : "Thêm"}
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={isEditMode ? handleEditItem : handleAddItem}
        >
          <Form.Item
            label="Tên Sản Phẩm"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
          >
            <Input placeholder="Nhập tên sản phẩm" />
          </Form.Item>

          <Form.Item
            label="Danh Mục"
            name="category"
          >
            <Input placeholder="Ví dụ: Mỹ phẩm, Dụng cụ, v.v" />
          </Form.Item>

          <Form.Item
            label="Số Lượng"
            name="quantity"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
          >
            <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Giá Mỗi Cái (₫)"
            name="unitPrice"
            rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
          >
            <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Mức Tái Đặt (Cảnh báo khi dưới)"
            name="reorderLevel"
            rules={[{ required: true, message: 'Vui lòng nhập mức tái đặt' }]}
          >
            <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Nhà Cung Cấp"
            name="supplier"
          >
            <Input placeholder="Nhập tên nhà cung cấp" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={selectedItem ? `${selectedItem.name}` : 'Chi Tiết Sản Phẩm'}
        placement="right"
        onClose={() => {
          setDetailDrawerOpen(false);
          setIsEditMode(false);
          form.resetFields();
        }}
        open={detailDrawerOpen}
        width={600}
        extra={
          <Space>
            {!isEditMode && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setIsEditMode(true)}
                style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
              >
                Sửa
              </Button>
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
        <Spin spinning={false}>
          {selectedItem && (
            <Tabs
              items={[
                {
                  key: 'info',
                  label: 'Thông Tin',
                  children: isEditMode ? (
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={handleEditItem}
                    >
                      <Form.Item
                        label="Tên Sản Phẩm"
                        name="name"
                        rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item label="Danh Mục" name="category">
                        <Input />
                      </Form.Item>
                      <Form.Item label="Số Lượng" name="quantity">
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="Giá Mỗi Cái (₫)" name="unitPrice">
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
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="Tên Sản Phẩm">
                        {selectedItem.name}
                      </Descriptions.Item>
                      <Descriptions.Item label="Danh Mục">
                        {selectedItem.category || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Số Lượng">
                        {selectedItem.quantity || 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="Mức Tái Đặt">
                        {selectedItem.reorderLevel || 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="Giá Mỗi Cái">
                        {selectedItem.unitPrice ? `${selectedItem.unitPrice.toLocaleString('vi-VN')} ₫` : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Nhà Cung Cấp">
                        {selectedItem.supplier || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Giá Trị Tồn Kho">
                        <strong>{((selectedItem.quantity || 0) * (selectedItem.unitPrice || 0)).toLocaleString('vi-VN')} ₫</strong>
                      </Descriptions.Item>
                      {isLowStock(selectedItem) && (
                        <Descriptions.Item label="Trạng Thái">
                          <Tag icon={<AlertOutlined />} color="red">Tồn Kho Thấp</Tag>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  ),
                },
              ]}
            />
          )}
        </Spin>
      </Drawer>
    </Card>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Spin, Drawer, Tabs, Descriptions } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAPI } from '../../hooks/useAPI';

export default function Customers() {
  const { invoke } = useAPI();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const result = await invoke('db:customers:getAll');
      console.log('[Customers] Loaded data:', result);
      const data = result.data || result || [];
      console.log('[Customers] Final data:', data);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Customers] Error:', error);
      message.error('Lỗi tải khách hàng: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (values) => {
    try {
      await invoke('db:customers:add', values);
      message.success('Thêm khách hàng thành công');
      form.resetFields();
      setIsModalOpen(false);
      loadCustomers();
    } catch (error) {
      message.error('Lỗi thêm khách hàng: ' + error.message);
    }
  };

  const loadCustomerDetails = async (customerId) => {
    setDetailLoading(true);
    try {
      const bookingsResult = await invoke('db:query', 'BOOKINGS', [
        { field: 'customerId', operator: '==', value: customerId }
      ]);
      const transactionsResult = await invoke('db:query', 'TRANSACTIONS', [
        { field: 'customerId', operator: '==', value: customerId }
      ]);

      setCustomerBookings(bookingsResult.data || []);
      setCustomerTransactions(transactionsResult.data || []);
    } catch (error) {
      console.error('[Customers] Error loading details:', error);
      message.error('Lỗi tải chi tiết khách hàng: ' + error.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setDetailDrawerOpen(true);
    loadCustomerDetails(customer.id);
  };

  const columns = [
    {
      title: 'Họ Tên',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Điện Thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Địa Chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 200,
      render: (text) => text || '-',
    },
    {
      title: 'Điểm',
      dataIndex: 'points',
      key: 'points',
      width: 80,
      render: (text) => text || 0,
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          style={{ color: '#ff69b4' }}
          onClick={() => handleViewCustomer(record)}
        >
          Chi Tiết
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Quản Lý Khách Hàng"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
          style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
        >
          Thêm Khách Hàng
        </Button>
      }
    >
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={customers.map((c, i) => ({ ...c, key: c.id || i }))}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Spin>

      <Modal
        title="Thêm Khách Hàng Mới"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText="Thêm"
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddCustomer}
        >
          <Form.Item
            label="Họ Tên"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nhập họ tên khách hàng" />
          </Form.Item>

          <Form.Item
            label="Điện Thoại"
            name="phone"
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { type: 'email', message: 'Email không hợp lệ' }
            ]}
          >
            <Input placeholder="Nhập email" />
          </Form.Item>

          <Form.Item
            label="Địa Chỉ"
            name="address"
          >
            <Input placeholder="Nhập địa chỉ" />
          </Form.Item>

          <Form.Item
            label="Ghi Chú"
            name="notes"
          >
            <Input.TextArea placeholder="Nhập ghi chú" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={selectedCustomer ? `${selectedCustomer.name}` : 'Chi Tiết Khách Hàng'}
        placement="right"
        onClose={() => setDetailDrawerOpen(false)}
        open={detailDrawerOpen}
        width={600}
      >
        <Spin spinning={detailLoading}>
          {selectedCustomer && (
            <Tabs
              items={[
                {
                  key: 'info',
                  label: 'Thông Tin',
                  children: (
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="Họ Tên">
                        {selectedCustomer.name}
                      </Descriptions.Item>
                      <Descriptions.Item label="Điện Thoại">
                        {selectedCustomer.phone || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Email">
                        {selectedCustomer.email || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Địa Chỉ">
                        {selectedCustomer.address || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Điểm">
                        {selectedCustomer.points || 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ghi Chú">
                        {selectedCustomer.notes || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: 'bookings',
                  label: 'Lịch Sử Đặt Lịch',
                  children: (
                    <Table
                      columns={[
                        {
                          title: 'Ngày',
                          dataIndex: 'date',
                          key: 'date',
                          render: (text) => text || '-',
                        },
                        {
                          title: 'Dịch Vụ',
                          dataIndex: 'service',
                          key: 'service',
                          render: (text) => text || '-',
                        },
                        {
                          title: 'Trạng Thái',
                          dataIndex: 'status',
                          key: 'status',
                          render: (status) => {
                            const colors = { completed: '#52c41a', pending: '#faad14', cancelled: '#f5222d' };
                            return <span style={{ color: colors[status] || '#666' }}>{status || '-'}</span>;
                          },
                        },
                      ]}
                      dataSource={customerBookings.map((b, i) => ({ ...b, key: b.id || i }))}
                      pagination={false}
                      size="small"
                    />
                  ),
                },
                {
                  key: 'transactions',
                  label: 'Lịch Sử Thanh Toán',
                  children: (
                    <Table
                      columns={[
                        {
                          title: 'Ngày',
                          dataIndex: 'date',
                          key: 'date',
                          render: (text) => text || '-',
                        },
                        {
                          title: 'Loại',
                          dataIndex: 'type',
                          key: 'type',
                          render: (text) => text || '-',
                        },
                        {
                          title: 'Số Tiền',
                          dataIndex: 'amount',
                          key: 'amount',
                          render: (text) => text ? `${text.toLocaleString('vi-VN')} ₫` : '-',
                        },
                        {
                          title: 'Phương Thức',
                          dataIndex: 'method',
                          key: 'method',
                          render: (text) => text || '-',
                        },
                      ]}
                      dataSource={customerTransactions.map((t, i) => ({ ...t, key: t.id || i }))}
                      pagination={false}
                      size="small"
                    />
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

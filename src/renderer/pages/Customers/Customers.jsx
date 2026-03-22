import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Spin, Drawer, Tabs, Descriptions, Space, Popconfirm, Empty, Select, DatePicker, Tag } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { PlusOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, SearchOutlined, CalendarOutlined } from '@ant-design/icons';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

export default function Customers() {
  const { invoke } = useAPI();
  const { guardAction } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isBookingEditMode, setIsBookingEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [bookingSearchText, setBookingSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('customers');
  const [form] = Form.useForm();
  const [bookingForm] = Form.useForm();

  useEffect(() => {
    loadCustomers();
    loadStaffList();
    loadServicesList();
    if (activeTab === 'bookings') {
      loadBookings();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadBookings();
    }
  }, [activeTab]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const result = await invoke('db:customers:getAll');
      const data = result.data || result || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Customers] Error:', error);
      message.error('Lỗi tải khách hàng: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const result = await invoke('db:bookings:getAll');
      const data = result.data || result || [];
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Bookings] Error:', error);
      message.error('Lỗi tải đặt lịch: ' + error.message);
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadStaffList = async () => {
    try {
      const result = await invoke('db:staff:getAll');
      const data = result.data || result || [];
      setStaffList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Customers] Error loading staff:', error);
    }
  };

  const loadServicesList = async () => {
    try {
      const result = await invoke('db:services:getAll');
      const data = result.data || result || [];
      setServicesList(Array.isArray(data) ? data.filter(s => s.active !== false) : []);
    } catch (error) {
      console.error('[Customers] Error loading services:', error);
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
      const bookingsResult = await invoke('db:query', 'bookings', [
        { field: 'customerId', operator: '==', value: customerId }
      ]);
      const transactionsResult = await invoke('db:query', 'transactions', [
        { field: 'customerId', operator: '==', value: customerId }
      ]);

      setCustomerBookings(bookingsResult.data || bookingsResult || []);
      setCustomerTransactions(transactionsResult.data || transactionsResult || []);
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
    setIsEditMode(false);
    loadCustomerDetails(customer.id);
    form.setFieldsValue(customer);
  };

  const handleEditCustomer = async (values) => {
    try {
      await invoke('db:customers:update', selectedCustomer.id, values);
      message.success('Cập nhật khách hàng thành công');
      form.resetFields();
      setDetailDrawerOpen(false);
      setIsEditMode(false);
      loadCustomers();
    } catch (error) {
      message.error('Lỗi cập nhật khách hàng: ' + error.message);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      await invoke('db:customers:delete', customerId);
      message.success('Xóa khách hàng thành công');
      setDetailDrawerOpen(false);
      loadCustomers();
    } catch (error) {
      message.error('Lỗi xóa khách hàng: ' + error.message);
    }
  };

  const handleAddBooking = async (values) => {
    try {
      const customer = customers.find(c => c.id === values.customer_id);
      const staff = staffList.find(s => s.id === values.staff_id);
      const service = servicesList.find(s => s.id === values.service_id);
      await invoke('db:bookings:add', {
        customer_id: values.customer_id,
        customer_name: customer?.name || '',
        staff_id: values.staff_id || '',
        staff_name: staff?.name || '',
        service_id: values.service_id || '',
        service_name: service?.name || '',
        booking_date: dayjs(values.booking_date).toISOString(),
        status: values.status || 'pending',
        notes: values.notes || '',
      });
      message.success('Thêm đặt lịch thành công');
      bookingForm.resetFields();
      setIsBookingModalOpen(false);
      loadBookings();
    } catch (error) {
      message.error('Lỗi thêm đặt lịch: ' + error.message);
    }
  };

  const handleEditBooking = async (values) => {
    try {
      const customer = customers.find(c => c.id === values.customer_id);
      const staff = staffList.find(s => s.id === values.staff_id);
      const service = servicesList.find(s => s.id === values.service_id);
      await invoke('db:bookings:update', selectedBooking.id, {
        customer_id: values.customer_id,
        customer_name: customer?.name || '',
        staff_id: values.staff_id || '',
        staff_name: staff?.name || '',
        service_id: values.service_id || '',
        service_name: service?.name || '',
        booking_date: dayjs(values.booking_date).toISOString(),
        status: values.status || 'pending',
        notes: values.notes || '',
      });
      message.success('Cập nhật đặt lịch thành công');
      bookingForm.resetFields();
      setIsBookingModalOpen(false);
      loadBookings();
    } catch (error) {
      message.error('Lỗi cập nhật đặt lịch: ' + error.message);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    try {
      await invoke('db:bookings:delete', bookingId);
      message.success('Xóa đặt lịch thành công');
      loadBookings();
    } catch (error) {
      message.error('Lỗi xóa đặt lịch: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    if (customers.length === 0) {
      message.warning('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['Họ Tên', 'Điện Thoại', 'Email', 'Địa Chỉ', 'Điểm', 'Ghi Chú'];
    const rows = customers.map(c => [
      c.name || '',
      c.phone || '',
      c.email || '',
      c.address || '',
      c.points || 0,
      c.notes || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `khach-hang-${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Xuất dữ liệu thành công');
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    customer.phone?.includes(searchText) ||
    customer.email?.toLowerCase().includes(searchText.toLowerCase())
  );

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
      title: 'Trạng Thái',
      key: 'status',
      width: 140,
      render: (_, record) => {
        const todayStr = dayjs().format('YYYY-MM-DD');
        const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
        const customerBookings = bookings.filter(b => {
          const custId = b.customer_id || b.customerId;
          if (custId !== record.id) return false;
          if (b.status === 'cancelled' || b.status === 'completed') return false;
          return true;
        });
        const todayBooking = customerBookings.find(b => {
          const d = b.booking_date || b.bookingDate;
          return d && dayjs(d).format('YYYY-MM-DD') === todayStr;
        });
        const tomorrowBooking = customerBookings.find(b => {
          const d = b.booking_date || b.bookingDate;
          return d && dayjs(d).format('YYYY-MM-DD') === tomorrowStr;
        });
        const upcomingCount = customerBookings.filter(b => {
          const d = b.booking_date || b.bookingDate;
          return d && dayjs(d).isAfter(dayjs());
        }).length;

        if (todayBooking) {
          const d = dayjs(todayBooking.booking_date || todayBooking.bookingDate);
          return <Tag icon={<CalendarOutlined />} color="green">Hôm nay {d.format('HH:mm')}</Tag>;
        }
        if (tomorrowBooking) {
          return <Tag icon={<CalendarOutlined />} color="blue">Ngày mai</Tag>;
        }
        if (upcomingCount > 0) {
          return <Tag color="default">{upcomingCount} lịch hẹn</Tag>;
        }
        return <span style={{ color: '#bfbfbf' }}>—</span>;
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
            onClick={() => handleViewCustomer(record)}
          >
            Chi Tiết
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedCustomer(record);
              setIsEditMode(true);
              setDetailDrawerOpen(true);
              loadCustomerDetails(record.id);
              form.setFieldsValue(record);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa khách hàng"
            description="Bạn có chắc chắn muốn xóa khách hàng này?"
            onConfirm={guardAction(() => handleDeleteCustomer(record.id))}
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

  const filteredBookings = bookings.filter(booking => {
    const search = bookingSearchText.toLowerCase();
    const customerName = (booking.customer_name || customers.find(c => c.id === booking.customer_id)?.name || '').toLowerCase();
    const staffName = (booking.staff_name || staffList.find(s => s.id === booking.staff_id)?.name || '').toLowerCase();
    const serviceName = (booking.service_name || servicesList.find(s => s.id === booking.service_id)?.name || '').toLowerCase();
    return customerName.includes(search) || staffName.includes(search) || serviceName.includes(search);
  });

  const bookingColumns = [
    {
      title: 'Khách Hàng',
      key: 'customer',
      width: 150,
      render: (_, record) => {
        return record.customer_name || customers.find(c => c.id === record.customer_id)?.name || '-';
      },
    },
    {
      title: 'Nhân Viên',
      key: 'staff',
      width: 130,
      render: (_, record) => {
        return record.staff_name || staffList.find(s => s.id === record.staff_id)?.name || '-';
      },
    },
    {
      title: 'Dịch Vụ',
      key: 'service',
      width: 150,
      render: (_, record) => {
        return record.service_name || servicesList.find(s => s.id === record.service_id)?.name || '-';
      },
    },
    {
      title: 'Ngày Đặt',
      key: 'bookingDate',
      width: 150,
      render: (_, record) => {
        const date = record.booking_date || record.bookingDate;
        return date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-';
      },
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusMap = { 'pending': 'Chờ xử lý', 'confirmed': 'Xác nhận', 'completed': 'Hoàn thành', 'cancelled': 'Hủy' };
        const colorMap = { 'pending': '#faad14', 'confirmed': '#1890ff', 'completed': '#52c41a', 'cancelled': '#f5222d' };
        return <span style={{ color: colorMap[status] }}>{statusMap[status] || status}</span>;
      },
    },
    {
      title: 'Ghi Chú',
      dataIndex: 'notes',
      key: 'notes',
      render: (text) => text || '-',
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
              setSelectedBooking(record);
              setIsBookingEditMode(true);
              setIsBookingModalOpen(true);
              bookingForm.setFieldsValue({
                ...record,
                booking_date: dayjs(record.bookingDate),
              });
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa đặt lịch"
            description="Bạn có chắc chắn muốn xóa?"
            onConfirm={guardAction(() => handleDeleteBooking(record.id))}
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
      title="Quản Lý Khách Hàng & Đặt Lịch"
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'customers',
            label: 'Khách Hàng',
            children: (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  <Input
                    placeholder="Tìm kiếm theo tên, điện thoại, email..."
                    prefix={<SearchOutlined />}
                    style={{ width: 300 }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  <Space>
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
                      Thêm Khách Hàng
                    </Button>
                  </Space>
                </div>
                <Spin spinning={loading}>
                  {filteredCustomers.length === 0 ? (
                    <Empty description="Không có khách hàng" style={{ marginTop: '50px' }} />
                  ) : (
                    <Table
                      columns={columns}
                      dataSource={filteredCustomers.map((c, i) => ({ ...c, key: c.id || i }))}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1000 }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },
          {
            key: 'bookings',
            label: 'Đặt Lịch',
            children: (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  <Input
                    placeholder="Tìm kiếm theo khách hàng..."
                    prefix={<SearchOutlined />}
                    style={{ width: 300 }}
                    value={bookingSearchText}
                    onChange={(e) => setBookingSearchText(e.target.value)}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedBooking(null);
                      setIsBookingEditMode(false);
                      bookingForm.resetFields();
                      setIsBookingModalOpen(true);
                    }}
                    style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
                  >
                    Thêm Đặt Lịch
                  </Button>
                </div>
                <Spin spinning={bookingsLoading}>
                  {filteredBookings.length === 0 ? (
                    <Empty description="Không có đặt lịch" style={{ marginTop: '50px' }} />
                  ) : (
                    <Table
                      columns={bookingColumns}
                      dataSource={filteredBookings.map((b, i) => ({ ...b, key: b.id || i }))}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1000 }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={isEditMode ? "Chỉnh Sửa Khách Hàng" : "Thêm Khách Hàng Mới"}
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
          onFinish={isEditMode ? guardAction(handleEditCustomer) : handleAddCustomer}
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
        <Spin spinning={detailLoading}>
          {selectedCustomer && (
            <Tabs
              items={[
                {
                  key: 'info',
                  label: 'Thông Tin',
                  children: isEditMode ? (
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={guardAction(handleEditCustomer)}
                    >
                      <Form.Item
                        label="Họ Tên"
                        name="name"
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item label="Điện Thoại" name="phone">
                        <Input />
                      </Form.Item>
                      <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
                        <Input />
                      </Form.Item>
                      <Form.Item label="Địa Chỉ" name="address">
                        <Input />
                      </Form.Item>
                      <Form.Item label="Điểm" name="points">
                        <Input type="number" />
                      </Form.Item>
                      <Form.Item label="Ghi Chú" name="notes">
                        <Input.TextArea rows={3} />
                      </Form.Item>
                    </Form>
                  ) : (
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

      {/* Booking Modal */}
      <Modal
        title={isBookingEditMode ? "Chỉnh Sửa Đặt Lịch" : "Thêm Đặt Lịch Mới"}
        open={isBookingModalOpen}
        onOk={() => bookingForm.submit()}
        onCancel={() => {
          setIsBookingModalOpen(false);
          bookingForm.resetFields();
        }}
        okText={isBookingEditMode ? "Cập Nhật" : "Thêm"}
        cancelText="Hủy"
      >
        <Form
          form={bookingForm}
          layout="vertical"
          onFinish={isBookingEditMode ? guardAction(handleEditBooking) : handleAddBooking}
        >
          <Form.Item
            label="Khách Hàng"
            name="customer_id"
            rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}
          >
            <Select
              placeholder="Chọn khách hàng"
              options={customers.map(c => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>

          <Form.Item
            label="Nhân Viên"
            name="staff_id"
          >
            <Select
              placeholder="Chọn nhân viên"
              allowClear
              showSearch
              optionFilterProp="label"
              options={staffList.map(s => ({ label: s.name, value: s.id }))}
            />
          </Form.Item>

          <Form.Item
            label="Dịch Vụ"
            name="service_id"
          >
            <Select
              placeholder="Chọn dịch vụ"
              allowClear
              showSearch
              optionFilterProp="label"
              options={servicesList.map(s => ({ label: `${s.name}${s.price ? ` - ${Number(s.price).toLocaleString('vi-VN')}₫` : ''}`, value: s.id }))}
            />
          </Form.Item>

          <Form.Item
            label="Ngày Đặt"
            name="booking_date"
            rules={[{ required: true, message: 'Vui lòng chọn ngày đặt' }]}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" placeholder="Chọn ngày giờ" />
          </Form.Item>

          <Form.Item
            label="Trạng Thái"
            name="status"
            initialValue="pending"
          >
            <Select
              options={[
                { label: 'Chờ xử lý', value: 'pending' },
                { label: 'Xác nhận', value: 'confirmed' },
                { label: 'Hoàn thành', value: 'completed' },
                { label: 'Hủy', value: 'cancelled' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Ghi Chú"
            name="notes"
          >
            <Input.TextArea placeholder="Ghi chú" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Spin, Drawer, Space, Popconfirm, Empty, InputNumber, Tag, Descriptions, Tabs, DatePicker, Select, Statistic, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, SearchOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAPI } from '../../hooks/useAPI';

export default function Staff() {
  const { invoke } = useAPI();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [commissionMonth, setCommissionMonth] = useState(dayjs());
  const [commissionData, setCommissionData] = useState(null);
  const [form] = Form.useForm();
  const [checkInForm] = Form.useForm();

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const result = await invoke('db:staff:getAll');
      const data = result.data || result || [];
      setStaff(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Staff] Error:', error);
      message.error('Lỗi tải nhân viên: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceRecords = async (staffId) => {
    try {
      const result = await invoke('db:query', 'attendance', [
        { field: 'staffId', operator: '==', value: staffId }
      ]);
      setAttendanceRecords((result.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error('[Staff] Error loading attendance:', error);
      setAttendanceRecords([]);
    }
  };

  const loadCommissionData = async (staffId, rate, month = null) => {
    try {
      const result = await invoke('db:query', 'TRANSACTIONS', [
        { field: 'staffId', operator: '==', value: staffId }
      ]);

      const targetMonth = month || commissionMonth;
      const monthStr = targetMonth.format('YYYY-MM');
      const monthTransactions = (result.data || []).filter(t => {
        const tDate = t.date || t.createdAt || '';
        return tDate.startsWith(monthStr);
      });

      const totalRevenue = monthTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const commission = totalRevenue * (Number(rate) / 100);

      setCommissionData({
        totalRevenue,
        commissionRate: rate,
        totalCommission: commission,
        transactions: monthTransactions || [],
      });
    } catch (error) {
      console.error('[Staff] Error loading commission:', error);
      setCommissionData({
        totalRevenue: 0,
        commissionRate: rate,
        totalCommission: 0,
        transactions: [],
      });
    }
  };

  const handleAddStaff = async (values) => {
    try {
      await invoke('db:staff:add', {
        name: values.name,
        phone: values.phone || '',
        email: values.email || '',
        position: values.position || '',
        salary: Number(values.salary) || 0,
        commission_rate: Number(values.commissionRate) || 0,
      });
      message.success('Thêm nhân viên thành công');
      form.resetFields();
      setIsModalOpen(false);
      loadStaff();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleUpdateStaff = async (values) => {
    try {
      await invoke('db:staff:update', selectedStaff.id, {
        name: values.name,
        phone: values.phone || '',
        email: values.email || '',
        position: values.position || '',
        salary: Number(values.salary) || 0,
        commission_rate: Number(values.commissionRate) || 0,
      });
      message.success('Cập nhật thành công');
      setDetailDrawerOpen(false);
      setIsEditMode(false);
      form.resetFields();
      loadStaff();
      loadCommissionData(selectedStaff.id, Number(values.commissionRate) || 0);
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    try {
      await invoke('db:staff:delete', id);
      message.success('Xóa thành công');
      setDetailDrawerOpen(false);
      loadStaff();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleCheckIn = async (values) => {
    try {
      const now = new Date();
      const checkInRecord = {
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
        date: now.toISOString(),
        checkInTime: dayjs(values.checkInTime).toISOString(),
        checkOutTime: values.checkOutTime ? dayjs(values.checkOutTime).toISOString() : null,
        status: values.status || 'present',
        notes: values.notes || '',
        hoursWorked: values.hoursWorked || 0,
      };

      try {
        await invoke('db:attendance:add', checkInRecord);
      } catch (e) {
        console.log('Attendance log:', e.message);
      }

      message.success('Ghi nhận chấm công thành công');
      checkInForm.resetFields();
      setIsCheckInModalOpen(false);
      loadStaff();
      loadAttendanceRecords(selectedStaff.id);
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    if (staff.length === 0) {
      message.warning('Không có dữ liệu');
      return;
    }

    const headers = ['Tên', 'Vị Trí', 'Điện Thoại', 'Email', 'Lương', 'Tỷ Lệ Hoa Hồng'];
    const rows = staff.map(s => [
      s.name || '',
      s.position || '',
      s.phone || '',
      s.email || '',
      s.salary || 0,
      (s.commission_rate || 0) * 100 + '%',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `nhan-vien-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Xuất dữ liệu thành công');
  };

  const openStaffDetail = (s) => {
    setSelectedStaff(s);
    setIsEditMode(false);
    setDetailDrawerOpen(true);
    form.setFieldsValue(s);
    loadAttendanceRecords(s.id);
    loadCommissionData(s.id, s.commission_rate || 0);
  };

  const filteredStaff = staff.filter(s =>
    (s.name?.toLowerCase().includes(searchText.toLowerCase())) ||
    (s.position?.toLowerCase().includes(searchText.toLowerCase())) ||
    (s.phone?.includes(searchText))
  );

  const getMonthlyStats = () => {
    const monthStr = selectedMonth.format('YYYY-MM');
    const monthRecords = attendanceRecords.filter(r => r.date?.startsWith(monthStr));
    const totalHours = monthRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    const presentDays = monthRecords.filter(r => r.status === 'present').length;
    const absentDays = monthRecords.filter(r => r.status === 'absent').length;

    return { totalHours, presentDays, absentDays, monthRecords };
  };

  const staffColumns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      width: 140,
    },
    {
      title: 'Vị Trí',
      dataIndex: 'position',
      key: 'position',
      width: 120,
    },
    {
      title: 'Điện Thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: 'Lương',
      dataIndex: 'salary',
      key: 'salary',
      width: 120,
      render: (salary) => salary ? `${Number(salary).toLocaleString('vi-VN')} ₫` : '0 ₫',
    },
    {
      title: 'Hoa Hồng',
      dataIndex: 'commission_rate',
      key: 'commission_rate',
      width: 100,
      render: (rate) => `${(rate || 0).toFixed(1)}%`,
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<LoginOutlined />}
            onClick={() => {
              setSelectedStaff(record);
              setIsCheckInModalOpen(true);
              checkInForm.setFieldsValue({
                checkInTime: dayjs(),
                status: 'present',
              });
            }}
            style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
          >
            Chấm
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => openStaffDetail(record)}
            style={{ color: '#ff69b4' }}
          >
            Chi Tiết
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedStaff(record);
              setIsEditMode(true);
              setDetailDrawerOpen(true);
              form.setFieldsValue(record);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa?"
            description="Xác nhận xóa nhân viên này?"
            onConfirm={() => handleDeleteStaff(record.id)}
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

  const attendanceColumns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Check In',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      width: 100,
      render: (time) => time ? dayjs(time).format('HH:mm') : '-',
    },
    {
      title: 'Check Out',
      dataIndex: 'checkOutTime',
      key: 'checkOutTime',
      width: 100,
      render: (time) => time ? dayjs(time).format('HH:mm') : '-',
    },
    {
      title: 'Giờ Làm',
      dataIndex: 'hoursWorked',
      key: 'hoursWorked',
      width: 80,
      render: (hours) => hours ? `${hours.toFixed(1)}h` : '-',
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const colors = { present: 'green', absent: 'red', late: 'orange', 'early-leave': 'blue' };
        const labels = { present: 'Có Mặt', absent: 'Vắng', late: 'Đi Muộn', 'early-leave': 'Về Sớm' };
        return <Tag color={colors[status]}>{labels[status] || status}</Tag>;
      },
    },
  ];

  return (
    <Card
      title="Quản Lý Nhân Viên"
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
        {filteredStaff.length === 0 ? (
          <Empty description="Không có nhân viên" style={{ marginTop: 50 }} />
        ) : (
          <Table
            columns={staffColumns}
            dataSource={filteredStaff.map((s, i) => ({ ...s, key: s.id || i }))}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
          />
        )}
      </Spin>

      <Modal
        title={isEditMode ? 'Sửa Nhân Viên' : 'Thêm Nhân Viên'}
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
          onFinish={isEditMode ? handleUpdateStaff : handleAddStaff}
        >
          <Form.Item
            label="Tên"
            name="name"
            rules={[{ required: true, message: 'Nhập tên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Vị Trí" name="position">
            <Input />
          </Form.Item>
          <Form.Item label="Điện Thoại" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input />
          </Form.Item>
          <Form.Item label="Lương (₫)" name="salary">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Tỷ Lệ Hoa Hồng (%)" name="commissionRate">
            <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} placeholder="0-100" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={selectedStaff?.name}
        placement="right"
        width={700}
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
                  onClick={() => setIsCheckInModalOpen(true)}
                  icon={<LoginOutlined />}
                  style={{ color: '#ff69b4', borderColor: '#ff69b4' }}
                >
                  Chấm Công
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
            onFinish={handleUpdateStaff}
          >
            <Form.Item label="Tên" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Vị Trí" name="position">
              <Input />
            </Form.Item>
            <Form.Item label="Điện Thoại" name="phone">
              <Input />
            </Form.Item>
            <Form.Item label="Email" name="email">
              <Input />
            </Form.Item>
            <Form.Item label="Lương (₫)" name="salary">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Tỷ Lệ Hoa Hồng (%)" name="commissionRate">
              <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} placeholder="0-100" />
            </Form.Item>
          </Form>
        ) : (
          selectedStaff && (
            <Tabs
              items={[
                {
                  key: 'info',
                  label: 'Thông Tin',
                  children: (
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="Tên">{selectedStaff.name}</Descriptions.Item>
                      <Descriptions.Item label="Vị Trí">{selectedStaff.position || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Điện Thoại">{selectedStaff.phone || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Email">{selectedStaff.email || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Lương">
                        {selectedStaff.salary ? `${Number(selectedStaff.salary).toLocaleString('vi-VN')} ₫` : '0 ₫'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Tỷ Lệ Hoa Hồng">
                        {(selectedStaff.commission_rate || 0).toFixed(1)}%
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: 'attendance',
                  label: 'Chấm Công',
                  children: (
                    <div>
                      <div style={{ marginBottom: 20 }}>
                        <DatePicker
                          picker="month"
                          value={selectedMonth}
                          onChange={setSelectedMonth}
                          format="MM/YYYY"
                        />
                      </div>
                      <Row gutter={16} style={{ marginBottom: 20 }}>
                        <Col span={6}>
                          <Statistic
                            title="Tổng Giờ"
                            value={getMonthlyStats().totalHours}
                            suffix="h"
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="Có Mặt"
                            value={getMonthlyStats().presentDays}
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="Vắng"
                            value={getMonthlyStats().absentDays}
                            valueStyle={{ color: '#f5222d' }}
                          />
                        </Col>
                      </Row>
                      <Table
                        columns={attendanceColumns}
                        dataSource={getMonthlyStats().monthRecords.map((r, i) => ({ ...r, key: r.id || i }))}
                        pagination={false}
                        size="small"
                        locale={{ emptyText: 'Không có dữ liệu' }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'commission',
                  label: 'Hoa Hồng',
                  children: (
                    <div>
                      <div style={{ marginBottom: 20 }}>
                        <DatePicker
                          picker="month"
                          value={commissionMonth}
                          onChange={(date) => {
                            setCommissionMonth(date);
                            loadCommissionData(selectedStaff.id, selectedStaff.commission_rate || 0, date);
                          }}
                          format="MM/YYYY"
                        />
                      </div>
                      {commissionData ? (
                        <>
                          <Row gutter={16} style={{ marginBottom: 20 }}>
                            <Col span={8}>
                              <Statistic
                                title="Doanh Số"
                                value={commissionData.totalRevenue}
                                suffix="₫"
                                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
                              />
                            </Col>
                            <Col span={8}>
                              <Statistic
                                title="Tỷ Lệ"
                                value={commissionData.commissionRate}
                                suffix="%"
                              />
                            </Col>
                            <Col span={8}>
                              <Statistic
                                title="Hoa Hồng"
                                value={commissionData.totalCommission}
                                suffix="₫"
                                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
                                valueStyle={{ color: '#ff69b4', fontWeight: 'bold' }}
                              />
                            </Col>
                          </Row>
                          {commissionData.transactions.length > 0 ? (
                            <Table
                              columns={[
                                {
                                  title: 'Ngày',
                                  dataIndex: 'date',
                                  key: 'date',
                                  width: 120,
                                  render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
                                },
                                {
                                  title: 'Số Tiền',
                                  dataIndex: 'amount',
                                  key: 'amount',
                                  width: 130,
                                  render: (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} ₫`,
                                },
                                {
                                  title: 'Hoa Hồng',
                                  key: 'commission',
                                  width: 130,
                                  render: (_, record) => {
                                    const commission = (Number(record.amount) || 0) * (Number(commissionData.commissionRate) / 100);
                                    return `${Number(commission).toLocaleString('vi-VN')} ₫`;
                                  },
                                },
                              ]}
                              dataSource={commissionData.transactions.map((t, i) => ({ ...t, key: t.id || i }))}
                              pagination={false}
                              size="small"
                            />
                          ) : (
                            <Empty description="Không có doanh số" style={{ marginTop: 30 }} />
                          )}
                        </>
                      ) : (
                        <Spin />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )
        )}
      </Drawer>

      <Modal
        title={`Chấm Công - ${selectedStaff?.name}`}
        open={isCheckInModalOpen}
        onCancel={() => {
          setIsCheckInModalOpen(false);
          checkInForm.resetFields();
        }}
        onOk={() => checkInForm.submit()}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form
          form={checkInForm}
          layout="vertical"
          onFinish={handleCheckIn}
          onValuesChange={(changedValues) => {
            // Auto-calculate hours if both times are set
            if (changedValues.checkOutTime && checkInForm.getFieldValue('checkInTime')) {
              const checkIn = checkInForm.getFieldValue('checkInTime');
              const checkOut = changedValues.checkOutTime;
              const hours = checkOut.diff(checkIn, 'hour', true);
              checkInForm.setFieldsValue({ hoursWorked: parseFloat(hours.toFixed(1)) });
            }
          }}
        >
          <Form.Item
            label="Giờ Check In (*)  - Tự động lấy giờ hiện tại, có thể sửa"
            name="checkInTime"
            rules={[{ required: true, message: 'Nhập giờ check in' }]}
          >
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder="Chọn giờ check in"
            />
          </Form.Item>
          <Form.Item
            label="Giờ Check Out (tuỳ chọn)"
            name="checkOutTime"
          >
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder="Chọn giờ check out"
            />
          </Form.Item>
          <Form.Item
            label="Giờ Làm (tự động tính nếu có check out)"
            name="hoursWorked"
          >
            <InputNumber
              min={0}
              max={24}
              step={0.5}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>
          <Form.Item
            label="Trạng Thái"
            name="status"
            initialValue="present"
          >
            <Select
              options={[
                { label: 'Có Mặt', value: 'present' },
                { label: 'Vắng', value: 'absent' },
                { label: 'Đi Muộn', value: 'late' },
                { label: 'Về Sớm', value: 'early-leave' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Ghi Chú"
            name="notes"
          >
            <Input.TextArea rows={2} placeholder="Ghi chú thêm nếu cần" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

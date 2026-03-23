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
  DatePicker,
  Select,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  SearchOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../context/AuthContext';

// Helper: Convert any date format to Date object
// Handles: Date, ISO string, Firestore Timestamp (with toDate()),
// and serialized Timestamp ({_seconds, _nanoseconds} or {seconds, nanoseconds})
const toDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (val.toDate && typeof val.toDate === 'function') return val.toDate();
  // Serialized Firestore Timestamp (loses toDate() method over IPC)
  if (val._seconds !== undefined) return new Date(val._seconds * 1000);
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return null;
};

// Helper: Format date for display
const formatDate = (val) => {
  const d = toDate(val);
  return d ? dayjs(d).format('DD/MM/YYYY') : '-';
};

// Helper: Format time for display
const formatTime = (val) => {
  const d = toDate(val);
  return d ? dayjs(d).format('HH:mm') : '-';
};

// Default thresholds (overridden from Settings)
let LATE_HOUR = 9;
let LATE_MINUTE = 0;
let END_HOUR = 17;
let END_MINUTE = 0;

const getAutoStatus = (checkInTime, lateH = LATE_HOUR, lateM = LATE_MINUTE) => {
  if (!checkInTime) return 'present';
  const t = dayjs(checkInTime);
  const lateThreshold = t.clone().hour(lateH).minute(lateM).second(0);
  return t.isAfter(lateThreshold) ? 'late' : 'present';
};

const isEarlyLeave = (checkOutTime, endH = END_HOUR, endM = END_MINUTE) => {
  if (!checkOutTime) return false;
  const t = dayjs(checkOutTime);
  const endThreshold = t.clone().hour(endH).minute(endM).second(0);
  return t.isBefore(endThreshold);
};

export default function Staff() {
  const { invoke } = useAPI();
  const { guardAction } = useAuth();
  const [form] = Form.useForm();
  const [checkInForm] = Form.useForm();

  // Data
  const [staff, setStaff] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [commissionData, setCommissionData] = useState(null);
  const [commissionMonth, setCommissionMonth] = useState(dayjs());

  // UI States
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedStaff, setSelectedStaff] = useState(null);

  // ============ LOAD DATA ============
  useEffect(() => {
    loadStaff();
    // Load work time settings
    (async () => {
      try {
        const res = await invoke('db:settings:get', 'workTime');
        if (res.success && res.data) {
          LATE_HOUR = Number(res.data.lateHour) || 9;
          LATE_MINUTE = Number(res.data.lateMinute) || 0;
          END_HOUR = Number(res.data.endHour) || 17;
          END_MINUTE = Number(res.data.endMinute) || 0;
        }
      } catch {}
    })();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const result = await invoke('db:staff:getAll');
      const data = result.data || result || [];
      setStaff(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Lỗi tải nhân viên');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceRecords = async (staffId) => {
    try {
      const result = await invoke('db:query', 'attendance', [
        { field: 'staffId', operator: '==', value: staffId },
      ]);

      let records = (result.data || result || []).filter(r => !r.deleted && r.status !== 'deleted');
      // Sort by date descending
      records.sort((a, b) => {
        const dateA = toDate(a.date)?.getTime() || 0;
        const dateB = toDate(b.date)?.getTime() || 0;
        return dateB - dateA;
      });

      setAttendanceRecords(records);
    } catch (error) {
      console.error('[Staff] Attendance load error:', error);
      setAttendanceRecords([]);
    }
  };

  // ============ ACTIONS ============
  const handleAddStaff = async (values) => {
    try {
      const result = await invoke('db:staff:add', {
        name: values.name,
        phone: values.phone || '',
        email: values.email || '',
        position: values.position || '',
        salary: Number(values.salary) || 0,
        commission_rate: Number(values.commissionRate) || 0,
      });

      if (result.success || result.id) {
        message.success('Thêm nhân viên thành công');
        form.resetFields();
        setIsModalOpen(false);
        await loadStaff();
      } else {
        message.error('Lỗi thêm nhân viên');
      }
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleUpdateStaff = async (values) => {
    if (!selectedStaff?.id) {
      message.error('Lỗi: Không tìm thấy nhân viên');
      return;
    }

    try {
      const result = await invoke('db:staff:update', selectedStaff.id, {
        name: values.name,
        phone: values.phone || '',
        email: values.email || '',
        position: values.position || '',
        salary: Number(values.salary) || 0,
        commission_rate: Number(values.commissionRate) || 0,
      });

      if (result.success) {
        message.success('Cập nhật thành công');
        setDetailDrawerOpen(false);
        setIsEditMode(false);
        form.resetFields();
        await loadStaff();
      } else {
        message.error('Lỗi cập nhật');
      }
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    try {
      const result = await invoke('db:staff:delete', id);
      if (result.success) {
        message.success('Xóa thành công');
        setDetailDrawerOpen(false);
        await loadStaff();
      } else {
        message.error('Lỗi xóa nhân viên');
      }
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleCheckIn = async (values) => {
    if (!selectedStaff?.id) {
      message.error('Lỗi: Không tìm thấy nhân viên');
      return;
    }

    try {
      const now = new Date();
      const checkInTime = dayjs(values.checkInTime);
      const checkOutTime = values.checkOutTime ? dayjs(values.checkOutTime) : null;

      // Calculate hours if checkout exists
      let hoursWorked = values.hoursWorked || 0;
      if (checkOutTime && checkInTime) {
        hoursWorked = parseFloat(checkOutTime.diff(checkInTime, 'hour', true).toFixed(1));
      }

      const result = await invoke('db:attendance:add', {
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
        date: now.toISOString(),
        checkInTime: checkInTime.toISOString(),
        checkOutTime: checkOutTime ? checkOutTime.toISOString() : null,
        status: values.status || 'present',
        notes: values.notes || '',
        hoursWorked,
      });

      if (result.success || result.id) {
        message.success('Ghi nhận chấm công thành công');
        checkInForm.resetFields();
        setIsCheckInModalOpen(false);
        await loadAttendanceRecords(selectedStaff.id);
      } else {
        message.error('Lỗi: Không thể ghi nhận chấm công');
      }
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleCheckOut = async (staffId) => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const result = await invoke('db:query', 'attendance', [
        { field: 'staffId', operator: '==', value: staffId },
      ]);
      const records = result.data || result || [];
      // Find today's record without a checkout
      const todayRecord = records.find((r) => {
        const d = toDate(r.date);
        return d && dayjs(d).format('YYYY-MM-DD') === today && !r.checkOutTime;
      });

      if (!todayRecord) {
        message.warning('Không tìm thấy bản ghi chấm công hôm nay hoặc đã check out rồi');
        return;
      }

      const now = dayjs();
      const checkIn = toDate(todayRecord.checkInTime);
      const hoursWorked = checkIn
        ? parseFloat(now.diff(dayjs(checkIn), 'hour', true).toFixed(1))
        : 0;

      // Auto-detect early leave: checkout trước 17:00 → về sớm
      const updateData = {
        checkOutTime: now.toISOString(),
        hoursWorked,
      };
      if (isEarlyLeave(now)) {
        updateData.status = 'early-leave';
      }

      const updateResult = await invoke('db:attendance:update', todayRecord.id, updateData);

      if (updateResult.success) {
        const statusMsg = isEarlyLeave(now) ? ' (Về Sớm)' : '';
        message.success(`Check out lúc ${now.format('HH:mm')} — Làm ${hoursWorked}h${statusMsg}`);
        if (selectedStaff?.id === staffId) {
          await loadAttendanceRecords(staffId);
        }
      } else {
        message.error('Lỗi check out');
      }
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    if (staff.length === 0) {
      message.warning('Không có dữ liệu');
      return;
    }

    const headers = ['Tên', 'Vị Trí', 'Điện Thoại', 'Email', 'Lương', 'Hoa Hồng (%)'];
    const rows = staff.map((s) => [
      s.name || '',
      s.position || '',
      s.phone || '',
      s.email || '',
      s.salary || 0,
      (s.commissionRate ?? s.commission_rate ?? 0).toFixed(1),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
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
    form.setFieldsValue({
      name: s.name,
      phone: s.phone,
      email: s.email,
      position: s.position,
      salary: s.salary,
      commissionRate: s.commissionRate ?? s.commission_rate ?? 0,
    });
    loadAttendanceRecords(s.id);
    loadCommissionData(s.id, s.commissionRate ?? s.commission_rate ?? 0);
  };

  const loadCommissionData = async (staffId, commissionRate, month = null) => {
    setCommissionData(null);
    try {
      console.log('[Commission] Loading for staffId:', staffId, 'rate:', commissionRate);
      const result = await invoke('db:query', 'transactions', [
        { field: 'staffId', operator: '==', value: staffId },
      ]);
      console.log('[Commission] Query result:', JSON.stringify(result).substring(0, 500));
      if (!result.success && result.error) {
        console.error('[Commission] Query error:', result.error);
        message.error('Lỗi tải hoa hồng: ' + result.error);
        setCommissionData({ totalRevenue: 0, commissionRate, totalCommission: 0, transactions: [] });
        return;
      }
      const targetMonth = month || commissionMonth;
      const monthStr = targetMonth.format('YYYY-MM');
      let txList = Array.isArray(result.data) ? result.data : [];
      console.log('[Commission] Total transactions for staff:', txList.length);
      txList.forEach((t, i) => {
        console.log(`[Commission] tx[${i}]:`, t.transactionType, t.amount, t.commissionAmount, t.date);
      });
      const monthTx = txList.filter((t) => {
        if (t.deleted) return false;
        const type = t.transactionType || t.transaction_type;
        if (type !== 'commission') return false;
        const dateField = t.date || t.createdAt;
        if (!dateField) return false;
        const d = toDate(dateField);
        return d && d.toISOString().startsWith(monthStr);
      });
      const totalRevenue = monthTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const totalCommission = monthTx.reduce((sum, t) => sum + (Number(t.commissionAmount ?? t.commission_amount) || 0), 0);
      setCommissionData({
        totalRevenue,
        commissionRate,
        totalCommission,
        transactions: monthTx,
      });
    } catch (err) {
      console.error('[Commission] loadCommissionData error:', err);
      setCommissionData({ totalRevenue: 0, commissionRate, totalCommission: 0, transactions: [] });
    }
  };

  // ============ COMPUTED ============
  const filteredStaff = staff.filter(
    (s) =>
      (s.name?.toLowerCase().includes(searchText.toLowerCase())) ||
      (s.position?.toLowerCase().includes(searchText.toLowerCase())) ||
      (s.phone?.includes(searchText))
  );

  const getMonthlyStats = () => {
    if (!selectedMonth) {
      return { totalHours: 0, presentDays: 0, absentDays: 0, lateDays: 0, monthRecords: [] };
    }

    const monthStr = selectedMonth.format('YYYY-MM');
    const monthRecords = attendanceRecords.filter((r) => {
      const dateStr = toDate(r.date)?.toISOString() || '';
      return dateStr.startsWith(monthStr);
    });

    const totalHours = monthRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    const presentDays = monthRecords.filter((r) => r.status === 'present').length;
    const absentDays = monthRecords.filter((r) => r.status === 'absent').length;
    const lateDays = monthRecords.filter((r) => r.status === 'late').length;

    return { totalHours, presentDays, absentDays, lateDays, monthRecords };
  };

  // Build attendance calendar data for selected month
  const getCalendarData = () => {
    if (!selectedMonth) return { weeks: [], dayMap: {} };

    const monthStr = selectedMonth.format('YYYY-MM');
    const monthRecords = attendanceRecords.filter((r) => {
      const dateStr = toDate(r.date)?.toISOString() || '';
      return dateStr.startsWith(monthStr);
    });

    // Build a map: dayOfMonth -> record
    const dayMap = {};
    monthRecords.forEach((r) => {
      const d = toDate(r.date);
      if (d) {
        const day = d.getDate();
        dayMap[day] = r;
      }
    });

    // Build weeks grid
    const startOfMonth = selectedMonth.startOf('month');
    const daysInMonth = selectedMonth.daysInMonth();
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // We want Monday-first (0 = Mon, 6 = Sun)
    const firstDayOfWeek = (startOfMonth.day() + 6) % 7; // convert Sun=0 to Mon=0

    const weeks = [];
    let week = new Array(firstDayOfWeek).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }

    return { weeks, dayMap };
  };

  // ============ COLUMNS ============
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
      render: (salary) =>
        salary ? `${Number(salary).toLocaleString('vi-VN')} ₫` : '0 ₫',
    },
    {
      title: 'Hoa Hồng',
      key: 'commission_rate',
      width: 100,
      render: (_, record) => {
        const rate = record.commissionRate ?? record.commission_rate ?? 0;
        return `${Number(rate).toFixed(1)}%`;
      },
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
              const now = dayjs();
              setSelectedStaff(record);
              setIsCheckInModalOpen(true);
              checkInForm.setFieldsValue({
                checkInTime: now,
                status: getAutoStatus(now),
              });
            }}
            style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
          >
            Chấm
          </Button>
          <Button
            size="small"
            icon={<LogoutOutlined />}
            onClick={() => handleCheckOut(record.id)}
            style={{ color: '#595959', borderColor: '#d9d9d9' }}
          >
            Về
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
              form.setFieldsValue({
                name: record.name,
                phone: record.phone,
                email: record.email,
                position: record.position,
                salary: record.salary,
                commissionRate: record.commissionRate ?? record.commission_rate ?? 0,
              });
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa?"
            description="Xác nhận xóa nhân viên này?"
            onConfirm={guardAction(() => handleDeleteStaff(record.id))}
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
      render: formatDate,
    },
    {
      title: 'Check In',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      width: 100,
      render: formatTime,
    },
    {
      title: 'Check Out',
      dataIndex: 'checkOutTime',
      key: 'checkOutTime',
      width: 100,
      render: formatTime,
    },
    {
      title: 'Giờ Làm',
      dataIndex: 'hoursWorked',
      key: 'hoursWorked',
      width: 80,
      render: (hours) => (hours ? `${hours.toFixed(1)}h` : '-'),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const colors = {
          present: 'green',
          absent: 'red',
          late: 'orange',
          'early-leave': 'blue',
        };
        const labels = {
          present: 'Có Mặt',
          absent: 'Vắng',
          late: 'Đi Muộn',
          'early-leave': 'Về Sớm',
        };
        return <Tag color={colors[status]}>{labels[status] || status}</Tag>;
      },
    },
  ];

  // ============ RENDER ============
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

      {/* Add/Edit Modal */}
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
          onFinish={isEditMode ? guardAction(handleUpdateStaff) : handleAddStaff}
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
            <Input type="email" />
          </Form.Item>
          <Form.Item label="Lương (₫)" name="salary">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Tỷ Lệ Hoa Hồng (%)" name="commissionRate">
            <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
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
                  onClick={() => {
                    const now = dayjs();
                    checkInForm.setFieldsValue({ checkInTime: now, status: getAutoStatus(now) });
                    setIsCheckInModalOpen(true);
                  }}
                  icon={<LoginOutlined />}
                  style={{ color: '#ff69b4', borderColor: '#ff69b4' }}
                >
                  Chấm Công
                </Button>
                <Button
                  onClick={() => handleCheckOut(selectedStaff.id)}
                  icon={<LogoutOutlined />}
                >
                  Về
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
          <Form form={form} layout="vertical" onFinish={guardAction(handleUpdateStaff)}>
            <Form.Item
              label="Tên"
              name="name"
              rules={[{ required: true }]}
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
              <Input type="email" />
            </Form.Item>
            <Form.Item label="Lương (₫)" name="salary">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Tỷ Lệ Hoa Hồng (%)" name="commissionRate">
              <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        ) : selectedStaff ? (
          <Tabs
            items={[
              {
                key: 'info',
                label: 'Thông Tin',
                children: (
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Tên">
                      {selectedStaff.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Vị Trí">
                      {selectedStaff.position || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Điện Thoại">
                      {selectedStaff.phone || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Email">
                      {selectedStaff.email || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Lương">
                      {selectedStaff.salary
                        ? `${Number(selectedStaff.salary).toLocaleString('vi-VN')} ₫`
                        : '0 ₫'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Tỷ Lệ Hoa Hồng">
                      {(selectedStaff.commissionRate ?? selectedStaff.commission_rate ?? 0).toFixed(1)}%
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'attendance',
                label: 'Chấm Công',
                children: (() => {
                  const stats = getMonthlyStats();
                  const { weeks, dayMap } = getCalendarData();
                  const weekDayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                  const statusStyle = {
                    present: { bg: '#f6ffed', border: '#52c41a', dot: '#52c41a', label: 'Có Mặt' },
                    absent:  { bg: '#fff1f0', border: '#ff4d4f', dot: '#ff4d4f', label: 'Vắng' },
                    late:    { bg: '#fff7e6', border: '#fa8c16', dot: '#fa8c16', label: 'Đi Muộn' },
                    'early-leave': { bg: '#e6f7ff', border: '#1890ff', dot: '#1890ff', label: 'Về Sớm' },
                  };
                  const today = dayjs();

                  return (
                    <div>
                      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <DatePicker
                          picker="month"
                          value={selectedMonth}
                          onChange={setSelectedMonth}
                          format="MM/YYYY"
                        />
                        <span style={{ fontSize: 13, color: '#888' }}>
                          Tháng {selectedMonth?.format('MM/YYYY')}
                        </span>
                      </div>

                      {/* Stats row */}
                      <Row gutter={12} style={{ marginBottom: 16 }}>
                        <Col span={6}>
                          <Statistic title="Tổng Giờ" value={stats.totalHours.toFixed(1)} suffix="h" />
                        </Col>
                        <Col span={6}>
                          <Statistic title="Có Mặt" value={stats.presentDays} valueStyle={{ color: '#52c41a' }} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="Đi Muộn" value={stats.lateDays} valueStyle={{ color: '#fa8c16' }} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="Vắng" value={stats.absentDays} valueStyle={{ color: '#f5222d' }} />
                        </Col>
                      </Row>

                      {/* Legend */}
                      <div style={{ marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {Object.entries(statusStyle).map(([key, s]) => (
                          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <span style={{ width: 12, height: 12, borderRadius: 3, background: s.bg, border: `2px solid ${s.border}`, display: 'inline-block' }} />
                            {s.label}
                          </span>
                        ))}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#fafafa', border: '2px solid #d9d9d9', display: 'inline-block' }} />
                          Không có dữ liệu
                        </span>
                      </div>

                      {/* Calendar grid */}
                      <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
                        {/* Day headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#fafafa' }}>
                          {weekDayLabels.map((d, i) => (
                            <div key={d} style={{
                              textAlign: 'center',
                              padding: '8px 4px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: i >= 5 ? '#ff4d4f' : '#595959',
                              borderRight: i < 6 ? '1px solid #f0f0f0' : 'none',
                              borderBottom: '1px solid #f0f0f0',
                            }}>
                              {d}
                            </div>
                          ))}
                        </div>

                        {/* Weeks */}
                        {weeks.map((week, wi) => (
                          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                            {week.map((day, di) => {
                              const record = day ? dayMap[day] : null;
                              const style = record ? (statusStyle[record.status] || statusStyle.present) : null;
                              const isToday = day &&
                                selectedMonth.year() === today.year() &&
                                selectedMonth.month() === today.month() &&
                                day === today.date();

                              return (
                                <div key={di} style={{
                                  minHeight: 64,
                                  padding: '6px 8px',
                                  background: day ? (style ? style.bg : '#ffffff') : '#fafafa',
                                  border: `1px solid ${day && style ? style.border : '#f0f0f0'}`,
                                  borderWidth: day && style ? '0 0 0 3px' : '0',
                                  borderRight: di < 6 ? '1px solid #f0f0f0' : 'none',
                                  borderBottom: wi < weeks.length - 1 ? '1px solid #f0f0f0' : 'none',
                                  borderLeft: day && style ? `3px solid ${style.border}` : (di > 0 ? '1px solid #f0f0f0' : 'none'),
                                  opacity: day ? 1 : 0.3,
                                }}>
                                  {day && (
                                    <>
                                      <div style={{
                                        fontSize: 13,
                                        fontWeight: isToday ? 700 : 400,
                                        color: isToday ? '#ff69b4' : (di >= 5 ? '#ff4d4f' : '#262626'),
                                        marginBottom: 2,
                                        background: isToday ? 'rgba(255,105,180,0.1)' : 'transparent',
                                        borderRadius: 4,
                                        width: 24,
                                        height: 24,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}>
                                        {day}
                                      </div>
                                      {record && (
                                        <div>
                                          <Tag
                                            color={style?.dot}
                                            style={{ fontSize: 10, padding: '0 4px', marginBottom: 2 }}
                                          >
                                            {style?.label}
                                          </Tag>
                                          {record.checkInTime && (
                                            <div style={{ fontSize: 10, color: '#8c8c8c' }}>
                                              {formatTime(record.checkInTime)}
                                              {record.checkOutTime && ` - ${formatTime(record.checkOutTime)}`}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Detail table */}
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Chi Tiết</div>
                        <Table
                          columns={attendanceColumns}
                          dataSource={stats.monthRecords.map((r, i) => ({ ...r, key: r.id || i }))}
                          pagination={false}
                          size="small"
                          locale={{ emptyText: 'Không có dữ liệu' }}
                        />
                      </div>
                    </div>
                  );
                })(),
              },
              {
                key: 'commission',
                label: 'Hoa Hồng',
                children: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <DatePicker
                        picker="month"
                        value={commissionMonth}
                        onChange={(date) => {
                          setCommissionMonth(date);
                          loadCommissionData(
                            selectedStaff.id,
                            selectedStaff.commissionRate ?? selectedStaff.commission_rate ?? 0,
                            date
                          );
                        }}
                        format="MM/YYYY"
                      />
                    </div>
                    {commissionData ? (
                      <>
                        <Row gutter={16} style={{ marginBottom: 20 }}>
                          <Col span={8}>
                            <Statistic title="Doanh Số" value={commissionData.totalRevenue} suffix="₫"
                              formatter={(v) => Number(v).toLocaleString('vi-VN')} />
                          </Col>
                          <Col span={8}>
                            <Statistic title="Tỷ Lệ" value={Number(commissionData.commissionRate || 0).toFixed(1)} suffix="%" />
                          </Col>
                          <Col span={8}>
                            <Statistic title="Hoa Hồng" value={commissionData.totalCommission} suffix="₫"
                              formatter={(v) => Number(v).toLocaleString('vi-VN')}
                              valueStyle={{ color: '#ff69b4', fontWeight: 'bold' }} />
                          </Col>
                        </Row>
                        {commissionData.transactions.length > 0 ? (
                          <Table
                            columns={[
                              {
                                title: 'Ngày', key: 'date', width: 120,
                                render: (_, r) => formatDate(r.date || r.createdAt),
                              },
                              {
                                title: 'Khách Hàng', key: 'customer', width: 130,
                                render: (_, r) => r.customerName || r.customer_name || '-',
                              },
                              {
                                title: 'Số Tiền', dataIndex: 'amount', key: 'amount', width: 130,
                                render: (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫`,
                              },
                              {
                                title: 'Hoa Hồng', key: 'comm', width: 120,
                                render: (_, r) => {
                                  const comm = Number(r.commissionAmount ?? r.commission_amount) || 0;
                                  return <span style={{ color: '#ff69b4' }}>{comm.toLocaleString('vi-VN')} ₫</span>;
                                },
                              },
                              {
                                title: '', key: 'del', width: 50,
                                render: (_, r) => (
                                  <Popconfirm
                                    title="Xóa giao dịch này?"
                                    description="Hành động không thể hoàn tác."
                                    onConfirm={guardAction(async () => {
                                      try {
                                        await invoke('db:transactions:update', r.id, {
                                          deleted: true,
                                          transactionType: 'deleted',
                                          transaction_type: 'deleted',
                                        });
                                        message.success('Đã xóa');
                                        loadCommissionData(
                                          selectedStaff.id,
                                          selectedStaff.commissionRate ?? selectedStaff.commission_rate ?? 0,
                                          commissionMonth
                                        );
                                      } catch (error) {
                                        message.error('Lỗi: ' + error.message);
                                      }
                                    })}
                                    okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                                  >
                                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                  </Popconfirm>
                                ),
                              },
                            ]}
                            dataSource={commissionData.transactions.map((t, i) => ({ ...t, key: t.id || i }))}
                            pagination={false}
                            size="small"
                          />
                        ) : (
                          <Empty description="Không có doanh số tháng này" />
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
        ) : null}
      </Drawer>

      {/* Check In Modal */}
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
          onValuesChange={(changed) => {
            // Auto-detect late status when check-in time changes
            if (changed.checkInTime) {
              checkInForm.setFieldsValue({ status: getAutoStatus(changed.checkInTime) });
            }
            // Auto-calculate hours worked when check-out time changes
            if (changed.checkOutTime && checkInForm.getFieldValue('checkInTime')) {
              const checkIn = checkInForm.getFieldValue('checkInTime');
              const checkOut = changed.checkOutTime;
              const hours = parseFloat(
                checkOut.diff(checkIn, 'hour', true).toFixed(1)
              );
              checkInForm.setFieldsValue({ hoursWorked: hours });
            }
          }}
        >
          <Form.Item
            label={<span>Giờ Check In (*) <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>— Vào sau 09:00 = Đi Muộn, Ra trước 17:00 = Về Sớm</span></span>}
            name="checkInTime"
            rules={[{ required: true, message: 'Nhập giờ check in' }]}
          >
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder="Chọn giờ check in"
            />
          </Form.Item>
          <Form.Item label="Giờ Check Out (tuỳ chọn)" name="checkOutTime">
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder="Chọn giờ check out"
            />
          </Form.Item>
          <Form.Item label="Giờ Làm" name="hoursWorked">
            <InputNumber
              min={0}
              max={24}
              step={0.5}
              style={{ width: '100%' }}
              placeholder="Tự động tính nếu có check out"
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
          <Form.Item label="Ghi Chú" name="notes">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm nếu cần" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

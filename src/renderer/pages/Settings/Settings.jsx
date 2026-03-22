import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, message, Spin, Tabs, Space,
  Divider, Select, Modal, Descriptions, Tag, InputNumber,
} from 'antd';
import {
  SettingOutlined, BankOutlined, ShopOutlined, LockOutlined,
  SaveOutlined, KeyOutlined, DeleteOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useAPI } from '../../hooks/useAPI';

export default function Settings({ onSpaNameChange }) {
  const { invoke } = useAPI();
  const [spaForm] = Form.useForm();
  const [bankForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [changePasswordForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [settings, setSettings] = useState({});
  const [resetting, setResetting] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const safeFetch = async (key) => {
    try {
      const res = await invoke('db:settings:get', key);
      return res.success ? res.data : {};
    } catch {
      return {};
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [spa, bank, security, workTime] = await Promise.all([
        safeFetch('spa'),
        safeFetch('bank'),
        safeFetch('security'),
        safeFetch('workTime'),
      ]);

      setSettings({ spa, bank, security, workTime });

      spaForm.setFieldsValue({
        name: spa.name || 'SPA VIP',
        address: spa.address || '',
        phone: spa.phone || '',
        email: spa.email || '',
      });

      bankForm.setFieldsValue({
        bankId: bank.bankId || 'MB',
        accountNo: bank.accountNo || '',
        accountName: bank.accountName || '',
        bankName: bank.bankName || '',
      });
    } catch (error) {
      console.error('[Settings] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============ UNLOCK ============
  const handleUnlock = async (values) => {
    const stored = await safeFetch('security');
    const password = stored.password || '123456'; // default password

    if (values.password === password) {
      setIsLocked(false);
      setShowPasswordModal(false);
      passwordForm.resetFields();
      message.success('Đã mở khóa cài đặt');
    } else {
      message.error('Sai mật khẩu');
    }
  };

  // ============ SAVE ============
  const handleSaveSpa = async (values) => {
    if (isLocked) {
      setShowPasswordModal(true);
      return;
    }
    setSaving(true);
    try {
      await invoke('db:settings:set', 'spa', values);
      message.success('Lưu thông tin spa thành công');
      setSettings(prev => ({ ...prev, spa: values }));
      if (onSpaNameChange && values.name) {
        onSpaNameChange(values.name);
      }
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async (values) => {
    if (isLocked) {
      setShowPasswordModal(true);
      return;
    }
    setSaving(true);
    try {
      await invoke('db:settings:set', 'bank', values);
      message.success('Lưu thông tin ngân hàng thành công');
      setSettings(prev => ({ ...prev, bank: values }));
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (values) => {
    try {
      const stored = await safeFetch('security');
      const currentPassword = stored.password || '123456';

      if (values.currentPassword !== currentPassword) {
        message.error('Mật khẩu hiện tại không đúng');
        return;
      }
      if (values.newPassword !== values.confirmPassword) {
        message.error('Mật khẩu mới không khớp');
        return;
      }

      await invoke('db:settings:set', 'security', { password: values.newPassword });
      message.success('Đổi mật khẩu thành công');
      setShowChangePasswordModal(false);
      changePasswordForm.resetFields();
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    }
  };

  const handleSaveWorkTime = async (values) => {
    if (isLocked) {
      setShowPasswordModal(true);
      return;
    }
    setSaving(true);
    try {
      await invoke('db:settings:set', 'workTime', values);
      message.success('Lưu giờ làm việc thành công');
      setSettings(prev => ({ ...prev, workTime: values }));
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============ RESET DATA ============
  const handleResetCollection = async (collection, label) => {
    if (isLocked) { setShowPasswordModal(true); return; }
    setResetting(true);
    try {
      const result = await invoke(`db:${collection}:getAll`);
      const items = result.data || result || [];
      let deleted = 0;
      for (const item of items) {
        try {
          await invoke(`db:${collection}:delete`, item.id);
          deleted++;
        } catch {}
      }
      message.success(`Đã xóa ${deleted} ${label}`);
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    } finally {
      setResetting(false);
    }
  };

  const handleResetTransactions = async () => {
    if (isLocked) { setShowPasswordModal(true); return; }
    setResetting(true);
    try {
      const result = await invoke('db:transactions:getAll');
      const items = result.data || result || [];
      let deleted = 0;
      for (const item of items) {
        try {
          await invoke('db:transactions:update', item.id, {
            deleted: true, transactionType: 'deleted', transaction_type: 'deleted',
          });
          deleted++;
        } catch {}
      }
      message.success(`Đã xóa ${deleted} giao dịch`);
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    } finally {
      setResetting(false);
    }
  };

  const handleResetAttendance = async () => {
    if (isLocked) { setShowPasswordModal(true); return; }
    setResetting(true);
    try {
      const result = await invoke('db:query', 'attendance', []);
      const items = result.data || result || [];
      let deleted = 0;
      for (const item of items) {
        try {
          await invoke('db:attendance:update', item.id, { deleted: true, status: 'deleted' });
          deleted++;
        } catch {}
      }
      message.success(`Đã xóa ${deleted} chấm công`);
    } catch (error) {
      message.error('Lỗi: ' + error.message);
    } finally {
      setResetting(false);
    }
  };

  // ============ QR PREVIEW ============
  const bankValues = bankForm.getFieldsValue();
  const qrPreviewUrl = bankValues.bankId && bankValues.accountNo
    ? `https://img.vietqr.io/image/${bankValues.bankId}-${bankValues.accountNo}-compact2.png?amount=100000&addInfo=Test&accountName=${encodeURIComponent(bankValues.accountName || '')}`
    : null;

  if (loading) return <Spin style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  return (
    <Card
      title={
        <span>
          <SettingOutlined style={{ marginRight: 8 }} />
          Cài Đặt Hệ Thống
        </span>
      }
      extra={
        <Space>
          {isLocked ? (
            <Button
              icon={<LockOutlined />}
              onClick={() => setShowPasswordModal(true)}
              type="primary"
              style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
            >
              Mở Khóa Để Sửa
            </Button>
          ) : (
            <Tag color="green">Đã mở khóa</Tag>
          )}
          <Button
            icon={<KeyOutlined />}
            onClick={() => setShowChangePasswordModal(true)}
          >
            Đổi Mật Khẩu
          </Button>
        </Space>
      }
    >
      <Tabs
        items={[
          {
            key: 'spa',
            label: <span><ShopOutlined /> Thông Tin Spa</span>,
            children: (
              <Form
                form={spaForm}
                layout="vertical"
                onFinish={handleSaveSpa}
                disabled={isLocked}
                style={{ maxWidth: 600 }}
              >
                <Form.Item
                  label="Tên Spa"
                  name="name"
                  rules={[{ required: true, message: 'Nhập tên spa' }]}
                >
                  <Input placeholder="VD: SPA VIP" />
                </Form.Item>
                <Form.Item label="Địa Chỉ" name="address">
                  <Input placeholder="Nhập địa chỉ spa" />
                </Form.Item>
                <Form.Item label="Số Điện Thoại" name="phone">
                  <Input placeholder="Nhập số điện thoại" />
                </Form.Item>
                <Form.Item label="Email" name="email">
                  <Input placeholder="Nhập email" />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  disabled={isLocked}
                  style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
                >
                  Lưu Thông Tin
                </Button>
              </Form>
            ),
          },
          {
            key: 'bank',
            label: <span><BankOutlined /> Ngân Hàng</span>,
            children: (
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <Form
                  form={bankForm}
                  layout="vertical"
                  onFinish={handleSaveBank}
                  disabled={isLocked}
                  style={{ flex: 1, minWidth: 350 }}
                  onValuesChange={() => {
                    // Force re-render for QR preview
                    bankForm.validateFields().catch(() => {});
                  }}
                >
                  <Form.Item
                    label="Ngân Hàng"
                    name="bankId"
                    rules={[{ required: true, message: 'Chọn ngân hàng' }]}
                  >
                    <Select
                      placeholder="Chọn ngân hàng"
                      showSearch
                      optionFilterProp="label"
                      options={[
                        { label: 'MB Bank', value: 'MB' },
                        { label: 'Vietcombank (VCB)', value: 'VCB' },
                        { label: 'Techcombank (TCB)', value: 'TCB' },
                        { label: 'ACB', value: 'ACB' },
                        { label: 'BIDV', value: 'BIDV' },
                        { label: 'VPBank', value: 'VPB' },
                        { label: 'Agribank', value: 'AGR' },
                        { label: 'Sacombank (STB)', value: 'STB' },
                        { label: 'TPBank', value: 'TPB' },
                        { label: 'VietinBank (CTG)', value: 'CTG' },
                        { label: 'HDBank', value: 'HDB' },
                        { label: 'OCB', value: 'OCB' },
                        { label: 'SHB', value: 'SHB' },
                        { label: 'MSB', value: 'MSB' },
                        { label: 'VIB', value: 'VIB' },
                        { label: 'SeABank', value: 'SEAB' },
                        { label: 'LienVietPostBank', value: 'LPB' },
                        { label: 'Eximbank', value: 'EIB' },
                        { label: 'BaoViet Bank', value: 'BVB' },
                        { label: 'Nam A Bank', value: 'NAB' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item label="Tên Ngân Hàng (hiển thị)" name="bankName">
                    <Input placeholder="VD: MB Bank" />
                  </Form.Item>
                  <Form.Item
                    label="Số Tài Khoản"
                    name="accountNo"
                    rules={[{ required: true, message: 'Nhập số tài khoản' }]}
                  >
                    <Input placeholder="Nhập số tài khoản" />
                  </Form.Item>
                  <Form.Item
                    label="Tên Chủ Tài Khoản"
                    name="accountName"
                    rules={[{ required: true, message: 'Nhập tên chủ TK' }]}
                  >
                    <Input placeholder="Nhập tên chủ tài khoản" />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={saving}
                    disabled={isLocked}
                    style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
                  >
                    Lưu Ngân Hàng
                  </Button>
                </Form>

                {/* QR Preview */}
                <div style={{ minWidth: 250, textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>Xem Trước QR</div>
                  {qrPreviewUrl ? (
                    <div style={{ padding: 16, background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0' }}>
                      <img
                        src={qrPreviewUrl}
                        alt="QR Preview"
                        style={{ width: 220, height: 'auto', borderRadius: 8 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                        {bankValues.bankId} — {bankValues.accountNo}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {bankValues.accountName}
                      </div>
                      <div style={{ fontSize: 11, color: '#52c41a', marginTop: 4 }}>
                        (Mẫu: 100,000₫)
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 40, background: '#fafafa', borderRadius: 12, color: '#ccc' }}>
                      Nhập thông tin ngân hàng để xem QR
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'workTime',
            label: <span><SettingOutlined /> Giờ Làm Việc</span>,
            children: (
              <Form
                layout="vertical"
                onFinish={handleSaveWorkTime}
                disabled={isLocked}
                style={{ maxWidth: 400 }}
                initialValues={{
                  lateHour: settings.workTime?.lateHour ?? 9,
                  lateMinute: settings.workTime?.lateMinute ?? 0,
                  endHour: settings.workTime?.endHour ?? 17,
                  endMinute: settings.workTime?.endMinute ?? 0,
                  pointRate: settings.workTime?.pointRate ?? 10000,
                }}
              >
                <Divider orientation="left" style={{ fontSize: 13 }}>Chấm Công</Divider>
                <div style={{ display: 'flex', gap: 16 }}>
                  <Form.Item label="Giờ vào (muộn sau)" name="lateHour">
                    <InputNumber min={0} max={23} style={{ width: '100%' }} addonAfter="giờ" />
                  </Form.Item>
                  <Form.Item label="Phút" name="lateMinute">
                    <InputNumber min={0} max={59} style={{ width: '100%' }} addonAfter="phút" />
                  </Form.Item>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <Form.Item label="Giờ tan làm (sớm trước)" name="endHour">
                    <InputNumber min={0} max={23} style={{ width: '100%' }} addonAfter="giờ" />
                  </Form.Item>
                  <Form.Item label="Phút" name="endMinute">
                    <InputNumber min={0} max={59} style={{ width: '100%' }} addonAfter="phút" />
                  </Form.Item>
                </div>
                <Divider orientation="left" style={{ fontSize: 13 }}>Tích Điểm</Divider>
                <Form.Item label="Mỗi bao nhiêu VNĐ = 1 điểm" name="pointRate">
                  <InputNumber min={1000} step={1000} style={{ width: '100%' }} addonAfter="VNĐ" />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  disabled={isLocked}
                  style={{ background: '#ff69b4', borderColor: '#ff69b4' }}
                >
                  Lưu Cài Đặt
                </Button>
              </Form>
            ),
          },
          {
            key: 'data',
            label: <span><DeleteOutlined /> Quản Lý Dữ Liệu</span>,
            children: (
              <div>
                {isLocked && (
                  <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8 }}>
                    <WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
                    <span style={{ color: '#fa8c16' }}>Cần mở khóa để thực hiện xóa dữ liệu</span>
                    <Button size="small" style={{ marginLeft: 12 }} onClick={() => setShowPasswordModal(true)}>Mở Khóa</Button>
                  </div>
                )}
                <div style={{ marginBottom: 16, padding: 16, background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: '#f5222d', marginBottom: 8 }}>
                    <WarningOutlined /> Xóa Toàn Bộ Dữ Liệu Test
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
                    Dùng khi bàn giao app cho khách — xóa tất cả dữ liệu thử nghiệm để bắt đầu từ đầu. Hành động không thể hoàn tác!
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {[
                      { collection: 'transactions', label: 'giao dịch', color: '#f5222d', title: 'Xóa Giao Dịch', isSpecial: true },
                      { collection: 'bookings', label: 'đặt lịch', color: '#fa8c16', title: 'Xóa Đặt Lịch' },
                      { collection: 'customers', label: 'khách hàng', color: '#1890ff', title: 'Xóa Khách Hàng' },
                      { collection: 'attendance', label: 'chấm công', color: '#722ed1', title: 'Xóa Chấm Công', isAttendance: true },
                    ].map(({ collection, label, color, title, isSpecial, isAttendance }) => (
                      <div key={collection} style={{ border: `1px solid ${color}30`, borderRadius: 8, padding: 12, minWidth: 160, background: '#fafafa' }}>
                        <div style={{ fontWeight: 600, color, marginBottom: 8 }}>{title}</div>
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          loading={resetting}
                          disabled={isLocked}
                          onClick={() => isSpecial ? handleResetTransactions() : isAttendance ? handleResetAttendance() : handleResetCollection(collection, label)}
                        >
                          Xóa tất cả {label}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 16, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, color: '#52c41a', marginBottom: 8 }}>Lưu Ý Khi Bàn Giao App</div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#555', fontSize: 13 }}>
                    <li>Xóa giao dịch → báo cáo về 0</li>
                    <li>Xóa đặt lịch → lịch hẹn sạch</li>
                    <li>Xóa khách hàng → danh sách trống</li>
                    <li>Xóa chấm công → lịch sử về trắng</li>
                    <li style={{ color: '#fa8c16' }}>Nhân viên, dịch vụ, sản phẩm <strong>không bị xóa</strong></li>
                    <li style={{ color: '#fa8c16' }}>Cài đặt (tên spa, ngân hàng, mật khẩu) <strong>giữ nguyên</strong></li>
                  </ul>
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* Unlock Password Modal */}
      <Modal
        title="Nhập Mật Khẩu"
        open={showPasswordModal}
        onCancel={() => { setShowPasswordModal(false); passwordForm.resetFields(); }}
        onOk={() => passwordForm.submit()}
        okText="Mở Khóa"
        cancelText="Hủy"
      >
        <Form form={passwordForm} onFinish={handleUnlock} layout="vertical">
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Nhập mật khẩu' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu để chỉnh sửa" autoFocus />
          </Form.Item>
          <div style={{ fontSize: 12, color: '#888' }}>
            Mật khẩu mặc định: 123456
          </div>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title="Đổi Mật Khẩu"
        open={showChangePasswordModal}
        onCancel={() => { setShowChangePasswordModal(false); changePasswordForm.resetFields(); }}
        onOk={() => changePasswordForm.submit()}
        okText="Đổi Mật Khẩu"
        cancelText="Hủy"
      >
        <Form form={changePasswordForm} onFinish={handleChangePassword} layout="vertical">
          <Form.Item
            label="Mật khẩu hiện tại"
            name="currentPassword"
            rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
          >
            <Input.Password placeholder="Mật khẩu hiện tại" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[{ required: true, message: 'Nhập mật khẩu mới' }, { min: 4, message: 'Tối thiểu 4 ký tự' }]}
          >
            <Input.Password placeholder="Mật khẩu mới" />
          </Form.Item>
          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            rules={[{ required: true, message: 'Xác nhận mật khẩu' }]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

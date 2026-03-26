import React, { useState, useEffect } from 'react';
import { Card, Input, Button, message, Typography, Space, Tag, Divider, Spin } from 'antd';
import { KeyOutlined, LockOutlined, CheckCircleOutlined, CopyOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function LicenseGate({ children }) {
  const [licensed, setLicensed] = useState(null); // null = loading, true/false
  const [machineId, setMachineId] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [activating, setActivating] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState(null);

  const ipc = window.electron || window.ipc;

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      const result = await ipc.invoke('license:check');
      if (result.valid) {
        setLicensed(true);
        setLicenseInfo(result);
      } else {
        setLicensed(false);
        setLicenseInfo(result);
      }
      const mid = await ipc.invoke('license:getMachineId');
      setMachineId(mid);
    } catch (error) {
      // In dev mode or if handler doesn't exist, allow access
      setLicensed(true);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      message.warning('Vui lòng nhập key bản quyền');
      return;
    }
    if (!expiryDate.trim()) {
      message.warning('Vui lòng nhập ngày hết hạn');
      return;
    }

    setActivating(true);
    try {
      const result = await ipc.invoke('license:activate', licenseKey.trim().toUpperCase(), expiryDate.trim());
      if (result.success) {
        message.success('Kích hoạt bản quyền thành công!');
        setLicensed(true);
        setLicenseInfo({ valid: true, expiry: result.expiry });
      } else {
        message.error(result.error || 'Key không hợp lệ');
      }
    } catch (error) {
      message.error('Lỗi kích hoạt: ' + error.message);
    } finally {
      setActivating(false);
    }
  };

  const copyMachineId = () => {
    navigator.clipboard.writeText(machineId).then(() => {
      message.success('Đã copy Mã Máy');
    }).catch(() => {
      message.info(`Mã máy: ${machineId}`);
    });
  };

  // Loading state
  if (licensed === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
        <Spin size="large" tip="Đang kiểm tra bản quyền..." />
      </div>
    );
  }

  // Licensed - show app
  if (licensed) {
    return children;
  }

  // Not licensed - show activation screen
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #ff69b4 100%)',
    }}>
      <Card
        style={{ width: 480, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        bodyStyle={{ padding: 32 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <LockOutlined style={{ fontSize: 48, color: '#ff69b4', marginBottom: 12 }} />
          <Title level={3} style={{ margin: 0, color: '#333' }}>SPA VIP Management</Title>
          <Text type="secondary">Kích hoạt bản quyền để sử dụng</Text>
        </div>

        {licenseInfo?.reason === 'expired' && (
          <div style={{ padding: 12, background: '#fff2e8', border: '1px solid #ffd591', borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>
            <Text type="warning">Bản quyền đã hết hạn ({licenseInfo.expiry})</Text>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 12, color: '#888' }}>MÃ MÁY (gửi cho nhà cung cấp)</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Input
              value={machineId}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, letterSpacing: 2 }}
            />
            <Button icon={<CopyOutlined />} onClick={copyMachineId}>Copy</Button>
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 12, color: '#888' }}>KEY BẢN QUYỀN</Text>
          <Input
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={licenseKey}
            onChange={e => setLicenseKey(e.target.value.toUpperCase())}
            style={{ marginTop: 4, fontFamily: 'monospace', fontSize: 16, letterSpacing: 2 }}
            maxLength={19}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ fontSize: 12, color: '#888' }}>NGÀY HẾT HẠN</Text>
          <Input
            placeholder="2027-12-31"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            style={{ marginTop: 4, fontFamily: 'monospace' }}
            maxLength={10}
          />
        </div>

        <Button
          type="primary"
          block
          size="large"
          icon={<KeyOutlined />}
          loading={activating}
          onClick={handleActivate}
          style={{ background: '#ff69b4', borderColor: '#ff69b4', height: 48, fontSize: 16, borderRadius: 8 }}
        >
          Kích Hoạt Bản Quyền
        </Button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Liên hệ nhà cung cấp để nhận key bản quyền
          </Text>
        </div>
      </Card>
    </div>
  );
}

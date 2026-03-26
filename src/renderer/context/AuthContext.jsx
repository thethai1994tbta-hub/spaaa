import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [form] = Form.useForm();

  // Fetch password from DB
  const getPassword = async () => {
    try {
      const ipc = window.electron || window.ipc;
      if (!ipc) return '123456';
      const result = await ipc.invoke('db:settings:get', 'security');
      if (result.success && result.data?.password) {
        return result.data.password;
      }
    } catch {}
    return '123456'; // default
  };

  // Call this before any destructive action (edit/delete)
  // Returns true if unlocked, false if locked (will show modal)
  const requireAuth = useCallback((action) => {
    if (isUnlocked) return true;
    setPendingAction(() => action);
    setShowModal(true);
    return false;
  }, [isUnlocked]);

  // Wrap a handler: only executes if unlocked
  const guardAction = useCallback((action) => {
    return (...args) => {
      if (isUnlocked) {
        return action(...args);
      }
      setPendingAction(() => () => action(...args));
      setShowModal(true);
    };
  }, [isUnlocked]);

  const handleUnlock = async (values) => {
    const password = await getPassword();
    if (values.password === password) {
      setIsUnlocked(true);
      setShowModal(false);
      form.resetFields();
      message.success('Đã mở khóa');
      // Execute pending action
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } else {
      message.error('Sai mật khẩu');
    }
  };

  const lock = () => {
    setIsUnlocked(false);
    message.info('Đã khóa');
  };

  return (
    <AuthContext.Provider value={{ isUnlocked, requireAuth, guardAction, lock }}>
      {children}

      <Modal
        title={<span><LockOutlined /> Nhập Mật Khẩu</span>}
        open={showModal}
        onCancel={() => { setShowModal(false); form.resetFields(); setPendingAction(null); }}
        onOk={() => form.submit()}
        okText="Mở Khóa"
        cancelText="Hủy"
        okButtonProps={{ style: { background: '#ff69b4', borderColor: '#ff69b4' } }}
      >
        <Form form={form} onFinish={handleUnlock} layout="vertical">
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Nhập mật khẩu' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu để thực hiện" autoFocus />
          </Form.Item>
          <div style={{ fontSize: 12, color: '#888' }}>
            Mật khẩu mặc định: 123456
          </div>
        </Form>
      </Modal>
    </AuthContext.Provider>
  );
}

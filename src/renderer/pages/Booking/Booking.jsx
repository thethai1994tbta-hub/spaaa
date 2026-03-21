import React from 'react';
import { Card, Button, Table, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export default function Booking() {
  return (
    <div>
      <Card title="Quan Ly Dat Lich" extra={<Button type="primary" icon={<PlusOutlined />}>Them</Button>}>
        <Table columns={[{ title: 'Khach Hang', dataIndex: 'customer_name', key: 'customer_name' }]} dataSource={[]} />
      </Card>
    </div>
  );
}

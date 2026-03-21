import React from 'react';
import { Card, Table } from 'antd';
export default function Inventory() {
  return <Card title="Quan Ly Kho Hang"><Table columns={[{title:'San Pham',dataIndex:'name',key:'name'}]} dataSource={[]} /></Card>;
}

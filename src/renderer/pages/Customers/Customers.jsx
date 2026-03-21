import React from 'react';
import { Card, Table } from 'antd';
export default function Customers() {
  return <Card title="Quan Ly Khach Hang"><Table columns={[{title:'Ho Ten',dataIndex:'name',key:'name'}]} dataSource={[]} /></Card>;
}

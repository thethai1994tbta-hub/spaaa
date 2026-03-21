import React from 'react';
import { Card, Tabs, Table } from 'antd';
export default function Staff() {
  return <Tabs items={[{key:'staff',label:'Nhan Vien',children:<Card title="Nhan Vien"><Table columns={[{title:'Ten',dataIndex:'name'}]} dataSource={[]} /></Card>}]} />;
}

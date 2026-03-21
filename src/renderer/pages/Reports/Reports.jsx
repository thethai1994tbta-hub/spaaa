import React from 'react';
import { Card, Table, Space, Button } from 'antd';
export default function Reports() {
  return <Card title="Bao Cao"><Space><Button>Xuat Excel</Button><Button>Xuat PDF</Button></Space><Table columns={[{title:'Thong Ke',dataIndex:'name'}]} dataSource={[]} /></Card>;
}

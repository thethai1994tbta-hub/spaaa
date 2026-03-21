import React from 'react';
import { Card, Button, Form, InputNumber, Row, Col } from 'antd';
export default function Payment() {
  return <Card title="Thanh Toan"><Form><Form.Item label="So Tien"><InputNumber style={{width:'100%'}} /></Form.Item></Form></Card>;
}

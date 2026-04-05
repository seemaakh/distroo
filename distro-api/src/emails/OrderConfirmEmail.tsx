import React from 'react';
import { Html, Head, Body, Container, Section, Row, Column, Heading, Text, Button, Hr } from '@react-email/components';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

interface OrderConfirmEmailProps {
  orderNumber: string;
  storeName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryDistrict: string;
  paymentMethod: string;
}

export function OrderConfirmEmail({
  orderNumber,
  storeName,
  items,
  subtotal,
  deliveryFee,
  total,
  deliveryDistrict,
  paymentMethod,
}: OrderConfirmEmailProps): React.ReactElement {
  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DISTRO</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Order Confirmed — {orderNumber}</Heading>
            <Text style={subtext}>Thank you {storeName}, your order is being processed.</Text>

            {/* Items table header */}
            <Row style={tableHeader}>
              <Column style={{ ...th, width: '45%' }}>Item</Column>
              <Column style={{ ...th, width: '15%' }}>Qty</Column>
              <Column style={{ ...th, width: '20%' }}>Unit Price</Column>
              <Column style={{ ...th, width: '20%' }}>Total</Column>
            </Row>

            {/* Items rows */}
            {items.map((item, i) => (
              <Row key={i} style={i % 2 === 0 ? rowEven : rowOdd}>
                <Column style={{ ...td, width: '45%' }}>{item.name}</Column>
                <Column style={{ ...td, width: '15%' }}>{item.qty}</Column>
                <Column style={{ ...td, width: '20%' }}>Rs {item.price.toFixed(2)}</Column>
                <Column style={{ ...td, width: '20%' }}>Rs {item.total.toFixed(2)}</Column>
              </Row>
            ))}

            {/* Totals */}
            <Row style={totalRow}>
              <Column style={{ width: '60%' }}></Column>
              <Column style={{ ...td, width: '40%' }}>Subtotal: Rs {subtotal.toFixed(2)}</Column>
            </Row>
            <Row style={totalRow}>
              <Column style={{ width: '60%' }}></Column>
              <Column style={{ ...td, width: '40%' }}>Delivery: Rs {deliveryFee.toFixed(2)}</Column>
            </Row>
            <Row style={{ ...totalRow, backgroundColor: '#1A4BDB' }}>
              <Column style={{ width: '60%' }}></Column>
              <Column style={{ ...td, width: '40%', color: '#ffffff', fontWeight: 'bold' }}>
                Total: Rs {total.toFixed(2)}
              </Column>
            </Row>

            <Hr style={hr} />
            <Text style={metaLine}>Delivery to: <strong>{deliveryDistrict}</strong></Text>
            <Text style={metaLine}>Payment: <strong>{paymentMethod}</strong></Text>

            <Button style={btn} href="https://distronepal.com/track">
              Track Your Order
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>DISTRO Nepal Pvt Ltd — distronepal.com</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body:        React.CSSProperties = { backgroundColor: '#F7F9FF', fontFamily: 'system-ui, sans-serif' };
const container:   React.CSSProperties = { maxWidth: '600px', margin: '0 auto', padding: '24px 0' };
const header:      React.CSSProperties = { backgroundColor: '#1A4BDB', padding: '20px 32px', borderRadius: '8px 8px 0 0' };
const logo:        React.CSSProperties = { color: '#ffffff', fontWeight: 'bold', fontSize: '24px', margin: 0 };
const content:     React.CSSProperties = { backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px' };
const h1:          React.CSSProperties = { color: '#0D1120', fontSize: '20px', fontWeight: 'bold', margin: '0 0 6px' };
const subtext:     React.CSSProperties = { color: '#555555', fontSize: '14px', margin: '0 0 24px' };
const tableHeader: React.CSSProperties = { backgroundColor: '#1A4BDB', borderRadius: '4px 4px 0 0' };
const th:          React.CSSProperties = { color: '#ffffff', fontSize: '13px', fontWeight: 'bold', padding: '8px 6px' };
const td:          React.CSSProperties = { color: '#0D1120', fontSize: '13px', padding: '8px 6px' };
const rowEven:     React.CSSProperties = { backgroundColor: '#F7F9FF' };
const rowOdd:      React.CSSProperties = { backgroundColor: '#ffffff' };
const totalRow:    React.CSSProperties = { borderTop: '1px solid #e5e7eb' };
const hr:          React.CSSProperties = { borderColor: '#e5e7eb', margin: '20px 0' };
const metaLine:    React.CSSProperties = { color: '#0D1120', fontSize: '14px', margin: '0 0 6px' };
const btn:         React.CSSProperties = { backgroundColor: '#00C46F', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', textDecoration: 'none', display: 'inline-block', marginTop: '16px' };
const footer:      React.CSSProperties = { color: '#9ca3af', fontSize: '12px', textAlign: 'center', margin: 0 };

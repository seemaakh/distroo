import React from 'react';
import { Html, Head, Body, Container, Section, Heading, Text, Button, Hr } from '@react-email/components';

interface PaymentConfirmEmailProps {
  orderNumber: string;
  storeName: string;
  amount: number;
  method: string;
  reference?: string;
}

export function PaymentConfirmEmail({ orderNumber, storeName, amount, method, reference }: PaymentConfirmEmailProps): React.ReactElement {
  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DISTRO</Text>
          </Section>

          <Section style={content}>
            {/* Green checkmark */}
            <Section style={checkCircle}>
              <Text style={checkMark}>✓</Text>
            </Section>

            <Heading style={h1}>Payment Confirmed</Heading>
            <Text style={text}>
              Hi {storeName}, we've received your payment for order <strong>{orderNumber}</strong>.
            </Text>

            {/* Payment summary box */}
            <Section style={summaryBox}>
              <Text style={summaryRow}><strong>Amount:</strong>    Rs {amount.toFixed(2)}</Text>
              <Text style={summaryRow}><strong>Method:</strong>    {method}</Text>
              <Text style={summaryRow}><strong>Reference:</strong> {reference ?? 'N/A'}</Text>
              <Text style={summaryRow}><strong>Order:</strong>     {orderNumber}</Text>
            </Section>

            <Button style={btn} href="https://distronepal.com/orders">
              View Order
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>DISTRO Nepal Pvt Ltd — distronepal.com</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body:       React.CSSProperties = { backgroundColor: '#F7F9FF', fontFamily: 'system-ui, sans-serif' };
const container:  React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '24px 0' };
const header:     React.CSSProperties = { backgroundColor: '#1A4BDB', padding: '20px 32px', borderRadius: '8px 8px 0 0' };
const logo:       React.CSSProperties = { color: '#ffffff', fontWeight: 'bold', fontSize: '24px', margin: 0 };
const content:    React.CSSProperties = { backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px', textAlign: 'center' };
const checkCircle:React.CSSProperties = { width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#00C46F', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const checkMark:  React.CSSProperties = { color: '#ffffff', fontSize: '28px', fontWeight: 'bold', margin: 0, lineHeight: '60px' };
const h1:         React.CSSProperties = { color: '#0D1120', fontSize: '22px', fontWeight: 'bold', margin: '0 0 12px' };
const text:       React.CSSProperties = { color: '#0D1120', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' };
const summaryBox: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px 24px', textAlign: 'left', margin: '0 0 24px' };
const summaryRow: React.CSSProperties = { color: '#0D1120', fontSize: '14px', margin: '0 0 8px', fontFamily: 'monospace, system-ui' };
const btn:        React.CSSProperties = { backgroundColor: '#1A4BDB', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', textDecoration: 'none', display: 'inline-block' };
const hr:         React.CSSProperties = { borderColor: '#e5e7eb', margin: '24px 0 16px' };
const footer:     React.CSSProperties = { color: '#9ca3af', fontSize: '12px', textAlign: 'center', margin: 0 };

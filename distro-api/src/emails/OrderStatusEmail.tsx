import React from 'react';
import { Html, Head, Body, Container, Section, Heading, Text, Button, Hr } from '@react-email/components';

interface OrderStatusEmailProps {
  orderNumber: string;
  storeName: string;
  newStatus: string;
  message?: string;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:  '#1A4BDB',
  PROCESSING: '#F59E0B',
  DISPATCHED: '#8B5CF6',
  DELIVERED:  '#00C46F',
  CANCELLED:  '#EF4444',
};

export function OrderStatusEmail({ orderNumber, storeName, newStatus, message }: OrderStatusEmailProps): React.ReactElement {
  const badgeColor = STATUS_COLORS[newStatus] ?? '#6B7280';

  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DISTRO</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Order Update — {orderNumber}</Heading>

            {/* Status badge */}
            <Section style={{ ...badge, backgroundColor: badgeColor }}>
              <Text style={badgeText}>{newStatus}</Text>
            </Section>

            <Text style={text}>
              Hi {storeName}, your order status has been updated to <strong>{newStatus}</strong>.
            </Text>

            {message && <Text style={msgText}>{message}</Text>}

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

const body:      React.CSSProperties = { backgroundColor: '#F7F9FF', fontFamily: 'system-ui, sans-serif' };
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '24px 0' };
const header:    React.CSSProperties = { backgroundColor: '#1A4BDB', padding: '20px 32px', borderRadius: '8px 8px 0 0' };
const logo:      React.CSSProperties = { color: '#ffffff', fontWeight: 'bold', fontSize: '24px', margin: 0 };
const content:   React.CSSProperties = { backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px' };
const h1:        React.CSSProperties = { color: '#0D1120', fontSize: '20px', fontWeight: 'bold', margin: '0 0 20px' };
const badge:     React.CSSProperties = { display: 'inline-block', borderRadius: '20px', padding: '6px 20px', marginBottom: '20px' };
const badgeText: React.CSSProperties = { color: '#ffffff', fontWeight: 'bold', fontSize: '14px', margin: 0, letterSpacing: '0.5px' };
const text:      React.CSSProperties = { color: '#0D1120', fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px' };
const msgText:   React.CSSProperties = { color: '#555555', fontSize: '14px', fontStyle: 'italic', margin: '0 0 16px' };
const btn:       React.CSSProperties = { backgroundColor: '#1A4BDB', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', textDecoration: 'none', display: 'inline-block', marginTop: '8px' };
const hr:        React.CSSProperties = { borderColor: '#e5e7eb', margin: '24px 0 16px' };
const footer:    React.CSSProperties = { color: '#9ca3af', fontSize: '12px', textAlign: 'center', margin: 0 };

import React from 'react';
import { Html, Head, Body, Container, Section, Heading, Text, Button, Hr } from '@react-email/components';

interface WelcomeEmailProps {
  storeName: string;
  phone: string;
}

export function WelcomeEmail({ storeName, phone }: WelcomeEmailProps): React.ReactElement {
  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          {/* Logo */}
          <Section style={header}>
            <Text style={logo}>DISTRO</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Welcome to DISTRO, {storeName}!</Heading>
            <Text style={text}>
              Your wholesale account is active. Start browsing our catalogue and placing
              bulk orders today.
            </Text>

            <Button style={btn} href="https://distronepal.com">
              Browse Catalogue
            </Button>

            <Text style={infoLine}>Your login: <strong>{phone}</strong></Text>
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
const h1:        React.CSSProperties = { color: '#0D1120', fontSize: '22px', fontWeight: 'bold', margin: '0 0 16px' };
const text:      React.CSSProperties = { color: '#0D1120', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' };
const btn:       React.CSSProperties = { backgroundColor: '#1A4BDB', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', textDecoration: 'none', display: 'inline-block' };
const infoLine:  React.CSSProperties = { color: '#555555', fontSize: '14px', marginTop: '24px' };
const hr:        React.CSSProperties = { borderColor: '#e5e7eb', margin: '24px 0 16px' };
const footer:    React.CSSProperties = { color: '#9ca3af', fontSize: '12px', textAlign: 'center', margin: 0 };

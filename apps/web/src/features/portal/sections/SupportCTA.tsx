/**
 * SupportCTA — donation link + inquiry form (localStorage).
 */

import { useState } from 'react';
import type { PortalConfig } from '../../../store/portalStore.js';
import type { LocalProject } from '../../../store/projectStore.js';
import { earth, confidence, semantic } from '../../../lib/tokens.js';

interface Props { config: PortalConfig; project: LocalProject }

export default function SupportCTA({ config, project }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    // Store inquiry in localStorage
    const inquiries = JSON.parse(localStorage.getItem('ogden-inquiries') ?? '[]');
    inquiries.push({
      id: crypto.randomUUID(),
      projectId: config.projectId,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('ogden-inquiries', JSON.stringify(inquiries));
    setSubmitted(true);
    setName(''); setEmail(''); setMessage('');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', fontSize: 13,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(212, 175, 95, 0.15)', borderRadius: 8,
    color: earth[100], fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <section style={{
      padding: '80px 24px',
      background: 'linear-gradient(180deg, transparent, rgba(212, 175, 95, 0.03), transparent)',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: semantic.sidebarActive, marginBottom: 8,
        }}>
          Get Involved
        </h2>
        <p style={{ fontSize: 14, color: semantic.sidebarIcon, marginBottom: 32 }}>
          Interested in this project? Reach out to learn more.
        </p>

        {/* Donation link */}
        {config.donationUrl && (
          <a
            href={config.donationUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', padding: '14px 40px',
              fontSize: 14, fontWeight: 600, letterSpacing: '0.04em',
              background: config.brandColor, color: '#1a1611',
              borderRadius: 8, textDecoration: 'none', marginBottom: 40,
            }}
          >
            Support This Vision
          </a>
        )}

        {/* Inquiry form */}
        {submitted ? (
          <div style={{
            padding: 24, borderRadius: 10,
            background: 'rgba(45,122,79,0.08)',
            border: '1px solid rgba(45,122,79,0.2)',
          }}>
            <div style={{ fontSize: 16, color: confidence.high, fontWeight: 500, marginBottom: 8 }}>
              Thank you for your interest!
            </div>
            <p style={{ fontSize: 13, color: semantic.sidebarIcon }}>
              Your inquiry has been saved. The project owner will review it.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              style={{
                marginTop: 12, padding: '8px 20px', fontSize: 12,
                border: '1px solid rgba(212, 175, 95, 0.2)', borderRadius: 6,
                background: 'transparent', color: semantic.sidebarActive, cursor: 'pointer',
              }}
            >
              Send Another
            </button>
          </div>
        ) : (
          <div style={{
            padding: 24, borderRadius: 10,
            border: '1px solid rgba(212, 175, 95, 0.1)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <textarea
              placeholder="Tell us about your interest in this project..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !email.trim()}
              style={{
                padding: '12px', fontSize: 13, fontWeight: 600,
                border: 'none', borderRadius: 8,
                background: name.trim() && email.trim() ? 'rgba(212, 175, 95, 0.15)' : 'rgba(255,255,255,0.03)',
                color: name.trim() && email.trim() ? semantic.sidebarActive : '#7d7864',
                cursor: name.trim() && email.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Send Inquiry
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

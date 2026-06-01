'use client';

import { useState } from 'react';
import Script from 'next/script';

const DEMO_CREDS = [
  { role: 'cliente',    emoji: '👤', email: 'demo@abzend.com',    pass: 'demo1234'    },
  { role: 'admin',      emoji: '🛠️', email: 'admin@abzend.com',   pass: 'admin1234'   },
  { role: 'repartidor', emoji: '🛵', email: 'driver@abzend.com',  pass: 'driver1234'  },
  { role: 'station',    emoji: '🏭', email: 'station@abzend.com', pass: 'station1234' },
];

export default function DemoBanner() {
  const [copied, setCopied] = useState<string | null>(null);
  if (process.env.NEXT_PUBLIC_IS_DEMO !== 'true') return null;

  function copy(email: string, pass: string, key: string) {
    navigator.clipboard.writeText(`${email}\n${pass}`).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 9999,
        background: 'linear-gradient(90deg,00f1117,01a1d24)',
        borderBottom: '1px solid rgba(249,115,22,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 16px', gap: '10px', flexWrap: 'wrap',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
        fontSize: '12px',
      }}>
        {/* Izquierda */}
        <span style={{ color: '0f97316', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ display:'inline-block',width:7,height:7,borderRadius:'50%',background:'0f97316' }} />
          🧪 Demo — datos se resetean cada lunes
        </span>

        {/* Credenciales */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', flex:1, justifyContent:'center' }}>
          {DEMO_CREDS.map(({ role, emoji, email, pass }) => (
            <button key={role}
              onClick={() => copy(email, pass, role)}
              title={`Copiar: ${email} / ${pass}`}
              style={{
                background: copied===role ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.06)',
                border: `1px solid ${copied===role ? 'rgba(34,197,94,.4)' : 'rgba(255,255,255,.1)'}`,
                borderRadius: 6, padding: '3px 9px', cursor: 'pointer',
                color: copied===role ? '04ade80' : '0f1f5f9',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              }}>
              {copied===role ? '✓ Copiado' : (
                <>
                  <span style={{ fontSize:10, color:'0f97316', fontWeight:700, textTransform:'capitalize' }}>{emoji} {role}</span>
                  <span style={{ fontSize:11, color:'094a3b8' }}>{email}</span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Derecha */}
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <a href="?tour=1" style={{
            background:'rgba(249,115,22,.12)', border:'1px solid rgba(249,115,22,.3)',
            color:'0f97316', padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:700, textDecoration:'none'
          }}>🎯 Tour</a>
          <a href="mailto:jesusmarmolejo@gmail.com?subject=Interés en ABZEND" style={{
            background:'0f97316', color:'0fff', padding:'4px 12px',
            borderRadius:6, fontSize:12, fontWeight:700, textDecoration:'none'
          }}>Contactar →</a>
        </div>
      </div>
      {process.env.NEXT_PUBLIC_IS_DEMO === 'true' && (
        <Script src="/demo-tour.js" strategy="afterInteractive" />
      )}
    </>
  );
}


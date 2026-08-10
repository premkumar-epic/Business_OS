import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';

export default function AuthLockScreen({ onUnlock, companyName = 'Business OS' }) {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    
    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      await api.unlock(pinInput.trim());
      onUnlock();
    } catch (err) {
      setErrorMsg(err.message || 'Incorrect passcode. Access Denied.');
      setPinInput('');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '1.5rem'
    }}>
      <div className="form-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.25rem',
        textAlign: 'center',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto'
        }}>
          <Lock size={32} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.35rem' }}>
          {companyName} System Access
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
          This system is private & password protected. Enter your master PIN to access.
        </p>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.825rem',
            fontWeight: '600',
            marginBottom: '1.25rem'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Master Passcode / PIN</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPin ? 'text' : 'password'} 
                className="form-input"
                style={{
                  paddingRight: '2.5rem',
                  fontSize: '1.1rem',
                  letterSpacing: '0.1em',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
                placeholder="Enter Passcode"
                value={pinInput}
                onChange={e => {
                  setPinInput(e.target.value);
                  setErrorMsg('');
                }}
                autoFocus
              />
              <button 
                type="button" 
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', fontSize: '0.95rem' }} disabled={isLoggingIn}>
            {isLoggingIn ? 'Verifying PIN...' : <><ShieldCheck size={18} /> Unlock System Access</>}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          🔒 Private Garment Billing ERP | Secured Access
        </div>
      </div>
    </div>
  );
}

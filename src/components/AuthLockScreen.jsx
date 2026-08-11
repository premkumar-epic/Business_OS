import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';

export default function AuthLockScreen({ onUnlock, companyName = 'Business OS' }) {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    
    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const res = await api.login(emailInput.trim(), passwordInput.trim());
      onUnlock(res.user);
    } catch (err) {
      setErrorMsg(err.message || 'Incorrect credentials. Access Denied.');
      setPasswordInput('');
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

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input"
              style={{ fontSize: '1.05rem', padding: '0.65rem' }}
              placeholder="e.g. admin@ivkgarments.com"
              value={emailInput}
              onChange={e => {
                setEmailInput(e.target.value);
                setErrorMsg('');
              }}
              autoFocus
              required
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="form-input"
                style={{
                  paddingRight: '2.5rem',
                  fontSize: '1.05rem',
                  padding: '0.65rem'
                }}
                placeholder="Enter password"
                value={passwordInput}
                onChange={e => {
                  setPasswordInput(e.target.value);
                  setErrorMsg('');
                }}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', fontSize: '0.95rem' }} disabled={isLoggingIn}>
            {isLoggingIn ? 'Verifying...' : <><ShieldCheck size={18} /> Secure Login</>}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          🔒 Private Garment Billing ERP | Secured Access
        </div>
      </div>
    </div>
  );
}

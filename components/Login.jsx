'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, database } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Pobierz role użytkownika
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      const userData = snapshot.val();
      
      onLoginSuccess(user, userData);
    } catch (err) {
      setError(err.message === 'Firebase: Error (auth/user-not-found).' ? 'Użytkownik nie znaleziony' : 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
      fontFamily: 'system-ui'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ marginBottom: '30px', textAlign: 'center', color: '#333', fontSize: '28px' }}>
          🗺️ Mapa Transportu
        </h1>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#666', fontSize: '14px', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@flexmeble.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#666', fontSize: '14px', fontWeight: 500 }}>
              Hasło
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              background: '#FFEBEE',
              color: '#C62828',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#F5F5F5',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666',
          lineHeight: '1.6'
        }}>
          <strong>Dane testowe:</strong><br/>
          Email: admin@flexmeble.com<br/>
          Hasło: Admin123!
        </div>
      </div>
    </div>
  );
}

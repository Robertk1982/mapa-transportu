'use client';

import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, database } from '@/lib/firebase';
import { ref, set, get, remove } from 'firebase/database';

// Drugi Firebase instance do tworzenia użytkowników (nie wylogowuje admina!)
const secondaryApp = initializeApp({
  apiKey: "AIzaSyA8nAm4Sm7JD7uQvGKe9zMSxIlhcZfBPCE",
  authDomain: "mapa-transport.firebaseapp.com",
  databaseURL: "https://mapa-transport-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mapa-transport",
  storageBucket: "mapa-transport.firebasestorage.app",
  messagingSenderId: "639172527680",
  appId: "1:639172527680:web:eb260b672810b1560e01a5",
}, 'secondary');
const secondaryAuth = getAuth(secondaryApp);

export default function AdminPanel({ currentUser, onLogout }) {
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('worker');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = Object.entries(snapshot.val()).map(([uid, data]) => ({
          uid,
          ...data
        }));
        setUsers(usersData);
      }
    } catch (err) {
      console.log('Error loading users:', err);
    }
  };

  const createNewUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newName) {
      setMessage('❌ Wypełnij wszystkie pola');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('❌ Hasło musi mieć min. 6 znaków');
      return;
    }

    setLoading(true);
    try {
      // Tworzy użytkownika przez DRUGI instance (admin pozostaje zalogowany!)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      const user = userCredential.user;

      // Ustaw canUpload na podstawie roli
      const canUpload = newRole === 'admin' || newRole === 'uploader';

      await set(ref(database, `users/${user.uid}`), {
        email: newEmail,
        name: newName,
        role: newRole,
        canUpload: canUpload,
        createdAt: new Date().toISOString()
      });

      // Wyloguj z drugiego instance
      await secondaryAuth.signOut();

      setMessage(`✅ Użytkownik ${newName} utworzony!`);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('worker');
      loadUsers();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setMessage('❌ Ten email jest już zajęty');
      } else {
        setMessage('❌ Błąd: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const removeUser = async (uid, email) => {
    if (uid === currentUser.uid) {
      setMessage('❌ Nie możesz usunąć siebie!');
      return;
    }
    if (!confirm(`Czy na pewno chcesz usunąć ${email}?`)) return;

    try {
      await remove(ref(database, `users/${uid}`));
      setMessage('✅ Użytkownik usunięty z bazy');
      loadUsers();
    } catch (err) {
      setMessage('❌ Błąd: ' + err.message);
    }
  };

  const toggleUpload = async (uid, currentValue) => {
    try {
      await set(ref(database, `users/${uid}/canUpload`), !currentValue);
      loadUsers();
      setMessage('✅ Uprawnienia zaktualizowane');
    } catch (err) {
      setMessage('❌ Błąd');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>👨‍💼 Panel Administracyjny</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            🗺️ Wróć do mapy
          </button>
          <button
            onClick={onLogout}
            style={{ padding: '8px 16px', background: '#F44336', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            🚪 Wyloguj
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#F5F5F5', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>➕ Dodaj nowego pracownika</h3>
          <form onSubmit={createNewUser}>
            <input
              type="text"
              placeholder="Imię i nazwisko"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              disabled={loading}
            />
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Hasło (min. 6 znaków)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              disabled={loading}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '16px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              disabled={loading}
            >
              <option value="worker">👤 Pracownik (tylko czyta mapę)</option>
              <option value="uploader">📤 Pracownik (może wczytywać XLS)</option>
              <option value="admin">🔧 Administrator (pełny dostęp)</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
            >
              {loading ? 'Dodawanie...' : '➕ Dodaj użytkownika'}
            </button>
          </form>
          {message && (
            <div style={{ marginTop: '12px', padding: '10px', background: message.includes('✅') ? '#E8F5E9' : '#FFEBEE', borderRadius: '4px', fontSize: '12px', color: '#333' }}>
              {message}
            </div>
          )}
        </div>

        <div style={{ background: '#F5F5F5', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>📊 Statystyka</h3>
          <div style={{ fontSize: '14px', lineHeight: '2', color: '#666' }}>
            <div>👥 Pracownicy: <strong>{users.length}</strong></div>
            <div>📤 Z dostępem do upload: <strong>{users.filter(u => u.canUpload).length}</strong></div>
            <div>🔧 Administratorzy: <strong>{users.filter(u => u.role === 'admin').length}</strong></div>
          </div>
        </div>
      </div>

      <div style={{ background: '#F5F5F5', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>👥 Lista pracowników</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', background: '#eee' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Imię</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Rola</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Upload XLS</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Akcja</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', fontWeight: 500 }}>{user.name || '-'}</td>
                <td style={{ padding: '10px', fontSize: '12px' }}>{user.email}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {user.role === 'admin' ? '🔧 Admin' : user.role === 'uploader' ? '📤 Upload' : '👤 Pracownik'}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {user.role === 'admin' ? '✅' : (
                    <input
                      type="checkbox"
                      checked={user.canUpload || false}
                      onChange={() => toggleUpload(user.uid, user.canUpload)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  )}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {user.uid === currentUser.uid ? (
                    <span style={{ color: '#999', fontSize: '11px' }}>To Ty</span>
                  ) : (
                    <button
                      onClick={() => removeUser(user.uid, user.email)}
                      style={{ padding: '4px 10px', background: '#F44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    >
                      🗑️ Usuń
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

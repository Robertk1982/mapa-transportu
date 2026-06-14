'use client';

import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { auth, database } from '@/lib/firebase';
import { ref, set, get, remove, child } from 'firebase/database';

export default function AdminPanel({ currentUser, onLogout }) {
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('worker');
  const [canUpload, setCanUpload] = useState(false);
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
      setMessage('Wypełnij wszystkie pola');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
      const user = userCredential.user;

      await set(ref(database, `users/${user.uid}`), {
        email: newEmail,
        name: newName,
        role: newRole,
        canUpload: newRole === 'admin' ? true : canUpload,
        createdAt: new Date().toISOString()
      });

      setMessage('✅ Użytkownik utworzony!');
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('worker');
      setCanUpload(false);
      loadUsers();
    } catch (err) {
      setMessage('❌ Błąd: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeUser = async (uid, email) => {
    if (!confirm(`Czy na pewno chcesz usunąć ${email}?`)) return;

    try {
      await remove(ref(database, `users/${uid}`));
      setMessage('✅ Użytkownik usunięty');
      loadUsers();
    } catch (err) {
      setMessage('❌ Błąd: ' + err.message);
    }
  };

  const updateUserPermissions = async (uid, canUpload) => {
    try {
      await set(ref(database, `users/${uid}/canUpload`), !canUpload);
      loadUsers();
      setMessage('✅ Uprawnienia zaktualizowane');
    } catch (err) {
      setMessage('❌ Błąd');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>👨‍💼 Panel Administracyjny</h2>
        <button
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            background: '#F44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Wyloguj się
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#F5F5F5', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Dodaj nowego pracownika</h3>
          <form onSubmit={createNewUser}>
            <input
              type="text"
              placeholder="Imię"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              disabled={loading}
            />
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Hasło"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              disabled={loading}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              disabled={loading}
            >
              <option value="worker">Pracownik (czyta mapę)</option>
              <option value="uploader">Pracownik (może wczytywać)</option>
              <option value="admin">Administrator</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              {loading ? 'Dodawanie...' : 'Dodaj użytkownika'}
            </button>
          </form>
          {message && (
            <div style={{ marginTop: '12px', padding: '8px', background: '#fff', borderRadius: '4px', fontSize: '12px', color: '#333' }}>
              {message}
            </div>
          )}
        </div>

        <div style={{ background: '#F5F5F5', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>📊 Statystyka</h3>
          <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#666' }}>
            <div>👥 Pracownicy: <strong>{users.length}</strong></div>
            <div>📤 Z dostępem do upload: <strong>{users.filter(u => u.canUpload).length}</strong></div>
            <div>🔧 Administratorzy: <strong>{users.filter(u => u.role === 'admin').length}</strong></div>
          </div>
        </div>
      </div>

      <div style={{ background: '#F5F5F5', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>👥 Lista pracowników</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Imię</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Rola</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Upload XLS</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.uid} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{user.name}</td>
                  <td style={{ padding: '8px', fontSize: '11px' }}>{user.email}</td>
                  <td style={{ padding: '8px' }}>
                    {user.role === 'admin' ? '🔧 Admin' : user.role === 'uploader' ? '📤 Upload' : '👤 Pracownik'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {user.role === 'admin' ? '✅' : (
                      <input
                        type="checkbox"
                        checked={user.canUpload || false}
                        onChange={() => updateUserPermissions(user.uid, user.canUpload)}
                        style={{ cursor: 'pointer' }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button
                      onClick={() => removeUser(user.uid, user.email)}
                      style={{
                        padding: '4px 8px',
                        background: '#F44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

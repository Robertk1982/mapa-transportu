'use client';

import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, remove, set, update } from 'firebase/database';

export default function Archive({ onClose }) {
  const [archived, setArchived] = useState({});
  const [searchId, setSearchId] = useState('');

  useEffect(() => {
    const archivedRef = ref(database, 'archived');
    const unsubscribe = onValue(archivedRef, (snapshot) => {
      if (snapshot.exists()) {
        setArchived(snapshot.val());
      } else {
        setArchived({});
      }
    });
    return unsubscribe;
  }, []);

  const handleRestore = async (id) => {
    try {
      await remove(ref(database, `archived/${id}`));
      await update(ref(database, 'hidden'), { [id]: false });
    } catch (e) {
      console.error('Restore error:', e);
    }
  };

  // Filtruj po ID
  const filteredArchived = Object.entries(archived).filter(([id]) => {
    if (!searchId) return true;
    return id.includes(searchId);
  });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 500 }}>🗂️ Archiwum ({Object.keys(archived).length})</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}
          >
            ✕
          </button>
        </div>

        {/* Wyszukiwarka */}
        <input
          type="text"
          placeholder="🔍 Wyszukaj po numerze zamówienia..."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '12px',
            boxSizing: 'border-box'
          }}
        />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredArchived.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              {searchId ? 'Nie znaleziono zamówienia' : 'Archiwum jest puste'}
            </div>
          ) : (
            filteredArchived.map(([id, order]) => (
              <div
                key={id}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>{id}</div>
                  <div style={{ color: '#666', fontSize: '11px' }}>
                    📍 {order.zip} | 📅 {order.date || '-'} | 💰 {parseFloat(String(order.value || '0').replace(',', '.')).toFixed(2)} PLN
                  </div>
                  <div style={{ color: '#999', fontSize: '10px', marginTop: '2px' }}>
                    {order.status?.substring(0, 40)}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(id)}
                  style={{
                    padding: '6px 12px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ♻️ Przywróć
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

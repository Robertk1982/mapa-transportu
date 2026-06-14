'use client';

import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';

export default function Archive({ onClose }) {
  const [archivedOrders, setArchivedOrders] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const archivedRef = ref(database, 'archived');
    const unsubscribe = onValue(archivedRef, (snapshot) => {
      if (snapshot.exists()) {
        setArchivedOrders(snapshot.val());
      } else {
        setArchivedOrders({});
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const restoreOrder = async (id) => {
    try {
      const order = archivedOrders[id];
      
      // Przenieś do aktywnych zamówień
      await update(ref(database), {
        [`orders/${id}`]: order,
        [`hidden/${id}`]: false,
        [`archived/${id}`]: null
      });
      
      alert('✅ Zamówienie przywrócone!');
    } catch (err) {
      alert('❌ Błąd: ' + err.message);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>🗂️ Archiwum ({Object.keys(archivedOrders).length})</h2>
          <button
            onClick={onClose}
            style={{
              background: '#F44336',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Zamknij
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#999' }}>Ładowanie...</p>
        ) : Object.keys(archivedOrders).length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>Archiwum jest puste</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {Object.entries(archivedOrders).map(([id, order]) => (
              <div
                key={id}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#F9F9F9'
                }}
              >
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>{id}</div>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    📍 {order.zip} | 📅 {order.date} | 💰 {order.value} PLN
                  </div>
                </div>
                <button
                  onClick={() => restoreOrder(id)}
                  style={{
                    padding: '6px 12px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ↩️ Przywróć
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

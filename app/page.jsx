'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { database } from '@/lib/firebase';
import { ref, onValue, update, push, remove } from 'firebase/database';
import * as XLSX from 'xlsx';

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

export default function Home() {
  const [orders, setOrders] = useState({});
  const [hiddenOrders, setHiddenOrders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [missingDateOrders, setMissingDateOrders] = useState([]);
  const fileInputRef = useRef(null);
  const dateInputsRef = useRef({});

  useEffect(() => {
    const ordersRef = ref(database, 'orders');
    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        setOrders(snapshot.val());
      } else {
        setOrders({});
      }
      setLoading(false);
    });

    const hiddenRef = ref(database, 'hidden');
    const unsubscribeHidden = onValue(hiddenRef, (snapshot) => {
      if (snapshot.exists()) {
        setHiddenOrders(new Set(Object.keys(snapshot.val())));
      } else {
        setHiddenOrders(new Set());
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeHidden();
    };
  }, []);

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (String(dateStr).includes('/')) {
      const [d, m, y] = String(dateStr).split('/');
      return new Date(y, m - 1, d);
    }
    if (String(dateStr).includes('.')) {
      const [d, m, y] = String(dateStr).split('.');
      return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      const missing = [];
      const newOrders = { ...orders };
      let addedCount = 0;
      let updatedCount = 0;

      rows.forEach((row) => {
        const id = String(row['ID Zamówienia'] || row['ID'] || '').trim();
        const transport = String(row['Transport'] || '').trim();
        const status = String(row['Status'] || '').trim();
        const dateRaw = row['Data Realizacji'];
        const zip = String(row['Kod pocztowy klienta'] || row['Kod pocztowy'] || '').trim();
        const value = String(row['Wartość zamówienia'] || row['Wartość'] || '0').trim();

        if (!transport.includes('Dostawa dedykowana Flexmeble')) return;
        if (!id || !zip) return;

        if (hiddenOrders.has(id)) return;

        let date = '';
        if (dateRaw) {
          date = String(dateRaw).trim();
        } else {
          missing.push({ id, zip, value, status });
        }

        if (newOrders[id]) {
          if (newOrders[id].status !== status) {
            updatedCount++;
          }
          newOrders[id] = { zip, date: date || newOrders[id].date, status, value };
        } else {
          if (date) {
            newOrders[id] = { zip, date, status, value };
            addedCount++;
          }
        }
      });

      if (missing.length > 0) {
        setMissingDateOrders(missing);
        setShowDateModal(true);
        const updates = {};
        Object.entries(newOrders).forEach(([key, value]) => {
          updates[`orders/${key}`] = value;
        });
        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates);
        }
      } else {
        const updates = {};
        Object.entries(newOrders).forEach(([key, value]) => {
          updates[`orders/${key}`] = value;
        });
        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates);
        }
        showNotification(`Plik wczytany - dodano ${addedCount}, zmieniono ${updatedCount} zamówień`);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      showNotification('Błąd: ' + error.message);
    }
  };

  const handleConfirmDates = async () => {
    const updates = {};
    let addedCount = 0;

    missingDateOrders.forEach((order) => {
      const dateVal = dateInputsRef.current[order.id]?.value;
      if (dateVal) {
        updates[`orders/${order.id}`] = {
          zip: order.zip,
          date: dateVal,
          status: order.status,
          value: order.value,
        };
        addedCount++;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }

    setShowDateModal(false);
    setMissingDateOrders([]);
    showNotification(`Dodano ${addedCount} zamówień z datami`);
  };

  const handleToggleOrder = async (id) => {
    if (hiddenOrders.has(id)) {
      const newHidden = new Set(hiddenOrders);
      newHidden.delete(id);
      setHiddenOrders(newHidden);
      await update(ref(database, 'hidden'), { [id]: false });
    } else {
      setHiddenOrders(new Set([...hiddenOrders, id]));
      await update(ref(database, 'hidden'), { [id]: true });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Ładowanie mapy...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <MapComponent orders={orders} hiddenOrders={hiddenOrders} />
      </div>

      <div style={{ width: '360px', borderLeft: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', background: '#f5f5f5' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '12px' }}>Dostawa dedykowana</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '10px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
            }}
          >
            📥 Wczytaj XLS
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {Object.entries(orders).length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              Brak zamówień. Wczytaj plik XLS.
            </div>
          ) : (
            Object.entries(orders).map(([id, order]) => {
              const isHidden = hiddenOrders.has(id);
              const date = new Date(order.date);
              const isOverdue = date < new Date();

              return (
                <div
                  key={id}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    opacity: isHidden ? 0.4 : 1,
                    background: isHidden ? '#f5f5f5' : 'white',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isHidden}
                    onChange={() => handleToggleOrder(id)}
                    style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, fontSize: '12px' }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px', color: '#000' }}>{id}</div>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: 500,
                        marginBottom: '4px',
                        background: '#2196F315',
                        color: '#2196F3',
                      }}
                    >
                      {order.status || 'Brak statusu'}
                    </div>
                    <div style={{ color: '#666', fontSize: '11px', lineHeight: '1.5', marginTop: '4px' }}>
                      📍 {order.zip}
                      <br />
                      📅{' '}
                      <span style={isOverdue ? { color: '#F44336', fontWeight: 500 } : {}}>
                        {order.date}
                        {isOverdue ? ' ⚠️' : ''}
                      </span>
                      <span style={{ display: 'block', color: '#2196F3', fontWeight: 500, marginTop: '2px' }}>
                        💰 {parseFloat(String(order.value).replace(',', '.')).toFixed(2)} PLN
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showDateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 500 }}>Brakujące daty realizacji</h3>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>Uzupełnij daty dla następujących zamówień:</p>
            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
              {missingDateOrders.map((order) => (
                <div key={order.id} style={{ padding: '8px', borderBottom: '1px solid #e0e0e0' }}>
                  <div style={{ marginBottom: '6px', fontWeight: 500 }}>{order.id}</div>
                  <input
                    type="date"
                    ref={(el) => {
                      if (el) dateInputsRef.current[order.id] = el;
                    }}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDateModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ddd',
                  background: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Pomiń
              </button>
              <button
                onClick={handleConfirmDates}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Potwierdź
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            background: '#4CAF50',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            zIndex: 999,
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          {notification}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

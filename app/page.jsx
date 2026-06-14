'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { signOut } from 'firebase/auth';
import { auth, database } from '@/lib/firebase';
import { ref, onValue, update, set, get } from 'firebase/database';
import * as XLSX from 'xlsx';
import Login from '@/components/Login';
import AdminPanel from '@/components/AdminPanel';
import FilterPanel, { STATUS_COLORS } from '@/components/FilterPanel';
import Archive from '@/components/Archive';

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

export default function Home() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [orders, setOrders] = useState({});
  const [hiddenOrders, setHiddenOrders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [missingDateOrders, setMissingDateOrders] = useState([]);
  const [selectedTransports, setSelectedTransports] = useState(['Dostawa dedykowana Flexmeble', 'Dostawa kurierska paletowa']);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [searchId, setSearchId] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const fileInputRef = useRef(null);
  const dateInputsRef = useRef({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();
        setUserRole(userData);
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const ordersRef = ref(database, 'orders');
    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const ordersData = snapshot.val();
        setOrders(ordersData);
        const allStatuses = [...new Set(
          Object.values(ordersData).map(o => o.status).filter(Boolean)
        )];
        setSelectedStatuses(allStatuses);
      } else {
        setOrders({});
        setSelectedStatuses([]);
      }
      setLoading(false);
    });

    const hiddenRef = ref(database, 'hidden');
    const unsubscribeHidden = onValue(hiddenRef, (snapshot) => {
      if (snapshot.exists()) {
        const hidden = Object.keys(snapshot.val()).filter(key => snapshot.val()[key]);
        setHiddenOrders(new Set(hidden));
      } else {
        setHiddenOrders(new Set());
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeHidden();
    };
  }, [user]);

  const handleLoginSuccess = (currentUser, userData) => {
    setUser(currentUser);
    setUserRole(userData);
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole(null);
    setShowAdmin(false);
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!userRole?.canUpload && userRole?.role !== 'admin') {
      showNotification('❌ Nie masz uprawnień do wczytywania plików');
      return;
    }

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

        const isRelevantTransport = transport.includes('Dostawa dedykowana Flexmeble') || transport.includes('paletowa');
        if (!isRelevantTransport) return;
        if (!id || !zip) return;

        if (hiddenOrders.has(id)) return;

        let date = '';
        if (dateRaw) {
          date = String(dateRaw).trim();
        } else {
          missing.push({ id, zip, value, status, transport });
        }

        if (newOrders[id]) {
          if (newOrders[id].status !== status) {
            updatedCount++;
          }
          newOrders[id] = { zip, date: date || newOrders[id].date, status, value, transport };
        } else {
          if (date) {
            newOrders[id] = { zip, date, status, value, transport };
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
        showNotification(`✅ Plik wczytany - dodano ${addedCount}, zmieniono ${updatedCount}`);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      showNotification('❌ Błąd: ' + error.message);
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
          transport: order.transport,
        };
        addedCount++;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }

    setShowDateModal(false);
    setMissingDateOrders([]);
    showNotification(`✅ Dodano ${addedCount} zamówień z datami`);
  };

  const handleToggleOrder = async (id) => {
    const newHidden = new Set(hiddenOrders);
    newHidden.add(id);
    const order = orders[id];
    await set(ref(database, `archived/${id}`), order);
    setHiddenOrders(newHidden);
    await update(ref(database, 'hidden'), { [id]: true });
    showNotification(`🗂️ Zamówienie ${id} przeniesione do archiwum`);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (showAdmin && userRole?.role === 'admin') {
    return <AdminPanel currentUser={user} onLogout={handleLogout} />;
  }

  // Filtruj zamówienia - UKRYJ ZARCHIWIZOWANE
  const filteredOrders = Object.fromEntries(
    Object.entries(orders).filter(([id, order]) => {
      // Ukryj zarchiwizowane - ZNIKAJĄ z listy
      if (hiddenOrders.has(id)) return false;

      if (searchId && !id.includes(searchId)) return false;
      
      const transport = order.transport || '';
      const isDedykowana = transport.includes('Dostawa dedykowana');
      const isPaletowa = !isDedykowana && transport.includes('paletowa');
      
      const matchesTransport = selectedTransports.some(t => {
        if (t === 'Dostawa dedykowana Flexmeble') return isDedykowana;
        if (t === 'Dostawa kurierska paletowa') return isPaletowa;
        return false;
      });
      if (!matchesTransport) return false;

      if (!selectedStatuses.includes(order.status)) return false;

      return true;
    })
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Ładowanie aplikacji...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <MapComponent 
          orders={filteredOrders} 
          hiddenOrders={hiddenOrders}
        />
      </div>

      <div style={{ width: '380px', borderLeft: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', background: '#f5f5f5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500 }}>Dostawa Flexmeble</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              {userRole?.role === 'admin' && (
                <button
                  onClick={() => setShowAdmin(!showAdmin)}
                  style={{ padding: '6px 12px', background: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                >
                  ⚙️
                </button>
              )}
              <button
                onClick={() => setShowArchive(true)}
                style={{ padding: '6px 12px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                🗂️
              </button>
              <button
                onClick={handleLogout}
                style={{ padding: '6px 12px', background: '#F44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                🚪
              </button>
            </div>
          </div>

          {(userRole?.canUpload || userRole?.role === 'admin') && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '13px', marginBottom: '12px' }}
            >
              📥 Wczytaj XLS
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
        </div>

        <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0', background: '#F9F9F9', overflowY: 'auto', maxHeight: '200px' }}>
          <FilterPanel
            selectedTransports={selectedTransports}
            onTransportChange={setSelectedTransports}
            selectedStatuses={selectedStatuses}
            onStatusChange={setSelectedStatuses}
            searchId={searchId}
            onSearchChange={setSearchId}
            orders={orders}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {Object.entries(filteredOrders).length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              Brak zamówień spełniających kryteria
            </div>
          ) : (
            Object.entries(filteredOrders).map(([id, order]) => (
              <div
                key={id}
                style={{ padding: '12px 14px', borderBottom: '1px solid #e0e0e0', display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'white' }}
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleToggleOrder(id)}
                  title="Przenieś do archiwum"
                  style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1, fontSize: '12px' }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px', color: '#000' }}>{id}</div>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 500,
                      marginBottom: '4px',
                      background: (STATUS_COLORS[order.status] || '#9C27B0') + '20',
                      color: STATUS_COLORS[order.status] || '#9C27B0',
                      border: `1px solid ${STATUS_COLORS[order.status] || '#9C27B0'}40`,
                      maxWidth: '100%',
                      wordBreak: 'break-word'
                    }}
                  >
                    {order.status?.substring(0, 30)}
                  </div>
                  <div style={{ color: '#666', fontSize: '11px', lineHeight: '1.5', marginTop: '4px' }}>
                    📍 {order.zip}<br />
                    📅 {order.date || '-'}<br/>
                    📦 {order.transport?.includes('Dostawa dedykowana') ? 'Dedykowana' : 'Paletowa'}
                    <span style={{ display: 'block', color: '#2196F3', fontWeight: 500, marginTop: '2px' }}>
                      💰 {parseFloat(String(order.value).replace(',', '.')).toFixed(2)} PLN
                    </span>
                  </div>
                </div>
              </div>
            ))
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
                  <div style={{ marginBottom: '6px', fontWeight: 500, fontSize: '12px' }}>{order.id}</div>
                  <input
                    type="date"
                    ref={(el) => { if (el) dateInputsRef.current[order.id] = el; }}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDateModal(false)} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Pomiń</button>
              <button onClick={handleConfirmDates} style={{ flex: 1, padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Potwierdź</button>
            </div>
          </div>
        </div>
      )}

      {showArchive && <Archive onClose={() => setShowArchive(false)} />}

      {notification && (
        <div style={{ position: 'fixed', top: '16px', right: '16px', background: '#4CAF50', color: 'white', padding: '12px 16px', borderRadius: '6px', fontSize: '13px', zIndex: 999, animation: 'slideIn 0.3s ease-out' }}>
          {notification}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

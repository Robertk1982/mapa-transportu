'use client';

const STATUS_COLORS = {
  '! !Dostawa dedykowana coraz bliżej. Finiszujemy z produkcją.': '#FFC107',
  '! !Dostawa paletowa coraz bliżej. Finiszujemy z produkcją.': '#FFC107',
  '! Dostawa dedykowana o krok. Produkcja zakończona sukcesem.': '#4CAF50',
  '! Dostawa paletowa - Odpowiedz na wiadomość': '#2196F3',
  '! Płatność została poprawnie zaksięgowana': '#4CAF50',
  '! Twoje zamówienie zostało przekazane do realizacji': '#FF9800',
  'AA_Corpus (realizacja)': '#FF9800',
  'AA_Wydane na produkcje (realizacja)': '#FFC107',
  'Payment received (Tpay)': '#4CAF50',
  'Płatność przyjęta': '#4CAF50',
  'Płatność zaakceptowana': '#4CAF50',
};

export default function FilterPanel({ 
  selectedTransports, 
  onTransportChange, 
  selectedStatuses, 
  onStatusChange,
  searchId,
  onSearchChange,
  orders 
}) {
  // Zbierz unikalne statusy z zamówień
  const uniqueStatuses = [...new Set(
    Object.values(orders || {})
      .map(order => order.status)
      .filter(Boolean)
  )].sort();

  const handleStatusToggle = (status) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    onStatusChange(newStatuses);
  };

  return (
    <div style={{
      padding: '16px',
      background: '#F5F5F5',
      borderRadius: '8px',
      marginBottom: '16px'
    }}>
      {/* Wyszukiwanie */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#333' }}>
          🔍 Wyszukaj ID
        </label>
        <input
          type="text"
          placeholder="Wpisz ID zamówienia..."
          value={searchId}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Filtry transportu */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#333' }}>
          🚚 Transport
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {['Dostawa dedykowana Flexmeble', 'Dostawa kurierska paletowa'].map(transport => (
            <label key={transport} style={{ display: 'flex', alignItems: 'center', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedTransports.includes(transport)}
                onChange={(e) => {
                  const newTransports = e.target.checked
                    ? [...selectedTransports, transport]
                    : selectedTransports.filter(t => t !== transport);
                  onTransportChange(newTransports);
                }}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              {transport}
            </label>
          ))}
        </div>
      </div>

      {/* Filtry statusów */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#333' }}>
          📊 Statusy ({selectedStatuses.length}/{uniqueStatuses.length})
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', maxHeight: '250px', overflowY: 'auto' }}>
          {uniqueStatuses.map(status => {
            const color = STATUS_COLORS[status] || '#9C27B0';
            const isSelected = selectedStatuses.includes(status);
            return (
              <label
                key={status}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  background: isSelected ? color + '20' : 'transparent',
                  border: isSelected ? `1px solid ${color}` : '1px solid transparent'
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleStatusToggle(status)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <div style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: color,
                  marginRight: '6px'
                }} />
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{status}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, marginBottom: '6px', color: '#333' }}>📋 Legenda kolorów:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4CAF50' }} />
            <span>Gotowe (Payment received, Produkcja zakończona)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FFC107' }} />
            <span>W produkcji (Finiszujemy, Wydane na produkcje)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FF9800' }} />
            <span>W realizacji (Corpus, Przekazane do realizacji)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2196F3' }} />
            <span>Pytanie (Odpowiedz na wiadomość)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { STATUS_COLORS };

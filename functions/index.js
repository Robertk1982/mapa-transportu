const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.database();

exports.geocodePostalCodes = onRequest({ timeoutSeconds: 540 }, async (req, res) => {
  try {
    const ordersSnapshot = await db.ref('orders').once('value');
    const orders = ordersSnapshot.val();

    if (!orders) {
      return res.status(200).json({ message: 'No orders found' });
    }

    const uniqueZips = new Set();
    for (const [id, order] of Object.entries(orders)) {
      if (order.zip) uniqueZips.add(order.zip);
    }

    let geocodedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const zip of uniqueZips) {
      const safeZip = zip.replace(/\./g, '_');

      const cachedResult = await db.ref(`geocache/${safeZip}`).once('value');
      if (cachedResult.exists()) {
        skippedCount++;
        continue;
      }

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(zip)}&countrycodes=pl&limit=1`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'FlexmebleTransport/1.0 (admin@flexmeble.pl)'
          }
        });

        const data = await response.json();

        if (data && data.length > 0) {
          const coords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };

          await db.ref(`geocache/${safeZip}`).set(coords);
          geocodedCount++;
        } else {
          failedCount++;
          errors.push(`${zip}: no results`);
        }

        await new Promise(r => setTimeout(r, 1200));

      } catch (e) {
        failedCount++;
        errors.push(`${zip}: ${e.message}`);
      }
    }

    res.status(200).json({
      success: true,
      totalUniqueZips: uniqueZips.size,
      geocodedCount,
      skippedCount,
      failedCount,
      errors: errors.slice(0, 20),
      message: `Geocoded ${geocodedCount}, skipped ${skippedCount}, failed ${failedCount}`
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

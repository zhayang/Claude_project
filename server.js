const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const SEATS_BASE = 'https://seats.aero/partnerapi';

// Cabin field prefix mapping
const CABIN_PREFIX = { economy: 'Y', premium: 'W', business: 'J', first: 'F' };

// Valid seat.aero loyalty program sources
const ALL_SOURCES = [
  'united', 'aeroplan', 'lifemiles', 'ethiopian',
  'flyingblue', 'qantas', 'delta', 'american'
];

// Points valuation in cents-per-point
const CPP = {
  united:     1.5,
  aeroplan:   1.5,
  lifemiles:  1.3,
  ethiopian:  1.1,
  flyingblue: 1.3,
  qantas:     1.4,
  delta:      1.2,
  american:   1.4,
};

// City-aware hotel mock data keyed by destination airport IATA
const HOTEL_DATA = {
  HKG: [
    { name: 'Grand Hyatt Hong Kong', brand: 'Hyatt', stars: 5, cash_per_night: 380, points_per_night: 25000, program: 'World of Hyatt', cpp: 1.5 },
    { name: 'Park Hyatt Hong Kong', brand: 'Hyatt', stars: 5, cash_per_night: 520, points_per_night: 30000, program: 'World of Hyatt', cpp: 1.5 },
    { name: 'JW Marriott Hong Kong', brand: 'Marriott', stars: 5, cash_per_night: 340, points_per_night: 60000, program: 'Marriott Bonvoy', cpp: 0.8 },
    { name: 'Conrad Hong Kong', brand: 'Hilton', stars: 5, cash_per_night: 420, points_per_night: 95000, program: 'Hilton Honors', cpp: 0.5 },
    { name: 'InterContinental Hong Kong', brand: 'IHG', stars: 5, cash_per_night: 480, points_per_night: 70000, program: 'IHG One Rewards', cpp: 0.6 },
    { name: 'Hyatt Centric Victoria Harbour', brand: 'Hyatt', stars: 4, cash_per_night: 220, points_per_night: 17000, program: 'World of Hyatt', cpp: 1.5 },
  ],
  LAX: [
    { name: 'Andaz West Hollywood', brand: 'Hyatt', stars: 4, cash_per_night: 280, points_per_night: 20000, program: 'World of Hyatt', cpp: 1.5 },
    { name: 'Marriott LAX', brand: 'Marriott', stars: 4, cash_per_night: 199, points_per_night: 40000, program: 'Marriott Bonvoy', cpp: 0.8 },
    { name: 'Hilton Los Angeles Airport', brand: 'Hilton', stars: 4, cash_per_night: 179, points_per_night: 50000, program: 'Hilton Honors', cpp: 0.5 },
    { name: 'IHG Los Angeles', brand: 'IHG', stars: 3, cash_per_night: 139, points_per_night: 30000, program: 'IHG One Rewards', cpp: 0.6 },
    { name: 'Thompson Hollywood', brand: 'Hyatt', stars: 4, cash_per_night: 310, points_per_night: 22000, program: 'World of Hyatt', cpp: 1.5 },
    { name: 'Sheraton Gateway LAX', brand: 'Marriott', stars: 4, cash_per_night: 185, points_per_night: 38000, program: 'Marriott Bonvoy', cpp: 0.8 },
  ],
  NRT: [
    { name: 'Park Hyatt Tokyo', brand: 'Hyatt', stars: 5, cash_per_night: 650, points_per_night: 30000, program: 'World of Hyatt', cpp: 1.5 },
    { name: 'Andaz Tokyo', brand: 'Hyatt', stars: 5, cash_per_night: 400, points_per_night: 25000, program: 'World of Hyatt', cpp: 1.5 },
    { name: 'Tokyo Marriott', brand: 'Marriott', stars: 5, cash_per_night: 350, points_per_night: 60000, program: 'Marriott Bonvoy', cpp: 0.8 },
    { name: 'Conrad Tokyo', brand: 'Hilton', stars: 5, cash_per_night: 500, points_per_night: 95000, program: 'Hilton Honors', cpp: 0.5 },
    { name: 'ANA Intercontinental Tokyo', brand: 'IHG', stars: 5, cash_per_night: 380, points_per_night: 60000, program: 'IHG One Rewards', cpp: 0.6 },
    { name: 'Hyatt Regency Tokyo', brand: 'Hyatt', stars: 4, cash_per_night: 220, points_per_night: 15000, program: 'World of Hyatt', cpp: 1.5 },
  ],
  LHR: [
    { name: 'Andaz London Liverpool St', brand: 'Hyatt', stars: 5, cash_per_night: 360, points_per_night: 25000, program: 'World of Hyatt', cpp: 1.5 },
    { name: 'Park Hyatt London', brand: 'Hyatt', stars: 5, cash_per_night: 550, points_per_night: 30000, program: 'World of Hyatt', cpp: 1.5 },
    { name: 'London Marriott Hotel County Hall', brand: 'Marriott', stars: 5, cash_per_night: 420, points_per_night: 70000, program: 'Marriott Bonvoy', cpp: 0.8 },
    { name: 'Hilton London Heathrow', brand: 'Hilton', stars: 4, cash_per_night: 189, points_per_night: 40000, program: 'Hilton Honors', cpp: 0.5 },
    { name: 'InterContinental London Park Lane', brand: 'IHG', stars: 5, cash_per_night: 480, points_per_night: 70000, program: 'IHG One Rewards', cpp: 0.6 },
    { name: 'Marriott Grosvenor Square', brand: 'Marriott', stars: 5, cash_per_night: 390, points_per_night: 65000, program: 'Marriott Bonvoy', cpp: 0.8 },
  ],
  SFO: [
    { name: 'Hyatt Regency San Francisco', brand: 'Hyatt', stars: 4, cash_per_night: 260, points_per_night: 18000, program: 'World of Hyatt', cpp: 1.5 },
    { name: 'Park Hyatt San Francisco', brand: 'Hyatt', stars: 5, cash_per_night: 420, points_per_night: 25000, program: 'World of Hyatt', cpp: 1.5 },
    { name: 'San Francisco Marriott Marquis', brand: 'Marriott', stars: 4, cash_per_night: 289, points_per_night: 55000, program: 'Marriott Bonvoy', cpp: 0.8 },
    { name: 'Hilton San Francisco Union Square', brand: 'Hilton', stars: 4, cash_per_night: 219, points_per_night: 60000, program: 'Hilton Honors', cpp: 0.5 },
    { name: 'IHG San Francisco Airport', brand: 'IHG', stars: 3, cash_per_night: 149, points_per_night: 25000, program: 'IHG One Rewards', cpp: 0.6 },
    { name: 'The Clift Royal Sonesta', brand: 'Sonesta', stars: 4, cash_per_night: 249, points_per_night: 30000, program: 'Sonesta Travel Pass', cpp: 0.7 },
  ],
};

// Generic fallback hotels for unknown cities
function genericHotels(dest) {
  return [
    { name: `Grand Hyatt ${dest}`, brand: 'Hyatt', stars: 5, cash_per_night: 350, points_per_night: 25000, program: 'World of Hyatt', cpp: 1.5 },
    { name: `Marriott ${dest}`, brand: 'Marriott', stars: 4, cash_per_night: 250, points_per_night: 50000, program: 'Marriott Bonvoy', cpp: 0.8 },
    { name: `Hilton ${dest}`, brand: 'Hilton', stars: 4, cash_per_night: 220, points_per_night: 60000, program: 'Hilton Honors', cpp: 0.5 },
    { name: `IHG ${dest}`, brand: 'IHG', stars: 4, cash_per_night: 200, points_per_night: 40000, program: 'IHG One Rewards', cpp: 0.6 },
    { name: `Hyatt Place ${dest}`, brand: 'Hyatt', stars: 3, cash_per_night: 149, points_per_night: 12000, program: 'World of Hyatt', cpp: 1.5 },
    { name: `Marriott Courtyard ${dest}`, brand: 'Marriott', stars: 3, cash_per_night: 139, points_per_night: 25000, program: 'Marriott Bonvoy', cpp: 0.8 },
  ];
}

function seatsHeaders() {
  const key = process.env.SEAT_AERO_API_KEY;
  if (!key) throw new Error('SEAT_AERO_API_KEY environment variable not set');
  return { 'Partner-Authorization': key, 'accept': 'application/json' };
}

// GET /api/flights
app.get('/api/flights', async (req, res) => {
  const { origin, destination, start, end, cabin = 'business' } = req.query;
  if (!origin || !destination || !start || !end) {
    return res.status(400).json({ error: 'origin, destination, start, end are required' });
  }
  const prefix = CABIN_PREFIX[cabin] || 'J';
  try {
    const headers = seatsHeaders();
    const url = `${SEATS_BASE}/search?origin_airport=${origin}&destination_airport=${destination}&cabin=${cabin}&start_date=${start}&end_date=${end}&take=100`;
    const resp = await fetch(url, { headers });
    const data = await resp.json();

    if (!data.data || data.data.length === 0) {
      // Fallback: try /availability for each source and filter by date range
      const results = await Promise.allSettled(
        ALL_SOURCES.map(source =>
          fetch(`${SEATS_BASE}/availability?source=${source}&origin_airport=${origin}&destination_airport=${destination}&cabin=${cabin}`, { headers })
            .then(r => r.json())
            .then(d => (d.data || []).map(row => ({ ...row, Source: source })))
        )
      );
      const combined = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .filter(row =>
          row[`${prefix}Available`] &&
          row.Date >= start &&
          row.Date <= end
        )
        .sort((a, b) => (a[`${prefix}MileageCostRaw`] || 0) - (b[`${prefix}MileageCostRaw`] || 0));

      return res.json({
        source: 'availability_fallback',
        cabin,
        prefix,
        cpp: CPP,
        results: combined.map(row => normalizeRow(row, prefix)),
      });
    }

    const sorted = (data.data || [])
      .filter(row => row[`${prefix}Available`])
      .sort((a, b) => (a[`${prefix}MileageCostRaw`] || 0) - (b[`${prefix}MileageCostRaw`] || 0));

    res.json({
      source: 'search',
      cabin,
      prefix,
      cpp: CPP,
      hasMore: data.hasMore || false,
      results: sorted.map(row => normalizeRow(row, prefix)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/availability  (all sources, no date filter — for calendar view)
app.get('/api/availability', async (req, res) => {
  const { origin, destination, cabin = 'business' } = req.query;
  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination are required' });
  }
  const prefix = CABIN_PREFIX[cabin] || 'J';
  try {
    const headers = seatsHeaders();
    const results = await Promise.allSettled(
      ALL_SOURCES.map(source =>
        fetch(`${SEATS_BASE}/availability?source=${source}&origin_airport=${origin}&destination_airport=${destination}&cabin=${cabin}`, { headers })
          .then(r => r.json())
          .then(d => (d.data || []).filter(row => row[`${prefix}Available`]).map(row => ({ ...row, Source: source })))
      )
    );
    const combined = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => (a[`${prefix}MileageCostRaw`] || 0) - (b[`${prefix}MileageCostRaw`] || 0));

    res.json({
      cabin, prefix, cpp: CPP,
      results: combined.map(row => normalizeRow(row, prefix)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hotels
app.get('/api/hotels', (req, res) => {
  const { destination, checkin, checkout } = req.query;
  if (!destination) return res.status(400).json({ error: 'destination is required' });

  const hotels = HOTEL_DATA[destination.toUpperCase()] || genericHotels(destination.toUpperCase());

  let nights = 1;
  if (checkin && checkout) {
    const ms = new Date(checkout) - new Date(checkin);
    if (!isNaN(ms) && ms > 0) nights = Math.round(ms / 86400000);
  }

  const enriched = hotels.map(h => ({
    ...h,
    nights,
    total_cash: h.cash_per_night * nights,
    total_points: h.points_per_night * nights,
    cash_value_of_points: Math.round(h.points_per_night * h.cpp / 100) * nights,
    value_rating: h.cpp >= 1.5 ? 'excellent' : h.cpp >= 1.0 ? 'good' : 'poor',
  }));

  res.json({ destination, checkin, checkout, nights, hotels: enriched });
});

function normalizeRow(row, prefix) {
  const source = row.Source || row.source || 'unknown';
  return {
    date: row.Date,
    source,
    miles: row[`${prefix}MileageCost`] || '0',
    miles_raw: row[`${prefix}MileageCostRaw`] || 0,
    taxes: row[`${prefix}TotalTaxes`] || 0,
    taxes_currency: row.TaxesCurrency || 'USD',
    seats: row[`${prefix}RemainingSeats`] || 0,
    airlines: row[`${prefix}Airlines`] || '',
    direct: row[`${prefix}Direct`] || false,
    cpp: CPP[source] || 1.3,
    cash_equiv: Math.round((row[`${prefix}MileageCostRaw`] || 0) * (CPP[source] || 1.3) / 100),
  };
}

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server' });

  const today = new Date().toISOString().split('T')[0];

  const system = `You are a helpful travel assistant embedded in a flight + hotel award search dashboard.
Today's date is ${today}.

When the user wants to search for flights or trips, respond with a JSON action block (and nothing else) in this exact format:
<action>
{"type":"search","origin":"LAX","destination":"HKG","start":"2026-08-01","end":"2026-08-08","cabin":"business"}
</action>

Cabin must be one of: economy, premium, business, first.
Dates must be YYYY-MM-DD. Always pick a reasonable 7-day window if the user doesn't specify exact dates.
Use IATA airport codes. Houston = IAH, New York (JFK) = JFK, Newark = EWR, Los Angeles = LAX, San Francisco = SFO, Chicago O'Hare = ORD, Miami = MIA, Dallas = DFW, London Heathrow = LHR, Paris = CDG, Tokyo Narita = NRT, Hong Kong = HKG, Singapore = SIN, Sydney = SYD, Dubai = DXB, Seoul = ICN, Toronto = YYZ, Vancouver = YVR.

If the user is asking a general travel question (not searching), answer helpfully in 1-3 sentences. Cover topics like points strategy, airline alliances, best programs for a route, award sweet spots, etc.

Do NOT wrap non-action responses in JSON. Just reply conversationally.`;

  try {
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system,
        messages,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'Claude API error');

    const text = data.content?.[0]?.text || '';

    // Parse action if present
    const actionMatch = text.match(/<action>\s*(\{[\s\S]*?\})\s*<\/action>/);
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1]);
        return res.json({ type: 'action', action, text: '' });
      } catch { /* fall through to text */ }
    }

    res.json({ type: 'text', text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Catch-all: return index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  const key = process.env.SEAT_AERO_API_KEY;
  if (!key) {
    console.warn('⚠️  WARNING: SEAT_AERO_API_KEY is not set. Flight API calls will fail.');
  } else {
    console.log(`✓ seat.aero API key loaded (${key.slice(0, 8)}...)`);
  }
  console.log(`🚀 Travel Dashboard running at http://localhost:${PORT}`);
});

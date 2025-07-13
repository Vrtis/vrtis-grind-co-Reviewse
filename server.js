const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const REVIEWS_FILE = path.join(__dirname, 'reviews.json');
const ADMIN_PHONE = '+17272716527'; // Your number in E.164 format

// Twilio config - fill these in with your actual account info
const twilioAccountSid = 'AC2ce1ca7a36546ffff2b4ad96edeac6f2';
const twilioAuthToken = '7b65e19786364cf6eda4b431a14ca44a';
const twilioFromNumber = '+12345678900'; // TEMP placeholder
const client = twilio(twilioAccountSid, twilioAuthToken);

// Helper to load reviews
function loadReviews() {
  try {
    return JSON.parse(fs.readFileSync(REVIEWS_FILE));
  } catch {
    return [];
  }
}

// Helper to save reviews
function saveReviews(reviews) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
}

app.post('/api/reviews', async (req, res) => {
  const { rating, review } = req.body;
  if (!rating || !review) return res.status(400).json({ error: 'Rating and review required' });

  const reviews = loadReviews();
  const newReview = { id: Date.now(), rating, review, date: new Date().toISOString() };
  reviews.push(newReview);
  saveReviews(reviews);

  try {
    await client.messages.create({
      body: `New review! ⭐${rating}\n"\${review}"`,
      from: twilioFromNumber,
      to: ADMIN_PHONE,
    });
  } catch (e) {
    console.error('SMS failed:', e.message);
  }

  res.status(201).json({ success: true });
});

// Basic auth middleware for /admin
app.use('/admin', (req, res, next) => {
  const auth = req.headers.authorization || '';
  const base64Credentials = auth.split(' ')[1] || '';
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (password === 'HEYDUDE!1') {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Access denied');
  }
});

app.get('/admin', (req, res) => {
  const reviews = loadReviews();
  let html = '<h1>Vrtis Grind Co Reviews</h1><ul>';
  reviews.forEach(r => {
    html += `<li><strong>⭐\${r.rating}</strong> - \${r.review} <em>(\${new Date(r.date).toLocaleString()})</em></li>`;
  });
  html += '</ul>';
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Server running on port \${PORT}`);
});

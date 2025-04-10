const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { nanoid } = require('nanoid');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Database to store URLs (in a real app, use a proper database)
const urlDatabase = {};

// Middleware
app.use(cors({
  origin: ['http://breif.site', 'https://breif.site', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to shorten URL
app.post('/api/shorten', (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Generate a short code
    const shortCode = nanoid(6); // 6 character code
    
    // Store in our database
    urlDatabase[shortCode] = url;
    
    console.log(`Created short URL: ${shortCode} for ${url}`);
    
    // Return the shortened URL
    return res.json({ shortUrl: shortCode });
  } catch (error) {
    console.error('Error shortening URL:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Redirect endpoint
app.get('/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlDatabase[shortCode];
  
  if (originalUrl) {
    return res.redirect(originalUrl);
  } else {
    return res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
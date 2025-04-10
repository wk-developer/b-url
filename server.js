const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { nanoid } = require('nanoid');

// In-memory DB (replace with real DB in production)
const urlDatabase = {};

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const serveStaticFile = (res, filePath) => {
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
};

const parseRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // POST /api/shorten
  if (req.method === 'POST' && pathname === '/api/shorten') {
    try {
      const data = await parseRequestBody(req);
      if (!data.url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'URL is required' }));
        return;
      }

      const shortCode = nanoid(6);
      urlDatabase[shortCode] = data.url;

      const host = process.env.HOST_URL || `https://${req.headers.host}`;
      const fullShortUrl = `${host}/${shortCode}`;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ shortUrl: fullShortUrl }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  // GET /api/urls
  else if (req.method === 'GET' && pathname === '/api/urls') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(urlDatabase));
  }

  // Redirect /<shortcode>
  else if (req.method === 'GET' && pathname.length > 1 && !pathname.includes('.')) {
    const shortCode = pathname.slice(1);
    const originalUrl = urlDatabase[shortCode];
    if (originalUrl) {
      res.writeHead(302, { Location: originalUrl });
      res.end();
    } else {
      serveStaticFile(res, path.join(__dirname, 'public', 'index.html'));
    }
  }

  // Static files
  else if (req.method === 'GET') {
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    serveStaticFile(res, filePath);
  }

  // All other requests
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

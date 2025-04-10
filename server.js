const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { nanoid } = require('nanoid');

// Database to store URLs (in a real app, use a proper database)
const urlDatabase = {};

// MIME types for serving static files
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

// Helper function to serve static files
const serveStaticFile = (res, filePath) => {
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        serveStaticFile(res, path.join(__dirname, 'public', 'index.html'));
      } else {
        // Server error
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
};

// Helper function to parse JSON from request body
const parseRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', (error) => {
      reject(error);
    });
  });
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  console.log(`${req.method} request for ${pathname}`);

  // API endpoint to shorten URL
  if (req.method === 'POST' && pathname === '/api/shorten') {
    try {
      const data = await parseRequestBody(req);
      
      if (!data.url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'URL is required' }));
        return;
      }
      
      // Generate a short code
      const shortCode = nanoid(6); // 6 character code
      
      // Store in our database
      urlDatabase[shortCode] = data.url;
      
      console.log(`Created short URL: ${shortCode} for ${data.url}`);
      
      // Return the shortened URL
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ shortUrl: shortCode }));
    } catch (error) {
      console.error('Error shortening URL:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    }
  } 
  // API endpoint to list all URLs (for debugging)
  else if (req.method === 'GET' && pathname === '/api/urls') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(urlDatabase));
  }
  // Redirect endpoint
  else if (req.method === 'GET' && pathname.length > 1 && !pathname.includes('.')) {
    const shortCode = pathname.substring(1); // Remove leading slash
    const originalUrl = urlDatabase[shortCode];
    
    console.log(`Redirect request for code: ${shortCode}`);
    console.log(`Original URL found: ${originalUrl || 'Not found'}`);
    
    if (originalUrl) {
      console.log(`Redirecting to: ${originalUrl}`);
      res.writeHead(302, { 'Location': originalUrl });
      res.end();
    } else {
      console.log('Short URL not found, returning 404');
      serveStaticFile(res, path.join(__dirname, 'public', 'index.html'));
    }
  }
  // Serve static files
  else if (req.method === 'GET') {
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    serveStaticFile(res, filePath);
  }
  // Handle other requests
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access your app at http://localhost:${PORT}`);
});
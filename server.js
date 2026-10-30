'use strict';

const http = require('node:http');
const os = require('node:os');

const PORT = Number(process.env.ALUMHACKS_PORT || 8787);
const GINJER_DEV_URL = 'https://devapi.ginjer.io/graphql';
const GINJER_PROD_URL = 'https://prodapi.ginjer.io/graphql';
let currentGinjerUrl = process.env.GINJER_URL || GINJER_DEV_URL;
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

let ginjerToken = '';
let tokenExpiresAt = 0;

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function clearToken() {
  ginjerToken = '';
  tokenExpiresAt = 0;
}

function tokenIsValid() {
  if (ginjerToken && Date.now() >= tokenExpiresAt) clearToken();
  return Boolean(ginjerToken);
}

function readJson(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.setEncoding('utf8');
    req.on('data', chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBytes) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function isPrivateIPv4(address) {
  const normalized = String(address || '').replace(/^::ffff:/i, '');
  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

function isLocalRequest(req, res) {
  const host = req.headers.host || '';
  let hostname;
  let port;
  try {
    const parsedHost = new URL('http://' + host);
    hostname = parsedHost.hostname;
    port = parsedHost.port || '80';
  } catch {
    json(res, 403, { error: 'Invalid Host header.' });
    return false;
  }
  const remoteAddress = String(req.socket.remoteAddress || '').replace(/^::ffff:/i, '');
  const isLoopback = ['127.0.0.1', 'localhost'].includes(hostname) &&
    (remoteAddress === '::1' || remoteAddress.startsWith('127.'));
  const isLanRequest = port === String(PORT) && isPrivateIPv4(hostname) && isPrivateIPv4(req.socket.remoteAddress);
  if (!(isLoopback && port === String(PORT)) && !isLanRequest) {
    json(res, 403, { error: 'This backend only accepts localhost or private Wi-Fi network requests.' });
    return false;
  }
  const origin = req.headers.origin;
  if (origin && origin !== 'http://' + host) {
    json(res, 403, { error: 'Cross-origin requests are not allowed.' });
    return false;
  }
  return true;
}

async function proxyGraphql(req, res) {
  let payload;
  try { payload = await readJson(req); }
  catch (err) { return json(res, err.status || 400, { error: err.message }); }
  if (typeof payload.query !== 'string' || !payload.query.trim()) {
    return json(res, 400, { error: 'A GraphQL query is required.' });
  }

  let targetUrl = req.headers['x-ginjer-url'];
  if (!targetUrl) {
    if (req.headers['x-ginjer-env'] === 'prod') targetUrl = GINJER_PROD_URL;
    else if (req.headers['x-ginjer-env'] === 'dev') targetUrl = GINJER_DEV_URL;
    else targetUrl = currentGinjerUrl;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (req.headers['x-ginjer-authenticated'] === 'true') {
    if (!tokenIsValid()) return json(res, 401, { error: 'No Ginjer token is stored. Reconnect using your token.' });
    headers.authorization = ginjerToken;
  }

  try {
    let upstream = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: payload.query, variables: payload.variables || {} }),
      signal: AbortSignal.timeout(30000)
    });
    let raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); } catch {}

    // Smart failover: if signIn returned user details not found on dev, try prod (or vice versa)
    if (payload.query.includes('signIn(') && data?.errors?.some(e => /user details not found/i.test(e.message))) {
      const altUrl = targetUrl === GINJER_DEV_URL ? GINJER_PROD_URL : GINJER_DEV_URL;
      try {
        const altUpstream = await fetch(altUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: payload.query, variables: payload.variables || {} }),
          signal: AbortSignal.timeout(30000)
        });
        const altRaw = await altUpstream.text();
        const altData = JSON.parse(altRaw);
        if (altData?.data?.signIn?.token) {
          targetUrl = altUrl;
          currentGinjerUrl = altUrl;
          upstream = altUpstream;
          raw = altRaw;
        }
      } catch {}
    } else if (data?.data?.signIn?.token) {
      currentGinjerUrl = targetUrl;
    }

    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(raw);
  } catch (err) {
    json(res, 502, { error: 'Could not reach Ginjer: ' + (err.name === 'TimeoutError' ? 'request timed out.' : 'check your internet connection and try again.') });
  }
}

const server = http.createServer(async (req, res) => {
  if (!isLocalRequest(req, res)) return;
  const url = new URL(req.url, 'http://127.0.0.1:' + PORT);

  if (req.method === 'GET' && url.pathname === '/api/status') {
    return json(res, 200, { ok: true, tokenConfigured: tokenIsValid() });
  }
  if (req.method === 'POST' && url.pathname === '/api/token') {
    let body;
    try { body = await readJson(req, 16 * 1024); }
    catch (err) { return json(res, err.status || 400, { error: err.message }); }
    const token = typeof body.token === 'string' ? body.token.trim().replace(/^Bearer\s+/i, '') : '';
    if (!token || token.length > 8192 || /[\r\n]/.test(token)) {
      return json(res, 400, { error: 'Enter a valid token value from Postman.' });
    }
    ginjerToken = token;
    tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
    return json(res, 200, { tokenConfigured: true, expiresInHours: 8 });
  }
  if (req.method === 'DELETE' && url.pathname === '/api/token') {
    clearToken();
    return json(res, 200, { tokenConfigured: false });
  }
  if (req.method === 'POST' && url.pathname === '/api/graphql') return proxyGraphql(req, res);

  json(res, 404, { error: 'Not found.' });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    process.stderr.write('Port ' + PORT + ' is already in use. Close the other server or set ALUMHACKS_PORT to another port.\n');
  } else {
    process.stderr.write('Backend error: ' + err.message + '\n');
  }
  process.exitCode = 1;
});

server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write('Alumhacks backend ready at http://127.0.0.1:' + PORT + '\n');
  const addresses = Object.values(os.networkInterfaces()).flatMap(items =>
    (items || []).filter(item => item.family === 'IPv4' && !item.internal && isPrivateIPv4(item.address)).map(item => item.address));
  for (const address of [...new Set(addresses)]) {
    process.stdout.write('Phone on the same Wi-Fi: http://' + address + ':' + PORT + '\n');
  }
  process.stdout.write('LAN access is limited to private IPv4 networks. Use only on a trusted Wi-Fi network.\n');
  process.stdout.write('Token storage is memory-only and expires after 8 hours. Press Ctrl+C to stop.\n');
});

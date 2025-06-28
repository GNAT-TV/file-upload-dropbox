/**
 * @fileoverview This Cloudflare Worker acts as a secure proxy to initiate
 * Google Drive resumable file uploads. It uses a Service Account to authenticate
 * with Google's APIs, creates an upload session, and returns the unique upload URL
 * to the client. This prevents any sensitive credentials from being exposed in the browser.
 */

export default {
  async fetch(request, env) {
    // Get the origin of the request (e.g., https://n-....googleusercontent.com)
    const origin = request.headers.get('Origin');
    const allowed = isOriginAllowed(origin);

    if (!allowed) {
      return new Response('Origin not allowed', { status: 403 });
    }
    
    // Handle CORS preflight (OPTIONS) requests
    if (request.method === 'OPTIONS') {
      return handleOptions(request, origin);
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) });
    }
    
    try {
      const { fileName, mimeType } = await request.json();
      
      // Get secrets from environment variables for security
      const FOLDER_ID = env.FOLDER_ID;
      const fixedPrivateKey = env.PRIVATE_KEY.replace(/\\n/g, '\n');
      const SERVICE_ACCOUNT_CREDS = {
        client_email: env.CLIENT_EMAIL,
        private_key: fixedPrivateKey,
      };
      
      const accessToken = await getAccessToken(SERVICE_ACCOUNT_CREDS);
      const initiationUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
      
      const initiationBody = JSON.stringify({
        name: fileName,
        parents: [FOLDER_ID],
      });

      const driveResponse = await fetch(initiationUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          // CRITICAL: Forward the browser's origin to Google so it can configure CORS correctly.
          'Origin': origin,
        },
        body: initiationBody,
      });

      if (driveResponse.status === 200) {
        const uploadUrl = driveResponse.headers.get('Location');
        const responseBody = JSON.stringify({ success: true, uploadUrl });
        
        return new Response(responseBody, {
          status: 200,
          headers: corsHeaders(origin),
        });
      } else {
        const errorText = await driveResponse.text();
        throw new Error(`Google API Error: ${driveResponse.status} ${errorText}`);
      }
    } catch (error) {
      const errorBody = JSON.stringify({ success: false, error: error.message });
      return new Response(errorBody, {
        status: 500,
        headers: corsHeaders(origin),
      });
    }
  },
};

// --- HELPER FUNCTIONS ---

/**
 * Checks if the request's origin is an allowed Google domain.
 * @param {string|null} origin - The origin header from the request.
 * @returns {boolean}
 */
function isOriginAllowed(origin) {
    if (!origin) return false;
    // Apps Script web apps are served from a `googleusercontent.com` domain.
    const googleOriginRegex = /^https:\/\/n-([a-z0-9-]{32,})-0lu-script\.googleusercontent\.com$/;
    return googleOriginRegex.test(origin);
}

/**
 * Handles CORS preflight OPTIONS requests.
 * @param {Request} request
 * @param {string} origin
 * @returns {Response}
 */
function handleOptions(request, origin) {
    return new Response(null, {
      headers: corsHeaders(origin),
    });
}

/**
 * Generates the necessary CORS headers for a response.
 * @param {string} origin - The allowed origin.
 * @returns {HeadersInit}
 */
const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

/**
 * Generates a Google OAuth2 access token from a service account key using JWT.
 * @param {object} SERVICE_ACCOUNT_CREDS - The service account credentials.
 * @returns {Promise<string>} The access token.
 */
async function getAccessToken(SERVICE_ACCOUNT_CREDS) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const claims = { iss: SERVICE_ACCOUNT_CREDS.client_email, scope: 'https://www.googleapis.com/auth/drive', aud: 'https://oauth2.googleapis.com/token', exp, iat };
  const jwt = await sign(claims, SERVICE_ACCOUNT_CREDS.private_key);
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// --- JWT Signing Logic ---
async function sign(payload, privateKey) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToArrayBuffer(privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, strToArrayBuffer(data));
  return `${data}.${base64url(signature)}`;
}
function strToArrayBuffer(str) { const buf = new ArrayBuffer(str.length); const bufView = new Uint8Array(buf); for (let i = 0, strLen = str.length; i < strLen; i++) { bufView[i] = str.charCodeAt(i); } return buf; }
function pemToArrayBuffer(pem) { const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, ''); const binary = atob(b64); const len = binary.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) { bytes[i] = binary.charCodeAt(i); } return bytes.buffer; }
function base64url(data) { let base64 = typeof data === 'string' ? btoa(data) : btoa(String.fromCharCode.apply(null, new Uint8Array(data))); return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }

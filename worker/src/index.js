// Salesforce API configuration
const SF_API_VERSION = 'v58.0';
const SF_LOGIN_URL = 'https://login.salesforce.com';
const SF_AUTH_URL = `${SF_LOGIN_URL}/services/oauth2/authorize`;
const SF_TOKEN_URL = `${SF_LOGIN_URL}/services/oauth2/token`;

// Base64URL encode
function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate random string for PKCE
function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(x => charset[x % charset.length]).join('');
}

// Generate code verifier and challenge
async function generatePKCE() {
  const verifier = generateRandomString(128);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64URLEncode(digest);
  return { verifier, challenge };
}

// Get OAuth URL for Salesforce login
async function getOAuthUrl(env) {
  if (!env.SF_CLIENT_ID) {
    throw new Error('SF_CLIENT_ID is not configured');
  }

  if (!env.REDIRECT_URI) {
    throw new Error('REDIRECT_URI is not configured');
  }

  const { verifier, challenge } = await generatePKCE();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.SF_CLIENT_ID,
    redirect_uri: env.REDIRECT_URI,
    scope: 'api refresh_token',
    state: crypto.randomUUID(),
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  const url = `https://login.salesforce.com/services/oauth2/authorize?${params.toString()}`;
  
  return {
    url,
    codeVerifier: verifier
  };
}

// Get CORS headers
function getCorsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, SF-Instance-URL',
  };
}

// Handle CORS preflight
function handleOptions(request) {
  return new Response(null, {
    headers: getCorsHeaders(request),
  });
}

// Exchange code for access token
async function getAccessToken(code, env, codeVerifier) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.SF_CLIENT_ID,
    client_secret: env.SF_CLIENT_SECRET,
    redirect_uri: env.REDIRECT_URI,
    code: code,
    code_verifier: codeVerifier
  });

  const response = await fetch(SF_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code for token');
  }

  return response.json();
}

// Make authenticated Salesforce API request
async function sfRequest(instanceUrl, accessToken, path, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${instanceUrl}/services/data/${SF_API_VERSION}${path}`, options);
  
  if (!response.ok) {
    throw new Error(`Salesforce API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Handle API requests
async function handleRequest(request, env) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Get OAuth URL
    if (path === '/auth/url') {
      try {
        const { url, codeVerifier } = await getOAuthUrl(env);
        
        console.log('Generated auth URL response:', {
          url,
          codeVerifier
        });
        
        const response = new Response(
          JSON.stringify({ url, codeVerifier }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...getCorsHeaders(request),
            },
          }
        );
        
        console.log('Response headers:', Object.fromEntries(response.headers));
        return response;
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...getCorsHeaders(request),
            },
          }
        );
      }
    }

    // Handle OAuth callback
    if (path === '/auth/callback') {
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              ...getCorsHeaders(request),
            },
          }
        );
      }

      const body = await request.json();
      const { code, codeVerifier } = body;

      if (!code) {
        throw new Error('No authorization code provided');
      }

      if (!codeVerifier) {
        throw new Error('No code verifier provided');
      }

      try {
        const tokenResponse = await getAccessToken(code, env, codeVerifier);
        return new Response(JSON.stringify(tokenResponse), {
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(request),
          },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...getCorsHeaders(request),
            },
          }
        );
      }
    }

    // All other endpoints require authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: getCorsHeaders(request),
      });
    }

    const accessToken = authHeader.split(' ')[1];
    const instanceUrl = request.headers.get('SF-Instance-URL');
    if (!instanceUrl) {
      return new Response('Instance URL required', {
        status: 400,
        headers: getCorsHeaders(request),
      });
    }

    // Search accounts
    if (path === '/api/accounts/search') {
      const searchTerm = url.searchParams.get('term') || '';
      const sosl = `FIND {${searchTerm}*} IN NAME FIELDS RETURNING Account(Id, Name, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry)`;
      const results = await sfRequest(
        instanceUrl,
        accessToken,
        `/search?q=${encodeURIComponent(sosl)}`
      );
      
      console.log('Search accounts response:', results);
      
      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request),
        },
      });
    }

    // Get pricebooks
    if (path === '/api/pricebooks') {
      const results = await sfRequest(
        instanceUrl,
        accessToken,
        '/query?q=' + encodeURIComponent('SELECT Id, Name FROM Pricebook2')
      );
      
      console.log('Get pricebooks response:', results);
      
      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request),
        },
      });
    }

    // Get pricebook entries
    if (path === '/api/pricebookentries') {
      const priceBookId = url.searchParams.get('pricebookId');
      if (!priceBookId) {
        throw new Error('Price book ID is required');
      }

      const soql = `SELECT Id, UnitPrice, Product2.Name, Product2.ProductCode FROM PricebookEntry WHERE Pricebook2Id = '${priceBookId}'`;
      const results = await sfRequest(
        instanceUrl,
        accessToken,
        '/query?q=' + encodeURIComponent(soql)
      );
      
      console.log('Get pricebook entries response:', results);
      
      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request),
        },
      });
    }

    // Handle 404
    return new Response('Not Found', {
      status: 404,
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request),
        },
      }
    );
  }
}

// Export Worker handler
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    return handleRequest(request, env);
  },
};

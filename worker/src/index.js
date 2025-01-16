// Salesforce API configuration
const SF_API_VERSION = 'v58.0';
const SF_LOGIN_URL = 'https://login.salesforce.com';
const SF_AUTH_URL = `${SF_LOGIN_URL}/services/oauth2/authorize`;
const SF_TOKEN_URL = `${SF_LOGIN_URL}/services/oauth2/token`;

// Base64URL encode
function base64URLEncode(buffer) {
  try {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    console.log('Base64URL encoded successfully:', base64);
    return base64;
  } catch (error) {
    console.error('Base64URL encoding failed:', error);
    throw error;
  }
}

// Generate random string for PKCE
function generateRandomString(length) {
  try {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    const result = Array.from(array).map(x => charset[x % charset.length]).join('');
    console.log('Generated random string successfully');
    return result;
  } catch (error) {
    console.error('Random string generation failed:', error);
    throw error;
  }
}

// Generate code verifier and challenge
async function generatePKCE() {
  try {
    console.log('Starting PKCE generation...');
    
    const verifier = generateRandomString(128);
    console.log('Generated verifier');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    console.log('Encoded verifier');
    
    const digest = await crypto.subtle.digest('SHA-256', data);
    console.log('Generated digest');
    
    const challenge = base64URLEncode(digest);
    console.log('Generated challenge');
    
    console.log('PKCE generation successful:', { verifier, challenge });
    return { verifier, challenge };
  } catch (error) {
    console.error('PKCE generation failed:', error);
    throw error;
  }
}

// Get OAuth URL for Salesforce login
async function getOAuthUrl(env) {
  try {
    console.log('Starting OAuth URL generation...');
    console.log('Environment variables:', {
      hasSfClientId: !!env.SF_CLIENT_ID,
      hasRedirectUri: !!env.REDIRECT_URI,
      redirectUri: env.REDIRECT_URI
    });

    // Validate environment variables
    if (!env.SF_CLIENT_ID) {
      throw new Error('SF_CLIENT_ID is not configured');
    }

    if (!env.REDIRECT_URI) {
      throw new Error('REDIRECT_URI is not configured');
    }

    // Generate PKCE values
    const { verifier, challenge } = await generatePKCE();
    console.log('Generated PKCE values:', {
      hasVerifier: !!verifier,
      hasChallenge: !!challenge,
      verifierLength: verifier.length,
      challengeLength: challenge.length
    });

    // Build OAuth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.SF_CLIENT_ID,
      redirect_uri: env.REDIRECT_URI,
      scope: 'api refresh_token openid',
      state: crypto.randomUUID(),
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });

    const url = `${SF_AUTH_URL}?${params.toString()}`;
    console.log('Generated OAuth URL:', url);

    // Return both URL and code verifier
    const result = {
      url,
      codeVerifier: verifier
    };

    // Validate response
    if (!result.url) {
      throw new Error('Failed to generate OAuth URL');
    }
    if (!result.codeVerifier) {
      throw new Error('Failed to generate code verifier');
    }

    console.log('OAuth URL generation successful:', {
      hasUrl: !!result.url,
      hasCodeVerifier: !!result.codeVerifier,
      urlLength: result.url.length,
      verifierLength: result.codeVerifier.length
    });

    return result;
  } catch (error) {
    console.error('OAuth URL generation failed:', error);
    throw error;
  }
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
  try {
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

    console.log('Access token generation successful:', await response.json());
    return response.json();
  } catch (error) {
    console.error('Access token generation failed:', error);
    throw error;
  }
}

// Make authenticated Salesforce API request
async function sfRequest(instanceUrl, accessToken, path, method = 'GET', body = null) {
  try {
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

    console.log('Salesforce API request successful:', await response.json());
    return response.json();
  } catch (error) {
    console.error('Salesforce API request failed:', error);
    throw error;
  }
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
    console.log('Handling request:', { method: request.method, path });

    // Get OAuth URL
    if (path === '/auth/url') {
      try {
        // Generate OAuth URL and code verifier
        const authData = await getOAuthUrl(env);
        console.log('Generated auth data:', {
          hasUrl: !!authData.url,
          hasCodeVerifier: !!authData.codeVerifier,
          urlLength: authData.url.length,
          verifierLength: authData.codeVerifier.length
        });

        // Create response
        const responseBody = JSON.stringify(authData);
        console.log('Response body:', responseBody);

        // Return response with both URL and code verifier
        const response = new Response(responseBody, {
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(request),
          },
        });

        // Log response details
        console.log('Response details:', {
          status: response.status,
          hasContentType: response.headers.has('Content-Type'),
          hasCors: response.headers.has('Access-Control-Allow-Origin'),
          bodySize: responseBody.length
        });

        return response;
      } catch (error) {
        console.error('Error generating auth URL:', {
          error,
          message: error.message,
          stack: error.stack
        });
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
      try {
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
      } catch (error) {
        console.error('Error searching accounts:', {
          error,
          message: error.message,
          stack: error.stack
        });
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

    // Get pricebooks
    if (path === '/api/pricebooks') {
      try {
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
      } catch (error) {
        console.error('Error getting pricebooks:', {
          error,
          message: error.message,
          stack: error.stack
        });
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

    // Get pricebook entries
    if (path === '/api/pricebookentries') {
      try {
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
      } catch (error) {
        console.error('Error getting pricebook entries:', {
          error,
          message: error.message,
          stack: error.stack
        });
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

    // Handle 404
    return new Response('Not Found', {
      status: 404,
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    console.error('Request failed:', {
      error,
      message: error.message,
      stack: error.stack
    });
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

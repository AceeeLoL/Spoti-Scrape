import http from 'http';
import { URL } from 'url';
import fs from 'fs/promises';
import open from 'open';
import { createServer } from 'http';
import destroyable from 'server-destroy';
import { config } from './config.js';
import axios from 'axios';
import crypto from 'crypto';

/**
 * Spotify OAuth Authentication Flow
 * 
 * Steps:
 * 1. Start local server to receive callback
 * 2. Open browser for user authorization
 * 3. Exchange authorization code for tokens
 * 4. Save tokens to file for reuse
 */

class SpotifyAuth {
  constructor() {
    this.server = null;
    this.tokens = null;
  }

  generateRandomString(length) {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
  }

  async loadTokens() {
    try {
      const data = await fs.readFile(config.tokenFile, 'utf-8');
      this.tokens = JSON.parse(data);
      return this.tokens;
    } catch (error) {
      return null;
    }
  }

  async saveTokens(tokens) {
    this.tokens = tokens;
    await fs.writeFile(config.tokenFile, JSON.stringify(tokens, null, 2));
  }

  async refreshAccessToken() {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refresh_token
      }), 
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            config.spotify.clientId + ':' + config.spotify.clientSecret
          ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const newTokens = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || this.tokens.refresh_token,
      expires_at: Date.now() + (response.data.expires_in * 1000),
      token_type: response.data.token_type
    };

    await this.saveTokens(newTokens);
    return newTokens;
  }

  async getValidToken() {
    const tokens = await this.loadTokens();
    
    if (!tokens) {
      console.log('No tokens found. Please run: npm run auth');
      return null;
    }

    // Check if token expired (with 5 minute buffer)
    if (tokens.expires_at && Date.now() >= (tokens.expires_at - 300000)) {
      console.log('Token expired, refreshing...');
      const newTokens = await this.refreshAccessToken();
      return newTokens.access_token;
    }

    return tokens.access_token;
  }

  async startAuthFlow() {
    return new Promise((resolve, reject) => {
      const state = this.generateRandomString(16);
      
      // Create authorization URL
      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.append('client_id', config.spotify.clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', config.spotify.redirectUri);
      authUrl.searchParams.append('scope', config.spotify.scopes.join(' '));
      authUrl.searchParams.append('state', state);

      // Start callback server
      this.server = createServer(async (req, res) => {
        try {
          const reqUrl = new URL(req.url, `http://127.0.0.1:${config.port}`);
          const code = reqUrl.searchParams.get('code');
          const returnedState = reqUrl.searchParams.get('state');

          if (returnedState !== state) {
            res.writeHead(400);
            res.end('State mismatch');
            reject(new Error('State mismatch'));
            return;
          }

          if (!code) {
            res.writeHead(400);
            res.end('No authorization code');
            reject(new Error('No authorization code'));
            return;
          }

          // Exchange code for tokens
          const tokenResponse = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: config.spotify.redirectUri
            }),
            {
              headers: {
                'Authorization': 'Basic ' + Buffer.from(
                  config.spotify.clientId + ':' + config.spotify.clientSecret
                ).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );

          const tokens = {
            access_token: tokenResponse.data.access_token,
            refresh_token: tokenResponse.data.refresh_token,
            expires_at: Date.now() + (tokenResponse.data.expires_in * 1000),
            token_type: tokenResponse.data.token_type
          };

          await this.saveTokens(tokens);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <h1>Success!</h1>
            <p>You can close this window and return to your terminal.</p>
            <script>window.close();</script>
          `);

          // Close server
          destroyable(this.server);
          this.server.destroy();
          
          resolve(tokens);
        } catch (error) {
          res.writeHead(500);
          res.end('Authentication failed');
          reject(error);
        }
      });

      this.server.listen(config.port, () => {
        console.log(`\nOpening browser for Spotify authorization...`);
        console.log(`If browser doesn't open, visit:\n${authUrl.toString()}\n`);
        open(authUrl.toString());
      });
    });
  }
}

export const spotifyAuth = new SpotifyAuth();

// CLI entry point
if (process.argv[1].includes('auth.js')) {
  (async () => {
    try {
      console.log('Starting Spotify authentication...\n');
      const tokens = await spotifyAuth.startAuthFlow();
      console.log('\n✓ Authentication successful!');
      console.log('Tokens saved to tokens.json');
      console.log('\nYou can now run:');
      console.log('  npm run fetch    - Fetch your listening data');
      console.log('  npm run analyze  - Generate statistics');
    } catch (error) {
      console.error('Authentication failed:', error.message);
      process.exit(1);
    }
  })();
}

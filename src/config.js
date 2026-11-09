import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const requiredEnv = [
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET'
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('Please check your .env file.');
  process.exit(1);
}

export const config = {
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback',
    scopes: [
      'user-read-recently-played',
      'user-top-read',
      'user-library-read',
      'user-read-playback-state',
      'playlist-read-private',
      'playlist-read-collaborative'
    ]
  },
  port: parseInt(process.env.PORT, 10) || 3000,
  tokenFile: path.resolve(process.cwd(), 'tokens.json'),
  dataDir: path.resolve(process.cwd(), 'data')
};

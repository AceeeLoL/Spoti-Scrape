import axios from 'axios';
import { spotifyAuth } from './auth.js';

/**
 * Spotify Web API Client
 * Handles all API requests with automatic token refresh
 */

class SpotifyAPIClient {
  constructor() {
    this.baseURL = 'https://api.spotify.com/v1';
  }

  async makeRequest(endpoint, params = {}) {
    const token = await spotifyAuth.getValidToken();
    
    if (!token) {
      throw new Error('Not authenticated. Run: npm run auth');
    }

    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params
      });
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token might be invalid, try refreshing
        await spotifyAuth.refreshAccessToken();
        const newToken = await spotifyAuth.getValidToken();
        
        const retryResponse = await axios.get(`${this.baseURL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${newToken}`
          },
          params
        });
        
        return retryResponse.data;
      }
      
      // Handle Rate Limiting
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 30;
        console.warn(`Rate limited. Waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.makeRequest(endpoint, params);
      }
      
      throw error;
    }
  }

  async makePaginatedRequest(endpoint, params = {}, maxItems = null) {
    let items = [];
    let nextUrl = null;
    let total = 0;

    const initialData = await this.makeRequest(endpoint, params);
    items = initialData.items || initialData.tracks || [];
    total = initialData.total;
    nextUrl = initialData.next;

    while (nextUrl && (!maxItems || items.length < maxItems)) {
      if (maxItems && items.length >= maxItems) break;

      const nextData = await this.makeRequest(nextUrl.replace(this.baseURL, ''));
      items = items.concat(nextData.items || nextData.tracks || []);
      nextUrl = nextData.next;
    }

    return { items: maxItems ? items.slice(0, maxItems) : items, total };
  }

  // User Profile
  async getCurrentUser() {
    return this.makeRequest('/me');
  }

  // Top Artists and Tracks
  async getTopArtists(timeRange = 'medium_term', limit = 50) {
    return this.makeRequest('/me/top/artists', {
      time_range: timeRange,
      limit
    });
  }

  async getTopTracks(timeRange = 'medium_term', limit = 50) {
    return this.makeRequest('/me/top/tracks', {
      time_range: timeRange,
      limit
    });
  }

  // Recently Played
  async getRecentlyPlayed(limit = 50) {
    return this.makeRequest('/me/player/recently-played', { limit });
  }

  // Saved Tracks
  async getSavedTracks(limit = 50) {
    return this.makePaginatedRequest('/me/tracks', { limit }, limit);
  }

  // Saved Albums
  async getSavedAlbums(limit = 50) {
    return this.makePaginatedRequest('/me/albums', { limit }, limit);
  }

  // Playlists
  async getPlaylists(limit = 50) {
    return this.makePaginatedRequest('/me/playlists', { limit }, limit);
  }

  async getPlaylistTracks(playlistId, limit = 100) {
    return this.makePaginatedRequest(`/playlists/${playlistId}/tracks`, { limit }, limit);
  }

  // Followed Artists
  async getFollowedArtists(limit = 50) {
    return this.makePaginatedRequest('/me/following', {
      type: 'artist',
      limit
    }, limit);
  }

  // Audio Features (for track analysis)
  async getAudioFeatures(trackIds) {
    // Batch requests (max 100 IDs per request)
    const batches = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      batches.push(trackIds.slice(i, i + 100));
    }

    const results = [];
    for (const batch of batches) {
      const data = await this.makeRequest('/audio-features', {
        ids: batch.join(',')
      });
      results.push(...(data.audio_features || []));
    }

    return results;
  }
}

export const spotifyClient = new SpotifyAPIClient();

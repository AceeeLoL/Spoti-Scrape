import fs from 'fs/promises';
import { spotifyClient } from './api-client.js';
import { config } from './config.js';
import ora from 'ora';

/**
 * Fetch all listening data from Spotify API
 * Saves to data/ directory for offline analysis
 */

class DataFetcher {
  constructor() {
    this.spinner = null;
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(config.dataDir, { recursive: true });
    } catch (error) {
      // Directory exists
    }
  }

  async saveData(filename, data) {
    await this.ensureDataDir();
    await fs.writeFile(
      `${config.dataDir}/${filename}`,
      JSON.stringify(data, null, 2)
    );
  }

  async fetchProfile() {
    this.spinner = ora('Fetching user profile...').start();
    try {
      const profile = await spotifyClient.getCurrentUser();
      await this.saveData('profile.json', profile);
      this.spinner.succeed(`Profile fetched: ${profile.display_name}`);
      return profile;
    } catch (error) {
      this.spinner.fail('Failed to fetch profile');
      throw error;
    }
  }

  async fetchTopArtists() {
    const timeRanges = ['short_term', 'medium_term', 'long_term'];
    const results = {};

    for (const range of timeRanges) {
      this.spinner = ora(`Fetching top artists (${range})...`).start();
      try {
        const data = await spotifyClient.getTopArtists(range, 50);
        results[range] = data.items;
        this.spinner.succeed(`Top artists (${range}): ${data.items.length} items`);
      } catch (error) {
        this.spinner.fail(`Failed to fetch top artists (${range})`);
        throw error;
      }
    }

    await this.saveData('top-artists.json', results);
    return results;
  }

  async fetchTopTracks() {
    const timeRanges = ['short_term', 'medium_term', 'long_term'];
    const results = {};

    for (const range of timeRanges) {
      this.spinner = ora(`Fetching top tracks (${range})...`).start();
      try {
        const data = await spotifyClient.getTopTracks(range, 50);
        results[range] = data.items;
        this.spinner.succeed(`Top tracks (${range}): ${data.items.length} items`);
      } catch (error) {
        this.spinner.fail(`Failed to fetch top tracks (${range})`);
        throw error;
      }
    }

    await this.saveData('top-tracks.json', results);
    return results;
  }

  async fetchRecentlyPlayed() {
    this.spinner = ora('Fetching recently played tracks...').start();
    try {
      const data = await spotifyClient.getRecentlyPlayed(50);
      await this.saveData('recently-played.json', data.items);
      this.spinner.succeed(`Recently played: ${data.items.length} tracks`);
      return data.items;
    } catch (error) {
      this.spinner.fail('Failed to fetch recently played');
      throw error;
    }
  }

  async fetchSavedTracks(limit = 200) {
    this.spinner = ora('Fetching saved tracks...').start();
    try {
      const data = await spotifyClient.getSavedTracks(limit);
      const tracks = data.items.map(item => item.track);
      await this.saveData('saved-tracks.json', tracks);
      this.spinner.succeed(`Saved tracks: ${tracks.length} of ${data.total}`);
      return tracks;
    } catch (error) {
      this.spinner.fail('Failed to fetch saved tracks');
      throw error;
    }
  }

  async fetchSavedAlbums(limit = 50) {
    this.spinner = ora('Fetching saved albums...').start();
    try {
      const data = await spotifyClient.getSavedAlbums(limit);
      await this.saveData('saved-albums.json', data.items);
      this.spinner.succeed(`Saved albums: ${data.items.length} of ${data.total}`);
      return data.items;
    } catch (error) {
      this.spinner.fail('Failed to fetch saved albums');
      throw error;
    }
  }

  async fetchPlaylists(limit = 50) {
    this.spinner = ora('Fetching playlists...').start();
    try {
      const data = await spotifyClient.getPlaylists(limit);
      await this.saveData('playlists.json', data.items);
      this.spinner.succeed(`Playlists: ${data.items.length} of ${data.total}`);
      return data.items;
    } catch (error) {
      this.spinner.fail('Failed to fetch playlists');
      throw error;
    }
  }

  async fetchAll() {
    console.log('\n🎵 Starting Spotify data fetch...\n');

    const results = {
      profile: null,
      topArtists: null,
      topTracks: null,
      recentlyPlayed: null,
      savedTracks: null,
      savedAlbums: null,
      playlists: null
    };

    try {
      results.profile = await this.fetchProfile();
      results.topArtists = await this.fetchTopArtists();
      results.topTracks = await this.fetchTopTracks();
      results.recentlyPlayed = await this.fetchRecentlyPlayed();
      results.savedTracks = await this.fetchSavedTracks();
      results.savedAlbums = await this.fetchSavedAlbums();
      results.playlists = await this.fetchPlaylists();

      console.log('\n✓ All data fetched successfully!');
      console.log(`Data saved to ${config.dataDir}/\n`);

      return results;
    } catch (error) {
      console.error('\n✗ Error fetching data:', error.message);
      throw error;
    }
  }
}

export const dataFetcher = new DataFetcher();

// CLI entry point
if (process.argv[1].includes('fetch-data.js')) {
  (async () => {
    await dataFetcher.fetchAll();
  })();
}

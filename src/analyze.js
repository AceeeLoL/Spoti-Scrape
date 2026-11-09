import fs from 'fs/promises';

/**
 * Analyze listening statistics from fetched data
 */

class StatisticsAnalyzer {
  constructor() {
    this.data = {};
  }

  async loadData() {
    const files = [
      'profile',
      'top-artists',
      'top-tracks',
      'recently-played',
      'saved-tracks',
      'saved-albums',
      'playlists'
    ];

    for (const file of files) {
      try {
        const content = await fs.readFile(`./data/${file}.json`, 'utf-8');
        this.data[file.replace('-', '_')] = JSON.parse(content);
      } catch (error) {
        console.log(`Warning: Could not load ${file}.json`);
      }
    }
  }

  analyzeGenres() {
    const genreCounts = {};
    const genreArtistMap = {};

    // Analyze from top artists
    if (this.data.top_artists) {
      Object.values(this.data.top_artists).flat().forEach(artist => {
        artist.genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          if (!genreArtistMap[genre]) genreArtistMap[genre] = [];
          genreArtistMap[genre].push(artist.name);
        });
      });
    }

    // Sort by frequency
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return {
      topGenres: sortedGenres,
      genreDiversity: Object.keys(genreCounts).length,
      genreArtistMap
    };
  }

  analyzeListeningTime() {
    const stats = {
      totalTracks: 0,
      totalDurationMs: 0,
      estimatedHours: 0,
      averageTrackDuration: 0,
      byTimeRange: {}
    };

    // From saved tracks
    if (this.data.saved_tracks) {
      const tracks = this.data.saved_tracks;
      stats.totalTracks += tracks.length;
      tracks.forEach(track => {
        stats.totalDurationMs += track.duration_ms || 0;
      });
    }

    // From top tracks
    if (this.data.top_tracks) {
      Object.entries(this.data.top_tracks).forEach(([range, tracks]) => {
        const duration = tracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0);
        stats.byTimeRange[range] = {
          count: tracks.length,
          durationMs: duration,
          hours: (duration / 3600000).toFixed(2)
        };
      });
    }

    stats.estimatedHours = (stats.totalDurationMs / 3600000).toFixed(2);
    stats.averageTrackDuration = stats.totalTracks > 0 
      ? Math.round(stats.totalDurationMs / stats.totalTracks / 1000) 
      : 0;

    return stats;
  }

  analyzeArtists() {
    const artistStats = {
      topArtists: {},
      artistCounts: {},
      uniqueArtists: new Set()
    };

    // Count artist occurrences across different datasets
    const countArtist = (artist, source) => {
      if (!artist) return;
      artistStats.uniqueArtists.add(artist.id);
      if (!artistStats.artistCounts[artist.id]) {
        artistStats.artistCounts[artist.id] = {
          name: artist.name,
          count: 0,
          sources: [],
          genres: artist.genres || []
        };
      }
      artistStats.artistCounts[artist.id].count++;
      artistStats.artistCounts[artist.id].sources.push(source);
    };

    // From top artists
    if (this.data.top_artists) {
      Object.entries(this.data.top_artists).forEach(([range, artists]) => {
        artistStats.topArtists[range] = artists.slice(0, 10).map(a => ({
          name: a.name,
          popularity: a.popularity,
          genres: a.genres.slice(0, 3)
        }));
        artists.forEach(a => countArtist(a, `top_${range}`));
      });
    }

    // From top tracks
    if (this.data.top_tracks) {
      Object.values(this.data.top_tracks).flat().forEach(track => {
        track.artists?.forEach(a => countArtist(a, 'top_track'));
      });
    }

    // From saved tracks
    if (this.data.saved_tracks) {
      this.data.saved_tracks.forEach(track => {
        track.artists?.forEach(a => countArtist(a, 'saved_track'));
      });
    }

    // Most frequent artists
    const frequentArtists = Object.values(artistStats.artistCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      topArtists: artistStats.topArtists,
      frequentArtists,
      uniqueArtistCount: artistStats.uniqueArtists.size
    };
  }

  analyzeTracks() {
    const trackStats = {
      topTracks: {},
      audioCharacteristics: {},
      popularity: {}
    };

    if (this.data.top_tracks) {
      Object.entries(this.data.top_tracks).forEach(([range, tracks]) => {
        trackStats.topTracks[range] = tracks.slice(0, 10).map(t => ({
          name: t.name,
          artists: t.artists?.map(a => a.name).join(', '),
          popularity: t.popularity,
          duration: Math.round(t.duration_ms / 1000)
        }));

        // Popularity analysis
        const avgPopularity = tracks.reduce((sum, t) => sum + (t.popularity || 0), 0) / tracks.length;
        trackStats.popularity[range] = {
          average: Math.round(avgPopularity),
          min: Math.min(...tracks.map(t => t.popularity || 0)),
          max: Math.max(...tracks.map(t => t.popularity || 0))
        };
      });
    }

    return trackStats;
  }

  analyzePlaylists() {
    if (!this.data.playlists) return null;

    const stats = {
      total: this.data.playlists.length,
      totalTracks: 0,
      owned: 0,
      collaborative: 0,
      public: 0,
      averageTracksPerPlaylist: 0
    };

    this.data.playlists.forEach(playlist => {
      stats.totalTracks += playlist.tracks?.total || 0;
      if (playlist.owner?.id === this.data.profile?.id) stats.owned++;
      if (playlist.collaborative) stats.collaborative++;
      if (playlist.public) stats.public++;
    });

    stats.averageTracksPerPlaylist = stats.total > 0 
      ? Math.round(stats.totalTracks / stats.total) 
      : 0;

    return stats;
  }

  analyzeListeningPatterns() {
    const patterns = {
      recentlyPlayed: null,
      timeOfDay: {},
      dayOfWeek: {}
    };

    if (this.data.recently_played) {
      const recentTracks = this.data.recently_played;
      patterns.recentlyPlayed = {
        count: recentTracks.length,
        lastPlayed: recentTracks[0]?.played_at
      };

      // Analyze when you listen
      recentTracks.forEach(item => {
        if (item.played_at) {
          const date = new Date(item.played_at);
          const hour = date.getHours();
          const day = date.toLocaleDateString('en-US', { weekday: 'long' });

          patterns.timeOfDay[hour] = (patterns.timeOfDay[hour] || 0) + 1;
          patterns.dayOfWeek[day] = (patterns.dayOfWeek[day] || 0) + 1;
        }
      });
    }

    return patterns;
  }

  async generateFullReport() {
    await this.loadData();

    const report = {
      generatedAt: new Date().toISOString(),
      profile: this.data.profile,
      genres: this.analyzeGenres(),
      listeningTime: this.analyzeListeningTime(),
      artists: this.analyzeArtists(),
      tracks: this.analyzeTracks(),
      playlists: this.analyzePlaylists(),
      patterns: this.analyzeListeningPatterns()
    };

    await fs.writeFile('./data/statistics.json', JSON.stringify(report, null, 2));
    return report;
  }
}

export const statisticsAnalyzer = new StatisticsAnalyzer();

// CLI entry point
if (process.argv[1].includes('analyze.js')) {
  (async () => {
    console.log('\n📊 Analyzing listening statistics...\n');
    const report = await statisticsAnalyzer.generateFullReport();
    console.log('✓ Report generated: data/statistics.json\n');
  })();
}

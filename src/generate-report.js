import fs from 'fs/promises';
import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Generate beautiful terminal report from statistics
 */

class ReportGenerator {
  constructor(report) {
    this.report = report;
  }

  printHeader() {
    console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║   🎵 SPOTIFY LISTENING STATISTICS 🎵     ║'));
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝\n'));
    
    if (this.report.profile) {
      console.log(chalk.bold(`User: ${this.report.profile.display_name || 'Unknown'}`));
      console.log(chalk.gray(`Generated: ${new Date(this.report.generatedAt).toLocaleString()}\n`));
    }
  }

  printGenreStats() {
    if (!this.report.genres) return;

    console.log(chalk.bold.magenta('\n📌 TOP GENRES\n'));
    
    const table = new Table({
      head: [chalk.cyan('Rank'), chalk.cyan('Genre'), chalk.cyan('Count')],
      colWidths: [8, 35, 10]
    });

    this.report.genres.topGenres.slice(0, 10).forEach((genre, i) => {
      table.push([i + 1, genre[0], genre[1]]);
    });

    console.log(table.toString());
    console.log(chalk.gray(`Genre Diversity: ${this.report.genres.genreDiversity} unique genres\n`));
  }

  printListeningTime() {
    if (!this.report.listeningTime) return;

    console.log(chalk.bold.magenta('\n⏱️  LISTENING TIME\n'));
    
    const stats = this.report.listeningTime;
    console.log(`  Total Tracks: ${chalk.bold(stats.totalTracks)}`);
    console.log(`  Estimated Hours: ${chalk.bold.green(stats.estimatedHours + 'h')}`);
    console.log(`  Average Track Duration: ${Math.floor(stats.averageTrackDuration / 60)}m ${stats.averageTrackDuration % 60}s`);

    if (Object.keys(stats.byTimeRange).length > 0) {
      console.log(chalk.gray('\n  By Time Range:'));
      Object.entries(stats.byTimeRange).forEach(([range, data]) => {
        const label = range === 'short_term' ? '4 weeks' 
                    : range === 'medium_term' ? '6 months' 
                    : 'All time';
        console.log(`    ${label}: ${data.count} tracks, ${data.hours}h`);
      });
    }
    console.log();
  }

  printArtistStats() {
    if (!this.report.artists) return;

    console.log(chalk.bold.magenta('\n🎤 TOP ARTISTS\n'));

    // Top artists by time range
    if (this.report.artists.topArtists) {
      Object.entries(this.report.artists.topArtists).forEach(([range, artists]) => {
        const label = range === 'short_term' ? 'Last 4 Weeks' 
                    : range === 'medium_term' ? 'Last 6 Months' 
                    : 'All Time';
        
        console.log(chalk.bold.cyan(`  ${label}:`));
        artists.slice(0, 5).forEach((artist, i) => {
          const genres = artist.genres.length > 0 
            ? chalk.gray(` (${artist.genres.slice(0, 2).join(', ')})`) 
            : '';
          console.log(`    ${i + 1}. ${artist.name}${genres}`);
        });
        console.log();
      });
    }

    // Most frequent artists
    if (this.report.artists.frequentArtists) {
      console.log(chalk.bold.cyan('  Most Frequent Across All Data:'));
      this.report.artists.frequentArtists.slice(0, 5).forEach((artist, i) => {
        console.log(`    ${i + 1}. ${artist.name} (${artist.count} appearances)`);
      });
      console.log(chalk.gray(`\n  Unique Artists: ${this.report.artists.uniqueArtistCount}\n`));
    }
  }

  printTrackStats() {
    if (!this.report.tracks) return;

    console.log(chalk.bold.magenta('\n🎵 TOP TRACKS\n'));

    if (this.report.tracks.topTracks) {
      Object.entries(this.report.tracks.topTracks).forEach(([range, tracks]) => {
        const label = range === 'short_term' ? 'Last 4 Weeks' 
                    : range === 'medium_term' ? 'Last 6 Months' 
                    : 'All Time';
        
        console.log(chalk.bold.cyan(`  ${label}:`));
        tracks.slice(0, 5).forEach((track, i) => {
          const duration = `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`;
          console.log(`    ${i + 1}. "${track.name}" - ${track.artists} (${duration})`);
        });
        console.log();
      });
    }

    if (this.report.tracks.popularity) {
      console.log(chalk.bold.cyan('  Track Popularity Scores:'));
      Object.entries(this.report.tracks.popularity).forEach(([range, data]) => {
        const label = range === 'short_term' ? '4 weeks' 
                    : range === 'medium_term' ? '6 months' 
                    : 'All time';
        console.log(`    ${label}: avg ${data.average}, range ${data.min}-${data.max}`);
      });
      console.log();
    }
  }

  printPlaylistStats() {
    if (!this.report.playlists) return;

    console.log(chalk.bold.magenta('\n📁 PLAYLISTS\n'));
    
    const p = this.report.playlists;
    console.log(`  Total Playlists: ${p.total}`);
    console.log(`  Total Tracks: ${p.totalTracks}`);
    console.log(`  Owned: ${p.owned}`);
    console.log(`  Public: ${p.public}`);
    console.log(`  Collaborative: ${p.collaborative}`);
    console.log(`  Avg Tracks/Playlist: ${p.averageTracksPerPlaylist}\n`);
  }

  printListeningPatterns() {
    if (!this.report.patterns) return;

    console.log(chalk.bold.magenta('\n📊 LISTENING PATTERNS\n'));

    if (this.report.patterns.recentlyPlayed) {
      const lastPlayed = new Date(this.report.patterns.recentlyPlayed.lastPlayed);
      console.log(`  Recently Played: ${this.report.patterns.recentlyPlayed.count} tracks`);
      console.log(`  Last Track: ${lastPlayed.toLocaleString()}\n`);
    }

    // Time of day
    if (Object.keys(this.report.patterns.timeOfDay).length > 0) {
      console.log(chalk.bold.cyan('  Listening by Hour:'));
      const hours = Object.entries(this.report.patterns.timeOfDay)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      hours.forEach(([hour, count]) => {
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`    ${hour.padStart(2, '0')}:00 ${bar} ${count}`);
      });
      console.log();
    }

    // Day of week
    if (Object.keys(this.report.patterns.dayOfWeek).length > 0) {
      console.log(chalk.bold.cyan('  Listening by Day:'));
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      days.forEach(day => {
        if (this.report.patterns.dayOfWeek[day]) {
          const count = this.report.patterns.dayOfWeek[day];
          const bar = '█'.repeat(Math.ceil(count / 2));
          console.log(`    ${day.padEnd(10)} ${bar} ${count}`);
        }
      });
      console.log();
    }
  }

  printFullReport() {
    this.printHeader();
    this.printGenreStats();
    this.printListeningTime();
    this.printArtistStats();
    this.printTrackStats();
    this.printPlaylistStats();
    this.printListeningPatterns();

    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('Data saved to: data/statistics.json\n'));
  }
}

// CLI entry point
if (process.argv[1].includes('generate-report.js')) {
  (async () => {
    try {
      const data = await fs.readFile('./data/statistics.json', 'utf-8');
      const report = JSON.parse(data);
      const generator = new ReportGenerator(report);
      generator.printFullReport();
    } catch (error) {
      console.error('Error: Could not load statistics.json');
      console.error('Run "npm run analyze" first.');
      process.exit(1);
    }
  })();
}

export { ReportGenerator };

# Spotify Listening Statistics

A personal tool to scrape and analyze your Spotify listening habits using the Spotify Web API.

## Features

- **Top Artists & Tracks** - View your most-played music across different time ranges
- **Genre Analysis** - Discover your music taste diversity
- **Listening Time** - Estimate your total listening hours
- **Listening Patterns** - See when you listen most (by hour, day of week)
- **Playlist Stats** - Analyze your playlist collection
- **Artist Insights** - Find your most frequent artists across all data

## Setup

### 1. Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in details:
   - App name: `spotify-scrape` (or any name)
   - Description: Personal statistics tool
4. Copy the **Client ID** and **Client Secret**
5. Click "Edit Settings" → Add Redirect URI: `http://127.0.0.1:3000/callback`
6. Save

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
```

### 3. Install Dependencies

```bash
npm install
```

## Usage

### Quick Start (Run Everything)

```bash
npm start
```

This will:
1. Check authentication
2. Fetch all your listening data
3. Generate statistics
4. Display beautiful report

### Step-by-Step

```bash
# Step 1: Authenticate
npm run auth

# Step 2: Fetch data from Spotify
npm run fetch

# Step 3: Analyze data
npm run analyze

# Step 4: View report
npm run report
```

## Data Fetched

The tool fetches the following from your Spotify account:

- **Profile** - Your user information
- **Top Artists** - Last 4 weeks, 6 months, all time
- **Top Tracks** - Last 4 weeks, 6 months, all time
- **Recently Played** - Last 50 tracks with timestamps
- **Saved Tracks** - Up to 200 tracks from your library
- **Saved Albums** - Up to 50 albums
- **Playlists** - Up to 50 playlists

All data is saved locally in `data/` directory for offline analysis.

## Statistics Generated

### Genre Analysis
- Top 20 genres by frequency
- Genre diversity count
- Genre → Artist mapping

### Listening Time
- Total estimated listening hours
- Average track duration
- Breakdown by time range

### Artist Insights
- Top artists by time range
- Most frequent artists across all data
- Unique artist count

### Track Insights
- Top tracks by time range
- Popularity scores (average, min, max)
- Duration analysis

### Listening Patterns
- Listening by hour of day
- Listening by day of week
- Recent activity timestamp

### Playlist Statistics
- Total playlists, tracks
- Owned vs. followed
- Public vs. private
- Average tracks per playlist

## Output

### Terminal Report

Beautiful terminal output with:
- Color-coded sections
- Tables for rankings
- Bar charts for patterns
- Summary statistics

### JSON Data

All data saved as JSON files:
```
data/
├── profile.json
├── top-artists.json
├── top-tracks.json
├── recently-played.json
├── saved-tracks.json
├── saved-albums.json
├── playlists.json
└── statistics.json (complete analysis)
```

## Time Ranges Explained

- **short_term**: Last 4 weeks
- **medium_term**: Last 6 months
- **long_term**: All time (several years)

## Privacy

- All data stays on your machine
- No data is sent to external servers
- Tokens stored locally in `tokens.json`
- Add `tokens.json` to `.gitignore` (already included)

## Rate Limits

Spotify API has rate limits. The tool:
- Uses pagination to fetch large datasets
- Implements automatic token refresh
- Handles rate limit errors gracefully

## Troubleshooting

### "No tokens found"
Run `npm run auth` first to authenticate.

### "Token expired"
The tool automatically refreshes expired tokens.

### "Invalid credentials"
Check your `.env` file has correct Client ID and Secret.

### "Port 3000 in use"
Change `PORT=3001` in `.env` file.

## Development

### Project Structure
```
src/
├── index.js          # Main CLI (runs all steps)
├── auth.js           # OAuth authentication
├── api-client.js     # Spotify API wrapper
├── fetch-data.js     # Data fetching logic
├── analyze.js        # Statistics calculation
├── generate-report.js # Terminal report
└── config.js         # Configuration
```

### Extending

To add more analysis:
1. Add fetcher method in `fetch-data.js`
2. Add analyzer method in `analyze.js`
3. Add display method in `generate-report.js`

## Future Enhancements

Potential features to add:
- [ ] Audio feature analysis (energy, danceability, etc.)
- [ ] Export to CSV/Excel
- [ ] HTML dashboard with charts
- [ ] Compare with friends
- [ ] Historical tracking (track changes over time)
- [ ] Recommendation engine based on your taste

## License

MIT
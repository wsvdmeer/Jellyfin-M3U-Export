# Jellyfin M3U Export

A Docker container that exports Jellyfin and Jellyseerr content as M3U playlists for use with IPTV players.

## Features

- 🎬 Export Jellyfin movies and series as M3U playlists
- 📺 Support for Jellyseerr requested content
- 🔄 Automatic periodic playlist updates
- 🌐 REST API for manual triggers
- 🐳 Docker and Docker Compose support

## Quick Start

### 1. Clone and Configure

```bash
cd /path/to/jellyfin-m3u-export
cp .env.example .env
```

Edit `.env` with your settings:

```env
JELLYFIN_URL=http://jellyfin:8096
JELLYFIN_API_KEY=your_jellyfin_api_key_here
JELLYSEERR_URL=http://jellyseerr:5055
JELLYSEERR_API_KEY=your_jellyseerr_api_key_here
UPDATE_INTERVAL=60
```

### 2. Get Your API Keys

#### Jellyfin API Key:

1. Log into Jellyfin web interface
2. Go to Dashboard → API Keys
3. Click "+" to create a new API key
4. Copy the generated key

#### Jellyseerr API Key:

1. Log into Jellyseerr web interface
2. Go to Settings → General
3. Scroll to "API Key" section
4. Copy the API key

### 3. Run with Docker Compose

```bash
docker-compose up -d
```

### 4. Access Playlists

The service will generate the following playlists in the `./output` directory:

- `jellyfin-all.m3u` - All movies and series
- `jellyfin-movies.m3u` - Movies only
- `jellyfin-series.m3u` - TV series episodes only
- `jellyfin-requested.m3u` - Content requested via Jellyseerr

You can also access them via HTTP:

- `http://localhost:3000/playlists/all`
- `http://localhost:3000/playlists/movies`
- `http://localhost:3000/playlists/series`
- `http://localhost:3000/playlists/requested`

## API Endpoints

- `GET /health` - Health check
- `GET /generate` - Manually trigger playlist generation
- `GET /playlists/:type` - Download a specific playlist (all, movies, series, requested)

## Integration with Existing Docker Compose

If you already have a docker-compose.yml for Jellyfin/Jellyseerr, add this service:

```yaml
services:
  jellyfin-m3u-export:
    build: ./jellyfin-m3u-export
    container_name: jellyfin-m3u-export
    restart: unless-stopped
    environment:
      - JELLYFIN_URL=http://jellyfin:8096
      - JELLYFIN_API_KEY=${JELLYFIN_API_KEY}
      - JELLYSEERR_URL=http://jellyseerr:5055
      - JELLYSEERR_API_KEY=${JELLYSEERR_API_KEY}
      - UPDATE_INTERVAL=60
    ports:
      - "3000:3000"
    volumes:
      - ./jellyfin-playlists:/output
    depends_on:
      - jellyfin
      - jellyseerr
```

## Development

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable             | Description                             | Default                  |
| -------------------- | --------------------------------------- | ------------------------ |
| `JELLYFIN_URL`       | Jellyfin server URL                     | `http://jellyfin:8096`   |
| `JELLYFIN_API_KEY`   | Jellyfin API key                        | Required                 |
| `JELLYSEERR_URL`     | Jellyseerr server URL                   | `http://jellyseerr:5055` |
| `JELLYSEERR_API_KEY` | Jellyseerr API key                      | Optional                 |
| `PORT`               | Server port                             | `3000`                   |
| `OUTPUT_DIR`         | Output directory for playlists          | `/output`                |
| `UPDATE_INTERVAL`    | Update interval in minutes (0=disabled) | `60`                     |

## Using the Playlists

### VLC Media Player

1. Open VLC
2. Media → Open Network Stream
3. Enter: `http://your-server-ip:3000/playlists/all`

### Kodi

1. Install IPTV Simple Client addon
2. Configure M3U Play List URL: `http://your-server-ip:3000/playlists/all`

### Other IPTV Players

Point your IPTV player to any of the playlist URLs listed above.

## Troubleshooting

### Playlists are empty

- Verify your Jellyfin API key is correct
- Check that Jellyfin URL is accessible from the container
- Review container logs: `docker-compose logs jellyfin-m3u-export`

### Can't access playlists

- Ensure port 3000 is not blocked by firewall
- Check Docker network configuration
- Verify all containers are on the same network

## License

MIT

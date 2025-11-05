# Testing on Your Media Server - Quick Guide

## Prerequisites

- Docker and Docker Compose installed on your media server
- Jellyfin running and accessible
- Jellyseerr running (optional)
- SSH access to your media server

## Step 1: Transfer Files to Your Media Server

### Option A: Using Git (Recommended)

```bash
# On your media server
cd /opt  # or wherever you keep your docker apps
git clone <your-repo-url> jellyfin-m3u-export
cd jellyfin-m3u-export
```

### Option B: Using SCP/SFTP

```bash
# From your Windows machine (PowerShell)
scp -r C:\Projects\jellyfin-m3u-export user@your-server:/opt/
```

### Option C: Manual Copy via WinSCP/FileZilla

Copy the entire `jellyfin-m3u-export` folder to your server

## Step 2: Configure Environment Variables

```bash
# On your media server
cd /opt/jellyfin-m3u-export
cp .env.example .env
nano .env  # or use vi/vim
```

### Get Your Jellyfin API Key

1. Open Jellyfin web UI: `http://your-server:8096`
2. Go to: Dashboard → Advanced → API Keys
3. Click the "+" button to create new key
4. Name it "M3U Export" and copy the key
5. Paste into `.env` file

### Get Your Jellyseerr API Key (Optional)

1. Open Jellyseerr web UI: `http://your-server:5055`
2. Go to: Settings → General
3. Find "API Key" section and copy the key
4. Paste into `.env` file

### Update URLs in .env

```env
JELLYFIN_URL=http://jellyfin:8096
JELLYFIN_API_KEY=your_actual_api_key_here

# Optional
JELLYSEERR_URL=http://jellyseerr:5055
JELLYSEERR_API_KEY=your_actual_api_key_here

UPDATE_INTERVAL=60
```

**Important**: If Jellyfin/Jellyseerr use different container names or ports, update accordingly.

## Step 3: Find Your Docker Network

Check what network your Jellyfin container is using:

```bash
docker inspect jellyfin | grep NetworkMode
# or
docker network ls
docker inspect <network-name>
```

Common network names:

- `jellyfin_default`
- `media-network`
- `bridge` (default)

## Step 4: Update docker-compose.yml Network

Edit `docker-compose.yml` and update the network section:

```yaml
networks:
  media-network:
    external: true
    name: your_actual_network_name # e.g., jellyfin_default
```

Or if using default bridge network, remove the networks section entirely.

## Step 5: Build and Run

```bash
# Build the container
docker-compose build

# Start in foreground to see logs (recommended for first test)
docker-compose up

# If everything looks good, stop it (Ctrl+C) and run in background:
docker-compose up -d
```

## Step 6: Verify It's Working

### Check the logs:

```bash
docker-compose logs -f
```

You should see:

```
Starting playlist generation...
Generated: /output/jellyfin-all.m3u
Generated: /output/jellyfin-movies.m3u
Generated: /output/jellyfin-series.m3u
Playlist generation completed successfully!
```

### Check the output files:

```bash
ls -lh output/
cat output/jellyfin-movies.m3u | head -20
```

### Test the API:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/generate
```

### Download a playlist:

```bash
curl http://localhost:3000/playlists/movies -o test.m3u
```

## Step 7: Test the Playlist

### Test with VLC (from any device on your network):

```bash
vlc http://your-server-ip:3000/playlists/movies
```

### Or test locally on server:

```bash
# Install vlc if needed
apt-get install vlc  # Ubuntu/Debian
yum install vlc      # CentOS/RHEL

# Play the playlist
vlc output/jellyfin-movies.m3u
```

## Troubleshooting

### Issue: Empty playlists

```bash
# Check Jellyfin connectivity
docker-compose exec jellyfin-m3u-export sh
wget -O- http://jellyfin:8096/System/Info
# Should return JSON with server info
```

### Issue: Can't reach Jellyfin/Jellyseerr

```bash
# Check if containers can ping each other
docker-compose exec jellyfin-m3u-export ping jellyfin
docker-compose exec jellyfin-m3u-export ping jellyseerr

# If ping fails, check network settings
docker network inspect <your-network-name>
```

### Issue: Port 3000 already in use

Edit `docker-compose.yml`:

```yaml
ports:
  - "3001:3000" # Use port 3001 instead
```

### View detailed logs:

```bash
docker-compose logs -f --tail=100
```

## Integration with Existing Docker Compose

If you have an existing `docker-compose.yml` with Jellyfin/Jellyseerr, you can merge this service:

```yaml
# Add to your existing docker-compose.yml
services:
  # ... your existing services (jellyfin, jellyseerr, etc)

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
```

## Testing Different Scenarios

### Test manual generation:

```bash
curl -X GET http://localhost:3000/generate
```

### Test specific playlist types:

```bash
# Movies only
curl http://localhost:3000/playlists/movies -o movies.m3u

# Series only
curl http://localhost:3000/playlists/series -o series.m3u

# All content
curl http://localhost:3000/playlists/all -o all.m3u
```

### Test with different IPTV players:

- **VLC**: Open Network Stream → `http://your-server:3000/playlists/all`
- **Kodi**: Install IPTV Simple Client → Set M3U URL
- **Perfect Player** (Android): Add playlist URL

## Performance Testing

Check how long it takes to generate playlists:

```bash
time curl http://localhost:3000/generate
```

Monitor resource usage:

```bash
docker stats jellyfin-m3u-export
```

## Next Steps

Once confirmed working:

1. Set up automatic start on boot: `docker-compose up -d`
2. Consider setting up a reverse proxy (nginx/traefik) if needed
3. Add to your backup routine
4. Share the playlist URLs with your devices!

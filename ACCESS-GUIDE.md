# Accessing M3U Playlists from Your Media Server

There are multiple ways to access the generated M3U playlists from your media server.

## 📁 **Method 1: Direct File Access** (Easiest)

The playlists are saved to `./output/` directory on your media server.

```bash
# On your media server
cd /opt/jellyfin-m3u-export/output
ls -lh
# You'll see:
# jellyfin-all.m3u
# jellyfin-movies.m3u
# jellyfin-series.m3u
# jellyfin-requested.m3u
```

**Copy to another location:**

```bash
# Copy to a shared folder
cp /opt/jellyfin-m3u-export/output/*.m3u /mnt/share/playlists/

# Or create a symlink
ln -s /opt/jellyfin-m3u-export/output /mnt/share/jellyfin-playlists
```

---

## 🌐 **Method 2: HTTP Download** (Best for IPTV Players)

Access playlists via HTTP from any device on your network:

```
http://your-server-ip:3000/playlists/all
http://your-server-ip:3000/playlists/movies
http://your-server-ip:3000/playlists/series
http://your-server-ip:3000/playlists/requested
```

**Use in IPTV players:**

- **VLC**: Media → Open Network Stream → Enter URL
- **Kodi**: IPTV Simple Client → M3U Play List URL
- **Perfect Player**: Playlist → Add → URL

**Download with curl:**

```bash
curl http://your-server-ip:3000/playlists/movies -o movies.m3u
```

---

## 🗂️ **Method 3: Mount to SMB/NFS Share** (Network Access)

Share the output directory via Samba or NFS so other devices can access it.

### **Using Samba (SMB):**

1. **Edit docker-compose.yml:**

```yaml
volumes:
  - /mnt/samba-share/playlists:/output
```

2. **Or create a bind mount to existing share:**

```yaml
volumes:
  - /srv/media/jellyfin-playlists:/output
```

3. **Windows Access:**

```
\\your-server\media\jellyfin-playlists\jellyfin-movies.m3u
```

4. **Linux/Mac Access:**

```
smb://your-server/media/jellyfin-playlists/
```

### **Using NFS:**

1. **Update docker-compose.yml:**

```yaml
volumes:
  - type: volume
    source: nfs-playlists
    target: /output
    volume:
      nocopy: true

volumes:
  nfs-playlists:
    driver: local
    driver_opts:
      type: nfs
      o: addr=your-nfs-server,rw
      device: ":/path/to/share"
```

---

## 📺 **Method 4: Reverse Proxy** (External Access)

Expose via nginx/Traefik for external access:

### **Nginx Example:**

```nginx
server {
    listen 80;
    server_name playlists.yourdomain.com;

    location / {
        proxy_pass http://jellyfin-m3u-export:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### **Traefik Labels (in docker-compose.yml):**

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.m3u-export.rule=Host(`playlists.yourdomain.com`)"
  - "traefik.http.services.m3u-export.loadbalancer.server.port=3000"
```

---

## 🐳 **Method 5: Docker Volume Mount Examples**

### **Example 1: Mount to Jellyfin's Directory**

```yaml
volumes:
  # Access playlists from Jellyfin's web interface
  - /var/lib/jellyfin/data/playlists:/output
```

### **Example 2: Mount to Home Directory**

```yaml
volumes:
  # Easy access from your home folder
  - ~/jellyfin-playlists:/output
```

### **Example 3: Named Docker Volume**

```yaml
volumes:
  - jellyfin-m3u-output:/output

volumes:
  jellyfin-m3u-output:
    driver: local
```

---

## 🔧 **Recommended Setup for Media Servers**

**For home servers with existing media shares:**

```yaml
# docker-compose.yml
services:
  jellyfin-m3u-export:
    build: .
    container_name: jellyfin-m3u-export
    restart: unless-stopped
    environment:
      - JELLYFIN_URL=http://jellyfin:8096
      - JELLYFIN_API_KEY=${JELLYFIN_API_KEY}
    ports:
      - "3000:3000"
    volumes:
      - ./output:/output # Local file access
    networks:
      - media-network
```

**Then access via:**

- **Local files**: `/opt/jellyfin-m3u-export/output/`
- **Network share**: `\\server\media\playlists\`
- **HTTP**: `http://server-ip:3000/playlists/movies`

---

## 🛠️ **Troubleshooting Access**

### **Can't access via HTTP:**

```bash
# Check if container is running
docker ps | grep jellyfin-m3u-export

# Check logs
docker-compose logs jellyfin-m3u-export

# Test locally
curl http://localhost:3000/health
```

### **Permission denied on files:**

```bash
# Fix permissions (the container runs as user 65532)
sudo chown -R 65532:65532 /opt/jellyfin-m3u-export/output
sudo chmod -R 755 /opt/jellyfin-m3u-export/output
```

### **Files not updating:**

```bash
# Trigger manual update
curl http://your-server-ip:3000/generate

# Check update interval
docker-compose logs | grep "Scheduled updates"
```

---

## 📱 **Quick Reference: Common Use Cases**

| Use Case          | Method | URL/Path                                                    |
| ----------------- | ------ | ----------------------------------------------------------- |
| **VLC on PC**     | HTTP   | `http://server-ip:3000/playlists/movies`                    |
| **Kodi IPTV**     | HTTP   | `http://server-ip:3000/playlists/all`                       |
| **Mobile Player** | HTTP   | `http://server-ip:3000/playlists/series`                    |
| **Local Script**  | File   | `/opt/jellyfin-m3u-export/output/jellyfin-all.m3u`          |
| **Windows Share** | SMB    | `\\server\share\playlists\jellyfin-movies.m3u`              |
| **Download Once** | curl   | `curl http://server-ip:3000/playlists/movies -o movies.m3u` |

---

## 🎯 **Recommended Approach**

**For most users:**

1. Use **HTTP access** for IPTV players (dynamic, always up-to-date)
2. Use **file access** for scripts or manual copying
3. Optionally mount to network share for Windows/Mac access

This gives you maximum flexibility! 🚀

import express from "express";
import dotenv from "dotenv";
import { JellyfinService } from "./services/JellyfinService";
import { JellyseerrService } from "./services/JellyseerrService";
import { M3UGenerator } from "./services/M3UGenerator";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = process.env.OUTPUT_DIR || "./output";
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL || "60", 10);

console.log("=".repeat(60));
console.log("🎬 Jellyfin M3U Export Starting...");
console.log("=".repeat(60));
console.log(`Server Port: ${PORT}`);
console.log(`Output Directory: ${OUTPUT_DIR}`);
console.log(`Update Interval: ${UPDATE_INTERVAL} minutes`);
console.log(
  `Jellyfin URL: ${process.env.JELLYFIN_URL || "http://jellyfin:8096"}`
);
console.log(
  `Jellyfin API Key: ${
    process.env.JELLYFIN_API_KEY ? "✓ Configured" : "✗ Missing"
  }`
);
console.log(
  `Jellyseerr URL: ${process.env.JELLYSEERR_URL || "http://jellyseerr:5055"}`
);
console.log(
  `Jellyseerr API Key: ${
    process.env.JELLYSEERR_API_KEY ? "✓ Configured" : "✗ Not configured"
  }`
);
console.log("=".repeat(60));

// Ensure output directory exists and is writable
try {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  fs.accessSync(OUTPUT_DIR, fs.constants.W_OK);
} catch (error) {
  console.error(`❌ Output directory ${OUTPUT_DIR} is not writable.`);
  console.error(
    "   The container runs as user 65532. On the host, pre-create the"
  );
  console.error("   directory with: mkdir -p output && chown 65532:65532 output");
  console.error(`   Details: ${error instanceof Error ? error.message : error}`);
}

const jellyfinService = new JellyfinService(
  process.env.JELLYFIN_URL || "http://jellyfin:8096",
  process.env.JELLYFIN_API_KEY || ""
);

const jellyseerrService = process.env.JELLYSEERR_API_KEY
  ? new JellyseerrService(
      process.env.JELLYSEERR_URL || "http://jellyseerr:5055",
      process.env.JELLYSEERR_API_KEY
    )
  : null;

const m3uGenerator = new M3UGenerator(jellyfinService);

// Generate playlists; returns false on failure so callers can report it
async function generatePlaylists(): Promise<boolean> {
  const startTime = Date.now();
  try {
    console.log("\n" + "=".repeat(60));
    console.log("📝 Starting playlist generation...");
    console.log("=".repeat(60));

    // Fetch the library once; every playlist is built from the same data
    const [movies, episodes] = await Promise.all([
      jellyfinService.getMovies(),
      jellyfinService.getSeries(),
    ]);

    const writePlaylist = (filename: string, content: string) => {
      const filePath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filePath, content);
      const size = (content.length / 1024).toFixed(2);
      console.log(`💾 Saved: ${filePath} (${size} KB)`);
    };

    writePlaylist(
      "jellyfin-all.m3u",
      m3uGenerator.buildPlaylist([...movies, ...episodes])
    );
    writePlaylist("jellyfin-movies.m3u", m3uGenerator.buildPlaylist(movies));
    writePlaylist("jellyfin-series.m3u", m3uGenerator.buildPlaylist(episodes));

    // If Jellyseerr is configured, generate requested content playlist
    if (jellyseerrService) {
      const [requests, shows] = await Promise.all([
        jellyseerrService.getAvailableRequests(),
        jellyfinService.getShows(),
      ]);
      writePlaylist(
        "jellyfin-requested.m3u",
        m3uGenerator.buildRequestedContentPlaylist(
          movies,
          episodes,
          shows,
          requests
        )
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("=".repeat(60));
    console.log(`✅ Playlist generation completed in ${duration}s`);
    console.log("=".repeat(60) + "\n");
    return true;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error("=".repeat(60));
    console.error(`❌ Playlist generation failed after ${duration}s`);
    console.error("=".repeat(60));
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    } else {
      console.error("Error:", error);
    }
    console.error("=".repeat(60) + "\n");
    return false;
  }
}

// API Routes
app.get("/health", (req, res) => {
  console.log("[API] Health check requested");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/generate", async (req, res) => {
  console.log("[API] Manual playlist generation triggered");
  const success = await generatePlaylists();
  if (success) {
    res.json({ success: true, message: "Playlists generated successfully" });
  } else {
    res.status(500).json({
      success: false,
      error: "Playlist generation failed - check container logs",
    });
  }
});

const VALID_PLAYLIST_TYPES = ["all", "movies", "series", "requested"];

app.get("/playlists/:type", (req, res) => {
  const { type } = req.params;
  if (!VALID_PLAYLIST_TYPES.includes(type)) {
    console.warn(`[API] Unknown playlist type: ${type}`);
    res.status(404).json({
      error: "Unknown playlist type",
      valid: VALID_PLAYLIST_TYPES,
    });
    return;
  }
  const filename = `jellyfin-${type}.m3u`;
  const filePath = path.join(OUTPUT_DIR, filename);

  if (fs.existsSync(filePath)) {
    console.log(`[API] Serving playlist: ${filename}`);
    res.setHeader("Content-Type", "audio/x-mpegurl");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.sendFile(path.resolve(filePath));
  } else {
    console.warn(`[API] Playlist not found: ${filename}`);
    res.status(404).json({ error: "Playlist not found" });
  }
});

app.listen(PORT, async () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📂 Output directory: ${OUTPUT_DIR}`);
  console.log(`\n🔗 API Endpoints:`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   Manual Trigger: http://localhost:${PORT}/generate`);
  console.log(`   All Content: http://localhost:${PORT}/playlists/all`);
  console.log(`   Movies: http://localhost:${PORT}/playlists/movies`);
  console.log(`   Series: http://localhost:${PORT}/playlists/series`);
  console.log(`   Requested: http://localhost:${PORT}/playlists/requested`);

  // Generate playlists on startup
  console.log("\n🔄 Running initial playlist generation...");
  await generatePlaylists();

  // Schedule periodic updates if configured
  if (UPDATE_INTERVAL > 0) {
    console.log(`⏰ Scheduled updates every ${UPDATE_INTERVAL} minutes`);
    const nextUpdate = new Date(Date.now() + UPDATE_INTERVAL * 60 * 1000);
    console.log(`   Next update: ${nextUpdate.toLocaleString()}\n`);
    setInterval(() => {
      const now = new Date();
      console.log(`\n⏰ Scheduled update triggered at ${now.toLocaleString()}`);
      generatePlaylists();
    }, UPDATE_INTERVAL * 60 * 1000);
  } else {
    console.log("⏰ Automatic updates disabled (UPDATE_INTERVAL=0)\n");
  }
});

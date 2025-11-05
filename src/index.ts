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

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

const m3uGenerator = new M3UGenerator(jellyfinService, jellyseerrService);

// Generate playlists
async function generatePlaylists() {
  try {
    console.log("Starting playlist generation...");

    // Generate all content playlist
    const allPlaylist = await m3uGenerator.generateAllContentPlaylist();
    const allPath = path.join(OUTPUT_DIR, "jellyfin-all.m3u");
    fs.writeFileSync(allPath, allPlaylist);
    console.log(`Generated: ${allPath}`);

    // Generate movies playlist
    const moviesPlaylist = await m3uGenerator.generateMoviesPlaylist();
    const moviesPath = path.join(OUTPUT_DIR, "jellyfin-movies.m3u");
    fs.writeFileSync(moviesPath, moviesPlaylist);
    console.log(`Generated: ${moviesPath}`);

    // Generate series playlist
    const seriesPlaylist = await m3uGenerator.generateSeriesPlaylist();
    const seriesPath = path.join(OUTPUT_DIR, "jellyfin-series.m3u");
    fs.writeFileSync(seriesPath, seriesPlaylist);
    console.log(`Generated: ${seriesPath}`);

    // If Jellyseerr is configured, generate requested content playlist
    if (jellyseerrService) {
      const requestedPlaylist =
        await m3uGenerator.generateRequestedContentPlaylist();
      const requestedPath = path.join(OUTPUT_DIR, "jellyfin-requested.m3u");
      fs.writeFileSync(requestedPath, requestedPlaylist);
      console.log(`Generated: ${requestedPath}`);
    }

    console.log("Playlist generation completed successfully!");
  } catch (error) {
    console.error("Error generating playlists:", error);
  }
}

// API Routes
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/generate", async (req, res) => {
  try {
    await generatePlaylists();
    res.json({ success: true, message: "Playlists generated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.get("/playlists/:type", (req, res) => {
  const { type } = req.params;
  const filename = `jellyfin-${type}.m3u`;
  const filePath = path.join(OUTPUT_DIR, filename);

  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "audio/x-mpegurl");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: "Playlist not found" });
  }
});

app.listen(PORT, async () => {
  console.log(`Jellyfin M3U Export server running on port ${PORT}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  // Generate playlists on startup
  await generatePlaylists();

  // Schedule periodic updates if configured
  if (UPDATE_INTERVAL > 0) {
    console.log(`Scheduled updates every ${UPDATE_INTERVAL} minutes`);
    setInterval(generatePlaylists, UPDATE_INTERVAL * 60 * 1000);
  }
});

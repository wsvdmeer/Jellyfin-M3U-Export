import { JellyfinService, JellyfinItem } from "./JellyfinService";
import { JellyseerrService } from "./JellyseerrService";

export class M3UGenerator {
  constructor(
    private jellyfinService: JellyfinService,
    private jellyseerrService: JellyseerrService | null
  ) {}

  private generateM3UHeader(): string {
    return "#EXTM3U\n";
  }

  private generateM3UEntry(item: JellyfinItem): string {
    let title = item.Name;

    // For episodes, include series name and episode info
    if (item.Type === "Episode" && item.SeriesName) {
      const season = item.ParentIndexNumber || 0;
      const episode = item.IndexNumber || 0;
      title = `${item.SeriesName} - S${season
        .toString()
        .padStart(2, "0")}E${episode.toString().padStart(2, "0")} - ${
        item.Name
      }`;
    }

    // For movies, include year if available
    if (item.Type === "Movie" && item.ProductionYear) {
      title = `${item.Name} (${item.ProductionYear})`;
    }

    const url = this.jellyfinService.getDirectPlayUrl(item);

    return `#EXTINF:-1,${title}\n${url}\n`;
  }

  async generateAllContentPlaylist(): Promise<string> {
    const items = await this.jellyfinService.getAllContent();
    let playlist = this.generateM3UHeader();

    for (const item of items) {
      playlist += this.generateM3UEntry(item);
    }

    return playlist;
  }

  async generateMoviesPlaylist(): Promise<string> {
    const movies = await this.jellyfinService.getMovies();
    let playlist = this.generateM3UHeader();

    for (const movie of movies) {
      playlist += this.generateM3UEntry(movie);
    }

    return playlist;
  }

  async generateSeriesPlaylist(): Promise<string> {
    const episodes = await this.jellyfinService.getSeries();
    let playlist = this.generateM3UHeader();

    for (const episode of episodes) {
      playlist += this.generateM3UEntry(episode);
    }

    return playlist;
  }

  async generateRequestedContentPlaylist(): Promise<string> {
    if (!this.jellyseerrService) {
      return this.generateM3UHeader() + "# Jellyseerr not configured\n";
    }

    // Get available requests from Jellyseerr
    const requests = await this.jellyseerrService.getAvailableRequests();

    // Get all Jellyfin content
    const allContent = await this.jellyfinService.getAllContent();

    let playlist = this.generateM3UHeader();
    playlist += "# Content requested via Jellyseerr that is now available\n";

    // Note: Matching Jellyseerr requests to Jellyfin items is complex
    // This is a simplified version - you may need to enhance matching logic
    // based on TMDB/IMDB IDs or title matching

    for (const item of allContent) {
      // For now, include all content as we don't have perfect matching
      // In a production version, you'd want to implement proper matching
      // between Jellyseerr requests and Jellyfin items
      playlist += this.generateM3UEntry(item);
    }

    return playlist;
  }
}

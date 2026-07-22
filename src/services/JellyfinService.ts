import axios, { AxiosInstance } from "axios";

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: string;
  Path?: string;
  MediaSources?: Array<{
    Path: string;
    Protocol: string;
  }>;
  SeriesName?: string;
  SeriesId?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  ProductionYear?: number;
  ProviderIds?: Record<string, string>;
}

export class JellyfinService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    console.log(`[Jellyfin] Initializing connection to: ${baseUrl}`);
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "X-MediaBrowser-Token": apiKey,
      },
      timeout: 30000,
    });
  }

  private async fetchItems(
    label: string,
    params: Record<string, unknown>
  ): Promise<JellyfinItem[]> {
    try {
      console.log(`[Jellyfin] Fetching ${label}...`);
      const response = await this.client.get("/Items", { params });
      const items = response.data.Items || [];
      console.log(`[Jellyfin] ✓ Found ${items.length} ${label}`);
      return items;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          `[Jellyfin] ✗ Failed to fetch ${label}: ${error.message}`
        );
        console.error(`[Jellyfin]   URL: ${error.config?.url}`);
        console.error(`[Jellyfin]   Status: ${error.response?.status}`);
        if (error.response?.status === 401) {
          console.error(
            "[Jellyfin]   Authentication failed - check your API key"
          );
        }
      } else {
        console.error(`[Jellyfin] ✗ Error fetching ${label}:`, error);
      }
      return [];
    }
  }

  async getMovies(): Promise<JellyfinItem[]> {
    return this.fetchItems("movies", {
      IncludeItemTypes: "Movie",
      Recursive: true,
      Fields: "Path,MediaSources,ProviderIds",
      SortBy: "SortName",
    });
  }

  async getSeries(): Promise<JellyfinItem[]> {
    return this.fetchItems("episodes", {
      IncludeItemTypes: "Episode",
      Recursive: true,
      Fields: "Path,MediaSources,SeriesName",
      SortBy: "SeriesName,ParentIndexNumber,IndexNumber",
    });
  }

  // TV shows (Series items) - used to match Jellyseerr TV requests, which
  // reference the show's TMDB/TVDB id, against episodes via SeriesId
  async getShows(): Promise<JellyfinItem[]> {
    return this.fetchItems("shows", {
      IncludeItemTypes: "Series",
      Recursive: true,
      Fields: "ProviderIds",
      SortBy: "SortName",
    });
  }

  getStreamUrl(itemId: string): string {
    return `${this.baseUrl}/Items/${itemId}/Download`;
  }

  getDirectPlayUrl(item: JellyfinItem): string {
    // Try to use the direct file path if available
    if (item.MediaSources && item.MediaSources.length > 0) {
      const source = item.MediaSources[0];
      if (source.Protocol === "File" && source.Path) {
        return source.Path;
      }
    }
    // Fallback to stream URL
    return this.getStreamUrl(item.Id);
  }
}

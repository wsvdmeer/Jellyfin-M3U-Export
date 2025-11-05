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
  IndexNumber?: number;
  ParentIndexNumber?: number;
  ProductionYear?: number;
}

export class JellyfinService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "X-MediaBrowser-Token": apiKey,
      },
    });
  }

  async getMovies(): Promise<JellyfinItem[]> {
    try {
      const response = await this.client.get("/Items", {
        params: {
          IncludeItemTypes: "Movie",
          Recursive: true,
          Fields: "Path,MediaSources",
          SortBy: "SortName",
        },
      });
      return response.data.Items || [];
    } catch (error) {
      console.error("Error fetching movies from Jellyfin:", error);
      return [];
    }
  }

  async getSeries(): Promise<JellyfinItem[]> {
    try {
      const response = await this.client.get("/Items", {
        params: {
          IncludeItemTypes: "Episode",
          Recursive: true,
          Fields: "Path,MediaSources,SeriesName",
          SortBy: "SeriesName,ParentIndexNumber,IndexNumber",
        },
      });
      return response.data.Items || [];
    } catch (error) {
      console.error("Error fetching series from Jellyfin:", error);
      return [];
    }
  }

  async getAllContent(): Promise<JellyfinItem[]> {
    const [movies, series] = await Promise.all([
      this.getMovies(),
      this.getSeries(),
    ]);
    return [...movies, ...series];
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

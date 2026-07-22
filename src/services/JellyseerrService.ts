import axios, { AxiosInstance } from "axios";

export interface JellyseerrRequest {
  id: number;
  type: "movie" | "tv";
  status: number;
  media: {
    tmdbId: number;
    tvdbId?: number;
    imdbId?: string;
    status: number;
  };
}

export class JellyseerrService {
  private client: AxiosInstance;

  constructor(baseUrl: string, apiKey: string) {
    console.log(`[Jellyseerr] Initializing connection to: ${baseUrl}`);
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "X-Api-Key": apiKey,
      },
      timeout: 30000,
    });
  }

  async getRequests(take: number = 100): Promise<JellyseerrRequest[]> {
    try {
      console.log("[Jellyseerr] Fetching content requests...");
      const response = await this.client.get("/api/v1/request", {
        params: {
          take,
          skip: 0,
        },
      });
      const requests = response.data.results || [];
      console.log(`[Jellyseerr] ✓ Found ${requests.length} requests`);
      return requests;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          `[Jellyseerr] ✗ Failed to fetch requests: ${error.message}`
        );
        console.error(`[Jellyseerr]   URL: ${error.config?.url}`);
        console.error(`[Jellyseerr]   Status: ${error.response?.status}`);
        if (error.response?.status === 401) {
          console.error(
            "[Jellyseerr]   Authentication failed - check your API key"
          );
        }
      } else {
        console.error("[Jellyseerr] ✗ Error fetching requests:", error);
      }
      return [];
    }
  }

  async getApprovedRequests(): Promise<JellyseerrRequest[]> {
    const requests = await this.getRequests();
    // Request status: 1 = pending, 2 = approved, 3 = declined
    return requests.filter((req) => req.status === 2);
  }

  async getAvailableRequests(): Promise<JellyseerrRequest[]> {
    const requests = await this.getRequests();
    // Availability lives on the media, not the request:
    // media.status 4 = partially available, 5 = available
    const available = requests.filter(
      (req) => req.media.status === 4 || req.media.status === 5
    );
    console.log(`[Jellyseerr] ✓ ${available.length} requests are available`);
    return available;
  }
}

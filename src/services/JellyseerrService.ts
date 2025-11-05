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
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "X-Api-Key": apiKey,
      },
    });
  }

  async getRequests(take: number = 100): Promise<JellyseerrRequest[]> {
    try {
      const response = await this.client.get("/api/v1/request", {
        params: {
          take,
          skip: 0,
        },
      });
      return response.data.results || [];
    } catch (error) {
      console.error("Error fetching requests from Jellyseerr:", error);
      return [];
    }
  }

  async getApprovedRequests(): Promise<JellyseerrRequest[]> {
    const requests = await this.getRequests();
    // Status 2 = approved, Status 3 = available
    return requests.filter((req) => req.status === 2 || req.status === 3);
  }

  async getAvailableRequests(): Promise<JellyseerrRequest[]> {
    const requests = await this.getRequests();
    // Status 3 = available
    return requests.filter((req) => req.status === 3);
  }
}

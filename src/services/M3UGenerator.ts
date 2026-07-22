import { JellyfinService, JellyfinItem } from "./JellyfinService";
import { JellyseerrRequest } from "./JellyseerrService";

export class M3UGenerator {
  constructor(private jellyfinService: JellyfinService) {}

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

  // Jellyfin's ProviderIds key casing varies between versions ("Tmdb"/"tmdb")
  private getProviderId(
    item: JellyfinItem,
    provider: string
  ): string | undefined {
    if (!item.ProviderIds) return undefined;
    const key = Object.keys(item.ProviderIds).find(
      (k) => k.toLowerCase() === provider.toLowerCase()
    );
    return key ? item.ProviderIds[key] : undefined;
  }

  buildPlaylist(items: JellyfinItem[]): string {
    let playlist = this.generateM3UHeader();
    for (const item of items) {
      playlist += this.generateM3UEntry(item);
    }
    return playlist;
  }

  buildRequestedContentPlaylist(
    movies: JellyfinItem[],
    episodes: JellyfinItem[],
    shows: JellyfinItem[],
    requests: JellyseerrRequest[]
  ): string {
    // Requested movies: match Jellyfin movies by TMDB/IMDB id
    const movieRequests = requests.filter((req) => req.type === "movie");
    const movieTmdbIds = new Set(
      movieRequests.map((req) => String(req.media.tmdbId))
    );
    const movieImdbIds = new Set(
      movieRequests.flatMap((req) => (req.media.imdbId ? [req.media.imdbId] : []))
    );
    const requestedMovies = movies.filter((movie) => {
      const tmdb = this.getProviderId(movie, "Tmdb");
      const imdb = this.getProviderId(movie, "Imdb");
      return (
        (tmdb !== undefined && movieTmdbIds.has(tmdb)) ||
        (imdb !== undefined && movieImdbIds.has(imdb))
      );
    });

    // Requested TV: match shows by TMDB/TVDB id, then take their episodes
    const tvRequests = requests.filter((req) => req.type === "tv");
    const tvTmdbIds = new Set(
      tvRequests.map((req) => String(req.media.tmdbId))
    );
    const tvTvdbIds = new Set(
      tvRequests.flatMap((req) =>
        req.media.tvdbId ? [String(req.media.tvdbId)] : []
      )
    );
    const requestedShowIds = new Set(
      shows
        .filter((show) => {
          const tmdb = this.getProviderId(show, "Tmdb");
          const tvdb = this.getProviderId(show, "Tvdb");
          return (
            (tmdb !== undefined && tvTmdbIds.has(tmdb)) ||
            (tvdb !== undefined && tvTvdbIds.has(tvdb))
          );
        })
        .map((show) => show.Id)
    );
    const requestedEpisodes = episodes.filter(
      (episode) => episode.SeriesId && requestedShowIds.has(episode.SeriesId)
    );

    let playlist = this.generateM3UHeader();
    playlist += "# Content requested via Jellyseerr that is now available\n";
    for (const item of [...requestedMovies, ...requestedEpisodes]) {
      playlist += this.generateM3UEntry(item);
    }

    console.log(
      `[M3U] ✓ Matched ${requestedMovies.length} movies and ${requestedEpisodes.length} episodes to ${requests.length} available requests`
    );
    return playlist;
  }
}

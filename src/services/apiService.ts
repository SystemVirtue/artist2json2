interface APIConfig {
  userAgent: string;
  theAudioDbKey: string;
  youtubeApiKey?: string;
  spotifyAccessToken?: string;
}

interface MusicBrainzArtist {
  id: string;
  name: string;
  score: number;
}

interface MusicBrainzResponse {
  artists: MusicBrainzArtist[];
}

interface TheAudioDBVideo {
  idTrack: string;
  idAlbum: string;
  strArtist: string;
  strTrack: string;
  intDuration: string;
  strTrackThumb?: string;
  strMusicVid: string;
  strDescriptionEN?: string;
  strMusicBrainzArtistID?: string;
  strMusicBrainzAlbumID?: string;
  strMusicBrainzID?: string;
}

interface TheAudioDBResponse {
  mvids: TheAudioDBVideo[] | null;
}

export class APIService {
  private config: APIConfig;

  constructor(config: APIConfig) {
    this.config = config;
  }

  updateConfig(config: APIConfig) {
    this.config = config;
  }

  async getMusicBrainzArtistId(artistName: string): Promise<string | null> {
    const encodedName = encodeURIComponent(artistName);
    const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodedName}&fmt=json&limit=1`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`MusicBrainz API error: ${response.status} ${response.statusText}`);
      }

      const data: MusicBrainzResponse = await response.json();
      
      if (data.artists && data.artists.length > 0) {
        return data.artists[0].id;
      }

      return null;
    } catch (error) {
      console.error('MusicBrainz API error:', error);
      throw error;
    }
  }

  async getArtistMusicVideos(musicBrainzId: string): Promise<TheAudioDBVideo[]> {
    const url = `https://www.theaudiodb.com/api/v1/json/${this.config.theAudioDbKey}/mvid-mb.php?i=${musicBrainzId}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`TheAudioDB API error: ${response.status} ${response.statusText}`);
      }

      const data: TheAudioDBResponse = await response.json();
      
      console.log(`TheAudioDB API response for ${musicBrainzId}:`, data);
      
      if (data.mvids && Array.isArray(data.mvids)) {
        console.log(`Found ${data.mvids.length} music videos for artist ${musicBrainzId}`);
        // Remove strDescription from each video object
        return data.mvids.map(video => {
          const { strDescription, ...videoWithoutDescription } = video as any;
          return videoWithoutDescription;
        });
      }

      console.log(`No music videos found for artist ${musicBrainzId}`);
      return [];
    } catch (error) {
      console.error('TheAudioDB API error:', error);
      throw error;
    }
  }

  async searchArtistBySpotifyUrl(spotifyUrl: string): Promise<string | null> {
    const encodedUrl = encodeURIComponent(spotifyUrl);
    const url = `https://musicbrainz.org/ws/2/url/?query=url:${encodedUrl}&targettype=artist&fmt=json`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`MusicBrainz URL search error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.urls && data.urls.length > 0 && data.urls[0].relation_list) {
        const artistRelations = data.urls[0].relation_list.filter(
          (rel: any) => rel['target-type'] === 'artist'
        );
        
        if (artistRelations.length > 0) {
          return artistRelations[0].artist.id;
        }
      }

      return null;
    } catch (error) {
      console.error('MusicBrainz URL search error:', error);
      throw error;
    }
  }

  /**
   * Get YouTube API key for playlist parsing
   */
  getYouTubeApiKey(): string | undefined {
    return this.config.youtubeApiKey;
  }

  /**
   * Get Spotify access token for playlist parsing
   */
  getSpotifyAccessToken(): string | undefined {
    return this.config.spotifyAccessToken;
  }

  /**
   * Check if YouTube API is configured
   */
  isYouTubeApiConfigured(): boolean {
    return !!this.config.youtubeApiKey;
  }

  /**
   * Check if Spotify API is configured
   */
  isSpotifyApiConfigured(): boolean {
    return !!this.config.spotifyAccessToken;
  }

  /**
   * Extract YouTube video ID from various YouTube URL formats
   */
  private extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  /**
   * Get YouTube video details for multiple videos (up to 50 per request)
   * @param videoUrls Array of YouTube video URLs or IDs
   * @returns Array of YouTube video details
   */
  async getYouTubeVideoDetails(videoUrls: string[]): Promise<any[]> {
    if (!this.config.youtubeApiKey) {
      throw new Error('YouTube API key not configured');
    }

    // Extract video IDs from URLs
    const videoIds = videoUrls
      .map(url => this.extractYouTubeVideoId(url))
      .filter((id): id is string => id !== null);

    if (videoIds.length === 0) {
      return [];
    }

    // YouTube API allows up to 50 video IDs per request
    const batches: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      batches.push(videoIds.slice(i, i + 50));
    }

    const allResults: any[] = [];

    for (const batch of batches) {
      const ids = batch.join(',');
      const url = `https://www.googleapis.com/youtube/v3/videos?id=${ids}&part=contentDetails,snippet,statistics,status&key=${this.config.youtubeApiKey}`;

      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.items && Array.isArray(data.items)) {
          allResults.push(...data.items);
        }
      } catch (error) {
        console.error('YouTube API error:', error);
        throw error;
      }
    }

    return allResults;
  }
}
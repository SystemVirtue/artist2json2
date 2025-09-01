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
}
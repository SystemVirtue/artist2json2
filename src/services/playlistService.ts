interface PlaylistTrack {
  artist: string;
  title: string;
  album?: string;
  duration?: number;
}

interface PlaylistParseResult {
  tracks: PlaylistTrack[];
  artists: string[];
  source: 'youtube' | 'spotify' | 'apple' | 'unknown';
  playlistName?: string;
}

export class PlaylistService {
  private youtubeApiKey?: string;
  private spotifyAccessToken?: string;

  constructor(youtubeApiKey?: string, spotifyAccessToken?: string) {
    this.youtubeApiKey = youtubeApiKey;
    this.spotifyAccessToken = spotifyAccessToken;
  }

  /**
   * Parse playlist URL and extract artist names
   */
  async parsePlaylistUrl(url: string): Promise<PlaylistParseResult> {
    const cleanUrl = url.trim();
    
    if (this.isYouTubeUrl(cleanUrl)) {
      return await this.parseYouTubePlaylist(cleanUrl);
    } else if (this.isSpotifyUrl(cleanUrl)) {
      return await this.parseSpotifyPlaylist(cleanUrl);
    } else if (this.isAppleMusicUrl(cleanUrl)) {
      return await this.parseAppleMusicPlaylist(cleanUrl);
    } else {
      throw new Error('Unsupported playlist URL format. Supported: YouTube, Spotify, Apple Music');
    }
  }

  /**
   * Check if URL is a YouTube playlist
   */
  private isYouTubeUrl(url: string): boolean {
    const youtubePatterns = [
      /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=/,
      /^https?:\/\/(www\.)?youtube\.com\/watch\?.*list=/,
      /^https?:\/\/youtu\.be\/.*list=/,
      /^https?:\/\/music\.youtube\.com\/playlist\?list=/
    ];
    return youtubePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL is a Spotify playlist
   */
  private isSpotifyUrl(url: string): boolean {
    const spotifyPatterns = [
      /^https?:\/\/open\.spotify\.com\/playlist\//,
      /^https?:\/\/open\.spotify\.com\/album\//,
      /^spotify:playlist:/,
      /^spotify:album:/
    ];
    return spotifyPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL is an Apple Music playlist
   */
  private isAppleMusicUrl(url: string): boolean {
    const applePatterns = [
      /^https?:\/\/music\.apple\.com\/.*\/playlist\//,
      /^https?:\/\/music\.apple\.com\/.*\/album\//
    ];
    return applePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Extract playlist ID from YouTube URL
   */
  private extractYouTubePlaylistId(url: string): string | null {
    const patterns = [
      /[?&]list=([a-zA-Z0-9_-]+)/,
      /playlist\?list=([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Extract playlist ID from Spotify URL
   */
  private extractSpotifyPlaylistId(url: string): string | null {
    const patterns = [
      /playlist\/([a-zA-Z0-9]+)/,
      /album\/([a-zA-Z0-9]+)/,
      /spotify:playlist:([a-zA-Z0-9]+)/,
      /spotify:album:([a-zA-Z0-9]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Parse YouTube playlist using YouTube Data API v3
   */
  private async parseYouTubePlaylist(url: string): Promise<PlaylistParseResult> {
    const playlistId = this.extractYouTubePlaylistId(url);
    if (!playlistId) {
      throw new Error('Invalid YouTube playlist URL');
    }

    if (!this.youtubeApiKey) {
      // Fallback: Parse what we can from the URL structure
      return this.parseYouTubePlaylistFallback(url);
    }

    try {
      // Get playlist details
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${this.youtubeApiKey}`
      );
      
      if (!playlistResponse.ok) {
        throw new Error(`YouTube API error: ${playlistResponse.status}`);
      }
      
      const playlistData = await playlistResponse.json();
      const playlistName = playlistData.items?.[0]?.snippet?.title;

      // Get playlist items
      const itemsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${this.youtubeApiKey}`
      );
      
      if (!itemsResponse.ok) {
        throw new Error(`YouTube API error: ${itemsResponse.status}`);
      }
      
      const itemsData = await itemsResponse.json();
      const tracks: PlaylistTrack[] = [];
      const artistSet = new Set<string>();

      for (const item of itemsData.items || []) {
        const title = item.snippet?.title || '';
        const channelTitle = item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || '';
        
        // Parse artist and track from title (common formats)
        const parsed = this.parseYouTubeTitle(title, channelTitle);
        if (parsed.artist) {
          tracks.push(parsed);
          artistSet.add(parsed.artist);
        }
      }

      return {
        tracks,
        artists: Array.from(artistSet),
        source: 'youtube',
        playlistName
      };

    } catch (error) {
      console.error('YouTube API error, falling back to URL parsing:', error);
      return this.parseYouTubePlaylistFallback(url);
    }
  }

  /**
   * Fallback YouTube parsing without API
   */
  private parseYouTubePlaylistFallback(url: string): PlaylistParseResult {
    // This is a basic fallback - in production you might want to use web scraping
    // or suggest the user provide a YouTube API key
    throw new Error('YouTube API key required for playlist parsing. Please configure your API key or manually input artist names.');
  }

  /**
   * Parse artist and track from YouTube video title
   */
  private parseYouTubeTitle(title: string, channelTitle: string): PlaylistTrack {
    // Common patterns for music videos
    const patterns = [
      /^(.+?)\s*[-–—]\s*(.+?)(?:\s*\[.*\]|\s*\(.*\))?$/,  // Artist - Track
      /^(.+?)\s*:\s*(.+?)(?:\s*\[.*\]|\s*\(.*\))?$/,      // Artist : Track
      /^(.+?)\s*"(.+?)"(?:\s*\[.*\]|\s*\(.*\))?$/,        // Artist "Track"
      /^(.+?)\s*'(.+?)'(?:\s*\[.*\]|\s*\(.*\))?$/         // Artist 'Track'
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return {
          artist: match[1].trim(),
          title: match[2].trim()
        };
      }
    }

    // If no pattern matches, use channel name as artist
    return {
      artist: channelTitle || 'Unknown Artist',
      title: title.replace(/\[.*\]|\(.*\)/g, '').trim()
    };
  }

  /**
   * Parse Spotify playlist using Spotify Web API
   */
  private async parseSpotifyPlaylist(url: string): Promise<PlaylistParseResult> {
    const playlistId = this.extractSpotifyPlaylistId(url);
    if (!playlistId) {
      throw new Error('Invalid Spotify playlist URL');
    }

    if (!this.spotifyAccessToken) {
      throw new Error('Spotify access token required for playlist parsing. Please configure your Spotify API credentials.');
    }

    try {
      const isAlbum = url.includes('/album/') || url.includes('spotify:album:');
      const endpoint = isAlbum 
        ? `https://api.spotify.com/v1/albums/${playlistId}/tracks`
        : `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.spotifyAccessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
      }

      const data = await response.json();
      const tracks: PlaylistTrack[] = [];
      const artistSet = new Set<string>();

      for (const item of data.items || []) {
        const track = isAlbum ? item : item.track;
        if (track && track.artists && track.artists.length > 0) {
          const artist = track.artists[0].name;
          tracks.push({
            artist,
            title: track.name,
            album: track.album?.name,
            duration: track.duration_ms
          });
          artistSet.add(artist);
        }
      }

      return {
        tracks,
        artists: Array.from(artistSet),
        source: 'spotify'
      };

    } catch (error) {
      console.error('Spotify API error:', error);
      throw error;
    }
  }

  /**
   * Parse Apple Music playlist (limited support without API)
   */
  private async parseAppleMusicPlaylist(url: string): Promise<PlaylistParseResult> {
    // Apple Music API requires more complex authentication
    // For now, we'll provide a basic structure
    throw new Error('Apple Music playlist parsing requires Apple Music API integration. Please manually input artist names or use YouTube/Spotify playlists.');
  }

  /**
   * Extract unique artists from tracks
   */
  static extractUniqueArtists(tracks: PlaylistTrack[]): string[] {
    const artistSet = new Set<string>();
    tracks.forEach(track => {
      if (track.artist && track.artist.trim()) {
        artistSet.add(track.artist.trim());
      }
    });
    return Array.from(artistSet).sort();
  }

  /**
   * Validate playlist URL format
   */
  static isValidPlaylistUrl(url: string): boolean {
    const service = new PlaylistService();
    return service.isYouTubeUrl(url) || service.isSpotifyUrl(url) || service.isAppleMusicUrl(url);
  }
}
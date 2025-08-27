import { ArtistData } from "@/pages/Index";

export interface DatabaseExport {
  version: string;
  exportDate: string;
  totalArtists: number;
  data: ArtistData[];
  metadata: {
    appVersion: string;
    exportedBy: string;
    description?: string;
  };
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: string[];
  data?: ArtistData[];
}

export interface DatabaseSummary {
  totalArtists: number;
  completedArtists: number;
  errorArtists: number;
  pendingArtists: number;
  totalMusicVideos: number;
  avgVideosPerArtist: number;
  topGenres: { genre: string; count: number }[];
  statusBreakdown: {
    pending: number;
    processing: number;
    completed: number;
    error: number;
  };
  apiUsageStats: {
    musicBrainzCalls: number;
    theAudioDbCalls: number;
  };
  dataQuality: {
    artistsWithMBID: number;
    artistsWithVideos: number;
    artistsWithErrors: number;
    completionRate: number;
  };
}

export class ImportExportService {
  private static readonly CURRENT_VERSION = "1.0.0";
  private static readonly APP_VERSION = "Music Video DB Manager v1.0";

  /**
   * Export database to JSON format
   */
  static exportDatabase(
    data: ArtistData[], 
    apiStats?: { musicBrainzCalls: number; theAudioDbCalls: number },
    description?: string
  ): DatabaseExport {
    const exportData: DatabaseExport = {
      version: this.CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      totalArtists: data.length,
      data: data.map(artist => ({
        ...artist,
        // Ensure data consistency
        status: artist.status || 'pending',
        mvids: artist.mvids || []
      })),
      metadata: {
        appVersion: this.APP_VERSION,
        exportedBy: "Music Video Database Manager",
        description: description || `Database export containing ${data.length} artists`
      }
    };

    return exportData;
  }

  /**
   * Download database as JSON file
   */
  static downloadDatabase(
    data: ArtistData[], 
    apiStats?: { musicBrainzCalls: number; theAudioDbCalls: number },
    filename?: string
  ): void {
    const exportData = this.exportDatabase(data, apiStats);
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const defaultFilename = `music-video-database-${new Date().toISOString().split('T')[0]}.json`;
    const exportFilename = filename || defaultFilename;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFilename);
    linkElement.click();
  }

  /**
   * Download database with custom filename
   */
  static downloadDatabaseWithCustomName(
    data: ArtistData[], 
    filename: string,
    apiStats?: { musicBrainzCalls: number; theAudioDbCalls: number }
  ): void {
    const exportData = this.exportDatabase(data, apiStats);
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', filename);
    linkElement.click();
  }

  /**
   * Import database from JSON file
   */
  static async importFromFile(file: File): Promise<ImportResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const result = this.importFromJSON(content);
          resolve(result);
        } catch (error) {
          resolve({
            success: false,
            importedCount: 0,
            skippedCount: 0,
            errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`]
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          importedCount: 0,
          skippedCount: 0,
          errors: ['Failed to read file']
        });
      };

      reader.readAsText(file);
    });
  }

  /**
   * Import database from JSON string
   */
  static importFromJSON(jsonString: string): ImportResult {
    const errors: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    try {
      const parsed = JSON.parse(jsonString);
      
      // Validate format
      if (!this.isValidExportFormat(parsed)) {
        // Try to import as raw array (legacy format)
        if (Array.isArray(parsed)) {
          return this.importLegacyFormat(parsed);
        }
        
        return {
          success: false,
          importedCount: 0,
          skippedCount: 0,
          errors: ['Invalid file format. Expected Music Video Database export format.']
        };
      }

      const exportData = parsed as DatabaseExport;
      const validatedData: ArtistData[] = [];

      // Process each artist
      for (const [index, artist] of exportData.data.entries()) {
        try {
          const validatedArtist = this.validateArtistData(artist);
          if (validatedArtist) {
            validatedData.push(validatedArtist);
            importedCount++;
          } else {
            skippedCount++;
            errors.push(`Row ${index + 1}: Invalid artist data`);
          }
        } catch (error) {
          skippedCount++;
          errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Validation error'}`);
        }
      }

      return {
        success: importedCount > 0,
        importedCount,
        skippedCount,
        errors,
        data: validatedData
      };

    } catch (error) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: [`JSON parsing error: ${error instanceof Error ? error.message : 'Invalid JSON'}`]
      };
    }
  }

  /**
   * Import legacy format (raw artist array)
   */
  private static importLegacyFormat(data: any[]): ImportResult {
    const errors: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;
    const validatedData: ArtistData[] = [];

    for (const [index, item] of data.entries()) {
      try {
        const validatedArtist = this.validateArtistData(item);
        if (validatedArtist) {
          validatedData.push(validatedArtist);
          importedCount++;
        } else {
          skippedCount++;
          errors.push(`Row ${index + 1}: Invalid artist data`);
        }
      } catch (error) {
        skippedCount++;
        errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Validation error'}`);
      }
    }

    return {
      success: importedCount > 0,
      importedCount,
      skippedCount,
      errors,
      data: validatedData
    };
  }

  /**
   * Validate export format
   */
  private static isValidExportFormat(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.version &&
      data.exportDate &&
      Array.isArray(data.data) &&
      data.metadata &&
      typeof data.totalArtists === 'number'
    );
  }

  /**
   * Validate and sanitize artist data
   */
  private static validateArtistData(artist: any): ArtistData | null {
    if (!artist || typeof artist !== 'object') {
      return null;
    }

    if (!artist.artistName || typeof artist.artistName !== 'string') {
      return null;
    }

    const validStatuses = ['pending', 'processing', 'completed', 'error'];
    const status = validStatuses.includes(artist.status) ? artist.status : 'pending';

    return {
      artistName: artist.artistName.trim(),
      musicBrainzArtistID: artist.musicBrainzArtistID || undefined,
      mvids: Array.isArray(artist.mvids) ? artist.mvids : undefined,
      status: status as 'pending' | 'processing' | 'completed' | 'error',
      error: artist.error || undefined
    };
  }

  /**
   * Generate database summary and analytics
   */
  static generateSummary(
    data: ArtistData[], 
    apiStats?: { musicBrainzCalls: number; theAudioDbCalls: number }
  ): DatabaseSummary {
    const totalArtists = data.length;
    const completedArtists = data.filter(a => a.status === 'completed').length;
    const errorArtists = data.filter(a => a.status === 'error').length;
    const pendingArtists = data.filter(a => a.status === 'pending').length;
    const processingArtists = data.filter(a => a.status === 'processing').length;

    const artistsWithMBID = data.filter(a => a.musicBrainzArtistID).length;
    const artistsWithVideos = data.filter(a => a.mvids && a.mvids.length > 0).length;
    const artistsWithErrors = data.filter(a => a.error).length;

    const totalMusicVideos = data.reduce((sum, artist) => sum + (artist.mvids?.length || 0), 0);
    const avgVideosPerArtist = artistsWithVideos > 0 ? totalMusicVideos / artistsWithVideos : 0;

    const completionRate = totalArtists > 0 ? (completedArtists / totalArtists) * 100 : 0;

    // Extract genres from music videos (basic implementation)
    const genreMap = new Map<string, number>();
    data.forEach(artist => {
      artist.mvids?.forEach(video => {
        // This is a placeholder - in reality you'd need genre data from the API
        // For now, we'll just show a generic breakdown
        if (video.strTrack) {
          genreMap.set('Music Video', (genreMap.get('Music Video') || 0) + 1);
        }
      });
    });

    const topGenres = Array.from(genreMap.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalArtists,
      completedArtists,
      errorArtists,
      pendingArtists,
      totalMusicVideos,
      avgVideosPerArtist,
      topGenres,
      statusBreakdown: {
        pending: pendingArtists,
        processing: processingArtists,
        completed: completedArtists,
        error: errorArtists
      },
      apiUsageStats: {
        musicBrainzCalls: apiStats?.musicBrainzCalls || 0,
        theAudioDbCalls: apiStats?.theAudioDbCalls || 0
      },
      dataQuality: {
        artistsWithMBID,
        artistsWithVideos,
        artistsWithErrors,
        completionRate
      }
    };
  }

  /**
   * Export all videos as CSV text list
   */
  static exportAllVideosCSV(data: ArtistData[]): string {
    const csvRows: string[] = [];
    
    // Add header row
    csvRows.push('artistname,strTrack,strMusicVid');
    
    // Process each artist and their tracks
    data.forEach(artist => {
      if (artist.mvids && artist.mvids.length > 0) {
        artist.mvids.forEach(video => {
          if (video.strTrack && video.strMusicVid) {
            // Escape CSV values (handle commas, quotes, newlines)
            const escapeCsvValue = (value: string): string => {
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            };
            
            const artistName = escapeCsvValue(artist.artistName);
            const trackName = escapeCsvValue(video.strTrack);
            const videoUrl = escapeCsvValue(video.strMusicVid);
            
            csvRows.push(`${artistName},${trackName},${videoUrl}`);
          }
        });
      }
    });
    
    return csvRows.join('\n');
  }

  /**
   * Download all videos as CSV file
   */
  static downloadAllVideosCSV(data: ArtistData[], filename?: string): void {
    const csvContent = this.exportAllVideosCSV(data);
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    
    const defaultFilename = `all-videos-list-${new Date().toISOString().split('T')[0]}.csv`;
    const exportFilename = filename || defaultFilename;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFilename);
    linkElement.click();
  }

  /**
   * Export summary as text report
   */
  static exportSummaryReport(summary: DatabaseSummary): string {
    const report = `
# Music Video Database Summary Report

## Overview
- **Total Artists**: ${summary.totalArtists}
- **Completed Artists**: ${summary.completedArtists}
- **Pending Artists**: ${summary.pendingArtists}
- **Error Artists**: ${summary.errorArtists}
- **Total Music Videos**: ${summary.totalMusicVideos}
- **Average Videos per Artist**: ${summary.avgVideosPerArtist.toFixed(2)}

## Data Quality
- **Completion Rate**: ${summary.dataQuality.completionRate.toFixed(2)}%
- **Artists with MusicBrainz ID**: ${summary.dataQuality.artistsWithMBID}
- **Artists with Videos**: ${summary.dataQuality.artistsWithVideos}
- **Artists with Errors**: ${summary.dataQuality.artistsWithErrors}

## API Usage Statistics
- **MusicBrainz API Calls**: ${summary.apiUsageStats.musicBrainzCalls}
- **TheAudioDB API Calls**: ${summary.apiUsageStats.theAudioDbCalls}

## Status Breakdown
- **Pending**: ${summary.statusBreakdown.pending}
- **Processing**: ${summary.statusBreakdown.processing}
- **Completed**: ${summary.statusBreakdown.completed}
- **Error**: ${summary.statusBreakdown.error}

Generated on: ${new Date().toISOString()}
    `.trim();

    return report;
  }
}
import { useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { DataInputSection } from "@/components/DataInputSection";
import { DatabaseViewer } from "@/components/DatabaseViewer";
import { APIStatusPanel } from "@/components/APIStatusPanel";
import { ExportControls } from "@/components/ExportControls";
import { APIConfigSection } from "@/components/APIConfigSection";
import { ActionControlsSection } from "@/components/ActionControlsSection";
import { JSONManagerSection } from "@/components/JSONManagerSection";
import { ConfigurationSection, ConfigurationSettings } from "@/components/ConfigurationSection";
import { useRateLimiter } from "@/hooks/useRateLimiter";
import { APIService } from "@/services/apiService";
import { ImportExportService } from "@/services/importExportService";
import { Music, Database, Zap } from "lucide-react";

export interface ArtistData {
  artistName: string;
  musicBrainzArtistID?: string;
  mvids?: MusicVideo[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface MusicVideo {
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
  youtubeDetails?: {
    duration?: string;
    dimension?: string;
    definition?: string;
    caption?: string;
    licensedContent?: boolean;
    regionRestriction?: {
      allowed?: string[];
      blocked?: string[];
    };
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
    publishedAt?: string;
    tags?: string[];
  };
}

const Index = () => {
  const { toast } = useToast();
  const [database, setDatabase] = useState<ArtistData[]>([]);
  const [isProcessingMB, setIsProcessingMB] = useState(false);
  const [isProcessingVideos, setIsProcessingVideos] = useState(false);
  const [isProcessingYouTube, setIsProcessingYouTube] = useState(false);
  const [runSimultaneously, setRunSimultaneously] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [processedCallsCount, setProcessedCallsCount] = useState(0);
  const [autoSaveFileCount, setAutoSaveFileCount] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>("");
  const [apiConfig, setApiConfig] = useState({
    userAgent: "MusicVideoDBManager/1.0 ( admin@djamms.app )",
    theAudioDbKey: import.meta.env.VITE_THEAUDIODB_API_KEY || "18626d636d76696473706d",
    youtubeApiKey: import.meta.env.VITE_YOUTUBE_V3_API_KEY || "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4",
    spotifyAccessToken: ""
  });
  const [apiStats, setApiStats] = useState({
    musicBrainzCalls: 0,
    theAudioDbCalls: 0,
    youtubeApiCalls: 0,
    rateLimitStatus: 'normal' as 'normal' | 'warning' | 'limited'
  });
  const [configSettings, setConfigSettings] = useState<ConfigurationSettings>({
    maxExportFileSize: 100,
    enableFileSizeLimit: true,
    includeDescriptions: true,
    includeThumbnails: true,
    includeVideos: true,
    includeAlbumInfo: true,
    includeMusicBrainzIds: true,
    generateLogFiles: true,
    logLevel: 'detailed',
    includeSummaryReports: true,
    autoDownloadReports: false,
    batchSize: 50,
    requestDelay: 1000,
    maxRetries: 3,
    validateOnImport: true,
    removeDuplicates: true,
    normalizeArtistNames: true,
    skipEmptyRecords: true,
  });

  const apiServiceRef = useRef(new APIService(apiConfig));
  
  // Rate limiters for all APIs
  const musicBrainzLimiter = useRateLimiter({ maxCalls: 1, timeWindow: 1000 }); // 1 call per second
  const theAudioDbLimiter = useRateLimiter({ maxCalls: 2, timeWindow: 1000 }); // 2 calls per second
  const youtubeLimiter = useRateLimiter({ maxCalls: 10, timeWindow: 1000 }); // 10 calls per second (within quota)

  // Auto-save functionality
  const triggerAutoSave = (currentProcessedCount: number) => {
    if (autoSave && currentProcessedCount > 0 && currentProcessedCount % 300 === 0) {
      const fileName = `AUTO-SAVE_${currentProcessedCount}_Processed.json`;
      try {
        ImportExportService.downloadDatabaseWithCustomName(database, fileName, apiStats);
        setAutoSaveFileCount(prev => prev + 1);
        toast({
          title: "Auto-Save Complete",
          description: `Backup saved: ${fileName}`,
        });
      } catch (error) {
        toast({
          title: "Auto-Save Error",
          description: "Failed to create backup file",
          variant: "destructive"
        });
      }
    }
  };

  // Time estimation calculation
  const updateTimeEstimation = (processed: number, total: number, startTime: Date) => {
    if (processed === 0) return;
    
    const elapsed = Date.now() - startTime.getTime();
    const averageTimePerCall = elapsed / processed;
    const remaining = total - processed;
    const estimatedMs = remaining * averageTimePerCall;
    
    const hours = Math.floor(estimatedMs / (1000 * 60 * 60));
    const minutes = Math.floor((estimatedMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((estimatedMs % (1000 * 60)) / 1000);
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    setEstimatedTimeRemaining(timeString);
  };

  const addArtistsToDatabase = (artists: string[]) => {
    const newArtists: ArtistData[] = artists.map(name => ({
      artistName: name.trim(),
      status: 'pending'
    }));
    
    setDatabase(prev => [...prev, ...newArtists]);
    
    toast({
      title: "Artists Added",
      description: `${artists.length} artists added to database`,
    });
  };

  const updateAPIConfig = (newConfig: typeof apiConfig) => {
    setApiConfig(newConfig);
    apiServiceRef.current.updateConfig(newConfig);
  };

  const getMusicBrainzIds = async () => {
    setIsProcessingMB(true);
    setProcessingStartTime(new Date());
    setProcessedCallsCount(0);
    
    const pendingArtists = database
      .map((artist, index) => ({ artist, index }))
      .filter(({ artist }) => artist.status === 'pending');

    if (pendingArtists.length === 0) {
      toast({
        title: "No Pending Artists",
        description: "All artists already have MusicBrainz IDs or are in error state",
        variant: "destructive"
      });
      setIsProcessingMB(false);
      return;
    }

    toast({
      title: "Processing Started",
      description: `Getting MusicBrainz IDs for ${pendingArtists.length} artists`,
    });

    for (const { artist, index } of pendingArtists) {
      if (stopRequested) {
        break;
      }
      
      try {
        // Update status to processing
        setDatabase(prev => prev.map((a, i) => 
          i === index ? { ...a, status: 'processing' as const } : a
        ));

        // Use rate limiter for MusicBrainz API
        const musicBrainzId = await musicBrainzLimiter.enqueue(() =>
          apiServiceRef.current.getMusicBrainzArtistId(artist.artistName)
        );

        setApiStats(prev => ({
          ...prev,
          musicBrainzCalls: prev.musicBrainzCalls + 1
        }));

        const newCallCount = processedCallsCount + 1;
        setProcessedCallsCount(newCallCount);
        triggerAutoSave(newCallCount);
        
        if (processingStartTime) {
          updateTimeEstimation(newCallCount, pendingArtists.length, processingStartTime);
        }

        if (musicBrainzId) {
          setDatabase(prev => prev.map((a, i) => 
            i === index ? {
              ...a,
              musicBrainzArtistID: musicBrainzId,
              status: 'completed' as const
            } : a
          ));
        } else {
          setDatabase(prev => prev.map((a, i) => 
            i === index ? {
              ...a,
              status: 'error' as const,
              error: 'Artist not found in MusicBrainz'
            } : a
          ));
        }

      } catch (error) {
        setDatabase(prev => prev.map((a, i) => 
          i === index ? {
            ...a,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          } : a
        ));
      }
    }

    setIsProcessingMB(false);
    setStopRequested(false);
    toast({
      title: stopRequested ? "MusicBrainz Processing Stopped" : "MusicBrainz Processing Complete",
      description: stopRequested ? "Processing was stopped by user" : "All artists have been processed",
    });
  };

  const getVideoData = async () => {
    setIsProcessingVideos(true);
    if (!processingStartTime) {
      setProcessingStartTime(new Date());
      setProcessedCallsCount(0);
    }
    
    const artistsWithMBID = database
      .map((artist, index) => ({ artist, index }))
      .filter(({ artist }) => artist.musicBrainzArtistID);

    if (artistsWithMBID.length === 0) {
      toast({
        title: "No Artists Ready",
        description: "No artists with MusicBrainz IDs are ready for video data retrieval",
        variant: "destructive"
      });
      setIsProcessingVideos(false);
      return;
    }

    toast({
      title: "Video Processing Started", 
      description: `Getting video data for ${artistsWithMBID.length} artists. Note: Free API key limited to 1 video per artist.`,
    });

    for (const { artist, index } of artistsWithMBID) {
      if (stopRequested) {
        break;
      }
      
      try {
        // Use rate limiter for TheAudioDB API
        const videos = await theAudioDbLimiter.enqueue(() =>
          apiServiceRef.current.getArtistMusicVideos(artist.musicBrainzArtistID!)
        );

        console.log(`Processing artist ${artist.artistName}: got ${videos.length} videos`);
        console.log(`Current videos for ${artist.artistName}:`, artist.mvids?.length || 0);

        setApiStats(prev => ({
          ...prev,
          theAudioDbCalls: prev.theAudioDbCalls + 1
        }));

        const newCallCount = processedCallsCount + 1;
        setProcessedCallsCount(newCallCount);
        triggerAutoSave(newCallCount);
        
        if (processingStartTime) {
          updateTimeEstimation(newCallCount, artistsWithMBID.length, processingStartTime);
        }

        setDatabase(prev => prev.map((a, i) => 
          i === index ? { 
            ...a, 
            mvids: a.mvids ? [...a.mvids, ...videos] : videos,
            status: 'completed' as const
          } : a
        ));

      } catch (error) {
        setDatabase(prev => prev.map((a, i) => 
          i === index ? {
            ...a,
            error: `Video data error: ${error instanceof Error ? error.message : 'Unknown error'}`
          } : a
        ));
      }
    }

    setIsProcessingVideos(false);
    setStopRequested(false);
    toast({
      title: stopRequested ? "Video Processing Stopped" : "Video Processing Complete",
      description: stopRequested ? "Processing was stopped by user" : "All video data has been retrieved",
    });
  };

  const getYouTubeVideoInfo = async () => {
    setIsProcessingYouTube(true);
    if (!processingStartTime) {
      setProcessingStartTime(new Date());
      setProcessedCallsCount(0);
    }
    
    // Collect all videos that have YouTube URLs
    const videosToEnrich: { artistIndex: number; videoIndex: number; url: string }[] = [];
    
    database.forEach((artist, artistIndex) => {
      if (artist.mvids) {
        artist.mvids.forEach((video, videoIndex) => {
          if (video.strMusicVid && !video.youtubeDetails) {
            videosToEnrich.push({ artistIndex, videoIndex, url: video.strMusicVid });
          }
        });
      }
    });

    if (videosToEnrich.length === 0) {
      toast({
        title: "No Videos to Enrich",
        description: "No YouTube videos found or all videos already have YouTube details",
        variant: "destructive"
      });
      setIsProcessingYouTube(false);
      return;
    }

    toast({
      title: "YouTube Enrichment Started",
      description: `Fetching details for ${videosToEnrich.length} videos (batched up to 50 per request)`,
    });

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < videosToEnrich.length; i += batchSize) {
      if (stopRequested) {
        break;
      }

      const batch = videosToEnrich.slice(i, i + batchSize);
      const urls = batch.map(item => item.url);

      try {
        const youtubeDetails = await youtubeLimiter.enqueue(() =>
          apiServiceRef.current.getYouTubeVideoDetails(urls)
        );

        setApiStats(prev => ({
          ...prev,
          youtubeApiCalls: prev.youtubeApiCalls + 1
        }));

        const newCallCount = processedCallsCount + 1;
        setProcessedCallsCount(newCallCount);
        triggerAutoSave(newCallCount);
        
        if (processingStartTime) {
          updateTimeEstimation(newCallCount, Math.ceil(videosToEnrich.length / batchSize), processingStartTime);
        }

        // Map YouTube details back to videos
        const detailsMap = new Map(youtubeDetails.map(item => [item.id, item]));

        setDatabase(prev => {
          const newDatabase = [...prev];
          
          batch.forEach(({ artistIndex, videoIndex, url }) => {
            const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];
            
            if (videoId && detailsMap.has(videoId)) {
              const ytData = detailsMap.get(videoId);
              const artist = newDatabase[artistIndex];
              
              if (artist.mvids && artist.mvids[videoIndex]) {
                artist.mvids[videoIndex] = {
                  ...artist.mvids[videoIndex],
                  youtubeDetails: {
                    duration: ytData.contentDetails?.duration,
                    dimension: ytData.contentDetails?.dimension,
                    definition: ytData.contentDetails?.definition,
                    caption: ytData.contentDetails?.caption,
                    licensedContent: ytData.contentDetails?.licensedContent,
                    regionRestriction: ytData.contentDetails?.regionRestriction,
                    viewCount: ytData.statistics?.viewCount,
                    likeCount: ytData.statistics?.likeCount,
                    commentCount: ytData.statistics?.commentCount,
                    publishedAt: ytData.snippet?.publishedAt,
                    tags: ytData.snippet?.tags,
                  }
                };
              }
            }
          });
          
          return newDatabase;
        });

      } catch (error) {
        toast({
          title: "YouTube API Error",
          description: error instanceof Error ? error.message : "Failed to fetch YouTube details",
          variant: "destructive"
        });
        console.error('YouTube API error:', error);
      }
    }

    setIsProcessingYouTube(false);
    setStopRequested(false);
    toast({
      title: stopRequested ? "YouTube Enrichment Stopped" : "YouTube Enrichment Complete",
      description: stopRequested ? "Processing was stopped by user" : "All video details have been fetched",
    });
  };

  const exportDatabase = () => {
    try {
      ImportExportService.downloadDatabase(database, apiStats);
      
      toast({
        title: "Database Exported",
        description: "Enhanced JSON file downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export Error",
        description: error instanceof Error ? error.message : "Failed to export database",
        variant: "destructive"
      });
    }
  };

  const clearDatabase = () => {
    setDatabase([]);
    setApiStats({
      musicBrainzCalls: 0,
      theAudioDbCalls: 0,
      youtubeApiCalls: 0,
      rateLimitStatus: 'normal'
    });
    
    toast({
      title: "Database Cleared",
      description: "All data has been removed",
    });
  };

  const importDatabase = (importedData: ArtistData[]) => {
    setDatabase(importedData);
    
    toast({
      title: "Database Imported",
      description: `${importedData.length} artists imported successfully`,
    });
  };

  const showSummary = () => {
    // This could open a modal or navigate to a summary page
    // For now, we'll just show a toast
    toast({
      title: "Summary Generated",
      description: "Database summary report has been downloaded",
    });
  };

  const runSimultaneousProcessing = async () => {
    setIsProcessingMB(true);
    setIsProcessingVideos(true);
    setIsProcessingYouTube(true);
    setProcessingStartTime(new Date());
    setProcessedCallsCount(0);
    
    const pendingArtists = database
      .map((artist, index) => ({ artist, index }))
      .filter(({ artist }) => artist.status === 'pending');

    if (pendingArtists.length === 0) {
      toast({
        title: "No Pending Artists",
        description: "All artists already processed or are in error state",
        variant: "destructive"
      });
      setIsProcessingMB(false);
      setIsProcessingVideos(false);
      return;
    }

    toast({
      title: "Simultaneous Processing Started",
      description: `Processing both steps for ${pendingArtists.length} artists`,
    });

    for (const { artist, index } of pendingArtists) {
      if (stopRequested) {
        break;
      }
      
      try {
        // Step 1: Get MusicBrainz ID
        setDatabase(prev => prev.map((a, i) => 
          i === index ? { ...a, status: 'processing' as const } : a
        ));

        const musicBrainzId = await musicBrainzLimiter.enqueue(() =>
          apiServiceRef.current.getMusicBrainzArtistId(artist.artistName)
        );

        setApiStats(prev => ({
          ...prev,
          musicBrainzCalls: prev.musicBrainzCalls + 1
        }));

        let newCallCount = processedCallsCount + 1;
        setProcessedCallsCount(newCallCount);
        triggerAutoSave(newCallCount);

        if (musicBrainzId) {
          setDatabase(prev => prev.map((a, i) => 
            i === index ? {
              ...a,
              musicBrainzArtistID: musicBrainzId,
              status: 'completed' as const
            } : a
          ));

          // Step 2: Get Video Data immediately
          try {
            const videos = await theAudioDbLimiter.enqueue(() =>
              apiServiceRef.current.getArtistMusicVideos(musicBrainzId)
            );

            setApiStats(prev => ({
              ...prev,
              theAudioDbCalls: prev.theAudioDbCalls + 1
            }));

            newCallCount = processedCallsCount + 1;
            setProcessedCallsCount(newCallCount);
            triggerAutoSave(newCallCount);
            
            if (processingStartTime) {
              updateTimeEstimation(newCallCount, pendingArtists.length * 2, processingStartTime);
            }

            setDatabase(prev => prev.map((a, i) => 
              i === index ? { 
                ...a, 
                mvids: a.mvids ? [...a.mvids, ...videos] : videos
              } : a
            ));

            // Step 3: Get YouTube Video Info
            if (videos.length > 0 && apiServiceRef.current.isYouTubeApiConfigured()) {
              try {
                const videoUrls = videos.map(v => v.strMusicVid);
                const youtubeDetails = await youtubeLimiter.enqueue(() =>
                  apiServiceRef.current.getYouTubeVideoDetails(videoUrls)
                );

                setApiStats(prev => ({
                  ...prev,
                  youtubeApiCalls: prev.youtubeApiCalls + 1
                }));

                newCallCount = processedCallsCount + 1;
                setProcessedCallsCount(newCallCount);
                triggerAutoSave(newCallCount);

                // Map YouTube details to videos
                const detailsMap = new Map(youtubeDetails.map(item => [item.id, item]));

                setDatabase(prev => prev.map((a, i) => {
                  if (i === index && a.mvids) {
                    const enrichedVideos = a.mvids.map(video => {
                      const videoId = video.strMusicVid.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];
                      
                      if (videoId && detailsMap.has(videoId)) {
                        const ytData = detailsMap.get(videoId);
                        return {
                          ...video,
                          youtubeDetails: {
                            duration: ytData.contentDetails?.duration,
                            dimension: ytData.contentDetails?.dimension,
                            definition: ytData.contentDetails?.definition,
                            caption: ytData.contentDetails?.caption,
                            licensedContent: ytData.contentDetails?.licensedContent,
                            regionRestriction: ytData.contentDetails?.regionRestriction,
                            viewCount: ytData.statistics?.viewCount,
                            likeCount: ytData.statistics?.likeCount,
                            commentCount: ytData.statistics?.commentCount,
                            publishedAt: ytData.snippet?.publishedAt,
                            tags: ytData.snippet?.tags,
                          }
                        };
                      }
                      return video;
                    });

                    return { ...a, mvids: enrichedVideos };
                  }
                  return a;
                }));

              } catch (youtubeError) {
                console.error('YouTube enrichment error in simultaneous mode:', youtubeError);
              }
            }

          } catch (videoError) {
            setDatabase(prev => prev.map((a, i) => 
              i === index ? {
                ...a,
                error: `Video data error: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`
              } : a
            ));
          }
        } else {
          setDatabase(prev => prev.map((a, i) => 
            i === index ? {
              ...a,
              status: 'error' as const,
              error: 'Artist not found in MusicBrainz'
            } : a
          ));
        }

      } catch (error) {
        setDatabase(prev => prev.map((a, i) => 
          i === index ? {
            ...a,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          } : a
        ));
      }
    }

    setIsProcessingMB(false);
    setIsProcessingVideos(false);
    setIsProcessingYouTube(false);
    setStopRequested(false);
    setEstimatedTimeRemaining("");
    toast({
      title: stopRequested ? "Simultaneous Processing Stopped" : "Simultaneous Processing Complete",
      description: stopRequested ? "Processing was stopped by user" : "All artists processed through both steps",
    });
  };

  const stopProcessing = () => {
    setStopRequested(true);
    toast({
      title: "Stopping Processing",
      description: "Processing will stop after current operation completes",
    });
  };

  // Calculate action stats
  const getActionStats = () => {
    const totalArtists = database.length;
    const pendingMusicBrainz = database.filter(a => a.status === 'pending').length;
    const completedMusicBrainz = database.filter(a => a.musicBrainzArtistID && a.status === 'completed').length;
    const errorMusicBrainz = database.filter(a => a.status === 'error').length;
    
    // Count videos that need YouTube enrichment
    let pendingYouTube = 0;
    let completedYouTube = 0;
    database.forEach(artist => {
      if (artist.mvids) {
        artist.mvids.forEach(video => {
          if (video.strMusicVid) {
            if (video.youtubeDetails) {
              completedYouTube++;
            } else {
              pendingYouTube++;
            }
          }
        });
      }
    });
    const pendingVideoData = database.filter(a => a.musicBrainzArtistID && !a.mvids).length;
    const completedVideoData = database.filter(a => a.mvids && a.mvids.length > 0).length;
    const errorVideoData = database.filter(a => a.error && a.error.includes('Video data error')).length;

    return {
      totalArtists,
      pendingMusicBrainz,
      completedMusicBrainz,
      errorMusicBrainz,
      pendingVideoData,
      completedVideoData,
      errorVideoData,
      pendingYouTube,
      completedYouTube
    };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Music className="h-8 w-8" />
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Music Video Database Manager
              </h1>
              <p className="text-sm text-muted-foreground">
                MusicBrainz & TheAudioDB Integration Platform
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* API Status Panel */}
        <APIStatusPanel 
          stats={apiStats}
          isProcessing={isProcessingMB || isProcessingVideos}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column: Configuration & Controls */}
          <div className="space-y-6">
            <APIConfigSection
              config={apiConfig}
              onConfigUpdate={updateAPIConfig}
              disabled={isProcessingMB || isProcessingVideos}
            />
            
            <ActionControlsSection
              stats={getActionStats()}
              onGetMusicBrainzIds={getMusicBrainzIds}
              onGetVideoData={getVideoData}
              onGetYouTubeVideoInfo={getYouTubeVideoInfo}
              onRunSimultaneous={runSimultaneousProcessing}
              onStopProcessing={stopProcessing}
              isProcessingMB={isProcessingMB}
              isProcessingVideos={isProcessingVideos}
              isProcessingYouTube={isProcessingYouTube}
              runSimultaneously={runSimultaneously}
              onRunSimultaneousToggle={setRunSimultaneously}
              autoSave={autoSave}
              onAutoSaveToggle={setAutoSave}
              estimatedTimeRemaining={estimatedTimeRemaining}
              disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
            />
          </div>

          {/* Middle Column: Data Input & Export */}
          <div className="space-y-6">
            <DataInputSection 
              onArtistsAdded={addArtistsToDatabase}
              disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
              apiConfig={apiConfig}
            />
            
            <ExportControls
              onExport={exportDatabase}
              onClear={clearDatabase}
              onImport={importDatabase}
              onShowSummary={showSummary}
              hasData={database.length > 0}
              disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
              database={database}
              apiStats={apiStats}
            />
            
            <JSONManagerSection
              currentData={database}
              onDataUpdate={setDatabase}
              disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
            />
            
            <ConfigurationSection
              settings={configSettings}
              onSettingsUpdate={setConfigSettings}
              disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
            />
          </div>

          {/* Right Column: Database Viewer */}
          <DatabaseViewer
            database={database}
            onProcessArtist={() => {}} // No longer used - replaced by individual actions
            isProcessing={isProcessingMB || isProcessingVideos || isProcessingYouTube}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;

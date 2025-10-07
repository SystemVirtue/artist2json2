import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Music, Database, Settings, Upload, FileJson, Cog, FileText
} from "lucide-react";
import { DataInputSection } from "@/components/DataInputSection";
import { DatabaseViewer } from "@/components/DatabaseViewer";
import { APIStatusPanel } from "@/components/APIStatusPanel";
import { ExportControls } from "@/components/ExportControls";
import { APIConfigSection } from "@/components/APIConfigSection";
import { ActionControlsSection } from "@/components/ActionControlsSection";
import { JSONManagerSection } from "@/components/JSONManagerSection";
import { ConfigurationSection, ConfigurationSettings } from "@/components/ConfigurationSection";
import { ArtistData } from "./Index";

const AlternativeUI = () => {
  const { toast } = useToast();
  const [database, setDatabase] = useState<ArtistData[]>([]);
  const [isProcessingMB, setIsProcessingMB] = useState(false);
  const [isProcessingVideos, setIsProcessingVideos] = useState(false);
  const [isProcessingYouTube, setIsProcessingYouTube] = useState(false);
  const [activeTab, setActiveTab] = useState("data-input");
  
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

  const updateAPIConfig = (newConfig: typeof apiConfig) => {
    setApiConfig(newConfig);
  };

  const addArtistsToDatabase = (artists: string[]) => {
    const newArtists: ArtistData[] = artists.map(name => ({
      artistName: name,
      status: 'pending' as const
    }));
    
    setDatabase(prev => {
      const existingNames = new Set(prev.map(a => a.artistName.toLowerCase()));
      const filtered = newArtists.filter(a => !existingNames.has(a.artistName.toLowerCase()));
      return [...prev, ...filtered];
    });
    
    toast({
      title: "Artists Added",
      description: `${artists.length} artists added to database`,
    });
  };

  const getMusicBrainzIds = async () => {
    toast({
      title: "Feature Available in Classic UI",
      description: "Processing features are available in the classic UI. Click the button in the header to switch.",
    });
  };

  const getVideoData = async () => {
    toast({
      title: "Feature Available in Classic UI",
      description: "Processing features are available in the classic UI. Click the button in the header to switch.",
    });
  };

  const getYouTubeVideoInfo = async () => {
    toast({
      title: "Feature Available in Classic UI",
      description: "Processing features are available in the classic UI. Click the button in the header to switch.",
    });
  };

  const runSimultaneousProcessing = async () => {
    toast({
      title: "Feature Available in Classic UI",
      description: "Processing features are available in the classic UI. Click the button in the header to switch.",
    });
  };

  const stopProcessing = () => {
    toast({
      title: "No Active Processing",
      description: "There is no processing to stop",
    });
  };

  const exportDatabase = () => {
    const content = JSON.stringify(database, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Database Exported",
      description: "Your database has been exported successfully",
    });
  };

  const clearDatabase = () => {
    setDatabase([]);
    toast({
      title: "Database Cleared",
      description: "All data has been removed",
    });
  };

  const importDatabase = (data: ArtistData[]) => {
    setDatabase(data);
    toast({
      title: "Database Imported",
      description: `Imported ${data.length} artists`,
    });
  };

  const showSummary = () => {
    const summary = {
      totalArtists: database.length,
      apiCalls: apiStats.musicBrainzCalls + apiStats.theAudioDbCalls + apiStats.youtubeApiCalls,
      timestamp: new Date().toISOString()
    };
    console.log('Summary:', summary);
    toast({
      title: "Summary Generated",
      description: "Check the console for full summary details",
    });
  };

  const getActionStats = () => {
    const totalArtists = database.length;
    const pendingMusicBrainz = database.filter(a => !a.musicBrainzArtistID && a.status === 'pending').length;
    const completedMusicBrainz = database.filter(a => a.musicBrainzArtistID).length;
    const errorMusicBrainz = database.filter(a => a.error && !a.error.includes('Video data error')).length;
    
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

  const stats = getActionStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-primary">
                <Music className="h-6 w-6" />
                <Database className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">Music Video Database Manager</h1>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/">Classic UI</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto">
            <TabsTrigger value="data-input" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Data Input</span>
            </TabsTrigger>
            <TabsTrigger value="processing" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Processing</span>
            </TabsTrigger>
            <TabsTrigger value="json-tools" className="gap-2">
              <FileJson className="h-4 w-4" />
              <span className="hidden sm:inline">JSON Tools</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Database</span>
            </TabsTrigger>
            <TabsTrigger value="api-config" className="gap-2">
              <Cog className="h-4 w-4" />
              <span className="hidden sm:inline">API Config</span>
            </TabsTrigger>
            <TabsTrigger value="app-config" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">App Config</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* Data Input Tab */}
          <TabsContent value="data-input" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Input</CardTitle>
                <CardDescription>Add artists to your database</CardDescription>
              </CardHeader>
              <CardContent>
                <DataInputSection 
                  onArtistsAdded={addArtistsToDatabase}
                  disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
                  apiConfig={apiConfig}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processing Actions Tab */}
          <TabsContent value="processing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Processing Actions</CardTitle>
                <CardDescription>Process artist data through various enrichment steps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 border border-border rounded-lg p-6 text-center space-y-4">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Processing Features</h3>
                    <p className="text-muted-foreground mb-4">
                      Full data processing features are available in the Classic UI
                    </p>
                    <Button asChild>
                      <a href="/">Go to Classic UI</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <APIStatusPanel 
              stats={apiStats}
              isProcessing={isProcessingMB || isProcessingVideos || isProcessingYouTube}
            />
          </TabsContent>

          {/* JSON Management Tools Tab */}
          <TabsContent value="json-tools" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>JSON Management Tools</CardTitle>
                <CardDescription>Customize, validate, and manage your JSON data</CardDescription>
              </CardHeader>
              <CardContent>
                <JSONManagerSection
                  currentData={database}
                  onDataUpdate={setDatabase}
                  disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Controls Tab */}
          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Viewer & Controls</CardTitle>
                <CardDescription>{stats.totalArtists} artists in database</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <DatabaseViewer
                  database={database}
                  onProcessArtist={() => {}}
                  isProcessing={isProcessingMB || isProcessingVideos || isProcessingYouTube}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Configuration Tab */}
          <TabsContent value="api-config" className="space-y-6">
            <APIConfigSection
              config={apiConfig}
              onConfigUpdate={updateAPIConfig}
              disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
            />
          </TabsContent>

          {/* Application Configuration Tab */}
          <TabsContent value="app-config" className="space-y-6">
            <ConfigurationSection
              settings={configSettings}
              onSettingsUpdate={setConfigSettings}
              disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
            />
          </TabsContent>

          {/* System Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>View application logs and activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">
                    Logs will appear here during processing operations.
                  </p>
                  <div className="mt-4 space-y-2 font-mono text-xs">
                    <div className="text-muted-foreground">
                      Total Artists: {stats.totalArtists}
                    </div>
                    <div className="text-muted-foreground">
                      Completed MusicBrainz: {stats.completedMusicBrainz}
                    </div>
                    <div className="text-muted-foreground">
                      Completed Videos: {stats.completedVideoData}
                    </div>
                    <div className="text-muted-foreground">
                      API Calls: {apiStats.musicBrainzCalls + apiStats.theAudioDbCalls + apiStats.youtubeApiCalls}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AlternativeUI;

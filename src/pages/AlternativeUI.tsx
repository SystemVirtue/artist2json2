import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Music, Database, Settings, CheckCircle2, AlertCircle, 
  ArrowRight, Upload, Download, Zap, BarChart3
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
  const [runSimultaneously, setRunSimultaneously] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  
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
  const workflowProgress = [
    { 
      step: 1, 
      title: "Setup & Configuration", 
      icon: Settings,
      completed: apiConfig.theAudioDbKey && apiConfig.youtubeApiKey,
      active: currentStep === 1
    },
    { 
      step: 2, 
      title: "Import Artists", 
      icon: Upload,
      completed: database.length > 0,
      active: currentStep === 2
    },
    { 
      step: 3, 
      title: "Process Data", 
      icon: Zap,
      completed: stats.completedMusicBrainz === stats.totalArtists && stats.totalArtists > 0,
      active: currentStep === 3
    },
    { 
      step: 4, 
      title: "Review & Export", 
      icon: Download,
      completed: false,
      active: currentStep === 4
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Modern Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Music className="h-7 w-7" />
                </div>
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Music Video Database Manager
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Streamlined workflow for building your music video database
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href="/">Switch to Classic UI</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Workflow Progress Bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {workflowProgress.map((item, index) => (
              <div key={item.step} className="flex items-center flex-1">
                <div 
                  className={`flex items-center gap-3 cursor-pointer transition-all ${
                    item.active ? 'scale-105' : ''
                  }`}
                  onClick={() => setCurrentStep(item.step)}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                    item.completed 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : item.active
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                  }`}>
                    {item.completed ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <item.icon className="h-6 w-6" />
                    )}
                  </div>
                  <div className="hidden md:block">
                    <div className={`text-sm font-semibold ${
                      item.active ? 'text-primary' : item.completed ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      Step {item.step}
                    </div>
                    <div className={`text-xs ${
                      item.active ? 'text-primary/80' : 'text-muted-foreground'
                    }`}>
                      {item.title}
                    </div>
                  </div>
                </div>
                {index < workflowProgress.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    item.completed ? 'bg-primary' : 'bg-muted-foreground/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Quick Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Artists</p>
                  <p className="text-3xl font-bold">{stats.totalArtists}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Music className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold">{stats.completedMusicBrainz}</p>
                </div>
                <div className="p-3 bg-accent/10 rounded-lg">
                  <CheckCircle2 className="h-8 w-8 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">API Calls</p>
                  <p className="text-3xl font-bold">
                    {apiStats.musicBrainzCalls + apiStats.theAudioDbCalls + apiStats.youtubeApiCalls}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${
            stats.errorMusicBrainz + stats.errorVideoData > 0 
              ? 'border-l-destructive' 
              : 'border-l-green-500'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-3xl font-bold">{stats.errorMusicBrainz + stats.errorVideoData}</p>
                </div>
                <div className={`p-3 rounded-lg ${
                  stats.errorMusicBrainz + stats.errorVideoData > 0
                    ? 'bg-destructive/10'
                    : 'bg-green-500/10'
                }`}>
                  <AlertCircle className={`h-8 w-8 ${
                    stats.errorMusicBrainz + stats.errorVideoData > 0
                      ? 'text-destructive'
                      : 'text-green-500'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Status */}
        <div className="mb-8">
          <APIStatusPanel 
            stats={apiStats}
            isProcessing={isProcessingMB || isProcessingVideos || isProcessingYouTube}
          />
        </div>

        {/* Step Content */}
        <Tabs value={`step-${currentStep}`} onValueChange={(v) => setCurrentStep(parseInt(v.split('-')[1]))}>
          <TabsList className="hidden">
            <TabsTrigger value="step-1">Step 1</TabsTrigger>
            <TabsTrigger value="step-2">Step 2</TabsTrigger>
            <TabsTrigger value="step-3">Step 3</TabsTrigger>
            <TabsTrigger value="step-4">Step 4</TabsTrigger>
          </TabsList>

          {/* Step 1: Configuration */}
          <TabsContent value="step-1" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configure API Settings
                </CardTitle>
                <CardDescription>
                  Set up your API keys and configuration before processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <APIConfigSection
                  config={apiConfig}
                  onConfigUpdate={updateAPIConfig}
                  disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
                />
                <ConfigurationSection
                  settings={configSettings}
                  onSettingsUpdate={setConfigSettings}
                  disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
                />
                <div className="flex justify-end">
                  <Button onClick={() => setCurrentStep(2)} className="gap-2">
                    Next: Import Artists
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: Import */}
          <TabsContent value="step-2" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Import Artist Data
                  </CardTitle>
                  <CardDescription>
                    Add artists to your database manually or via import
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataInputSection 
                    onArtistsAdded={addArtistsToDatabase}
                    disabled={isProcessingMB || isProcessingVideos || isProcessingYouTube}
                    apiConfig={apiConfig}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Current Database
                  </CardTitle>
                  <CardDescription>
                    {stats.totalArtists} artists loaded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DatabaseViewer
                    database={database}
                    onProcessArtist={() => {}}
                    isProcessing={isProcessingMB || isProcessingVideos || isProcessingYouTube}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)} 
                disabled={database.length === 0}
                className="gap-2"
              >
                Next: Process Data
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Step 3: Processing */}
          <TabsContent value="step-3" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Process Your Data
                </CardTitle>
                <CardDescription>
                  Enrich your artist data with MusicBrainz IDs, video information, and YouTube details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 border border-border rounded-lg p-6 text-center space-y-4">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
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

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep(4)}
                className="gap-2"
              >
                Next: Review & Export
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Step 4: Export */}
          <TabsContent value="step-4" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export & Manage Data
                </CardTitle>
                <CardDescription>
                  Export your data, customize schemas, and generate reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                Back
              </Button>
              <Button 
                variant="default"
                onClick={() => {
                  toast({
                    title: "Workflow Complete!",
                    description: "You can start a new workflow or continue refining your data.",
                  });
                }}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AlternativeUI;

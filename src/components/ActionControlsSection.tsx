import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Database, Video, CheckCircle, AlertTriangle, Clock, Square, Save, Timer } from "lucide-react";

interface ActionStats {
  totalArtists: number;
  pendingMusicBrainz: number;
  completedMusicBrainz: number;
  errorMusicBrainz: number;
  pendingVideoData: number;
  completedVideoData: number;
  errorVideoData: number;
  pendingYouTube: number;
  completedYouTube: number;
}

interface ActionControlsSectionProps {
  stats: ActionStats;
  onGetMusicBrainzIds: () => void;
  onGetVideoData: () => void;
  onGetYouTubeVideoInfo: () => void;
  onRunSimultaneous: () => void;
  onStopProcessing: () => void;
  isProcessingMB: boolean;
  isProcessingVideos: boolean;
  isProcessingYouTube: boolean;
  runSimultaneously: boolean;
  onRunSimultaneousToggle: (checked: boolean) => void;
  autoSave: boolean;
  onAutoSaveToggle: (checked: boolean) => void;
  estimatedTimeRemaining?: string;
  disabled?: boolean;
}

export const ActionControlsSection = ({ 
  stats, 
  onGetMusicBrainzIds, 
  onGetVideoData,
  onGetYouTubeVideoInfo,
  onRunSimultaneous,
  onStopProcessing,
  isProcessingMB, 
  isProcessingVideos,
  isProcessingYouTube,
  runSimultaneously,
  onRunSimultaneousToggle,
  autoSave,
  onAutoSaveToggle,
  estimatedTimeRemaining,
  disabled 
}: ActionControlsSectionProps) => {
  
  const canGetVideoData = stats.completedMusicBrainz > 0 && !isProcessingMB;
  const canGetYouTubeData = stats.completedVideoData > 0 && !isProcessingVideos;
  const hasArtists = stats.totalArtists > 0;

  const getMBProgress = () => {
    if (stats.totalArtists === 0) return 0;
    return ((stats.completedMusicBrainz + stats.errorMusicBrainz) / stats.totalArtists) * 100;
  };

  const getVideoProgress = () => {
    if (stats.completedMusicBrainz === 0) return 0;
    return ((stats.completedVideoData + stats.errorVideoData) / stats.completedMusicBrainz) * 100;
  };

  const getYouTubeProgress = () => {
    const totalVideos = stats.completedYouTube + stats.pendingYouTube;
    if (totalVideos === 0) return 0;
    return (stats.completedYouTube / totalVideos) * 100;
  };

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          <CardTitle>Processing Actions</CardTitle>
        </div>
        <CardDescription>
          Execute individual processing steps with error handling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Run Simultaneously Option */}
        <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded border">
          <Checkbox 
            id="run-simultaneously"
            checked={runSimultaneously}
            onCheckedChange={onRunSimultaneousToggle}
            disabled={disabled}
          />
          <label htmlFor="run-simultaneously" className="text-sm font-medium cursor-pointer">
            Run Simultaneously - Process each entry through all steps sequentially
          </label>
        </div>

        {/* Auto-Save Option */}
        <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded border">
          <Checkbox 
            id="auto-save"
            checked={autoSave}
            onCheckedChange={onAutoSaveToggle}
            disabled={disabled}
          />
          <label htmlFor="auto-save" className="text-sm font-medium cursor-pointer flex items-center gap-2">
            <Save className="h-4 w-4" />
            Auto-Save - Download backup every 300 processed API calls
          </label>
        </div>

        {/* Time Estimation */}
        {estimatedTimeRemaining && (isProcessingMB || isProcessingVideos || isProcessingYouTube) && (
          <div className="flex items-center gap-2 p-3 bg-accent/10 rounded border border-accent/20">
            <Timer className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">
              Estimated processing time remaining: {estimatedTimeRemaining}
            </span>
          </div>
        )}

        {/* Step 1: MusicBrainz IDs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="font-medium">Step 1: Get MusicBrainz Artist IDs</span>
            </div>
            <div className="flex items-center gap-2">
              {stats.completedMusicBrainz > 0 && (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {stats.completedMusicBrainz}
                </Badge>
              )}
              {stats.errorMusicBrainz > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.errorMusicBrainz}
                </Badge>
              )}
              {stats.pendingMusicBrainz > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.pendingMusicBrainz}
                </Badge>
              )}
            </div>
          </div>
          
          {stats.totalArtists > 0 && (
            <div className="space-y-1">
              <Progress value={getMBProgress()} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.completedMusicBrainz + stats.errorMusicBrainz} / {stats.totalArtists} processed
              </p>
            </div>
          )}

          {!runSimultaneously && (
            <Button
              onClick={onGetMusicBrainzIds}
              disabled={disabled || !hasArtists || isProcessingMB || stats.pendingMusicBrainz === 0}
              className="w-full"
              variant={stats.pendingMusicBrainz > 0 ? "default" : "secondary"}
            >
              <Database className="h-4 w-4 mr-2" />
              {isProcessingMB ? "Processing MusicBrainz..." : 
               stats.pendingMusicBrainz === 0 ? "All MusicBrainz IDs Retrieved" :
               `Get MusicBrainz IDs (${stats.pendingMusicBrainz} pending)`}
            </Button>
          )}
        </div>

        {/* Step 2: Video Data */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-accent" />
              <span className="font-medium">Step 2: Get Music Video Data</span>
            </div>
            <div className="flex items-center gap-2">
              {stats.completedVideoData > 0 && (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {stats.completedVideoData}
                </Badge>
              )}
              {stats.errorVideoData > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.errorVideoData}
                </Badge>
              )}
              {stats.pendingVideoData > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.pendingVideoData}
                </Badge>
              )}
            </div>
          </div>

          {stats.completedMusicBrainz > 0 && (
            <div className="space-y-1">
              <Progress value={getVideoProgress()} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.completedVideoData + stats.errorVideoData} / {stats.completedMusicBrainz} processed
              </p>
            </div>
          )}

          {!runSimultaneously && (
            <Button
              onClick={onGetVideoData}
              disabled={disabled || !canGetVideoData || isProcessingVideos || stats.pendingVideoData === 0}
              className="w-full"
              variant={canGetVideoData && stats.pendingVideoData > 0 ? "default" : "secondary"}
            >
              <Video className="h-4 w-4 mr-2" />
              {isProcessingVideos ? "Processing Video Data..." :
               !canGetVideoData ? "Complete Step 1 First" :
               stats.pendingVideoData === 0 ? "All Video Data Retrieved" :
               `Get Video Data (${stats.pendingVideoData} pending)`}
            </Button>
          )}

          {runSimultaneously && (
            <Button
              onClick={onRunSimultaneous}
              disabled={disabled || !hasArtists || isProcessingMB || isProcessingVideos || isProcessingYouTube || stats.pendingMusicBrainz === 0}
              className="w-full"
              variant={stats.pendingMusicBrainz > 0 ? "default" : "secondary"}
            >
              <Play className="h-4 w-4 mr-2" />
              {(isProcessingMB || isProcessingVideos || isProcessingYouTube) ? "Processing All Steps..." :
               stats.pendingMusicBrainz === 0 ? "All Processing Complete" :
               `Process All Steps (${stats.pendingMusicBrainz} pending)`}
            </Button>
          )}
        </div>

        {/* Step 3: YouTube Video Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-secondary" />
              <span className="font-medium">Step 3: Get YouTube Video Info</span>
            </div>
            <div className="flex items-center gap-2">
              {stats.completedYouTube > 0 && (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {stats.completedYouTube}
                </Badge>
              )}
              {stats.pendingYouTube > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.pendingYouTube}
                </Badge>
              )}
            </div>
          </div>

          {(stats.completedYouTube > 0 || stats.pendingYouTube > 0) && (
            <div className="space-y-1">
              <Progress value={getYouTubeProgress()} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.completedYouTube} / {stats.completedYouTube + stats.pendingYouTube} videos enriched
              </p>
            </div>
          )}

          {!runSimultaneously && (
            <Button
              onClick={onGetYouTubeVideoInfo}
              disabled={disabled || !canGetYouTubeData || isProcessingYouTube || stats.pendingYouTube === 0}
              className="w-full"
              variant={canGetYouTubeData && stats.pendingYouTube > 0 ? "default" : "secondary"}
            >
              <Video className="h-4 w-4 mr-2" />
              {isProcessingYouTube ? "Fetching YouTube Data..." :
               !canGetYouTubeData ? "Complete Step 2 First" :
               stats.pendingYouTube === 0 ? "All Videos Enriched" :
               `Enrich Videos (${stats.pendingYouTube} pending)`}
            </Button>
          )}
        </div>

        {/* Stop Processing Button */}
        {(isProcessingMB || isProcessingVideos || isProcessingYouTube) && (
          <Button
            onClick={onStopProcessing}
            variant="destructive"
            className="w-full"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Processing
          </Button>
        )}

        {/* Prerequisites Info */}
        {!hasArtists && (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded border-l-4 border-warning">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            Add artists using the Data Input section to begin processing
          </div>
        )}
      </CardContent>
    </Card>
  );
};

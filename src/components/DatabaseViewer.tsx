import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Play, Database, CheckCircle, AlertCircle, Clock, Loader2, ExternalLink } from "lucide-react";
import { ArtistData } from "@/pages/Index";

interface DatabaseViewerProps {
  database: ArtistData[];
  onProcessArtist: (index: number) => void;
  isProcessing: boolean;
}

export const DatabaseViewer = ({ database, onProcessArtist, isProcessing }: DatabaseViewerProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-warning animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Music Video Database</CardTitle>
          </div>
          <Badge variant="secondary">
            {database.length} Artists
          </Badge>
        </div>
        <CardDescription>
          Manage your music video database and track processing status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {database.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No artists in database</p>
            <p className="text-sm">Add artists using the input section</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {database.map((artist, index) => (
                <Card key={index} className="border border-border/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          {artist.artistName}
                        </h3>
                        {artist.musicBrainzArtistID && (
                          <p className="text-xs text-muted-foreground font-mono">
                            MBID: {artist.musicBrainzArtistID}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(artist.status)} className="flex items-center gap-1">
                          {getStatusIcon(artist.status)}
                          {artist.status}
                        </Badge>
                      </div>
                    </div>

                    {artist.error && (
                      <div className="text-sm text-destructive bg-destructive/10 p-2 rounded mb-3">
                        Error: {artist.error}
                      </div>
                    )}

                    {artist.mvids && artist.mvids.length > 0 && (
                      <div className="space-y-2">
                        <Separator />
                        <div className="pt-2">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Play className="h-4 w-4 text-accent" />
                            Music Videos ({artist.mvids.length})
                          </h4>
                          <div className="space-y-2">
                            {artist.mvids.slice(0, 3).map((video, vidIndex) => (
                              <div key={vidIndex} className="bg-muted/30 p-2 rounded text-sm">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-foreground">
                                      {video.strTrack}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Duration: {Math.floor(parseInt(video.intDuration) / 1000 / 60)}:
                                      {String(Math.floor((parseInt(video.intDuration) / 1000) % 60)).padStart(2, '0')}
                                    </p>
                                  </div>
                                  {video.strMusicVid && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => window.open(video.strMusicVid, '_blank')}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {artist.mvids.length > 3 && (
                              <p className="text-xs text-muted-foreground text-center">
                                +{artist.mvids.length - 3} more videos
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
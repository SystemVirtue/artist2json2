import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Database, Zap, AlertTriangle } from "lucide-react";

interface APIStatusPanelProps {
  stats: {
    musicBrainzCalls: number;
    theAudioDbCalls: number;
    rateLimitStatus: 'normal' | 'warning' | 'limited';
  };
  isProcessing: boolean;
}

export const APIStatusPanel = ({ stats, isProcessing }: APIStatusPanelProps) => {
  const getRateLimitColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'limited':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getRateLimitVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'normal':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'limited':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="shadow-lg border-border/50 bg-gradient-to-r from-card to-card/80">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>API Status</CardTitle>
          </div>
          <Badge 
            variant={getRateLimitVariant(stats.rateLimitStatus)}
            className="flex items-center gap-1"
          >
            {stats.rateLimitStatus === 'limited' && <AlertTriangle className="h-3 w-3" />}
            {stats.rateLimitStatus === 'warning' && <Zap className="h-3 w-3" />}
            Rate Limit: {stats.rateLimitStatus}
          </Badge>
        </div>
        <CardDescription>
          Real-time API usage and rate limiting status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MusicBrainz Stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">MusicBrainz API</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Calls Made</span>
                <span className="font-mono">{stats.musicBrainzCalls}</span>
              </div>
              <Progress value={(stats.musicBrainzCalls / 100) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Limit: 1 req/sec (Rate limiting active)
              </p>
            </div>
          </div>

          {/* TheAudioDB Stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">TheAudioDB API</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Calls Made</span>
                <span className="font-mono">{stats.theAudioDbCalls}</span>
              </div>
              <Progress value={(stats.theAudioDbCalls / 200) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Limit: 2 req/sec (API Key: 2)
              </p>
            </div>
          </div>

          {/* Processing Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Processing Status</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={isProcessing ? "secondary" : "outline"} className="text-xs">
                  {isProcessing ? "Active" : "Idle"}
                </Badge>
              </div>
              {isProcessing && (
                <Progress value={75} className="h-2" />
              )}
              <p className="text-xs text-muted-foreground">
                Queue management: Auto-throttling enabled
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
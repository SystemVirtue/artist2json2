import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Key, UserCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface APIConfig {
  userAgent: string;
  theAudioDbKey: string;
  youtubeApiKey?: string;
  spotifyAccessToken?: string;
}

interface APIConfigSectionProps {
  config: APIConfig;
  onConfigUpdate: (config: APIConfig) => void;
  disabled?: boolean;
}

export const APIConfigSection = ({ config, onConfigUpdate, disabled }: APIConfigSectionProps) => {
  const { toast } = useToast();
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    if (!localConfig.userAgent.trim()) {
      toast({
        title: "Invalid Configuration",
        description: "User-Agent string is required for MusicBrainz API",
        variant: "destructive"
      });
      return;
    }

    onConfigUpdate(localConfig);
    toast({
      title: "Configuration Saved",
      description: "API settings have been updated",
    });
  };

  const resetToDefaults = () => {
    const defaultConfig: APIConfig = {
      userAgent: "MusicVideoDBManager/1.0 ( your-email@example.com )",
      theAudioDbKey: import.meta.env.VITE_THEAUDIODB_API_KEY || "18626d636d76696473706d",
      youtubeApiKey: import.meta.env.VITE_YOUTUBE_V3_API_KEY || "18626d636d76696473706d",
      spotifyAccessToken: ""
    };
    setLocalConfig(defaultConfig);
  };

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>API Configuration</CardTitle>
        </div>
        <CardDescription>
          Configure API settings and rate limiting parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-agent" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            User-Agent String (MusicBrainz)
          </Label>
          <Input
            id="user-agent"
            placeholder="YourApp/1.0 ( your-email@example.com )"
            value={localConfig.userAgent}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, userAgent: e.target.value }))}
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Required for MusicBrainz API compliance. Include your app name and contact email.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="audiodb-key" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            TheAudioDB API Key
          </Label>
          <Input
            id="audiodb-key"
            value={localConfig.theAudioDbKey}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, theAudioDbKey: e.target.value }))}
            disabled={disabled}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Default: "2" (test key). Rate limited to 2 calls/second max.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={disabled}
            className="flex-1"
          >
            Save Configuration
          </Button>
          <Button
            onClick={resetToDefaults}
            disabled={disabled}
            variant="outline"
          >
            Reset Defaults
          </Button>
        </div>

        {/* Optional API Keys for Playlist Parsing */}
        <div className="space-y-4 pt-4 border-t border-border/30">
          <h4 className="text-sm font-medium text-foreground">Optional: Playlist Parsing APIs</h4>
          
          <div className="space-y-2">
            <Label htmlFor="youtube-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              YouTube Data API v3 Key (Optional)
            </Label>
            <Input
              id="youtube-key"
              placeholder="AIzaSyC..."
              value={localConfig.youtubeApiKey || ""}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, youtubeApiKey: e.target.value }))}
              disabled={disabled}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Required for YouTube playlist parsing. Get from Google Cloud Console.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="spotify-token" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Spotify Access Token (Optional)
            </Label>
            <Input
              id="spotify-token"
              placeholder="BQC..."
              value={localConfig.spotifyAccessToken || ""}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, spotifyAccessToken: e.target.value }))}
              disabled={disabled}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Required for Spotify playlist parsing. Get from Spotify Web API.
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/30">
          <p>• MusicBrainz: No API key required, respects 1 req/sec rate limit</p>
          <p>• TheAudioDB: Limited to 2 calls/second to prevent rate limiting</p>
          <p>• YouTube/Spotify: Optional for enhanced playlist parsing</p>
          <p>• All requests include proper headers and error handling</p>
        </div>
      </CardContent>
    </Card>
  );
};

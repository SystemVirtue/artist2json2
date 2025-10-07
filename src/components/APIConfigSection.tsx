import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Key, UserCheck, CheckCircle2, XCircle, Edit2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

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
  const [isEditingAudioDB, setIsEditingAudioDB] = useState(false);
  const [isEditingYouTube, setIsEditingYouTube] = useState(false);
  const [audioDB_Status, setAudioDB_Status] = useState<'valid' | 'invalid' | 'testing'>('testing');
  const [youTube_Status, setYouTube_Status] = useState<'valid' | 'invalid' | 'testing'>('testing');
  const [tempAudioDBKey, setTempAudioDBKey] = useState('');
  const [tempYouTubeKey, setTempYouTubeKey] = useState('');

  const testAudioDBKey = async (key: string) => {
    if (!key) {
      setAudioDB_Status('invalid');
      return false;
    }
    try {
      const response = await fetch(`https://theaudiodb.com/api/v1/json/${key}/artist.php?i=111674`);
      if (response.ok) {
        setAudioDB_Status('valid');
        return true;
      }
      setAudioDB_Status('invalid');
      return false;
    } catch {
      setAudioDB_Status('invalid');
      return false;
    }
  };

  const testYouTubeKey = async (key: string) => {
    if (!key) {
      setYouTube_Status('invalid');
      return false;
    }
    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=id&id=9bZkp7q19f0&key=${key}`);
      if (response.ok) {
        setYouTube_Status('valid');
        return true;
      }
      setYouTube_Status('invalid');
      return false;
    } catch {
      setYouTube_Status('invalid');
      return false;
    }
  };

  useEffect(() => {
    testAudioDBKey(localConfig.theAudioDbKey);
    if (localConfig.youtubeApiKey) {
      testYouTubeKey(localConfig.youtubeApiKey);
    } else {
      setYouTube_Status('invalid');
    }
  }, []);

  const handleSaveAudioDBKey = async () => {
    const isValid = await testAudioDBKey(tempAudioDBKey);
    if (isValid) {
      setLocalConfig(prev => ({ ...prev, theAudioDbKey: tempAudioDBKey }));
      setIsEditingAudioDB(false);
      toast({
        title: "Key Updated",
        description: "TheAudioDB API key has been validated and saved",
      });
    } else {
      toast({
        title: "Invalid Key",
        description: "The API key is not valid",
        variant: "destructive"
      });
    }
  };

  const handleSaveYouTubeKey = async () => {
    const isValid = await testYouTubeKey(tempYouTubeKey);
    if (isValid) {
      setLocalConfig(prev => ({ ...prev, youtubeApiKey: tempYouTubeKey }));
      setIsEditingYouTube(false);
      toast({
        title: "Key Updated",
        description: "YouTube API key has been validated and saved",
      });
    } else {
      toast({
        title: "Invalid Key",
        description: "The API key is not valid",
        variant: "destructive"
      });
    }
  };

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
      userAgent: "MusicVideoDBManager/1.0 ( admin@djamms.app )",
      theAudioDbKey: import.meta.env.VITE_THEAUDIODB_API_KEY || "18626d636d76696473706d",
      youtubeApiKey: import.meta.env.VITE_YOUTUBE_V3_API_KEY || "AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4",
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
          <Label htmlFor="audiodb-key" className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              TheAudioDB API Key
            </span>
            <div className="flex items-center gap-2">
              <Badge variant={audioDB_Status === 'valid' ? 'default' : audioDB_Status === 'testing' ? 'secondary' : 'destructive'} className="gap-1">
                {audioDB_Status === 'valid' ? (
                  <><CheckCircle2 className="h-3 w-3" /> Valid</>
                ) : audioDB_Status === 'testing' ? (
                  <>Testing...</>
                ) : (
                  <><XCircle className="h-3 w-3" /> Invalid</>
                )}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditingAudioDB(!isEditingAudioDB);
                  if (!isEditingAudioDB) setTempAudioDBKey(localConfig.theAudioDbKey);
                }}
                disabled={disabled}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit Key
              </Button>
            </div>
          </Label>
          {isEditingAudioDB ? (
            <div className="flex gap-2">
              <Input
                id="audiodb-key"
                value={tempAudioDBKey}
                onChange={(e) => setTempAudioDBKey(e.target.value)}
                disabled={disabled}
                className="font-mono"
                placeholder="Enter API key"
              />
              <Button onClick={handleSaveAudioDBKey} disabled={disabled} size="sm">
                Save
              </Button>
              <Button onClick={() => setIsEditingAudioDB(false)} disabled={disabled} size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          ) : (
            <Input
              id="audiodb-key"
              value="••••••••••••••••"
              disabled
              className="font-mono"
            />
          )}
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
            <Label htmlFor="youtube-key" className="flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                YouTube Data API v3 Key (Optional)
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={youTube_Status === 'valid' ? 'default' : youTube_Status === 'testing' ? 'secondary' : 'destructive'} className="gap-1">
                  {youTube_Status === 'valid' ? (
                    <><CheckCircle2 className="h-3 w-3" /> Valid</>
                  ) : youTube_Status === 'testing' ? (
                    <>Testing...</>
                  ) : (
                    <><XCircle className="h-3 w-3" /> Invalid</>
                  )}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingYouTube(!isEditingYouTube);
                    if (!isEditingYouTube) setTempYouTubeKey(localConfig.youtubeApiKey || '');
                  }}
                  disabled={disabled}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit Key
                </Button>
              </div>
            </Label>
            {isEditingYouTube ? (
              <div className="flex gap-2">
                <Input
                  id="youtube-key"
                  value={tempYouTubeKey}
                  onChange={(e) => setTempYouTubeKey(e.target.value)}
                  disabled={disabled}
                  className="font-mono text-sm"
                  placeholder="Enter API key"
                />
                <Button onClick={handleSaveYouTubeKey} disabled={disabled} size="sm">
                  Save
                </Button>
                <Button onClick={() => setIsEditingYouTube(false)} disabled={disabled} size="sm" variant="outline">
                  Cancel
                </Button>
              </div>
            ) : (
              <Input
                id="youtube-key"
                value={localConfig.youtubeApiKey ? "••••••••••••••••" : ""}
                disabled
                className="font-mono text-sm"
                placeholder="Not configured"
              />
            )}
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

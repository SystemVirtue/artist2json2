import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Type, Link, FileText, Music } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PlaylistService } from "@/services/playlistService";

interface APIConfig {
  userAgent: string;
  theAudioDbKey: string;
  youtubeApiKey?: string;
  spotifyAccessToken?: string;
}

interface DataInputSectionProps {
  onArtistsAdded: (artists: string[]) => void;
  disabled?: boolean;
  apiConfig: APIConfig;
}

export const DataInputSection = ({ onArtistsAdded, disabled, apiConfig }: DataInputSectionProps) => {
  const { toast } = useToast();
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseArtists = (text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      toast({
        title: "No Input",
        description: "Please enter artist names",
        variant: "destructive"
      });
      return;
    }

    const artists = parseArtists(textInput);
    if (artists.length === 0) {
      toast({
        title: "No Valid Artists",
        description: "No valid artist names found",
        variant: "destructive"
      });
      return;
    }

    onArtistsAdded(artists);
    setTextInput("");
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      toast({
        title: "No URL",
        description: "Please enter a Spotify or YouTube playlist URL",
        variant: "destructive"
      });
      return;
    }

    // Validate URL format
    if (!PlaylistService.isValidPlaylistUrl(urlInput.trim())) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube, Spotify, or Apple Music playlist URL",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Processing Playlist",
        description: "Parsing playlist URL and extracting artists...",
      });

      const playlistService = new PlaylistService(apiConfig.youtubeApiKey, apiConfig.spotifyAccessToken);
      const result = await playlistService.parsePlaylistUrl(urlInput.trim());
      
      if (result.artists.length === 0) {
        toast({
          title: "No Artists Found",
          description: "No artists could be extracted from this playlist",
          variant: "destructive"
        });
        return;
      }

      onArtistsAdded(result.artists);
      setUrlInput("");
      
      const sourceDisplay = result.source.charAt(0).toUpperCase() + result.source.slice(1);
      toast({
        title: "Playlist Parsed Successfully",
        description: `${result.artists.length} artists extracted from ${sourceDisplay} playlist${result.playlistName ? `: ${result.playlistName}` : ''}`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Playlist Parsing Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const artists = parseArtists(content);
      
      if (artists.length === 0) {
        toast({
          title: "No Valid Artists",
          description: "No valid artist names found in file",
          variant: "destructive"
        });
        return;
      }

      onArtistsAdded(artists);
      
      toast({
        title: "File Uploaded",
        description: `${artists.length} artists loaded from ${file.name}`,
      });
    };

    reader.readAsText(file);
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <CardTitle>Data Input</CardTitle>
        </div>
        <CardDescription>
          Add artists via text input, file upload, or playlist URLs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              File
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="artist-text">Artist Names (one per line)</Label>
              <Textarea
                id="artist-text"
                placeholder="The Weeknd&#10;Daft Punk&#10;Radiohead&#10;# Comments start with #"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[120px] font-mono"
                disabled={disabled}
              />
            </div>
            <Button 
              onClick={handleTextSubmit}
              disabled={disabled || !textInput.trim()}
              className="w-full"
            >
              <Type className="h-4 w-4 mr-2" />
              Add Artists
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload TXT or CSV File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                disabled={disabled}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: .txt, .csv (one artist per line)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-url">Playlist URL</Label>
              <Input
                id="playlist-url"
                placeholder="https://open.spotify.com/playlist/... or https://youtube.com/playlist?list=..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Supports YouTube playlists, Spotify playlists/albums, and Apple Music playlists
              </p>
              <div className="text-xs text-muted-foreground space-y-1 mt-2 p-2 bg-muted/30 rounded">
                <p><strong>Supported formats:</strong></p>
                <p>• YouTube: youtube.com/playlist?list=...</p>
                <p>• YouTube: youtube.com/watch?v=...&list=...</p>
                <p>• Spotify: open.spotify.com/playlist/...</p>
                <p>• Spotify: open.spotify.com/album/...</p>
                <p>• Apple Music: music.apple.com/.../playlist/...</p>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 mt-2 p-2 bg-primary/10 border border-primary/20 rounded">
                <p><strong>API Configuration:</strong></p>
                <p>• YouTube API key {apiConfig.youtubeApiKey ? '✓ configured' : '⚠ not configured'}</p>
                <p>• Spotify access token {apiConfig.spotifyAccessToken ? '✓ configured' : '⚠ not configured'}</p>
                <p>• Configure API keys in the "API Configuration" section for enhanced playlist parsing</p>
              </div>
            </div>
            <Button 
              onClick={handleUrlSubmit}
              disabled={disabled || !urlInput.trim()}
              className="w-full"
              variant="secondary"
            >
              <Link className="h-4 w-4 mr-2" />
              Parse Playlist
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
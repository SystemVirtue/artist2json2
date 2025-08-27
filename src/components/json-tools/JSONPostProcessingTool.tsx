import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Filter, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ArtistData } from "@/pages/Index";

interface JSONPostProcessingToolProps {
  data: ArtistData[];
  onDataUpdate: (data: ArtistData[]) => void;
  disabled?: boolean;
}

export const JSONPostProcessingTool = ({ data, onDataUpdate, disabled }: JSONPostProcessingToolProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const hasData = data && data.length > 0;

  const runPostProcessing = async () => {
    setIsProcessing(true);
    
    try {
      // Filter out artists with no associated music videos and clean up the data
      const processedData = data
        .filter(artist => artist.mvids && artist.mvids.length > 0) // Remove artists with no music videos
        .map(artist => {
          const cleanedArtist: any = {
            artistName: artist.artistName,
            musicBrainzArtistID: artist.musicBrainzArtistID
          };

          // Clean up mvids array by removing specified fields
          if (artist.mvids && artist.mvids.length > 0) {
            cleanedArtist.mvids = artist.mvids.map(video => {
              const cleanedVideo = { ...video } as any;
              
              // Remove the specified fields
              delete cleanedVideo.strMusicBrainzArtistID;
              delete cleanedVideo.strMusicBrainzAlbumID;
              delete cleanedVideo.idArtist;
              delete cleanedVideo.idAlbum;
              delete cleanedVideo.idTrack;
              
              return cleanedVideo;
            });
          }

          return cleanedArtist;
        });

      onDataUpdate(processedData);
      
      toast({
        title: "Post-Processing Complete",
        description: `Processed ${processedData.length} artists with music videos`,
      });
    } catch (error) {
      toast({
        title: "Post-Processing Error",
        description: error instanceof Error ? error.message : "Failed to process data",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStats = () => {
    if (!hasData) return { total: 0, withVideos: 0, withoutVideos: 0 };
    
    const withVideos = data.filter(artist => artist.mvids && artist.mvids.length > 0).length;
    const withoutVideos = data.length - withVideos;
    
    return {
      total: data.length,
      withVideos,
      withoutVideos
    };
  };

  const stats = getStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Post-Processing
        </CardTitle>
        <CardDescription>
          Streamline JSON data by removing unnecessary fields and empty entries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Task Summary */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Task Summary</h4>
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <p className="text-sm font-medium">Post-Processing will modify ALL JSON objects as follows:</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span>Remove all Artists with no associated Music Videos</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span>Remove JSON field 'status: {"{status}"}'</span>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">In mvids array:</p>
              <div className="space-y-1 text-sm pl-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-3 w-3 text-destructive" />
                  <span>Remove 'strMusicBrainzArtistID: {"{ID}"}'</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 className="h-3 w-3 text-destructive" />
                  <span>Delete 'strMusicBrainzAlbumID: {"{ID}"}'</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 className="h-3 w-3 text-destructive" />
                  <span>Delete 'idArtist: {"{ID}"}'</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 className="h-3 w-3 text-destructive" />
                  <span>Delete 'idAlbum: {"{ID}"}'</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 className="h-3 w-3 text-destructive" />
                  <span>Delete 'idTrack: {"{ID}"}'</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Data Stats */}
        {hasData && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Badge variant="secondary" className="w-full justify-center py-2">
                <span className="text-sm">Total: {stats.total}</span>
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="default" className="w-full justify-center py-2">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                <span className="text-sm">With Videos: {stats.withVideos}</span>
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="destructive" className="w-full justify-center py-2">
                <Trash2 className="h-3 w-3 mr-1" />
                <span className="text-sm">No Videos: {stats.withoutVideos}</span>
              </Badge>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size="lg"
                disabled={disabled || !hasData || isProcessing}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                {isProcessing ? "Processing..." : "Run Post-Processing"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are You Sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently modify your in-memory JSON data by removing artists without music videos and cleaning up unnecessary fields. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={runPostProcessing}>
                  Run
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
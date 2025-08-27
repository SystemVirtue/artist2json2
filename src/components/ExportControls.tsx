import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, FileJson, Import, BarChart3, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ImportExportService } from "@/services/importExportService";
import { ArtistData } from "@/pages/Index";
import { useRef } from "react";

interface ExportControlsProps {
  onExport: () => void;
  onClear: () => void;
  onImport: (data: ArtistData[]) => void;
  onShowSummary: () => void;
  hasData: boolean;
  disabled?: boolean;
  database: ArtistData[];
  apiStats?: { musicBrainzCalls: number; theAudioDbCalls: number };
}

export const ExportControls = ({ 
  onExport, 
  onClear, 
  onImport, 
  onShowSummary, 
  hasData, 
  disabled, 
  database, 
  apiStats 
}: ExportControlsProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast({
        title: "Importing Database",
        description: "Processing import file...",
      });

      const result = await ImportExportService.importFromFile(file);
      
      if (result.success && result.data) {
        onImport(result.data);
        
        const successMsg = `Successfully imported ${result.importedCount} artists${
          result.skippedCount > 0 ? `, skipped ${result.skippedCount}` : ''
        }`;
        
        toast({
          title: "Import Successful",
          description: successMsg,
        });

        if (result.errors.length > 0) {
          console.warn('Import warnings:', result.errors);
        }
      } else {
        toast({
          title: "Import Failed",
          description: result.errors.join('\n') || "Unknown error during import",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import file",
        variant: "destructive"
      });
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSummary = () => {
    try {
      const summary = ImportExportService.generateSummary(database, apiStats);
      onShowSummary();
      
      // Also offer to download as text report
      const report = ImportExportService.exportSummaryReport(summary);
      const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(report);
      const filename = `database-summary-${new Date().toISOString().split('T')[0]}.txt`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', filename);
      linkElement.click();
      
      toast({
        title: "Summary Generated",
        description: "Database summary downloaded as text report",
      });
    } catch (error) {
      toast({
        title: "Summary Error",
        description: error instanceof Error ? error.message : "Failed to generate summary",
        variant: "destructive"
      });
    }
  };

  const handleCSVExport = () => {
    try {
      ImportExportService.downloadAllVideosCSV(database);
      
      toast({
        title: "CSV Export Complete",
        description: "All videos list downloaded as CSV file",
      });
    } catch (error) {
      toast({
        title: "Export Error",
        description: error instanceof Error ? error.message : "Failed to export CSV",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            <CardTitle>Database Controls</CardTitle>
          </div>
          {hasData && (
            <Badge variant="secondary" className="text-xs">
              Ready for Export
            </Badge>
          )}
        </div>
        <CardDescription>
          Export, import, and manage your music video database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export/Import Row */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={onExport}
            disabled={disabled || !hasData}
            className="flex items-center gap-2"
            variant="default"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          
          <Button
            onClick={handleImport}
            disabled={disabled}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Import className="h-4 w-4" />
            Import JSON
          </Button>
        </div>

        {/* CSV Export Row */}
        <div className="w-full">
          <Button
            onClick={handleCSVExport}
            disabled={disabled || !hasData}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            All Videos Text List (CSV)
          </Button>
        </div>

        {/* Analysis/Management Row */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleSummary}
            disabled={disabled || !hasData}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Summary
          </Button>
          
          <Button
            onClick={onClear}
            disabled={disabled || !hasData}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        </div>

        {/* Info Text */}
        {/* Hidden file input for import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileImport}
          accept=".json"
          style={{ display: 'none' }}
        />

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/30">
          <p>• JSON exports include all artist data and music videos</p>
          <p>• CSV exports list each track individually with artist and video URL</p>
          <p>• Import supports JSON files from previous exports</p>
          <p>• Summary generates detailed analytics and downloads report</p>
        </div>
      </CardContent>
    </Card>
  );
};
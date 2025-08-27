import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Settings, Download, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export interface ConfigurationSettings {
  // JSON Export Settings
  maxExportFileSize: number; // MB
  enableFileSizeLimit: boolean;
  
  // TheAudioDB Request Settings
  includeDescriptions: boolean;
  includeThumbnails: boolean;
  includeVideos: boolean;
  includeAlbumInfo: boolean;
  includeMusicBrainzIds: boolean;
  
  // Logging and Reports
  generateLogFiles: boolean;
  logLevel: 'basic' | 'detailed' | 'verbose';
  includeSummaryReports: boolean;
  autoDownloadReports: boolean;
  
  // Processing Settings
  batchSize: number;
  requestDelay: number; // milliseconds
  maxRetries: number;
  
  // Data Quality
  validateOnImport: boolean;
  removeDuplicates: boolean;
  normalizeArtistNames: boolean;
  skipEmptyRecords: boolean;
}

interface ConfigurationSectionProps {
  settings: ConfigurationSettings;
  onSettingsUpdate: (settings: ConfigurationSettings) => void;
  disabled?: boolean;
}

const defaultSettings: ConfigurationSettings = {
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
};

export const ConfigurationSection = ({ settings, onSettingsUpdate, disabled }: ConfigurationSectionProps) => {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<ConfigurationSettings>(settings);

  const updateSetting = <K extends keyof ConfigurationSettings>(
    key: K,
    value: ConfigurationSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSettingsUpdate(localSettings);
    
    toast({
      title: "Settings Saved",
      description: "Configuration has been updated successfully",
    });
  };

  const handleReset = () => {
    setLocalSettings(defaultSettings);
    
    toast({
      title: "Settings Reset",
      description: "Configuration has been reset to defaults",
    });
  };

  const exportSettings = () => {
    const filename = `music-video-db-config-${new Date().toISOString().split('T')[0]}.json`;
    const content = JSON.stringify(localSettings, null, 2);
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
    
    toast({
      title: "Configuration Exported",
      description: `Settings exported as ${filename}`,
    });
  };

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Application Configuration</CardTitle>
        </div>
        <CardDescription>
          Customize export settings, data processing options, and logging preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* JSON Export Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">JSON Export Settings</h4>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableFileSizeLimit"
                checked={localSettings.enableFileSizeLimit}
                onCheckedChange={(checked) => updateSetting('enableFileSizeLimit', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="enableFileSizeLimit" className="text-sm">
                Enable file size limit for JSON exports
              </Label>
            </div>
            
            {localSettings.enableFileSizeLimit && (
              <div className="space-y-2 ml-6">
                <Label htmlFor="maxExportFileSize">Maximum file size (MB)</Label>
                <Input
                  id="maxExportFileSize"
                  type="number"
                  min="1"
                  max="1000"
                  value={localSettings.maxExportFileSize}
                  onChange={(e) => updateSetting('maxExportFileSize', parseInt(e.target.value) || 100)}
                  disabled={disabled}
                  className="w-24"
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* TheAudioDB Data Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">TheAudioDB Data Inclusion</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDescriptions"
                checked={localSettings.includeDescriptions}
                onCheckedChange={(checked) => updateSetting('includeDescriptions', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="includeDescriptions" className="text-sm">
                Include track descriptions
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeThumbnails"
                checked={localSettings.includeThumbnails}
                onCheckedChange={(checked) => updateSetting('includeThumbnails', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="includeThumbnails" className="text-sm">
                Include thumbnail images
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeVideos"
                checked={localSettings.includeVideos}
                onCheckedChange={(checked) => updateSetting('includeVideos', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="includeVideos" className="text-sm">
                Include video URLs
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeAlbumInfo"
                checked={localSettings.includeAlbumInfo}
                onCheckedChange={(checked) => updateSetting('includeAlbumInfo', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="includeAlbumInfo" className="text-sm">
                Include album information
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeMusicBrainzIds"
                checked={localSettings.includeMusicBrainzIds}
                onCheckedChange={(checked) => updateSetting('includeMusicBrainzIds', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="includeMusicBrainzIds" className="text-sm">
                Include MusicBrainz IDs
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Logging and Reports */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Logging and Reports</h4>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generateLogFiles"
                checked={localSettings.generateLogFiles}
                onCheckedChange={(checked) => updateSetting('generateLogFiles', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="generateLogFiles" className="text-sm">
                Generate log files during processing
              </Label>
            </div>
            
            {localSettings.generateLogFiles && (
              <div className="space-y-3 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="logLevel">Log detail level</Label>
                  <Select
                    value={localSettings.logLevel}
                    onValueChange={(value) => updateSetting('logLevel', value as any)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic - Errors only</SelectItem>
                      <SelectItem value="detailed">Detailed - Errors and progress</SelectItem>
                      <SelectItem value="verbose">Verbose - All operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeSummaryReports"
                    checked={localSettings.includeSummaryReports}
                    onCheckedChange={(checked) => updateSetting('includeSummaryReports', checked as boolean)}
                    disabled={disabled}
                  />
                  <Label htmlFor="includeSummaryReports" className="text-sm">
                    Include summary reports
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoDownloadReports"
                    checked={localSettings.autoDownloadReports}
                    onCheckedChange={(checked) => updateSetting('autoDownloadReports', checked as boolean)}
                    disabled={disabled}
                  />
                  <Label htmlFor="autoDownloadReports" className="text-sm">
                    Auto-download reports with exports
                  </Label>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Processing Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Processing Settings</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchSize">Batch size</Label>
              <Input
                id="batchSize"
                type="number"
                min="1"
                max="200"
                value={localSettings.batchSize}
                onChange={(e) => updateSetting('batchSize', parseInt(e.target.value) || 50)}
                disabled={disabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="requestDelay">Request delay (ms)</Label>
              <Input
                id="requestDelay"
                type="number"
                min="500"
                max="5000"
                value={localSettings.requestDelay}
                onChange={(e) => updateSetting('requestDelay', parseInt(e.target.value) || 1000)}
                disabled={disabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxRetries">Max retries</Label>
              <Input
                id="maxRetries"
                type="number"
                min="0"
                max="10"
                value={localSettings.maxRetries}
                onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value) || 3)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Data Quality Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Data Quality</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="validateOnImport"
                checked={localSettings.validateOnImport}
                onCheckedChange={(checked) => updateSetting('validateOnImport', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="validateOnImport" className="text-sm">
                Validate data on import
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="removeDuplicates"
                checked={localSettings.removeDuplicates}
                onCheckedChange={(checked) => updateSetting('removeDuplicates', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="removeDuplicates" className="text-sm">
                Remove duplicate entries
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="normalizeArtistNames"
                checked={localSettings.normalizeArtistNames}
                onCheckedChange={(checked) => updateSetting('normalizeArtistNames', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="normalizeArtistNames" className="text-sm">
                Normalize artist names
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipEmptyRecords"
                checked={localSettings.skipEmptyRecords}
                onCheckedChange={(checked) => updateSetting('skipEmptyRecords', checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="skipEmptyRecords" className="text-sm">
                Skip empty records
              </Label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
          
          <Button
            onClick={exportSettings}
            disabled={disabled}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Settings
          </Button>
          
          <Button
            onClick={handleReset}
            disabled={disabled}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/30">
          <p>• File size limits help prevent browser memory issues with large datasets</p>
          <p>• TheAudioDB settings control which fields are included in requests and exports</p>
          <p>• Higher batch sizes are faster but may trigger rate limits</p>
          <p>• Log files and reports are automatically timestamped</p>
        </div>
      </CardContent>
    </Card>
  );
};
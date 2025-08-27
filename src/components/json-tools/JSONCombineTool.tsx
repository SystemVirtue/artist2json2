import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Upload, Download, Combine, FileText, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { JSONManagementService, CombineOptions } from "@/services/jsonManagementService";
import { ArtistData } from "@/pages/Index";

interface FileInfo {
  id: string;
  name: string;
  data: any[];
  size: string;
  records: number;
}

interface JSONCombineToolProps {
  currentData: ArtistData[];
  onDataUpdate: (data: ArtistData[]) => void;
  disabled?: boolean;
}

export const JSONCombineTool = ({ currentData, onDataUpdate, disabled }: JSONCombineToolProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileList, setFileList] = useState<FileInfo[]>([]);
  const [options, setOptions] = useState<CombineOptions>({
    mergeStrategy: 'append',
    conflictResolution: 'keep_first'
  });
  const [isCombining, setIsCombining] = useState(false);

  // Add current data as a file option
  const addCurrentData = () => {
    if (!currentData.length) {
      toast({
        title: "No Current Data",
        description: "No data available in current session",
        variant: "destructive"
      });
      return;
    }

    const currentExists = fileList.some(file => file.id === 'current');
    if (currentExists) {
      toast({
        title: "Already Added",
        description: "Current data is already in the list",
        variant: "destructive"
      });
      return;
    }

    const currentFile: FileInfo = {
      id: 'current',
      name: 'Current Session Data',
      data: currentData,
      size: calculateFileSize(currentData),
      records: currentData.length
    };

    setFileList(prev => [...prev, currentFile]);
    
    toast({
      title: "Current Data Added",
      description: `Added ${currentData.length} records from current session`,
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: FileInfo[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!JSONManagementService.isFileSizeAcceptable(file)) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds size limit`,
          variant: "destructive"
        });
        continue;
      }

      try {
        const content = await file.text();
        const parsed = JSON.parse(content);
        
        let dataArray: any[] = [];
        
        if (Array.isArray(parsed)) {
          dataArray = parsed;
        } else if (parsed.data && Array.isArray(parsed.data)) {
          dataArray = parsed.data;
        } else {
          toast({
            title: "Invalid Format",
            description: `${file.name} does not contain a valid array`,
            variant: "destructive"
          });
          continue;
        }

        const fileInfo: FileInfo = {
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          data: dataArray,
          size: calculateFileSize(dataArray),
          records: dataArray.length
        };

        newFiles.push(fileInfo);
        
      } catch (error) {
        toast({
          title: "Parse Error",
          description: `Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      }
    }

    if (newFiles.length > 0) {
      setFileList(prev => [...prev, ...newFiles]);
      toast({
        title: "Files Added",
        description: `Successfully added ${newFiles.length} file(s)`,
      });
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFileList(prev => prev.filter(file => file.id !== id));
  };

  const calculateFileSize = (data: any[]): string => {
    const jsonString = JSON.stringify(data);
    const bytes = new Blob([jsonString]).size;
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCombine = async () => {
    if (fileList.length < 2) {
      toast({
        title: "Insufficient Files",
        description: "At least 2 files are required to combine",
        variant: "destructive"
      });
      return;
    }

    setIsCombining(true);
    
    try {
      toast({
        title: "Combining Files",
        description: `Combining ${fileList.length} files using ${options.mergeStrategy} strategy...`,
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataArrays = fileList.map(file => file.data);
      const combined = JSONManagementService.combineJSONFiles(dataArrays, options);
      
      const filename = `Combined_${fileList.length}files_${new Date().toISOString().split('T')[0]}.json`;
      const content = JSON.stringify(combined, null, 2);
      
      JSONManagementService.downloadFile(content, filename);
      
      // Optionally update current data
      onDataUpdate(combined);
      
      const totalOriginalRecords = fileList.reduce((sum, file) => sum + file.records, 0);
      
      toast({
        title: "Files Combined Successfully",
        description: `Combined ${totalOriginalRecords} records into ${combined.length} records. File: ${filename}`,
      });
      
    } catch (error) {
      toast({
        title: "Combine Error",
        description: error instanceof Error ? error.message : "Failed to combine files",
        variant: "destructive"
      });
    } finally {
      setIsCombining(false);
    }
  };

  const updateOption = <K extends keyof CombineOptions>(
    key: K, 
    value: CombineOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const totalRecords = fileList.reduce((sum, file) => sum + file.records, 0);
  const estimatedCombinedSize = calculateFileSize(
    fileList.flatMap(file => file.data.slice(0, 10)) // Estimate from sample
  );

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Select Files to Combine</CardTitle>
          </div>
          <CardDescription>
            Add multiple JSON files to combine into a single dataset
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isCombining}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add JSON Files
            </Button>
            
            <Button
              onClick={addCurrentData}
              disabled={disabled || isCombining || !currentData.length}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Current Data
            </Button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
            multiple
            style={{ display: 'none' }}
          />

          {/* File List */}
          {fileList.length > 0 && (
            <ScrollArea className="h-[200px] border rounded-lg p-4">
              <div className="space-y-3">
                {fileList.map((file, index) => (
                  <div key={file.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {file.name}
                          </span>
                          {file.id === 'current' && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {file.records} records • {file.size}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => removeFile(file.id)}
                        disabled={disabled || isCombining}
                        size="sm"
                        variant="outline"
                        className="ml-2"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {index < fileList.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Combine Options */}
      {fileList.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Combine className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Combination Strategy</CardTitle>
            </div>
            <CardDescription>
              Configure how files should be merged together
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Merge Strategy</Label>
                <Select
                  value={options.mergeStrategy}
                  onValueChange={(value) => updateOption('mergeStrategy', value as any)}
                  disabled={disabled || isCombining}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">Append - Add all records together</SelectItem>
                    <SelectItem value="merge">Merge - Combine and deduplicate</SelectItem>
                    <SelectItem value="replace">Replace - Use last file only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {options.mergeStrategy === 'merge' && (
                <div className="space-y-2">
                  <Label>Conflict Resolution</Label>
                  <Select
                    value={options.conflictResolution}
                    onValueChange={(value) => updateOption('conflictResolution', value as any)}
                    disabled={disabled || isCombining}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keep_first">Keep First - Preserve original</SelectItem>
                      <SelectItem value="keep_last">Keep Last - Use newer data</SelectItem>
                      <SelectItem value="combine">Combine - Merge properties</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-muted/30 rounded">
                <div className="font-semibold">{fileList.length}</div>
                <div className="text-xs text-muted-foreground">Files</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded">
                <div className="font-semibold">{totalRecords}</div>
                <div className="text-xs text-muted-foreground">Total Records</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded">
                <div className="font-semibold">~{estimatedCombinedSize}</div>
                <div className="text-xs text-muted-foreground">Est. Size</div>
              </div>
            </div>

            {options.mergeStrategy === 'merge' && (
              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Merge Strategy Note</p>
                  <p className="text-muted-foreground">
                    Records are matched by primary identifier (artistName, name, or id). 
                    Conflict resolution determines how duplicate records are handled.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Combine Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleCombine}
          disabled={disabled || fileList.length < 2 || isCombining}
          className="flex items-center gap-2"
          size="lg"
        >
          <Download className="h-4 w-4" />
          {isCombining ? 'Combining...' : 'Combine and Export'}
        </Button>
        
        {fileList.length > 1 && (
          <div className="flex items-center text-sm text-muted-foreground">
            Ready to combine {fileList.length} files with {totalRecords} total records
          </div>
        )}
      </div>

      {/* Help */}
      {fileList.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No Files Selected</p>
          <p className="text-sm">
            Add JSON files or current session data to start combining
          </p>
        </div>
      )}
    </div>
  );
};
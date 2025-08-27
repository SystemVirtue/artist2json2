import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, Trash2, RefreshCw, Info, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { JSONManagementService, JSONField, JSONStructure } from "@/services/jsonManagementService";
import { ArtistData } from "@/pages/Index";

interface JSONModifyToolProps {
  data: ArtistData[];
  onDataUpdate: (data: ArtistData[]) => void;
  disabled?: boolean;
}

export const JSONModifyTool = ({ data, onDataUpdate, disabled }: JSONModifyToolProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [structure, setStructure] = useState<JSONStructure | null>(null);
  const [modifiedFields, setModifiedFields] = useState<JSONField[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Analyze current data structure when data changes
  useEffect(() => {
    if (data && data.length > 0) {
      analyzeData(data);
    } else {
      setStructure(null);
      setModifiedFields([]);
    }
  }, [data]);

  const analyzeData = async (jsonData: any[]) => {
    setIsAnalyzing(true);
    try {
      // Simulate processing time for large datasets
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const analyzed = JSONManagementService.analyzeJSONStructure(jsonData);
      setStructure(analyzed);
      setModifiedFields([...analyzed.fields]);
      
      toast({
        title: "JSON Structure Analyzed",
        description: `Found ${analyzed.fields.length} unique fields in ${analyzed.totalRecords} records`,
      });
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: error instanceof Error ? error.message : "Failed to analyze JSON structure",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!JSONManagementService.isFileSizeAcceptable(file)) {
      toast({
        title: "File Too Large",
        description: `File size exceeds ${JSONManagementService.getMaxFileSize() / (1024 * 1024)}MB limit`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      const content = await file.text();
      const parsed = JSON.parse(content);
      
      let dataArray: any[] = [];
      
      // Handle different JSON formats
      if (Array.isArray(parsed)) {
        dataArray = parsed;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        dataArray = parsed.data; // Export format
      } else {
        throw new Error("JSON file must contain an array or have a 'data' property with an array");
      }

      await analyzeData(dataArray);
      onDataUpdate(dataArray);
      
    } catch (error) {
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import JSON file",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    console.log('Field toggle:', fieldKey, 'checked:', checked);
    setModifiedFields(prev => {
      const updated = prev.map(field => 
        field.key === fieldKey ? { ...field, isSelected: checked } : field
      );
      console.log('Updated fields:', updated.map(f => ({ key: f.key, isSelected: f.isSelected })));
      return updated;
    });
  };

  const handleSelectAll = () => {
    const allSelected = modifiedFields.every(field => field.isSelected);
    setModifiedFields(prev => 
      prev.map(field => ({ ...field, isSelected: !allSelected }))
    );
  };

  const handleSelectByType = (type: string) => {
    setModifiedFields(prev => 
      prev.map(field => 
        field.type === type ? { ...field, isSelected: !field.isSelected } : field
      )
    );
  };

  const exportModifiedJSON = () => {
    if (!structure || !data.length) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Export - All modified fields:', modifiedFields.map(f => ({ key: f.key, isSelected: f.isSelected })));
      const selectedFields = modifiedFields.filter(field => field.isSelected);
      console.log('Export - Selected fields:', selectedFields.map(f => f.key));
      console.log('Export - Original data sample:', data[0]);
      
      const modifiedData = JSONManagementService.createModifiedJSON(data, modifiedFields);
      console.log('Export - Modified data sample:', modifiedData[0]);
      
      // Update the in-memory data to reflect the changes
      onDataUpdate(modifiedData);
      
      const filename = `Modified_${new Date().toISOString().split('T')[0]}.json`;
      const content = JSON.stringify(modifiedData, null, 2);
      
      JSONManagementService.downloadFile(content, filename);
      
      toast({
        title: "Changes Applied & JSON Exported",
        description: `Applied changes and exported with ${selectedFields.length} fields. File: ${filename}`,
      });
      
    } catch (error) {
      toast({
        title: "Export Error",
        description: error instanceof Error ? error.message : "Failed to export modified JSON",
        variant: "destructive"
      });
    }
  };

  const clearData = () => {
    setStructure(null);
    setModifiedFields([]);
    onDataUpdate([]);
    
    toast({
      title: "Data Cleared",
      description: "All data has been cleared from memory",
    });
  };

  const filteredFields = modifiedFields.filter(field =>
    field.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (field.description && field.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedCount = modifiedFields.filter(field => field.isSelected).length;
  const totalCount = modifiedFields.length;

  return (
    <div className="space-y-6">
      {/* Import/Current Data Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isAnalyzing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import JSON File
          </Button>
          
          {data.length > 0 && (
            <Button
              onClick={() => analyzeData(data)}
              disabled={disabled || isAnalyzing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Re-analyze Current Data
            </Button>
          )}
          
          {data.length > 0 && (
            <Button
              onClick={clearData}
              disabled={disabled}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Data
            </Button>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileImport}
          accept=".json"
          style={{ display: 'none' }}
        />

        {isAnalyzing && (
          <div className="flex items-center gap-2">
            <Progress value={undefined} className="flex-1" />
            <span className="text-sm text-muted-foreground">Analyzing JSON structure...</span>
          </div>
        )}
      </div>

      {/* Structure Analysis Results */}
      {structure && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-lg font-semibold">{structure.totalRecords}</div>
              <div className="text-xs text-muted-foreground">Records</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-lg font-semibold">{totalCount}</div>
              <div className="text-xs text-muted-foreground">Fields</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-lg font-semibold">{selectedCount}</div>
              <div className="text-xs text-muted-foreground">Selected</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-lg font-semibold">{structure.estimatedSize}</div>
              <div className="text-xs text-muted-foreground">Est. Size</div>
            </div>
          </div>

          {/* Field Selection Controls */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Input
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:max-w-xs"
              />
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleSelectAll}
                  size="sm"
                  variant="outline"
                >
                  {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
                </Button>
                
                {Object.keys(structure.dataTypes).map(type => (
                  <Button
                    key={type}
                    onClick={() => handleSelectByType(type)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Toggle {type} ({structure.dataTypes[type]})
                  </Button>
                ))}
              </div>
            </div>

            {/* Field List */}
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-3">
                {filteredFields.map((field, index) => (
                  <div key={field.key} className="space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`field-${index}`}
                        checked={field.isSelected}
                        onCheckedChange={(checked) => 
                          handleFieldToggle(field.key, checked as boolean)
                        }
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label 
                            htmlFor={`field-${index}`}
                            className="font-mono text-sm font-medium cursor-pointer"
                          >
                            {field.key}
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            {field.type}
                          </Badge>
                        </div>
                        
                        {field.description && (
                          <div className="flex items-start gap-1 mt-1">
                            <Info className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              {field.description}
                            </p>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground font-mono mt-1 truncate">
                          Sample: {JSON.stringify(field.sampleValue)}
                        </div>
                      </div>
                    </div>
                    
                    {index < filteredFields.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Export Controls */}
          <div className="flex gap-3">
            <Button
              onClick={exportModifiedJSON}
              disabled={disabled || selectedCount === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Apply Changes & Export Modified JSON
            </Button>
            
            <div className="flex items-center text-sm text-muted-foreground">
              {selectedCount} of {totalCount} fields selected
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!structure && !isAnalyzing && (
        <div className="text-center text-muted-foreground py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No JSON Data Loaded</p>
          <p className="text-sm">
            Import a JSON file or use data from the main application to start customizing fields
          </p>
        </div>
      )}
    </div>
  );
};
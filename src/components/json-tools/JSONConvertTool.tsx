import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Download, Settings, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { JSONManagementService, SQLConversionOptions } from "@/services/jsonManagementService";
import { ImportExportService } from "@/services/importExportService";

interface JSONConvertToolProps {
  data: any[];
  disabled?: boolean;
}

export const JSONConvertTool = ({ data, disabled }: JSONConvertToolProps) => {
  const { toast } = useToast();
  const [outputFormat, setOutputFormat] = useState<'sql' | 'csv' | 'json'>('sql');
  const [csvFormat, setCsvFormat] = useState<'standard' | 'videolist'>('standard');
  const [options, setOptions] = useState<SQLConversionOptions>({
    database: 'mysql',
    tableName: 'music_video_data',
    includeCreateTable: true,
    includeInserts: true,
    batchSize: 1000
  });
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = async () => {
    if (!data.length) {
      toast({
        title: "No Data",
        description: "No data available to convert",
        variant: "destructive"
      });
      return;
    }

    if (outputFormat === 'sql' && !options.tableName.trim()) {
      toast({
        title: "Invalid Configuration", 
        description: "Table name is required for SQL export",
        variant: "destructive"
      });
      return;
    }

    setIsConverting(true);
    
    try {
      let content: string;
      let filename: string;
      let mimeType: string;
      
      const dateStr = new Date().toISOString().split('T')[0];
      
      if (outputFormat === 'sql') {
        toast({
          title: "Converting to SQL",
          description: `Converting ${data.length} records to ${options.database.toUpperCase()}...`,
        });
        
        content = JSONManagementService.convertToSQL(data, options);
        filename = `${options.tableName}_${options.database}_${dateStr}.sql`;
        mimeType = 'text/sql';
        
        toast({
          title: "SQL Export Complete",
          description: `${options.database.toUpperCase()} script exported as ${filename}`,
        });
        
      } else if (outputFormat === 'csv') {
        toast({
          title: "Converting to CSV",
          description: `Converting ${data.length} records to CSV...`,
        });
        
        if (csvFormat === 'videolist') {
          content = ImportExportService.exportAllVideosCSV(data);
          filename = `all-videos-list_${dateStr}.csv`;
          
          toast({
            title: "CSV Export Complete", 
            description: `All videos list exported as ${filename}`,
          });
        } else {
          content = JSONManagementService.convertToCSV(data);
          filename = `music_video_data_${dateStr}.csv`;
          
          toast({
            title: "CSV Export Complete", 
            description: `Standard CSV file exported as ${filename}`,
          });
        }
        
        mimeType = 'text/csv';
      } else if (outputFormat === 'json') {
        toast({
          title: "Converting to JSON",
          description: `Converting ${data.length} records to formatted JSON...`,
        });
        
        content = JSONManagementService.convertToJSON(data);
        filename = `music_video_data_${dateStr}.json`;
        mimeType = 'application/json';
        
        toast({
          title: "JSON Export Complete",
          description: `JSON file exported as ${filename}`,
        });
      } else {
        throw new Error("Invalid output format");
      }

      // Simulate processing time for large datasets
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!content) {
        throw new Error("Failed to generate output");
      }

      JSONManagementService.downloadFile(content, filename, mimeType);
      
    } catch (error) {
      toast({
        title: "Conversion Error",
        description: error instanceof Error ? error.message : "Failed to convert data",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  const updateOption = <K extends keyof SQLConversionOptions>(
    key: K, 
    value: SQLConversionOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const databaseInfo = {
    mysql: {
      name: "MySQL",
      description: "MySQL 5.7+ compatible SQL with JSON data type support",
      features: ["Batch inserts", "JSON columns", "UTF8 charset"]
    },
    postgresql: {
      name: "PostgreSQL", 
      description: "PostgreSQL 9.4+ compatible SQL with JSONB support",
      features: ["Batch inserts", "JSONB columns", "Advanced indexing"]
    },
    sqlserver: {
      name: "SQL Server",
      description: "Microsoft SQL Server 2016+ compatible SQL",
      features: ["Individual inserts", "NVARCHAR(MAX) for JSON", "Full Unicode support"]
    },
    sqlite: {
      name: "SQLite",
      description: "SQLite 3.x compatible SQL with JSON functions",
      features: ["Batch inserts", "JSON support", "Lightweight database"]
    }
  };

  const currentDbInfo = databaseInfo[options.database];

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Export Settings</CardTitle>
          </div>
          <CardDescription>
            Configure output format and conversion options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outputFormat">Output Format</Label>
              <Select
                value={outputFormat}
                onValueChange={(value) => setOutputFormat(value as 'sql' | 'csv' | 'json')}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select output format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sql">SQL Script</SelectItem>
                  <SelectItem value="csv">CSV File</SelectItem>
                  <SelectItem value="json">JSON File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {outputFormat === 'csv' && (
              <div className="space-y-2">
                <Label htmlFor="csvFormat">CSV Format</Label>
                <Select
                  value={csvFormat}
                  onValueChange={(value) => setCsvFormat(value as 'standard' | 'videolist')}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select CSV format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Artist Data</SelectItem>
                    <SelectItem value="videolist">All Videos Text List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {outputFormat === 'sql' && (
              <div className="space-y-2">
                <Label htmlFor="database">Target Database</Label>
                <Select
                  value={options.database}
                  onValueChange={(value) => updateOption('database', value as any)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select database type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="sqlserver">SQL Server</SelectItem>
                    <SelectItem value="sqlite">SQLite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {outputFormat === 'sql' && (
              <div className="space-y-2">
                <Label htmlFor="tableName">Table Name</Label>
                <Input
                  id="tableName"
                  value={options.tableName}
                  onChange={(e) => updateOption('tableName', e.target.value)}
                  disabled={disabled}
                  placeholder="table_name"
                  className="font-mono"
                />
              </div>
            )}
          </div>

          {outputFormat === 'sql' && (
            <>
              <div className="space-y-3">
                <Label>SQL Components</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCreateTable"
                      checked={options.includeCreateTable}
                      onCheckedChange={(checked) => updateOption('includeCreateTable', checked as boolean)}
                      disabled={disabled}
                    />
                    <Label htmlFor="includeCreateTable" className="text-sm">
                      Include CREATE TABLE statement
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeInserts"
                      checked={options.includeInserts}
                      onCheckedChange={(checked) => updateOption('includeInserts', checked as boolean)}
                      disabled={disabled}
                    />
                    <Label htmlFor="includeInserts" className="text-sm">
                      Include INSERT statements
                    </Label>
                  </div>
                </div>
              </div>

              {options.includeInserts && (
                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Size (records per INSERT)</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    min="1"
                    max="10000"
                    value={options.batchSize}
                    onChange={(e) => updateOption('batchSize', parseInt(e.target.value) || 1000)}
                    disabled={disabled}
                    placeholder="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Larger batches are faster but may hit database limits. SQL Server always uses individual inserts.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Output Format Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {outputFormat === 'sql' ? `${currentDbInfo.name} Output` : 
               outputFormat === 'csv' ? (csvFormat === 'videolist' ? 'All Videos CSV Output' : 'Standard CSV Output') : 
               'JSON Output'}
            </CardTitle>
          </div>
          <CardDescription>
            {outputFormat === 'sql' ? currentDbInfo.description :
             outputFormat === 'csv' ? (csvFormat === 'videolist' ? 
               'Individual video tracks with artist name, track title, and video URL on each row' :
               'Comma-separated values format compatible with spreadsheet applications') :
             'Pretty-formatted JSON file with proper indentation'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Features:</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {outputFormat === 'sql' ? currentDbInfo.features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                )) : outputFormat === 'csv' ? (
                  <>
                    {csvFormat === 'videolist' ? (
                      <>
                        <Badge variant="secondary" className="text-xs">Track per row</Badge>
                        <Badge variant="secondary" className="text-xs">Artist + Track + URL</Badge>
                        <Badge variant="secondary" className="text-xs">Video listing format</Badge>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary" className="text-xs">Excel compatible</Badge>
                        <Badge variant="secondary" className="text-xs">Flattened structure</Badge>
                        <Badge variant="secondary" className="text-xs">UTF-8 encoding</Badge>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="text-xs">Pretty formatted</Badge>
                    <Badge variant="secondary" className="text-xs">Full structure preserved</Badge>
                    <Badge variant="secondary" className="text-xs">Human readable</Badge>
                  </>
                )}
              </div>
            </div>
            
            {data.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <div className="text-center p-2 bg-muted/30 rounded">
                  <div className="font-semibold">{data.length}</div>
                  <div className="text-xs text-muted-foreground">Records</div>
                </div>
                {outputFormat === 'sql' && (
                  <>
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <div className="font-semibold">{options.batchSize}</div>
                      <div className="text-xs text-muted-foreground">Batch Size</div>
                    </div>
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <div className="font-semibold">
                        {Math.ceil(data.length / options.batchSize)}
                      </div>
                      <div className="text-xs text-muted-foreground">Batches</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Convert Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleConvert}
          disabled={disabled || !data.length || isConverting || (outputFormat === 'sql' && !options.tableName.trim())}
          className="flex items-center gap-2"
          size="lg"
        >
          <Download className="h-4 w-4" />
          {isConverting ? 'Converting...' : 
           outputFormat === 'sql' ? `Export ${currentDbInfo.name} SQL` :
           outputFormat === 'csv' ? 'Export CSV File' : 'Export JSON File'}
        </Button>
        
        {data.length > 0 && (
          <div className="flex items-center text-sm text-muted-foreground">
            Ready to convert {data.length} records to {
              outputFormat === 'sql' ? currentDbInfo.name : 
              outputFormat === 'csv' ? 'CSV format' : 'JSON format'
            }
          </div>
        )}
      </div>

      {/* Help */}
      {!data.length && (
        <div className="text-center text-muted-foreground py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No Data Available</p>
          <p className="text-sm">
            Load JSON data to export in your preferred format
          </p>
        </div>
      )}
    </div>
  );
};
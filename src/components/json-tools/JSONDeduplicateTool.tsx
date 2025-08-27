import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Trash2, CheckCircle2, AlertTriangle, RefreshCw, FileText, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { JSONManagementService } from "@/services/jsonManagementService";

interface JSONDeduplicateToolProps {
  data: any[];
  onDataUpdate: (data: any[]) => void;
  disabled?: boolean;
}

interface DeduplicationResult {
  originalCount: number;
  deduplicatedCount: number;
  removedCount: number;
  duplicateKeys: string[];
  deduplicatedData: any[];
}

export const JSONDeduplicateTool = ({ data, onDataUpdate, disabled }: JSONDeduplicateToolProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DeduplicationResult | null>(null);

  const hasData = data && data.length > 0;
  const hasDuplicates = result && result.removedCount > 0;

  const deduplicateData = async () => {
    if (!hasData) {
      toast({
        title: "No Data",
        description: "No data available to deduplicate",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate processing time for large datasets
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const deduplicationResult = JSONManagementService.deduplicateJSON(data);
      setResult(deduplicationResult);
      
      if (deduplicationResult.removedCount > 0) {
        toast({
          title: "Duplicates Found",
          description: `Found and prepared to remove ${deduplicationResult.removedCount} duplicate records`,
        });
      } else {
        toast({
          title: "No Duplicates Found",
          description: "All records are unique, no deduplication needed",
        });
      }
      
    } catch (error) {
      toast({
        title: "Deduplication Error",
        description: error instanceof Error ? error.message : "Failed to deduplicate JSON data",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyDeduplication = () => {
    if (!result || !result.deduplicatedData) return;

    onDataUpdate(result.deduplicatedData);
    
    toast({
      title: "Data Deduplicated",
      description: `Removed ${result.removedCount} duplicate records. Dataset now contains ${result.deduplicatedCount} unique records.`,
    });

    // Reset result after applying
    setResult(null);
  };

  const downloadDuplicatesReport = () => {
    if (!result) return;

    const report = generateDuplicatesReport(result);
    const filename = `duplicates-report-${new Date().toISOString().split('T')[0]}.txt`;
    
    JSONManagementService.downloadFile(report, filename, 'text/plain');
    
    toast({
      title: "Report Downloaded",
      description: `Duplicates report saved as ${filename}`,
    });
  };

  const generateDuplicatesReport = (result: DeduplicationResult): string => {
    const timestamp = new Date().toISOString();
    
    return `
DEDUPLICATION REPORT
Generated: ${timestamp}

SUMMARY
=======
Original Records: ${result.originalCount}
Unique Records: ${result.deduplicatedCount}
Duplicates Found: ${result.removedCount}
Duplicate Rate: ${((result.removedCount / result.originalCount) * 100).toFixed(2)}%

DUPLICATE IDENTIFICATION KEYS
============================
${result.duplicateKeys.length > 0 ? result.duplicateKeys.map((key, index) => `${index + 1}. ${key}`).join('\n') : 'No specific duplicate keys identified (full record matching used)'}

RECOMMENDATIONS
===============
${result.removedCount > 0 ? '• Apply deduplication to clean your dataset' : '• No action needed - all records are unique'}
${result.removedCount > 0 ? '• Review duplicate keys to understand data quality issues' : ''}
${result.duplicateKeys.length > 0 ? '• Consider implementing validation to prevent future duplicates' : ''}
`.trim();
  };

  const calculateProgress = (): number => {
    if (!result) return 0;
    return ((result.deduplicatedCount / result.originalCount) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Deduplication Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={deduplicateData}
          disabled={disabled || !hasData || isProcessing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          {isProcessing ? 'Analyzing...' : 'Find Duplicates'}
        </Button>
        
        {result && hasDuplicates && (
          <>
            <Button
              onClick={applyDeduplication}
              disabled={disabled}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Remove {result.removedCount} Duplicates
            </Button>
            
            <Button
              onClick={downloadDuplicatesReport}
              disabled={disabled}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </>
        )}
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analyzing {data.length} records for duplicates...</span>
            </div>
            <Progress value={undefined} />
          </CardContent>
        </Card>
      )}

      {/* Deduplication Results */}
      {result && !isProcessing && (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {hasDuplicates ? (
                  <AlertTriangle className="h-5 w-5 text-warning" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                )}
                <CardTitle className={`text-lg ${hasDuplicates ? 'text-warning' : 'text-success'}`}>
                  {hasDuplicates ? 'Duplicates Found' : 'No Duplicates Found'}
                </CardTitle>
              </div>
              <CardDescription>
                Duplicate record analysis and removal recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Data Uniqueness</span>
                  <span>{calculateProgress().toFixed(1)}%</span>
                </div>
                <Progress value={calculateProgress()} />
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-semibold">{result.originalCount}</div>
                  <div className="text-xs text-muted-foreground">Original Records</div>
                </div>
                <div className="text-center p-3 bg-success/10 rounded">
                  <div className="text-lg font-semibold text-success">{result.deduplicatedCount}</div>
                  <div className="text-xs text-muted-foreground">Unique Records</div>
                </div>
                <div className="text-center p-3 bg-warning/10 rounded">
                  <div className="text-lg font-semibold text-warning">{result.removedCount}</div>
                  <div className="text-xs text-muted-foreground">Duplicates Found</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duplicate Details */}
          {hasDuplicates && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Duplicate Analysis</CardTitle>
                <CardDescription>
                  Details about found duplicates and deduplication strategy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-warning mb-1">
                          Duplicate Records Detected
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Found {result.removedCount} duplicate records out of {result.originalCount} total records. 
                          The deduplication process will keep the first occurrence of each duplicate set and remove subsequent duplicates.
                        </p>
                      </div>
                    </div>
                  </div>

                  {result.duplicateKeys.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Duplicate Identification Criteria:</h4>
                      <ScrollArea className="h-24 border rounded p-2">
                        <div className="space-y-1">
                          {result.duplicateKeys.map((key, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {key}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  <div className="p-3 bg-muted/30 rounded text-sm">
                    <p className="font-medium mb-1">Deduplication Strategy:</p>
                    <p className="text-muted-foreground">
                      • Records are compared using their full content or key fields
                      <br />
                      • First occurrence of each unique record is preserved
                      <br />
                      • Subsequent duplicates are marked for removal
                      <br />
                      • Original data order is maintained for non-duplicate records
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {!hasDuplicates && (
            <Card className="border-success/20 bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">All Records Are Unique!</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  All {result.originalCount} records in your dataset are unique. No deduplication is necessary.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Help */}
      {!hasData && (
        <div className="text-center text-muted-foreground py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No Data to Deduplicate</p>
          <p className="text-sm">
            Load JSON data to identify and remove duplicate records
          </p>
        </div>
      )}
    </div>
  );
};
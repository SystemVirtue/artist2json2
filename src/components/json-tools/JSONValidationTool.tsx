import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, XCircle, Download, RefreshCw, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { JSONManagementService, ValidationResult } from "@/services/jsonManagementService";

interface JSONValidationToolProps {
  data: any[];
  disabled?: boolean;
}

export const JSONValidationTool = ({ data, disabled }: JSONValidationToolProps) => {
  const { toast } = useToast();
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [autoValidate, setAutoValidate] = useState(true);

  // Auto-validate when data changes
  useEffect(() => {
    if (autoValidate && data && data.length > 0) {
      validateData();
    } else {
      setValidationResult(null);
    }
  }, [data, autoValidate]);

  const validateData = async () => {
    if (!data.length) {
      toast({
        title: "No Data",
        description: "No data available to validate",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    
    try {
      // Simulate processing time for large datasets
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const result = JSONManagementService.validateJSON(data);
      setValidationResult(result);
      
      if (result.isValid) {
        toast({
          title: "Validation Complete",
          description: `${result.summary.validRecords} records validated successfully`,
        });
      } else {
        toast({
          title: "Validation Issues Found",
          description: `Found ${result.errors.length} errors and ${result.warnings.length} warnings`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Failed to validate JSON data",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const downloadReport = () => {
    if (!validationResult) return;

    const report = generateValidationReport(validationResult);
    const filename = `validation-report-${new Date().toISOString().split('T')[0]}.txt`;
    
    JSONManagementService.downloadFile(report, filename, 'text/plain');
    
    toast({
      title: "Report Downloaded",
      description: `Validation report saved as ${filename}`,
    });
  };

  const generateValidationReport = (result: ValidationResult): string => {
    const timestamp = new Date().toISOString();
    
    return `
JSON VALIDATION REPORT
Generated: ${timestamp}

SUMMARY
=======
Total Records: ${result.summary.totalRecords}
Valid Records: ${result.summary.validRecords}
Invalid Records: ${result.summary.invalidRecords}
Duplicate Records: ${result.summary.duplicates}
Overall Status: ${result.isValid ? 'VALID' : 'INVALID'}

STATISTICS
==========
Success Rate: ${((result.summary.validRecords / result.summary.totalRecords) * 100).toFixed(2)}%
Error Rate: ${((result.summary.invalidRecords / result.summary.totalRecords) * 100).toFixed(2)}%
Duplicate Rate: ${((result.summary.duplicates / result.summary.totalRecords) * 100).toFixed(2)}%

${result.errors.length > 0 ? `
ERRORS (${result.errors.length})
======
${result.errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}
` : ''}

${result.warnings.length > 0 ? `
WARNINGS (${result.warnings.length})
========
${result.warnings.map((warning, index) => `${index + 1}. ${warning}`).join('\n')}
` : ''}

RECOMMENDATIONS
===============
${result.summary.invalidRecords > 0 ? '• Fix validation errors before proceeding with data operations' : ''}
${result.summary.duplicates > 0 ? '• Consider removing or merging duplicate records' : ''}
${result.warnings.length > 0 ? '• Review warnings to improve data quality' : ''}
${result.isValid ? '• Data is valid and ready for use' : ''}
`.trim();
  };

  const getStatusIcon = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusColor = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-destructive';
    }
  };

  const getOverallStatus = (): 'valid' | 'warning' | 'error' => {
    if (!validationResult) return 'valid';
    if (!validationResult.isValid || validationResult.errors.length > 0) return 'error';
    if (validationResult.warnings.length > 0) return 'warning';
    return 'valid';
  };

  const calculateValidationProgress = (): number => {
    if (!validationResult) return 0;
    return (validationResult.summary.validRecords / validationResult.summary.totalRecords) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Validation Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={validateData}
          disabled={disabled || !data.length || isValidating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
          {isValidating ? 'Validating...' : 'Validate JSON'}
        </Button>
        
        {validationResult && (
          <Button
            onClick={downloadReport}
            disabled={disabled}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        )}
      </div>

      {/* Validation Progress */}
      {isValidating && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Validating {data.length} records...</span>
            </div>
            <Progress value={undefined} />
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResult && !isValidating && (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {getStatusIcon(getOverallStatus())}
                <CardTitle className={`text-lg ${getStatusColor(getOverallStatus())}`}>
                  Validation {validationResult.isValid ? 'Passed' : 'Failed'}
                </CardTitle>
              </div>
              <CardDescription>
                Data quality analysis and validation results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Data Quality Score</span>
                  <span>{calculateValidationProgress().toFixed(1)}%</span>
                </div>
                <Progress value={calculateValidationProgress()} />
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-semibold">{validationResult.summary.totalRecords}</div>
                  <div className="text-xs text-muted-foreground">Total Records</div>
                </div>
                <div className="text-center p-3 bg-success/10 rounded">
                  <div className="text-lg font-semibold text-success">{validationResult.summary.validRecords}</div>
                  <div className="text-xs text-muted-foreground">Valid Records</div>
                </div>
                <div className="text-center p-3 bg-destructive/10 rounded">
                  <div className="text-lg font-semibold text-destructive">{validationResult.summary.invalidRecords}</div>
                  <div className="text-xs text-muted-foreground">Invalid Records</div>
                </div>
                <div className="text-center p-3 bg-warning/10 rounded">
                  <div className="text-lg font-semibold text-warning">{validationResult.summary.duplicates}</div>
                  <div className="text-xs text-muted-foreground">Duplicates</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues Details */}
          {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Issues Found</CardTitle>
                <CardDescription>
                  Detailed list of validation errors and warnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {/* Errors */}
                    {validationResult.errors.map((error, index) => (
                      <div key={`error-${index}`}>
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <Badge variant="destructive" className="text-xs mb-1">
                              Error
                            </Badge>
                            <p className="text-sm">{error}</p>
                          </div>
                        </div>
                        {index < validationResult.errors.length - 1 && <Separator className="mt-3" />}
                      </div>
                    ))}

                    {/* Separator between errors and warnings */}
                    {validationResult.errors.length > 0 && validationResult.warnings.length > 0 && (
                      <Separator />
                    )}

                    {/* Warnings */}
                    {validationResult.warnings.map((warning, index) => (
                      <div key={`warning-${index}`}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <Badge variant="secondary" className="text-xs mb-1">
                              Warning
                            </Badge>
                            <p className="text-sm">{warning}</p>
                          </div>
                        </div>
                        {index < validationResult.warnings.length - 1 && <Separator className="mt-3" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {validationResult.isValid && validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
            <Card className="border-success/20 bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Perfect Data Quality!</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  All {validationResult.summary.totalRecords} records passed validation without any issues.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Help */}
      {!data.length && (
        <div className="text-center text-muted-foreground py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No Data to Validate</p>
          <p className="text-sm">
            Load JSON data to perform validation and quality analysis
          </p>
        </div>
      )}
    </div>
  );
};
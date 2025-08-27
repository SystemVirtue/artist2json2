import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Settings, Database, Combine, CheckCircle2, Trash2, Filter } from "lucide-react";
import { JSONModifyTool } from "./json-tools/JSONModifyTool";
import { JSONConvertTool } from "./json-tools/JSONConvertTool";
import { JSONCombineTool } from "./json-tools/JSONCombineTool";
import { JSONValidationTool } from "./json-tools/JSONValidationTool";
import { JSONDeduplicateTool } from "./json-tools/JSONDeduplicateTool";
import { JSONPostProcessingTool } from "./json-tools/JSONPostProcessingTool";
import { ArtistData } from "@/pages/Index";

interface JSONManagerSectionProps {
  currentData: ArtistData[];
  onDataUpdate: (data: ArtistData[]) => void;
  disabled?: boolean;
}

export const JSONManagerSection = ({ currentData, onDataUpdate, disabled }: JSONManagerSectionProps) => {
  const [activeTab, setActiveTab] = useState("modify");
  
  const hasData = currentData && currentData.length > 0;

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>JSON Management Tools</CardTitle>
          </div>
          {hasData && (
            <Badge variant="secondary" className="text-xs">
              {currentData.length} Records
            </Badge>
          )}
        </div>
        <CardDescription>
          Advanced tools for modifying, converting, combining, and validating JSON data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 grid-rows-2 h-auto gap-1">
            <TabsTrigger value="modify" className="flex items-center justify-center gap-2 px-4 py-3">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Modify</span>
            </TabsTrigger>
            <TabsTrigger value="convert" className="flex items-center justify-center gap-2 px-4 py-3">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Convert</span>
            </TabsTrigger>
            <TabsTrigger value="combine" className="flex items-center justify-center gap-2 px-4 py-3">
              <Combine className="h-4 w-4" />
              <span className="hidden sm:inline">Combine</span>
            </TabsTrigger>
            <TabsTrigger value="validate" className="flex items-center justify-center gap-2 px-4 py-3">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Validate</span>
            </TabsTrigger>
            <TabsTrigger value="deduplicate" className="flex items-center justify-center gap-2 px-4 py-3">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">De-Duplicate</span>
            </TabsTrigger>
            <TabsTrigger value="postprocess" className="flex items-center justify-center gap-2 px-4 py-3">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Post-Process</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="modify">
              <JSONModifyTool 
                data={currentData} 
                onDataUpdate={onDataUpdate}
                disabled={disabled}
              />
            </TabsContent>

            <TabsContent value="convert">
              <JSONConvertTool 
                data={currentData}
                disabled={disabled || !hasData}
              />
            </TabsContent>

            <TabsContent value="combine">
              <JSONCombineTool 
                currentData={currentData}
                onDataUpdate={onDataUpdate}
                disabled={disabled}
              />
            </TabsContent>

            <TabsContent value="validate">
              <JSONValidationTool 
                data={currentData}
                disabled={disabled || !hasData}
              />
            </TabsContent>

            <TabsContent value="deduplicate">
              <JSONDeduplicateTool 
                data={currentData}
                onDataUpdate={onDataUpdate}
                disabled={disabled}
              />
            </TabsContent>

            <TabsContent value="postprocess">
              <JSONPostProcessingTool 
                data={currentData}
                onDataUpdate={onDataUpdate}
                disabled={disabled}
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Redirect, Link } from "wouter";
import { CustomFieldsList } from "@/components/custom-fields/custom-fields-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Settings } from "lucide-react";

export default function CustomFieldsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("registration"); // "registration" or "camp"

  // Only organization owners and managers can access this page
  if (!user || !user.organizationId || !["camp_creator", "manager"].includes(user.role)) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/">
            <Button variant="ghost" className="flex items-center gap-1 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Custom Fields</h1>
          <p className="text-muted-foreground mt-1">
            Create reusable custom fields for your camps
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger 
              value="registration" 
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Registration Form Fields
            </TabsTrigger>
            <TabsTrigger 
              value="camp" 
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Camp Meta Fields
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="registration" className="space-y-6">
            <p className="text-muted-foreground">
              These fields will be available for participants to fill out during camp registration.
            </p>
            <div className="bg-card rounded-lg border p-6">
              <CustomFieldsList
                organizationId={user.organizationId}
                fieldSource="registration"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="camp" className="space-y-6">
            <p className="text-muted-foreground">
              These fields will be available for camp administrators to add extra information about camps.
            </p>
            <div className="bg-card rounded-lg border p-6">
              <CustomFieldsList
                organizationId={user.organizationId}
                fieldSource="camp"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
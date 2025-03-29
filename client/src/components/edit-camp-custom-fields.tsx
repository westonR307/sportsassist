import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camp } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { CampCustomFields } from "@/components/custom-fields/camp-custom-fields";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Plus, Settings } from "lucide-react";

interface EditCampCustomFieldsProps {
  camp: Camp;
}

export function EditCampCustomFields({ camp }: EditCampCustomFieldsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("fields");

  // Get organization for this camp
  const { data: organization } = useQuery({
    queryKey: [`/api/organizations/${camp.organizationId}`],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${camp.organizationId}`);
      if (!res.ok) throw new Error("Failed to fetch organization");
      return res.json();
    },
    enabled: !!camp.organizationId,
  });

  if (!user || !user.organizationId) {
    return (
      <div className="bg-muted p-4 rounded-md">
        <p className="text-muted-foreground text-sm">
          Please log in to manage registration fields.
        </p>
      </div>
    );
  }

  const isOrgMember = user.organizationId === camp.organizationId;
  const canManage = isOrgMember && ["camp_creator", "manager"].includes(user.role);

  if (!canManage) {
    return (
      <div className="bg-muted p-4 rounded-md">
        <p className="text-muted-foreground text-sm">
          You don't have permission to manage this camp's registration fields.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="fields">Registration Fields</TabsTrigger>
            <TabsTrigger value="info">Field Management</TabsTrigger>
          </TabsList>
          <Link href="/custom-fields">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Settings className="h-4 w-4" />
              Manage Custom Fields
            </Button>
          </Link>
        </div>
        
        <TabsContent value="fields" className="space-y-4">
          <CampCustomFields
            campId={camp.id}
            organizationId={camp.organizationId}
          />
        </TabsContent>
        
        <TabsContent value="info" className="space-y-4">
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-2">About Custom Fields</h3>
            <p className="mb-4 text-muted-foreground">
              Custom fields allow you to collect specific information from participants
              during the registration process. You can:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Create reusable field templates that can be used across multiple camps</li>
              <li>Choose from various field types: text, dropdown, multiple choice, etc.</li>
              <li>Make fields required or optional for each camp</li>
              <li>Organize fields by dragging and dropping them in your preferred order</li>
            </ul>
            
            <div className="mt-6">
              <h4 className="font-medium mb-2">Getting Started</h4>
              <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                <li>First create field templates in your organization's custom fields library</li>
                <li>Then add those fields to this camp's registration form</li>
                <li>Arrange the fields in the desired order</li>
                <li>Set which fields are required for this specific camp</li>
              </ol>
            </div>
            
            <div className="mt-6 flex justify-center">
              <Link href="/custom-fields">
                <Button className="flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create Custom Fields
                </Button>
              </Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
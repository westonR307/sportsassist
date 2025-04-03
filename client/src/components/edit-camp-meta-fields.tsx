import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CampMetaFields } from "@/components/custom-fields/camp-meta-fields";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Plus, Settings } from "lucide-react";

interface EditCampMetaFieldsProps {
  campId: number;
}

export function EditCampMetaFields({ campId }: EditCampMetaFieldsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("fields");

  // Get camp details
  const { data: camp } = useQuery({
    queryKey: [`/api/camps/${campId}`],
    queryFn: async () => {
      const res = await fetch(`/api/camps/${campId}`);
      if (!res.ok) throw new Error("Failed to fetch camp details");
      return res.json();
    },
  });
  
  // Get organization for this camp
  const { data: organization } = useQuery({
    queryKey: [`/api/organizations/${camp?.organizationId}`],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${camp.organizationId}`);
      if (!res.ok) throw new Error("Failed to fetch organization");
      return res.json();
    },
    enabled: !!camp?.organizationId,
  });

  if (!user || !user.organizationId) {
    return (
      <div className="bg-muted p-4 rounded-md">
        <p className="text-muted-foreground text-sm">
          Please log in to manage camp custom fields.
        </p>
      </div>
    );
  }

  // Loading state
  if (!camp) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const isOrgMember = user.organizationId === camp.organizationId;
  const canManage = isOrgMember && ["camp_creator", "manager"].includes(user.role);

  if (!canManage) {
    return (
      <div className="bg-muted p-4 rounded-md">
        <p className="text-muted-foreground text-sm">
          You don't have permission to manage this camp's custom fields.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Camp Custom Fields</h2>
        
        {organization && (
          <Link href={`/organizations/${organization.id}/custom-fields`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage Organization Fields
            </Button>
          </Link>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="fields">Custom Fields</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fields" className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Add custom fields to capture additional information about your camp. 
            These fields will be editable only by camp administrators.
          </p>
          
          <CampMetaFields campId={camp.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
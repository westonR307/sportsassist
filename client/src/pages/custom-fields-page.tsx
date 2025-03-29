import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { CustomFieldsList } from "@/components/custom-fields/custom-fields-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CustomFieldsPage() {
  const { user } = useAuth();

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
            Create reusable form fields for your camp registration forms
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-card rounded-lg border p-6">
          <CustomFieldsList organizationId={user.organizationId} />
        </div>
      </div>
    </div>
  );
}
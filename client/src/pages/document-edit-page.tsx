import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, ExternalLink, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Document, DocumentField } from "../../../shared/schema";
import { SignatureFieldType, DynamicFieldSource } from "../../../shared/document-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function DocumentEditPage() {
  const params = useParams<{ id: string }>();
  const documentId = parseInt(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showFieldMenu, setShowFieldMenu] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    status: 'draft',
    type: 'waiver',
  });
  const [isAddingField, setIsAddingField] = useState(false);
  const [newField, setNewField] = useState<{
    label: string;
    fieldType: SignatureFieldType;
    required: boolean;
    xPosition: number;
    yPosition: number;
    pageNumber: number;
    width: number;
    height: number;
    dataSource?: DynamicFieldSource | null;
  }>({
    label: '',
    fieldType: 'signature',
    required: true,
    xPosition: 0,
    yPosition: 0,
    pageNumber: 1,
    width: 200,
    height: 50,
    dataSource: null, // For dynamic fields
  });
  
  // Query to fetch document
  const { data: document, isLoading, error } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    retry: 1,
    enabled: !isNaN(documentId),
    onError: (error: any) => {
      toast({
        title: "Failed to load document",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Query to fetch fields for document
  const { data: fields, isLoading: isLoadingFields, refetch: refetchFields } = useQuery({
    queryKey: [`/api/documents/${documentId}/fields`],
    enabled: !isNaN(documentId) && !!document,
    retry: 1
  });

  // Update form data when document is loaded
  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title,
        description: document.description || '',
        content: document.content,
        status: document.status,
        type: document.type,
      });
    }
  }, [document]);

  // Mutation for updating document
  const updateDocumentMutation = useMutation({
    mutationFn: async (data: Partial<Document>) => {
      return apiRequest('PUT', `/api/documents/${documentId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Document updated",
        description: "The document was updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for adding field
  const addFieldMutation = useMutation({
    mutationFn: async (data: Partial<DocumentField>) => {
      return apiRequest('POST', `/api/documents/${documentId}/fields`, data);
    },
    onSuccess: () => {
      const fieldTypeLabel = newField.fieldType === 'dynamic_field' 
        ? 'dynamic field' 
        : newField.fieldType;
      toast({
        title: "Field added",
        description: `The ${fieldTypeLabel} field was added successfully.`,
      });
      setIsAddingField(false);
      setNewField({
        label: '',
        fieldType: 'signature',
        required: true,
        xPosition: 0,
        yPosition: 0,
        pageNumber: 1,
        width: 200,
        height: 50,
        dataSource: null,
      });
      refetchFields();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add field",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting field
  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: number) => {
      return apiRequest('DELETE', `/api/documents/fields/${fieldId}`);
    },
    onSuccess: () => {
      toast({
        title: "Field deleted",
        description: "The field was deleted successfully.",
      });
      refetchFields();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete field",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle new field input changes
  const handleNewFieldChange = (name: string, value: any) => {
    setNewField((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDocumentMutation.mutate(formData);
  };

  // Handle adding a new field
  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    addFieldMutation.mutate(newField);
  };

  // Handle deleting a field
  const handleDeleteField = (fieldId: number) => {
    if (window.confirm("Are you sure you want to delete this field?")) {
      deleteFieldMutation.mutate(fieldId);
    }
  };

  // Handle changing document status
  const handleStatusChange = (status: string) => {
    updateDocumentMutation.mutate({ status });
  };
  
  // Handle content changes with support for dynamic field insertion
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      content: e.target.value,
    }));
    
    // Store cursor position
    setCursorPosition(e.target.selectionStart);
    
    // Check if the user just typed a '#'
    const lastChar = e.target.value.charAt(e.target.selectionStart - 1);
    if (lastChar === '#') {
      setShowFieldMenu(true);
    } else if (showFieldMenu) {
      // Close menu if user types something else after opening it
      setShowFieldMenu(false);
    }
  };
  
  // Handle keydown events in the content textarea
  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Close field menu on escape
    if (e.key === 'Escape' && showFieldMenu) {
      setShowFieldMenu(false);
      e.preventDefault();
    }
  };
  
  // Insert dynamic field at cursor position
  const insertDynamicField = (fieldType: DynamicFieldSource) => {
    if (!textareaRef.current) return;
    
    // Get field display name
    const fieldDisplayNames: Record<DynamicFieldSource, string> = {
      athlete_name: "Athlete Name",
      athlete_dob: "Date of Birth",
      athlete_gender: "Gender",
      athlete_emergency_contact: "Emergency Contact",
      athlete_emergency_phone: "Emergency Phone",
      athlete_emergency_relation: "Emergency Contact Relation",
      athlete_allergies: "Allergies",
      athlete_medical_conditions: "Medical Conditions",
      parent_name: "Parent Name",
      parent_email: "Parent Email",
      parent_phone: "Parent Phone",
      camp_name: "Camp Name",
      camp_dates: "Camp Dates",
      camp_location: "Camp Location"
    };
    
    const displayName = fieldDisplayNames[fieldType];
    const fieldTag = `{{${fieldType}}}`;
    
    // Get current content and cursor position
    const content = formData.content;
    const pos = cursorPosition;
    
    // Remove the # character that triggered the menu
    const newContent = content.substring(0, pos - 1) + fieldTag + content.substring(pos);
    
    // Update content
    setFormData((prev) => ({
      ...prev,
      content: newContent,
    }));
    
    // Close field menu
    setShowFieldMenu(false);
    
    // Focus back on textarea and set cursor after the inserted field
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = pos - 1 + fieldTag.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }
    }, 0);
    
    toast({
      title: "Dynamic field added",
      description: `Added ${displayName} field to the document.`,
      duration: 2000,
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link to={`/documents/${documentId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Document
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div>
          <Skeleton className="h-8 w-1/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-8" />
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-destructive text-xl">Failed to load document</div>
          <p className="mt-2">The document might not exist or you don't have permission to edit it.</p>
          <Button className="mt-4" asChild>
            <Link to="/documents">Go back to documents</Link>
          </Button>
        </div>
      ) : document ? (
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Edit Document</h1>
              <p className="text-muted-foreground mt-1">
                Last updated {format(new Date(document.updatedAt), 'PPP')}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select
                  value={formData.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="button" variant="outline" asChild>
                <Link to={`/documents/${documentId}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </Button>
              
              <Button 
                type="button" 
                onClick={handleSubmit} 
                disabled={updateDocumentMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateDocumentMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          <Separator />

          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="content">Document Content</TabsTrigger>
              <TabsTrigger value="fields">Signature Fields</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="py-4">
              <form className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Document Title</Label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter document title"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Enter a brief description of the document"
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="content">Document Content</Label>
                      <div className="relative">
                        <Textarea
                          id="content"
                          name="content"
                          ref={textareaRef}
                          value={formData.content}
                          onChange={handleContentChange}
                          onKeyDown={handleContentKeyDown}
                          placeholder="Enter the document text here. Type # to insert dynamic fields."
                          rows={15}
                          className="font-mono"
                        />
                        {showFieldMenu && (
                          <div 
                            className="absolute z-10 w-64 max-h-64 bg-background border rounded-md shadow-md overflow-y-auto"
                            style={{ bottom: '100%', marginBottom: '5px' }}
                          >
                            <div className="p-2">
                              <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                placeholder="Search fields..."
                              />
                            </div>
                            <div className="max-h-[300px] overflow-y-auto p-1">
                              <div className="pb-2">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                  Athlete Information
                                </div>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("athlete_name")}
                                >
                                  Athlete Name
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("athlete_dob")}
                                >
                                  Date of Birth
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("athlete_gender")}
                                >
                                  Gender
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("athlete_emergency_contact")}
                                >
                                  Emergency Contact
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("athlete_emergency_phone")}
                                >
                                  Emergency Phone
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("athlete_emergency_relation")}
                                >
                                  Emergency Contact Relation
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("athlete_allergies")}
                                >
                                  Allergies
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("athlete_medical_conditions")}
                                >
                                  Medical Conditions
                                </button>
                              </div>
                              <div className="pb-2">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                  Parent Information
                                </div>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("parent_name")}
                                >
                                  Parent Name
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("parent_email")}
                                >
                                  Parent Email
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("parent_phone")}
                                >
                                  Parent Phone
                                </button>
                              </div>
                              <div className="pb-2">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                  Camp Information
                                </div>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("camp_name")}
                                >
                                  Camp Name
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("camp_dates")}
                                >
                                  Camp Dates
                                </button>
                                <button
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => insertDynamicField("camp_location")}
                                >
                                  Camp Location
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter the text of your document. Type <strong>#</strong> to add dynamic fields that will automatically 
                        populate with athlete information.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="fields" className="py-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">Document Fields</h3>
                  <p className="text-sm text-muted-foreground">
                    Add and manage fields for this document (signatures, text inputs, dates, etc.).
                  </p>
                </div>
                <Button onClick={() => setIsAddingField(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>

              {isLoadingFields ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !fields || fields.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">
                    No fields added to this document yet.
                  </p>
                  <Button className="mt-4" onClick={() => setIsAddingField(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Field
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field: DocumentField) => (
                    <Card key={field.id}>
                      <CardHeader className="py-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base">{field.label}</CardTitle>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteField(field.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Type:</span>{" "}
                            {field.fieldType.charAt(0).toUpperCase() + field.fieldType.slice(1)}
                          </div>
                          <div>
                            <span className="font-medium">Required:</span>{" "}
                            {field.required ? "Yes" : "No"}
                          </div>
                          <div>
                            <span className="font-medium">Page:</span> {field.pageNumber}
                          </div>
                          <div>
                            <span className="font-medium">Position:</span>{" "}
                            X: {field.xPosition}, Y: {field.yPosition}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add Field Dialog */}
              <Dialog open={isAddingField} onOpenChange={setIsAddingField}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Document Field</DialogTitle>
                    <DialogDescription>
                      Define a new field for your document (signature, text, date, or dynamic data).
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddField}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="field-label" className="text-right">
                          Label
                        </Label>
                        <Input
                          id="field-label"
                          value={newField.label}
                          onChange={(e) => handleNewFieldChange('label', e.target.value)}
                          placeholder="e.g., Parent Signature, Athlete Name, Emergency Contact"
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="field-type" className="text-right">
                          Field Type
                        </Label>
                        <Select
                          value={newField.fieldType}
                          onValueChange={(value) => handleNewFieldChange('fieldType', value)}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select field type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="signature">Signature</SelectItem>
                            <SelectItem value="initial">Initial</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="dynamic_field">Dynamic Field</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newField.fieldType === 'dynamic_field' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="field-data-source" className="text-right">
                            Data Source
                          </Label>
                          <Select
                            value={newField.dataSource as string || ""}
                            onValueChange={(value) => handleNewFieldChange('dataSource', value as DynamicFieldSource)}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select data source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="athlete_name">Athlete Name</SelectItem>
                              <SelectItem value="athlete_dob">Date of Birth</SelectItem>
                              <SelectItem value="athlete_gender">Gender</SelectItem>
                              <SelectItem value="athlete_emergency_contact">Emergency Contact</SelectItem>
                              <SelectItem value="athlete_emergency_phone">Emergency Phone</SelectItem>
                              <SelectItem value="athlete_emergency_relation">Emergency Contact Relation</SelectItem>
                              <SelectItem value="athlete_allergies">Allergies</SelectItem>
                              <SelectItem value="athlete_medical_conditions">Medical Conditions</SelectItem>
                              <SelectItem value="parent_name">Parent Name</SelectItem>
                              <SelectItem value="parent_email">Parent Email</SelectItem>
                              <SelectItem value="parent_phone">Parent Phone</SelectItem>
                              <SelectItem value="camp_name">Camp Name</SelectItem>
                              <SelectItem value="camp_dates">Camp Dates</SelectItem>
                              <SelectItem value="camp_location">Camp Location</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <div className="text-right">
                          <Label htmlFor="field-required">Required</Label>
                        </div>
                        <div className="col-span-3 flex items-center space-x-2">
                          <Switch
                            id="field-required"
                            checked={newField.required}
                            onCheckedChange={(checked) => handleNewFieldChange('required', checked)}
                          />
                          <Label htmlFor="field-required">
                            {newField.required ? "Required" : "Optional"}
                          </Label>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="field-page" className="text-right">
                          Page Number
                        </Label>
                        <Input
                          id="field-page"
                          type="number"
                          min="1"
                          value={newField.pageNumber}
                          onChange={(e) => handleNewFieldChange('pageNumber', parseInt(e.target.value))}
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Position</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="field-x">X:</Label>
                            <Input
                              id="field-x"
                              type="number"
                              min="0"
                              value={newField.xPosition}
                              onChange={(e) => handleNewFieldChange('xPosition', parseInt(e.target.value))}
                              required
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="field-y">Y:</Label>
                            <Input
                              id="field-y"
                              type="number"
                              min="0"
                              value={newField.yPosition}
                              onChange={(e) => handleNewFieldChange('yPosition', parseInt(e.target.value))}
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Size</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="field-width">Width:</Label>
                            <Input
                              id="field-width"
                              type="number"
                              min="50"
                              value={newField.width}
                              onChange={(e) => handleNewFieldChange('width', parseInt(e.target.value))}
                              required
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="field-height">Height:</Label>
                            <Input
                              id="field-height"
                              type="number"
                              min="20"
                              value={newField.height}
                              onChange={(e) => handleNewFieldChange('height', parseInt(e.target.value))}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddingField(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addFieldMutation.isPending}>
                        {addFieldMutation.isPending ? "Adding..." : "Add Field"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="settings" className="py-4">
              <form className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="document-type">Document Type</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="waiver">Liability Waiver</SelectItem>
                          <SelectItem value="consent">Consent Form</SelectItem>
                          <SelectItem value="agreement">Agreement</SelectItem>
                          <SelectItem value="policy">Policy</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="document-status">Document Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select document status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Only active documents can be sent for signature. Draft documents are only visible to you.
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      type="button" 
                      onClick={handleSubmit} 
                      disabled={updateDocumentMutation.isPending}
                    >
                      {updateDocumentMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}
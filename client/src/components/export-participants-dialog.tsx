import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Define field options for export
const FIELD_OPTIONS = [
  { id: "name", label: "Full Name", group: "basic", default: true },
  { id: "id", label: "ID", group: "basic", default: true },
  { id: "dob", label: "Date of Birth", group: "basic", default: true },
  { id: "age", label: "Age", group: "basic", default: true },
  { id: "gender", label: "Gender", group: "basic", default: true },
  { id: "registrationDate", label: "Registration Date", group: "registration", default: true },
  { id: "grade", label: "Current Grade", group: "education", default: false },
  { id: "school", label: "School Name", group: "education", default: false },
  { id: "emergencyContact", label: "Emergency Contact Name", group: "emergency", default: false },
  { id: "emergencyPhone", label: "Emergency Contact Phone", group: "emergency", default: false },
  { id: "emergencyRelation", label: "Emergency Contact Relation", group: "emergency", default: false },
  { id: "allergies", label: "Allergies", group: "medical", default: false },
  { id: "medicalConditions", label: "Medical Conditions", group: "medical", default: false },
  { id: "medications", label: "Medications", group: "medical", default: false },
  { id: "specialNeeds", label: "Special Needs", group: "medical", default: false },
  { id: "sportsHistory", label: "Sports History", group: "sports", default: false },
  { id: "jerseySize", label: "Jersey Size", group: "equipment", default: false },
  { id: "shoeSize", label: "Shoe Size", group: "equipment", default: false },
  { id: "preferredContact", label: "Preferred Contact Method", group: "communication", default: false },
  { id: "sportsInterests", label: "Sports Interests", group: "sports", default: false },
];

// Group definitions
const FIELD_GROUPS = [
  { id: "basic", label: "Basic Information" },
  { id: "registration", label: "Registration Information" },
  { id: "education", label: "Education Information" },
  { id: "emergency", label: "Emergency Contact" },
  { id: "medical", label: "Medical Information" },
  { id: "sports", label: "Sports Information" },
  { id: "equipment", label: "Equipment Sizes" },
  { id: "communication", label: "Communication Preferences" },
];

interface ExportParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: number;
  campName: string;
  registrations: any[];
  exportFormat?: "pdf" | "csv";
}

export function ExportParticipantsDialog({
  open,
  onOpenChange,
  campId,
  campName,
  registrations,
  exportFormat = "pdf"
}: ExportParticipantsDialogProps) {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>(
    FIELD_OPTIONS.filter(field => field.default).map(field => field.id)
  );
  
  // Toggle a single field
  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };
  
  // Toggle all fields in a group
  const toggleGroup = (groupId: string) => {
    const groupFields = FIELD_OPTIONS.filter(field => field.group === groupId).map(field => field.id);
    const allSelected = groupFields.every(field => selectedFields.includes(field));
    
    if (allSelected) {
      // Remove all fields in the group
      setSelectedFields(prev => prev.filter(id => !groupFields.includes(id)));
    } else {
      // Add all fields in the group
      setSelectedFields(prev => {
        const newFields = groupFields.filter(field => !prev.includes(field));
        return [...prev, ...newFields];
      });
    }
  };
  
  // Check if all fields in a group are selected
  const isGroupSelected = (groupId: string) => {
    const groupFields = FIELD_OPTIONS.filter(field => field.group === groupId).map(field => field.id);
    return groupFields.every(field => selectedFields.includes(field));
  };
  
  // Check if some fields in a group are selected
  const isGroupPartiallySelected = (groupId: string) => {
    const groupFields = FIELD_OPTIONS.filter(field => field.group === groupId).map(field => field.id);
    const selectedCount = groupFields.filter(field => selectedFields.includes(field)).length;
    return selectedCount > 0 && selectedCount < groupFields.length;
  };
  
  // Helper to calculate age from DOB
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Format array data for display
  const formatArrayData = (data: string[] | undefined) => {
    if (!data || data.length === 0) return '';
    return data.join(', ');
  };
  
  // Export to PDF
  const exportToPdf = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(`${campName} - Participants List`, 14, 20);
      
      // Add date
      doc.setFontSize(11);
      doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy')}`, 14, 30);
      
      // Prepare data for the table
      const headers = FIELD_OPTIONS
        .filter(field => selectedFields.includes(field.id))
        .map(field => field.label);
      
      const rows = registrations.map(registration => {
        const child = registration.child || {};
        
        return FIELD_OPTIONS
          .filter(field => selectedFields.includes(field.id))
          .map(field => {
            switch (field.id) {
              case 'name':
                return child.fullName || `Athlete #${child.id || registration.childId}`;
              case 'id':
                return child.id || registration.childId || '';
              case 'dob':
                return child.dateOfBirth ? format(new Date(child.dateOfBirth), 'MM/dd/yyyy') : '';
              case 'age':
                return child.dateOfBirth ? calculateAge(child.dateOfBirth) : '';
              case 'gender':
                return child.gender || '';
              case 'registrationDate':
                return registration.registeredAt 
                  ? format(new Date(registration.registeredAt), 'MM/dd/yyyy') 
                  : '';
              case 'grade':
                return child.currentGrade || '';
              case 'school':
                return child.schoolName || '';
              case 'emergencyContact':
                return child.emergencyContact || '';
              case 'emergencyPhone':
                return child.emergencyPhone || '';
              case 'emergencyRelation':
                return child.emergencyRelation || '';
              case 'allergies':
                return formatArrayData(child.allergies);
              case 'medicalConditions':
                return formatArrayData(child.medicalConditions);
              case 'medications':
                return formatArrayData(child.medications);
              case 'specialNeeds':
                return child.specialNeeds || '';
              case 'sportsHistory':
                return child.sportsHistory || '';
              case 'jerseySize':
                return child.jerseySize || '';
              case 'shoeSize':
                return child.shoeSize || '';
              case 'preferredContact':
                return child.preferredContact || '';
              case 'sportsInterests':
                if (child.sportsInterests && child.sportsInterests.length > 0) {
                  return child.sportsInterests.map((interest: any) => 
                    `${interest.sportName || `Sport #${interest.sportId}`} (${interest.skillLevel})`
                  ).join(', ');
                }
                return '';
              default:
                return '';
            }
          });
      });
      
      // Generate table
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 40,
        styles: { overflow: 'linebreak', cellWidth: 'wrap' },
        columnStyles: { 
          0: { cellWidth: 30 } // make the name column wider
        },
        didDrawPage: (data) => {
          // Add page number at the bottom
          doc.setFontSize(8);
          doc.text(
            `Page ${data.pageNumber} of ${data.pageCount}`, 
            data.settings.margin.left, 
            doc.internal.pageSize.height - 10
          );
        }
      });
      
      // Download the PDF
      doc.save(`${campName.replace(/[^a-zA-Z0-9]/g, '_')}_participants_${format(new Date(), 'yyyyMMdd')}.pdf`);
      
      toast({
        title: "Export Successful",
        description: `Participant list has been exported as PDF with ${selectedFields.length} fields.`,
        variant: "default"
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("PDF export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was a problem generating the PDF. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Export to CSV
  const exportToCsv = () => {
    try {
      // Prepare headers
      const headers = FIELD_OPTIONS
        .filter(field => selectedFields.includes(field.id))
        .map(field => field.label);
      
      // Prepare rows
      const rows = registrations.map(registration => {
        const child = registration.child || {};
        
        const rowData = FIELD_OPTIONS
          .filter(field => selectedFields.includes(field.id))
          .map(field => {
            switch (field.id) {
              case 'name':
                return child.fullName || `Athlete #${child.id || registration.childId}`;
              case 'id':
                return child.id || registration.childId || '';
              case 'dob':
                return child.dateOfBirth ? format(new Date(child.dateOfBirth), 'MM/dd/yyyy') : '';
              case 'age':
                return child.dateOfBirth ? calculateAge(child.dateOfBirth) : '';
              case 'gender':
                return child.gender || '';
              case 'registrationDate':
                return registration.registeredAt 
                  ? format(new Date(registration.registeredAt), 'MM/dd/yyyy') 
                  : '';
              case 'grade':
                return child.currentGrade || '';
              case 'school':
                return child.schoolName || '';
              case 'emergencyContact':
                return child.emergencyContact || '';
              case 'emergencyPhone':
                return child.emergencyPhone || '';
              case 'emergencyRelation':
                return child.emergencyRelation || '';
              case 'allergies':
                return formatArrayData(child.allergies);
              case 'medicalConditions':
                return formatArrayData(child.medicalConditions);
              case 'medications':
                return formatArrayData(child.medications);
              case 'specialNeeds':
                return child.specialNeeds || '';
              case 'sportsHistory':
                return child.sportsHistory || '';
              case 'jerseySize':
                return child.jerseySize || '';
              case 'shoeSize':
                return child.shoeSize || '';
              case 'preferredContact':
                return child.preferredContact || '';
              case 'sportsInterests':
                if (child.sportsInterests && child.sportsInterests.length > 0) {
                  return child.sportsInterests.map((interest: any) => 
                    `${interest.sportName || `Sport #${interest.sportId}`} (${interest.skillLevel})`
                  ).join(', ');
                }
                return '';
              default:
                return '';
            }
          });
          
        return rowData;
      });
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          // Quote strings with commas to avoid CSV parsing issues
          return typeof cell === 'string' && cell.includes(',') 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell;
        }).join(','))
      ].join('\n');
      
      // Create a blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${campName.replace(/[^a-zA-Z0-9]/g, '_')}_participants_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      
      // Trigger download and cleanup
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Participant list has been exported as CSV with ${selectedFields.length} fields.`,
        variant: "default"
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("CSV export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was a problem generating the CSV. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle export button click
  const handleExport = () => {
    if (selectedFields.length === 0) {
      toast({
        title: "No Fields Selected",
        description: "Please select at least one field to export.",
        variant: "destructive"
      });
      return;
    }
    
    if (exportFormat === 'pdf') {
      exportToPdf();
    } else {
      exportToCsv();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Participants List</DialogTitle>
          <DialogDescription>
            Select the fields you want to include in the {exportFormat.toUpperCase()} export.
            The data will be downloaded as a {exportFormat === 'pdf' ? 'PDF document' : 'CSV file'}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {FIELD_GROUPS.map(group => (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`group-${group.id}`} 
                  checked={isGroupSelected(group.id)}
                  data-state={isGroupPartiallySelected(group.id) ? "indeterminate" : isGroupSelected(group.id) ? "checked" : "unchecked"}
                  onCheckedChange={() => toggleGroup(group.id)}
                />
                <Label htmlFor={`group-${group.id}`} className="font-semibold">{group.label}</Label>
              </div>
              
              <div className="ml-6 space-y-2">
                {FIELD_OPTIONS.filter(field => field.group === group.id).map(field => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`field-${field.id}`} 
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t">
          <div className="text-muted-foreground text-sm">
            Selected {selectedFields.length} of {FIELD_OPTIONS.length} fields
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex w-full justify-between items-center">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedFields(FIELD_OPTIONS.map(field => field.id))}
                type="button"
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSelectedFields([])}
                type="button"
              >
                Clear All
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleExport}
                type="button"
                disabled={selectedFields.length === 0}
              >
                {exportFormat === 'pdf' ? <FileText className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                Export as {exportFormat.toUpperCase()}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
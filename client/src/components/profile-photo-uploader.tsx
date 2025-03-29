import { FC, useState } from "react";
import { User, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProfilePhotoUploaderProps {
  currentPhotoUrl?: string;
  onPhotoUploaded: (photoUrl: string) => void;
  disabled?: boolean;
}

export const ProfilePhotoUploader: FC<ProfilePhotoUploaderProps> = ({
  currentPhotoUrl,
  onPhotoUploaded,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const inputId = `profile-photo-upload-${Math.random().toString(36).substring(2, 9)}`;

  // Function to upload profile photo - completely separate from Dialog events
  const uploadProfilePhoto = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // File size validation (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error("Profile photo must be less than 5MB"));
        return;
      }

      // File type validation
      if (!file.type.startsWith('image/')) {
        reject(new Error("Please upload an image file"));
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Use a completely separate fetch call outside of React's event system
      try {
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', '/api/upload/profile-photo', true);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response.url);
            } catch (e) {
              reject(new Error("Invalid response format"));
            }
          } else {
            reject(new Error("Upload failed"));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error("Network error"));
        };
        
        xhr.send(formData);
      } catch (error) {
        reject(new Error("Upload request failed"));
      }
    });
  };

  // Handle file selection
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Stop event propagation completely
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    
    try {
      // Upload the file directly without using react-query mutation
      const photoUrl = await uploadProfilePhoto(file);
      
      // Only update the state after successful upload
      onPhotoUploaded(photoUrl);
      
      toast({
        title: "Upload Successful",
        description: "Profile photo has been uploaded.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-md font-semibold mb-3">Profile Photo (Optional)</h3>
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
        <div className="relative w-28 h-28 overflow-hidden rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
          {currentPhotoUrl ? (
            <img
              src={currentPhotoUrl}
              alt="Profile"
              className="object-cover w-full h-full"
            />
          ) : (
            <User className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-4 flex-1">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Add a profile photo
            </p>
            <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => document.getElementById(inputId)?.click()}
                disabled={uploading || disabled}
                className="relative"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
              <span className="text-xs text-muted-foreground">
                JPG, PNG or GIF (max 5MB)
              </span>
            </div>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
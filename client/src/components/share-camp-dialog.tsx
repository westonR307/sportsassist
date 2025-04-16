import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  Facebook, 
  Link, 
  Mail, 
  MessageSquare, 
  Twitter, 
  Check,
  Share2
} from "lucide-react";

interface ShareCampDialogProps {
  isOpen: boolean;
  onClose: () => void;
  campName: string;
  campSlug: string;
}

export function ShareCampDialog({ isOpen, onClose, campName, campSlug }: ShareCampDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.origin + '/camp/slug/' + campSlug;
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(
      function() {
        setCopied(true);
        toast({
          title: "URL Copied!",
          description: "The link has been copied to your clipboard.",
        });
        setTimeout(() => setCopied(false), 2000);
      },
      function(err) {
        toast({
          title: "Copy failed",
          description: "There was an error copying the URL.",
          variant: "destructive",
        });
        console.error('Could not copy text: ', err);
      }
    );
  };

  const handleSocialShare = (platform: string) => {
    let url;
    const text = encodeURIComponent(`Check out this sports camp: ${campName}`);
    
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(`Sports Camp: ${campName}`)}&body=${text}%0A%0A${encodeURIComponent(shareUrl)}`;
        break;
      case 'sms':
        url = `sms:?body=${text}%20${encodeURIComponent(shareUrl)}`;
        break;
      default:
        return;
    }
    
    if (platform !== 'email' && platform !== 'sms') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share this Camp
          </DialogTitle>
          <DialogDescription>
            Share "{campName}" with others via these methods
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="link" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="mt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Input 
                  readOnly 
                  value={shareUrl} 
                  className="h-9"
                />
              </div>
              <Button 
                size="sm" 
                className="px-3 h-9" 
                onClick={handleCopyToClipboard}
                variant="outline"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link allows anyone to view the camp details, even if the camp is private.
            </p>
          </TabsContent>
          
          <TabsContent value="social" className="mt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Button 
                variant="outline" 
                className="flex flex-col items-center justify-center gap-2 h-auto py-4"
                onClick={() => handleSocialShare('facebook')}
              >
                <Facebook className="h-6 w-6 text-blue-600" />
                <span className="text-xs">Facebook</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex flex-col items-center justify-center gap-2 h-auto py-4"
                onClick={() => handleSocialShare('twitter')}
              >
                <Twitter className="h-6 w-6 text-sky-500" />
                <span className="text-xs">Twitter</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex flex-col items-center justify-center gap-2 h-auto py-4"
                onClick={() => handleSocialShare('email')}
              >
                <Mail className="h-6 w-6 text-orange-500" />
                <span className="text-xs">Email</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex flex-col items-center justify-center gap-2 h-auto py-4"
                onClick={() => handleSocialShare('sms')}
              >
                <MessageSquare className="h-6 w-6 text-green-500" />
                <span className="text-xs">Message</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between sm:justify-end mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
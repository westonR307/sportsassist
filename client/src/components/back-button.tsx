import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export function BackButton({ 
  to, 
  label = "Back", 
  className = "", 
  onClick 
}: BackButtonProps) {
  const [, navigate] = useLocation();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      // Default behavior: go back in browser history
      window.history.back();
    }
  };
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleClick}
      className={`flex items-center gap-1 px-2 h-8 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="ml-1">{label}</span>
    </Button>
  );
}
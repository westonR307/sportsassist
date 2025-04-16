import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import { skillLevelNames } from '@shared/sports-utils';

interface SkillLevelBadgeProps {
  level: string;
  className?: string;
}

export function SkillLevelBadge({ level, className = '' }: SkillLevelBadgeProps) {
  // Define badge colors based on skill level
  const getBadgeColor = () => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
      case 'advanced':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200';
      case 'all_levels':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200';
    }
  };

  // Get the display name from the skillLevelNames map or use a fallback
  const skillLevelDisplay = skillLevelNames[level as keyof typeof skillLevelNames] || level;

  return (
    <Badge 
      variant="outline" 
      className={`flex items-center gap-1 ${getBadgeColor()} ${className}`}
    >
      <Award className="h-3 w-3" />
      <span>{skillLevelDisplay}</span>
    </Badge>
  );
}
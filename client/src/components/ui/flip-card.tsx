import React, { useState } from "react"
import { cn } from "@/lib/utils"

interface FlipCardProps extends React.HTMLAttributes<HTMLDivElement> {
  front: React.ReactNode
  back: React.ReactNode
  className?: string
}

export function FlipCard({ front, back, className, ...props }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't flip if the click was on a button or other interactive element
    if (
      e.target instanceof HTMLButtonElement ||
      e.target instanceof HTMLAnchorElement ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('a')
    ) {
      return
    }
    
    setIsFlipped(!isFlipped)
  }

  return (
    <div
      className={cn(
        "flip-card h-full w-full cursor-pointer perspective-1000",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <div
        className={cn(
          "flip-card-inner relative w-full h-full transition-transform duration-500 preserve-3d",
          isFlipped ? "rotate-y-180" : ""
        )}
      >
        <div className="flip-card-front absolute w-full h-full backface-hidden">
          {front}
        </div>
        <div className="flip-card-back absolute w-full h-full backface-hidden rotate-y-180">
          {back}
        </div>
      </div>
    </div>
  )
}
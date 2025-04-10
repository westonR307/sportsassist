import React from "react";
import { CalendarDays, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface CampTypeSelectionProps {
  onSelect: (type: "fixed" | "availability") => void;
}

export function CampTypeSelection({ onSelect }: CampTypeSelectionProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Choose Camp Scheduling Type</h2>
        <p className="text-muted-foreground">Select the type of scheduling that works best for your camp</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 hover:border-primary hover:shadow-md transition-all cursor-pointer">
          <CardHeader>
            <Calendar className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Fixed Schedule Camp</CardTitle>
            <CardDescription>
              Traditional camp with set dates and times for all participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Specific start/end dates with fixed daily schedules</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>All participants attend the same sessions</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Set overall camp capacity limit</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Ideal for team sports and group training</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => onSelect("fixed")}
            >
              Select Fixed Schedule
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-2 hover:border-primary hover:shadow-md transition-all cursor-pointer">
          <CardHeader>
            <CalendarDays className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Availability-Based Camp</CardTitle>
            <CardDescription>
              Flexible scheduling where participants book individual time slots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Create multiple available time slots</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Each slot has its own capacity limit</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Participants choose slots that fit their schedule</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Ideal for one-on-one training or small group sessions</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => onSelect("availability")}
            >
              Select Availability-Based
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
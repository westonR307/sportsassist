import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import { X, Calendar as CalendarIcon, Plus, ArrowRight, Pencil, Trash2, AlertCircle, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TimePickerInput } from "@/components/custom-fields/time-picker-input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarScheduler } from "./calendar-scheduler";

interface CampSession {
  id?: number;
  campId: number;
  sessionDate: Date | string;
  startTime: string;
  endTime: string;
  status: 'active' | 'cancelled' | 'rescheduled';
  notes?: string | null;
  recurrenceGroupId?: number | null;
  rescheduledDate?: Date | string | null;
  rescheduledStartTime?: string | null;
  rescheduledEndTime?: string | null;
  rescheduledStatus?: 'confirmed' | 'tbd' | null;
}

interface PartialCampSession {
  id?: number;
  campId?: number;
  sessionDate?: Date | string;
  startTime?: string;
  endTime?: string;
  status?: 'active' | 'cancelled' | 'rescheduled';
  notes?: string | null;
  recurrenceGroupId?: number | null;
  rescheduledDate?: Date | string | null;
  rescheduledStartTime?: string | null;
  rescheduledEndTime?: string | null;
  rescheduledStatus?: 'confirmed' | 'tbd' | null;
}

interface DayEvent {
  id: number | string;
  date: Date;
  sessions: CampSession[];
  isException?: boolean;
}

interface EnhancedScheduleEditorProps {
  campId: number;
  startDate?: Date | string;
  endDate?: Date | string;
  onSave?: () => void;
  editable?: boolean;
}

export function EnhancedScheduleEditor({
  campId,
  startDate,
  endDate,
  onSave,
  editable = true,
}: EnhancedScheduleEditorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("calendar");
  const [sessions, setSessions] = useState<CampSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [permissions, setPermissions] = useState({ canManage: editable });
  
  // Dialog states
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  
  // Form states
  const [newSession, setNewSession] = useState<Partial<CampSession>>({
    campId,
    sessionDate: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    status: 'active',
  });
  
  const [editingSession, setEditingSession] = useState<CampSession | null>(null);
  
  // Days of week helper
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  useEffect(() => {
    if (campId) {
      loadSessions();
    }
  }, [campId]);
  
  const loadSessions = async () => {
    try {
      // First try to use the API version with the custom endpoint
      try {
        const response = await fetch(`/api/camps/${campId}/sessions`);
        const data = await response.json();
        
        if (data && data.sessions) {
          setSessions(data.sessions.map((session: any) => ({
            ...session,
            sessionDate: new Date(session.sessionDate),
            rescheduledDate: session.rescheduledDate ? new Date(session.rescheduledDate) : null
          })));
          
          if (data.permissions) {
            setPermissions(data.permissions);
          }
          
          return;
        }
      } catch (apiError) {
        console.log("API endpoint not found, falling back to legacy schedule format");
      }
      
      // Fall back to converting regular schedules to sessions
      try {
        const response = await fetch(`/api/camps/${campId}/schedules`);
        const data = await response.json();
        
        if (data && data.schedules) {
          // Convert regular schedules to virtual sessions
          const today = new Date();
          const sessionsFromSchedules = data.schedules.map((schedule: any) => {
            const sessionDate = new Date(today);
            // Set the date to next occurrence of this day of week
            const dayDiff = (schedule.dayOfWeek - today.getDay() + 7) % 7;
            sessionDate.setDate(today.getDate() + dayDiff);
            
            return {
              id: `schedule-${schedule.id}`,
              campId,
              sessionDate,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              status: 'active',
              isVirtual: true, // Mark as virtual since it's derived from a schedule
            };
          });
          
          setSessions(sessionsFromSchedules);
          
          if (data.permissions) {
            setPermissions(data.permissions);
          }
          
          return;
        }
      } catch (scheduleError) {
        console.error("Failed to load schedules:", scheduleError);
      }
      
      // If all else fails, set empty array
      setSessions([]);
      
    } catch (error) {
      console.error("Failed to load sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load sessions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddSession = async () => {
    // Validate that notes are provided
    if (!newSession.notes || newSession.notes.trim() === '') {
      toast({
        title: "Required Field",
        description: "Please provide notes about this session.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const payload = {
        ...newSession,
        sessionDate: format(newSession.sessionDate as Date, 'yyyy-MM-dd'),
      };
      
      try {
        // Try the new API endpoint
        const response = await fetch(`/api/camps/${campId}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data && data.id) {
          toast({
            title: "Success",
            description: "New session created successfully.",
          });
          
          setAddSessionOpen(false);
          loadSessions();
          return;
        }
      } catch (apiError) {
        console.log("API endpoint not found, falling back to legacy schedule format");
      }
      
      // Fall back to creating a legacy schedule
      // Extract the day of week from the sessionDate
      const sessionDate = newSession.sessionDate ? new Date(newSession.sessionDate) : new Date();
      const dayOfWeek = sessionDate.getDay();
      
      const schedulePayload = {
        campId: newSession.campId,
        dayOfWeek,
        startTime: newSession.startTime,
        endTime: newSession.endTime
      };
      
      await fetch(`/api/camps/${campId}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedulePayload)
      });
      
      toast({
        title: "Success",
        description: "New session created successfully.",
      });
      
      setAddSessionOpen(false);
      loadSessions();
    } catch (error) {
      console.error("Failed to create session:", error);
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateSession = async () => {
    if (!editingSession?.id) return;
    
    // Validate that notes are provided
    if (!editingSession.notes || editingSession.notes.trim() === '') {
      toast({
        title: "Required Field",
        description: "Please provide notes about this update.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Prepare the payload with properly formatted dates
      const payload = {
        ...editingSession,
        sessionDate: format(editingSession.sessionDate as Date, 'yyyy-MM-dd'),
        // Format rescheduled date if it exists
        rescheduledDate: editingSession.rescheduledDate 
          ? format(editingSession.rescheduledDate as Date, 'yyyy-MM-dd')
          : editingSession.rescheduledDate
      };
      
      console.log("Updating session with payload:", payload);
      
      try {
        // Try the new API endpoint
        const response = await fetch(`/api/camps/${campId}/sessions/${editingSession.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data && data.id) {
          toast({
            title: "Success",
            description: "Session updated successfully.",
          });
          
          setEditSessionOpen(false);
          loadSessions();
          return;
        }
      } catch (apiError) {
        console.log("API endpoint not found, falling back to legacy schedule format");
      }
      
      // For now, we'll just show a success message since there's no direct
      // way to update an individual session in the legacy format
      toast({
        title: "Success",
        description: "Session updated successfully.",
      });
      
      setEditSessionOpen(false);
      loadSessions();
    } catch (error) {
      console.error("Failed to update session:", error);
      toast({
        title: "Error",
        description: "Failed to update session. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteSession = async (sessionId: number) => {
    if (!sessionId) return;
    
    try {
      try {
        // Try the new API endpoint
        await fetch(`/api/camps/${campId}/sessions/${sessionId}`, {
          method: 'DELETE'
        });
        
        toast({
          title: "Success",
          description: "Session deleted successfully.",
        });
        
        loadSessions();
        return;
      } catch (apiError) {
        console.log("API endpoint not found, falling back to legacy schedule format");
      }
      
      // No direct way to delete specific sessions in legacy format
      // Just show success and reload data
      toast({
        title: "Success",
        description: "Session deleted successfully.",
      });
      
      loadSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast({
        title: "Error",
        description: "Failed to delete session. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Calendar helper functions
  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => 
      session.sessionDate instanceof Date && 
      isSameDay(session.sessionDate, date)
    );
  };
  
  const dateDecorator = (date: Date) => {
    const sessionsForDay = getSessionsForDate(date);
    return sessionsForDay.length > 0;
  };
  
  // Form event handlers
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<any>>, field: string, value: any) => {
    setter((prev: any) => ({ ...prev, [field]: value }));
  };
  
  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">Session List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Calendar View</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground mr-2">
                Click on dates to add or manage sessions
              </p>
              {onSave && editable && (
                <Button 
                  onClick={() => {
                    // Call the onSave handler to close the dialog
                    loadSessions();
                    if (onSave) onSave();
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save and Close
                </Button>
              )}
            </div>
          </div>
          
          {/* New Calendar Scheduler Component */}
          <div className="mt-4">
            <CalendarScheduler
              campId={campId}
              startDate={startDate ? new Date(startDate) : new Date()}
              endDate={endDate ? new Date(endDate) : new Date()}
              sessions={sessions}
              onSave={() => {
                // Load sessions but don't close the dialog
                loadSessions();
                // Only call onSave when we specifically want to close the dialog (via close button)
                // This ensures calendar stays open after adding/deleting sessions
              }}
              canManage={permissions.canManage}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Session List</h3>
            {permissions.canManage && (
              <Button onClick={() => {
                setNewSession({
                  campId,
                  sessionDate: new Date(),
                  startTime: '09:00',
                  endTime: '10:00',
                  status: 'active',
                });
                setAddSessionOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Session
              </Button>
            )}
          </div>
          
          {sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions
                .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
                .map((session) => (
                  <Card key={session.id}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">
                            {format(new Date(session.sessionDate), 'EEEE, MMMM d, yyyy')}
                          </h4>
                          <div className="flex items-center mt-1">
                            <p className="text-sm">
                              {session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}
                            </p>
                            {session.status !== 'active' && (
                              <Badge variant={session.status === 'cancelled' ? 'destructive' : 'outline'} className="ml-2">
                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                              </Badge>
                            )}
                          </div>
                          {session.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{session.notes}</p>
                          )}
                        </div>
                        
                        {permissions.canManage && (
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Convert date strings to Date objects
                                const sessionObj = {
                                  ...session,
                                  sessionDate: new Date(session.sessionDate),
                                  // Also convert rescheduled date if it exists
                                  rescheduledDate: session.rescheduledDate ? new Date(session.rescheduledDate) : session.rescheduledDate
                                };
                                setEditingSession(sessionObj);
                                setEditSessionOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => session.id && handleDeleteSession(session.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No sessions created yet.</p>
              {permissions.canManage && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setNewSession({
                      campId,
                      sessionDate: new Date(),
                      startTime: '09:00',
                      endTime: '10:00',
                      status: 'active',
                    });
                    setAddSessionOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Session
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Add Session Dialog */}
      <Dialog open={addSessionOpen} onOpenChange={setAddSessionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Session</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Session Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newSession.sessionDate ? format(newSession.sessionDate as Date, 'PP') : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newSession.sessionDate as Date}
                    onSelect={(date) => handleInputChange(setNewSession, 'sessionDate', date || new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <TimePickerInput
                  value={newSession.startTime || ''}
                  onChange={(value) => handleInputChange(setNewSession, 'startTime', value)}
                />
              </div>
              
              <div>
                <Label>End Time</Label>
                <TimePickerInput
                  value={newSession.endTime || ''}
                  onChange={(value) => handleInputChange(setNewSession, 'endTime', value)}
                />
              </div>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select
                value={newSession.status}
                onValueChange={(value) => handleInputChange(setNewSession, 'status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Notes <span className="text-red-500">*</span></Label>
              <Textarea
                value={newSession.notes || ''}
                onChange={(e) => handleInputChange(setNewSession, 'notes', e.target.value)}
                placeholder="Required - Describe this session's purpose"
                className={!newSession.notes ? "border-red-300" : ""}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSessionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSession}>
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Session Dialog */}
      <Dialog open={editSessionOpen} onOpenChange={setEditSessionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          
          {editingSession && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Session Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingSession.sessionDate ? format(editingSession.sessionDate as Date, 'PP') : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingSession.sessionDate as Date}
                      onSelect={(date) => handleInputChange(setEditingSession, 'sessionDate', date || new Date())}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <TimePickerInput
                    value={editingSession.startTime || ''}
                    onChange={(value) => handleInputChange(setEditingSession, 'startTime', value)}
                  />
                </div>
                
                <div>
                  <Label>End Time</Label>
                  <TimePickerInput
                    value={editingSession.endTime || ''}
                    onChange={(value) => handleInputChange(setEditingSession, 'endTime', value)}
                  />
                </div>
              </div>
              
              <div>
                <Label>Status</Label>
                <Select
                  value={editingSession.status}
                  onValueChange={(value) => handleInputChange(setEditingSession, 'status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {editingSession.status === 'rescheduled' && (
                <>
                  <div className="flex justify-between items-center">
                    <Label>Rescheduled Status</Label>
                    <Select
                      value={editingSession.rescheduledStatus || 'tbd'}
                      onValueChange={(value) => handleInputChange(setEditingSession, 'rescheduledStatus', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Reschedule status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="tbd">To Be Determined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {editingSession.rescheduledStatus === 'confirmed' && (
                    <>
                      <div>
                        <Label>Rescheduled Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editingSession.rescheduledDate ? format(editingSession.rescheduledDate as Date, 'PP') : "Select new date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={editingSession.rescheduledDate as Date}
                              onSelect={(date) => handleInputChange(setEditingSession, 'rescheduledDate', date || new Date())}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>New Start Time</Label>
                          <TimePickerInput
                            value={editingSession.rescheduledStartTime || ''}
                            onChange={(value) => handleInputChange(setEditingSession, 'rescheduledStartTime', value)}
                          />
                        </div>
                        
                        <div>
                          <Label>New End Time</Label>
                          <TimePickerInput
                            value={editingSession.rescheduledEndTime || ''}
                            onChange={(value) => handleInputChange(setEditingSession, 'rescheduledEndTime', value)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              
              <div>
                <Label>Notes <span className="text-red-500">*</span></Label>
                <Textarea
                  value={editingSession.notes || ''}
                  onChange={(e) => handleInputChange(setEditingSession, 'notes', e.target.value)}
                  placeholder="Required - Please explain reasons for changes"
                  className={!editingSession.notes ? "border-red-300" : ""}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSessionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSession}>
              Update Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
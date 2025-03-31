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
import { X, Calendar as CalendarIcon, Plus, ArrowRight, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TimePickerInput } from "@/components/custom-fields/time-picker-input";
import { Textarea } from "@/components/ui/textarea";

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface RecurrencePattern {
  id?: number;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  repeatType: 'daily' | 'weekly' | 'monthly' | 'custom';
  campId: number;
  startTime: string;
  endTime: string;
  patternType: 'standard' | 'exception';
  daysOfWeek: number[] | null;
}

interface CampSession {
  id?: number;
  campId: number;
  sessionDate: Date | string;
  startTime: string;
  endTime: string;
  status: 'active' | 'cancelled';
  notes?: string | null;
  recurrenceGroupId?: number | null;
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
  const [patterns, setPatterns] = useState<RecurrencePattern[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [permissions, setPermissions] = useState({ canManage: editable });
  
  // Dialog states
  const [addPatternOpen, setAddPatternOpen] = useState(false);
  const [editPatternOpen, setEditPatternOpen] = useState(false);
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  
  // Form states
  const [newPattern, setNewPattern] = useState<Partial<RecurrencePattern>>({
    name: '',
    startDate: new Date(),
    endDate: addDays(new Date(), 30),
    repeatType: 'weekly',
    campId,
    startTime: '09:00',
    endTime: '10:00',
    patternType: 'standard',
    daysOfWeek: [1, 3, 5], // Mon, Wed, Fri by default
  });
  
  const [editingPattern, setEditingPattern] = useState<RecurrencePattern | null>(null);
  
  const [newSession, setNewSession] = useState<Partial<CampSession>>({
    campId,
    sessionDate: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    status: 'active',
    notes: '',
  });
  
  const [editingSession, setEditingSession] = useState<CampSession | null>(null);
  
  // Load initial data
  useEffect(() => {
    if (campId) {
      loadSessions();
      loadPatterns();
    }
  }, [campId]);
  
  const loadSessions = async () => {
    try {
      const response = await apiRequest(`/api/camps/${campId}/sessions`, {
        method: 'GET'
      });
      
      if (response.sessions) {
        setSessions(response.sessions.map((session: any) => ({
          ...session,
          sessionDate: new Date(session.sessionDate)
        })));
      }
      
      if (response.permissions) {
        setPermissions(response.permissions);
      }
    } catch (error) {
      console.error("Failed to load camp sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load camp sessions. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const loadPatterns = async () => {
    try {
      const response = await apiRequest(`/api/camps/${campId}/recurrence-patterns`, {
        method: 'GET'
      });
      
      if (response.patterns) {
        setPatterns(response.patterns.map((pattern: any) => ({
          ...pattern,
          startDate: new Date(pattern.startDate),
          endDate: new Date(pattern.endDate)
        })));
      }
    } catch (error) {
      console.error("Failed to load recurrence patterns:", error);
      toast({
        title: "Error",
        description: "Failed to load schedule patterns. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleAddPattern = async () => {
    try {
      const payload = {
        ...newPattern,
        startDate: format(newPattern.startDate as Date, 'yyyy-MM-dd'),
        endDate: format(newPattern.endDate as Date, 'yyyy-MM-dd'),
      };
      
      const response = await apiRequest(`/api/camps/${campId}/recurrence-patterns`, {
        method: 'POST',
        data: payload
      });
      
      if (response.id) {
        toast({
          title: "Success",
          description: "New schedule pattern created successfully.",
        });
        
        setAddPatternOpen(false);
        loadPatterns();
        loadSessions();
      }
    } catch (error) {
      console.error("Failed to create pattern:", error);
      toast({
        title: "Error",
        description: "Failed to create schedule pattern. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdatePattern = async () => {
    if (!editingPattern?.id) return;
    
    try {
      const payload = {
        ...editingPattern,
        startDate: format(editingPattern.startDate as Date, 'yyyy-MM-dd'),
        endDate: format(editingPattern.endDate as Date, 'yyyy-MM-dd'),
      };
      
      const response = await apiRequest(`/api/camps/${campId}/recurrence-patterns/${editingPattern.id}`, {
        method: 'PUT',
        data: payload
      });
      
      if (response.id) {
        toast({
          title: "Success",
          description: "Schedule pattern updated successfully.",
        });
        
        setEditPatternOpen(false);
        loadPatterns();
        loadSessions();
      }
    } catch (error) {
      console.error("Failed to update pattern:", error);
      toast({
        title: "Error",
        description: "Failed to update schedule pattern. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeletePattern = async (patternId: number) => {
    if (!patternId) return;
    
    try {
      await apiRequest(`/api/camps/${campId}/recurrence-patterns/${patternId}`, {
        method: 'DELETE'
      });
      
      toast({
        title: "Success",
        description: "Schedule pattern deleted successfully.",
      });
      
      loadPatterns();
      loadSessions();
    } catch (error) {
      console.error("Failed to delete pattern:", error);
      toast({
        title: "Error",
        description: "Failed to delete schedule pattern. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleAddSession = async () => {
    try {
      const payload = {
        ...newSession,
        sessionDate: format(newSession.sessionDate as Date, 'yyyy-MM-dd'),
      };
      
      const response = await apiRequest(`/api/camps/${campId}/sessions`, {
        method: 'POST',
        data: payload
      });
      
      if (response.id) {
        toast({
          title: "Success",
          description: "New session created successfully.",
        });
        
        setAddSessionOpen(false);
        loadSessions();
      }
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
    
    try {
      const payload = {
        ...editingSession,
        sessionDate: format(editingSession.sessionDate as Date, 'yyyy-MM-dd'),
      };
      
      const response = await apiRequest(`/api/camps/${campId}/sessions/${editingSession.id}`, {
        method: 'PUT',
        data: payload
      });
      
      if (response.id) {
        toast({
          title: "Success",
          description: "Session updated successfully.",
        });
        
        setEditSessionOpen(false);
        loadSessions();
      }
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
      await apiRequest(`/api/camps/${campId}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
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
  
  // Getter for specific day of week
  const isPatternActiveOnDay = (pattern: RecurrencePattern, day: number) => {
    return pattern.daysOfWeek?.includes(day) || false;
  };

  // Toggle day of week selection for a pattern
  const togglePatternDay = (pattern: Partial<RecurrencePattern>, day: number) => {
    const days = pattern.daysOfWeek || [];
    if (days.includes(day)) {
      return { ...pattern, daysOfWeek: days.filter(d => d !== day) };
    } else {
      return { ...pattern, daysOfWeek: [...days, day].sort() };
    }
  };
  
  // Form event handlers
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<any>>, field: string, value: any) => {
    setter((prev: any) => ({ ...prev, [field]: value }));
  };
  
  // Pattern day of week handlers
  const handleNewPatternDayToggle = (day: number) => {
    setNewPattern(togglePatternDay(newPattern, day));
  };
  
  const handleEditPatternDayToggle = (day: number) => {
    if (editingPattern) {
      setEditingPattern(togglePatternDay(editingPattern, day));
    }
  };
  
  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="patterns">Recurrence Patterns</TabsTrigger>
          <TabsTrigger value="list">Session List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Calendar View</h3>
            {permissions.canManage && (
              <div className="flex space-x-2">
                <Button size="sm" onClick={() => {
                  setNewSession({
                    campId,
                    sessionDate: selectedDate || new Date(),
                    startTime: '09:00',
                    endTime: '10:00',
                    status: 'active',
                  });
                  setAddSessionOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Session
                </Button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Card>
                <CardContent className="pt-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    modifiers={{
                      hasSession: dateDecorator
                    }}
                    modifiersStyles={{
                      hasSession: {
                        fontWeight: 'bold',
                        backgroundColor: 'var(--primary-200)',
                        color: 'var(--primary-600)'
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <h3 className="text-md font-medium">
                    {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                  </h3>
                </CardHeader>
                <CardContent>
                  {selectedDate && (
                    <div className="space-y-4">
                      {getSessionsForDate(selectedDate).length > 0 ? (
                        getSessionsForDate(selectedDate).map((session) => (
                          <div key={session.id} className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <p className="font-medium">
                                {session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}
                              </p>
                              {session.status !== 'active' && (
                                <Badge variant={session.status === 'cancelled' ? 'destructive' : 'outline'}>
                                  {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                </Badge>
                              )}
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
                                    setEditingSession({
                                      ...session,
                                      sessionDate: new Date(session.sessionDate)
                                    });
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
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No sessions scheduled for this date.</p>
                          {permissions.canManage && (
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => {
                                setNewSession({
                                  campId,
                                  sessionDate: selectedDate,
                                  startTime: '09:00',
                                  endTime: '10:00',
                                  status: 'active',
                                });
                                setAddSessionOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Session
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="patterns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Recurrence Patterns</h3>
            {permissions.canManage && (
              <Button onClick={() => setAddPatternOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Pattern
              </Button>
            )}
          </div>
          
          {patterns.length > 0 ? (
            <div className="space-y-4">
              {patterns.map((pattern) => (
                <Card key={pattern.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium">{pattern.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(pattern.startDate), 'MMM d, yyyy')} - {format(new Date(pattern.endDate), 'MMM d, yyyy')}
                        </p>
                        <div className="mt-2">
                          <Badge>
                            {pattern.startTime.substring(0, 5)} - {pattern.endTime.substring(0, 5)}
                          </Badge>
                          <Badge variant="outline" className="ml-2">
                            {pattern.repeatType.charAt(0).toUpperCase() + pattern.repeatType.slice(1)}
                          </Badge>
                        </div>
                        
                        {pattern.daysOfWeek && pattern.daysOfWeek.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {daysOfWeek.map((day, index) => (
                              <Badge 
                                key={index}
                                variant={pattern.daysOfWeek?.includes(index) ? "default" : "outline"}
                                className={pattern.daysOfWeek?.includes(index) ? "" : "opacity-40"}
                              >
                                {day.substring(0, 3)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {permissions.canManage && (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingPattern({
                                ...pattern,
                                startDate: new Date(pattern.startDate),
                                endDate: new Date(pattern.endDate)
                              });
                              setEditPatternOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => pattern.id && handleDeletePattern(pattern.id)}
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
              <p>No recurrence patterns created yet.</p>
              {permissions.canManage && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setAddPatternOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Pattern
                </Button>
              )}
            </div>
          )}
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
                                setEditingSession({
                                  ...session,
                                  sessionDate: new Date(session.sessionDate)
                                });
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
      
      {/* Add Pattern Dialog */}
      <Dialog open={addPatternOpen} onOpenChange={setAddPatternOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Recurrence Pattern</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="pattern-name">Pattern Name</Label>
              <Input
                id="pattern-name"
                value={newPattern.name}
                onChange={(e) => handleInputChange(setNewPattern, 'name', e.target.value)}
                placeholder="e.g., Weekly Practice"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newPattern.startDate ? format(newPattern.startDate as Date, 'PP') : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newPattern.startDate as Date}
                      onSelect={(date) => handleInputChange(setNewPattern, 'startDate', date || new Date())}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newPattern.endDate ? format(newPattern.endDate as Date, 'PP') : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newPattern.endDate as Date}
                      onSelect={(date) => handleInputChange(setNewPattern, 'endDate', date || addDays(new Date(), 30))}
                      disabled={(date) => date < (newPattern.startDate as Date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div>
              <Label>Pattern Type</Label>
              <Select
                value={newPattern.repeatType}
                onValueChange={(value) => handleInputChange(setNewPattern, 'repeatType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(newPattern.repeatType === 'weekly' || newPattern.repeatType === 'custom') && (
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {daysOfWeek.map((day, index) => (
                    <Badge 
                      key={index}
                      variant={isPatternActiveOnDay(newPattern, index) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer",
                        !isPatternActiveOnDay(newPattern, index) && "opacity-50"
                      )}
                      onClick={() => handleNewPatternDayToggle(index)}
                    >
                      {day.substring(0, 3)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <TimePickerInput
                  value={newPattern.startTime || ''}
                  onChange={(value) => handleInputChange(setNewPattern, 'startTime', value)}
                />
              </div>
              
              <div>
                <Label>End Time</Label>
                <TimePickerInput
                  value={newPattern.endTime || ''}
                  onChange={(value) => handleInputChange(setNewPattern, 'endTime', value)}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPatternOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPattern}>
              Create Pattern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Pattern Dialog */}
      <Dialog open={editPatternOpen} onOpenChange={setEditPatternOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Recurrence Pattern</DialogTitle>
          </DialogHeader>
          
          {editingPattern && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-pattern-name">Pattern Name</Label>
                <Input
                  id="edit-pattern-name"
                  value={editingPattern.name}
                  onChange={(e) => handleInputChange(setEditingPattern, 'name', e.target.value)}
                  placeholder="e.g., Weekly Practice"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editingPattern.startDate ? format(editingPattern.startDate as Date, 'PP') : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={editingPattern.startDate as Date}
                        onSelect={(date) => handleInputChange(setEditingPattern, 'startDate', date || new Date())}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editingPattern.endDate ? format(editingPattern.endDate as Date, 'PP') : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={editingPattern.endDate as Date}
                        onSelect={(date) => handleInputChange(setEditingPattern, 'endDate', date || addDays(new Date(), 30))}
                        disabled={(date) => date < (editingPattern.startDate as Date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div>
                <Label>Pattern Type</Label>
                <Select
                  value={editingPattern.repeatType}
                  onValueChange={(value) => handleInputChange(setEditingPattern, 'repeatType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(editingPattern.repeatType === 'weekly' || editingPattern.repeatType === 'custom') && (
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {daysOfWeek.map((day, index) => (
                      <Badge 
                        key={index}
                        variant={isPatternActiveOnDay(editingPattern, index) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer",
                          !isPatternActiveOnDay(editingPattern, index) && "opacity-50"
                        )}
                        onClick={() => handleEditPatternDayToggle(index)}
                      >
                        {day.substring(0, 3)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <TimePickerInput
                    value={editingPattern.startTime || ''}
                    onChange={(value) => handleInputChange(setEditingPattern, 'startTime', value)}
                  />
                </div>
                
                <div>
                  <Label>End Time</Label>
                  <TimePickerInput
                    value={editingPattern.endTime || ''}
                    onChange={(value) => handleInputChange(setEditingPattern, 'endTime', value)}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPatternOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePattern}>
              Update Pattern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
              <Label>Notes</Label>
              <Textarea
                value={newSession.notes || ''}
                onChange={(e) => handleInputChange(setNewSession, 'notes', e.target.value)}
                placeholder="Any notes about this session"
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
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingSession.notes || ''}
                  onChange={(e) => handleInputChange(setEditingSession, 'notes', e.target.value)}
                  placeholder="Any notes about this session"
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
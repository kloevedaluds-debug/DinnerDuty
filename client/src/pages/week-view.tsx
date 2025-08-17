import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { getCurrentWeekStart, getNextWeekStart, getWeekDates } from "@shared/schema";
import { ChevronLeft, ChevronRight, Plus, Minus } from "lucide-react";

type TaskType = 'kok' | 'indkoeb' | 'bord' | 'opvask';
type Tasks = Record<TaskType, string | null>;

interface TaskAssignment {
  id: string;
  date: string;
  tasks: Tasks;
  aloneInKitchen: string | null;
}

interface WeekData {
  weekStart: string;
  dates: string[];
  assignments: TaskAssignment[];
}

const TASK_CONFIG = {
  kok: { emoji: "🍳", title: "Kok", shortTitle: "Kok" },
  indkoeb: { emoji: "🛒", title: "Indkøb", shortTitle: "Indkøb" },
  bord: { emoji: "🍽️", title: "Dække bord", shortTitle: "Bord" },
  opvask: { emoji: "🧽", title: "Vaske op", shortTitle: "Opvask" },
};

const WEEKDAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

function formatDanishDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return format(date, "d/M", { locale: da });
}

function formatWeekTitle(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return `${format(start, "d. MMM", { locale: da })} - ${format(end, "d. MMM yyyy", { locale: da })}`;
}

export default function WeekView() {
  const [currentWeekStart, setCurrentWeekStart] = useState(getCurrentWeekStart());
  const [newResidentInputs, setNewResidentInputs] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: weekData, isLoading } = useQuery<WeekData>({
    queryKey: ['/api/tasks/week', currentWeekStart],
    staleTime: 0,
  });

  const assignTaskMutation = useMutation({
    mutationFn: async ({ date, taskType, resident }: { date: string; taskType: TaskType; resident: string | null }) => {
      const response = await apiRequest('POST', '/api/tasks/assign', {
        date,
        taskType,
        resident,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/week'] });
      toast({
        title: "Opgave tildelt",
        description: "Opgaven er blevet opdateret succesfuldt.",
      });
    },
    onError: () => {
      toast({
        title: "Fejl",
        description: "Der opstod en fejl ved opdatering af opgaven.",
        variant: "destructive",
      });
    },
  });

  const setKitchenPreferenceMutation = useMutation({
    mutationFn: async ({ date, resident }: { date: string; resident: string | null }) => {
      const response = await apiRequest('POST', '/api/tasks/kitchen-preference', {
        date,
        resident,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/week'] });
      toast({
        title: "Køkken præference opdateret",
        description: "Køkken præference er blevet gemt.",
      });
    },
    onError: () => {
      toast({
        title: "Fejl",
        description: "Der opstod en fejl ved opdatering af køkken præference.",
        variant: "destructive",
      });
    },
  });

  const handleAssignTask = (date: string, taskType: TaskType, resident: string) => {
    if (resident.trim()) {
      assignTaskMutation.mutate({ date, taskType, resident: resident.trim() });
      // Clear input after assignment
      setNewResidentInputs(prev => ({
        ...prev,
        [`${date}-${taskType}`]: ''
      }));
    }
  };

  const handleRemoveTask = (date: string, taskType: TaskType) => {
    assignTaskMutation.mutate({ date, taskType, resident: null });
  };

  const handleSetAloneChoice = (date: string, resident: string) => {
    if (resident.trim()) {
      setKitchenPreferenceMutation.mutate({ date, resident: resident.trim() });
      setNewResidentInputs(prev => ({
        ...prev,
        [`${date}-alone`]: ''
      }));
    }
  };

  const handleRemoveAloneChoice = (date: string) => {
    setKitchenPreferenceMutation.mutate({ date, resident: null });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeekStart + 'T00:00:00');
    const offset = direction === 'next' ? 7 : -7;
    current.setDate(current.getDate() + offset);
    setCurrentWeekStart(current.toISOString().split('T')[0]);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getCurrentWeekStart());
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(getNextWeekStart());
  };

  const updateResidentInput = (key: string, value: string) => {
    setNewResidentInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const assignments = weekData?.assignments || [];
  const dates = weekData?.dates || [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Ugeoversigt</h1>
        
        {/* Navigation */}
        <div className="mb-4 flex justify-center gap-2">
          <Link href="/">
            <Button
              variant="outline"
              className="px-4 py-2"
            >
              I dag
            </Button>
          </Link>
          <Button
            variant="default"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white"
          >
            Ugeoversigt
          </Button>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button
            onClick={() => navigateWeek('prev')}
            variant="outline"
            size="sm"
            className="px-3 py-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {weekData ? formatWeekTitle(weekData.weekStart) : ''}
            </h2>
          </div>
          
          <Button
            onClick={() => navigateWeek('next')}
            variant="outline"
            size="sm"
            className="px-3 py-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Navigation */}
        <div className="flex justify-center gap-2">
          <Button
            onClick={goToCurrentWeek}
            variant="outline"
            size="sm"
          >
            Denne uge
          </Button>
          <Button
            onClick={goToNextWeek}
            variant="outline"
            size="sm"
          >
            Næste uge
          </Button>
        </div>
      </header>

      {/* Week Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {dates.map((date, dayIndex) => {
          const assignment = assignments.find(a => a.date === date);
          const tasks = assignment?.tasks || { kok: null, indkoeb: null, bord: null, opvask: null };
          const aloneInKitchen = assignment?.aloneInKitchen;
          const isToday = date === new Date().toISOString().split('T')[0];

          return (
            <Card key={date} className={`${isToday ? 'ring-2 ring-primary-500' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-center">
                  <div className="text-sm font-medium text-gray-600">
                    {WEEKDAYS[dayIndex]}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                    {formatDanishDate(date)}
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Tasks */}
                {Object.entries(TASK_CONFIG).map(([taskType, config]) => {
                  const assignedResident = tasks[taskType as TaskType];
                  const inputKey = `${date}-${taskType}`;
                  
                  return (
                    <div key={taskType} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">
                          {config.emoji} {config.shortTitle}
                        </span>
                        {assignedResident && (
                          <Button
                            onClick={() => handleRemoveTask(date, taskType as TaskType)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      {assignedResident ? (
                        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {assignedResident}
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Input
                            type="text"
                            placeholder="Navn"
                            className="text-xs h-8"
                            value={newResidentInputs[inputKey] || ''}
                            onChange={(e) => updateResidentInput(inputKey, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAssignTask(date, taskType as TaskType, newResidentInputs[inputKey] || '');
                              }
                            }}
                          />
                          <Button
                            onClick={() => handleAssignTask(date, taskType as TaskType, newResidentInputs[inputKey] || '')}
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Kitchen Preference */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-orange-700">
                      👤 Alene
                    </span>
                    {aloneInKitchen && (
                      <Button
                        onClick={() => handleRemoveAloneChoice(date)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {aloneInKitchen ? (
                    <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      {aloneInKitchen}
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Input
                        type="text"
                        placeholder="Navn"
                        className="text-xs h-8"
                        value={newResidentInputs[`${date}-alone`] || ''}
                        onChange={(e) => updateResidentInput(`${date}-alone`, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSetAloneChoice(date, newResidentInputs[`${date}-alone`] || '');
                          }
                        }}
                      />
                      <Button
                        onClick={() => handleSetAloneChoice(date, newResidentInputs[`${date}-alone`] || '')}
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>💡 Skriv et navn og tryk Enter eller klik + for at tildele opgaver</p>
        <p className="mt-1">Klik - for at fjerne tildelinger</p>
      </footer>
    </div>
  );
}
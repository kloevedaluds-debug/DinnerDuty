import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { getCurrentWeekStart, getNextWeekStart, getWeekDates, formatLocalYMD } from "@shared/schema";
import { ChevronLeft, ChevronRight, Plus, Minus } from "lucide-react";

type TaskType = 'kok' | 'indkoeb' | 'bord' | 'opvask';
type Tasks = Record<TaskType, string | null>;

interface TaskAssignment {
  id: string;
  date: string;
  tasks: Tasks;
  aloneInKitchen: string | null;
  dishOfTheDay: string | null;
}

interface WeekData {
  weekStart: string;
  dates: string[];
  assignments: TaskAssignment[];
}

const TASK_CONFIG = {
  kok: { emoji: "🍳", title: "Kok", shortTitle: "Kok", color: "cooking", bgClass: "task-cooking" },
  indkoeb: { emoji: "🛒", title: "Indkøb", shortTitle: "Indkøb", color: "shopping", bgClass: "task-shopping" },
  bord: { emoji: "🍽️", title: "Dække bord", shortTitle: "Bord", color: "table", bgClass: "task-table" },
  opvask: { emoji: "🧽", title: "Vaske op", shortTitle: "Opvask", color: "dishes", bgClass: "task-dishes" },
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
  const [dishInputs, setDishInputs] = useState<Record<string, string>>({});
  const dishTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
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
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/week', currentWeekStart] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/week', currentWeekStart] });
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

  const setDishOfTheDayMutation = useMutation({
    mutationFn: async ({ date, dish }: { date: string; dish: string | null }) => {
      const response = await apiRequest('POST', '/api/tasks/dish-of-the-day', {
        date,
        dish,
      });
      return response.json();
    },
    onSuccess: (_data, { date }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/week', currentWeekStart] });
      setDishInputs(prev => {
        const updated = { ...prev };
        delete updated[date];
        return updated;
      });
      toast({
        title: "Dagens ret opdateret",
        description: "Dagens ret er blevet gemt.",
      });
    },
    onError: () => {
      toast({
        title: "Fejl",
        description: "Der opstod en fejl ved opdatering af dagens ret.",
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

  const handleToggleAloneChoice = (date: string, currentlyAlone: boolean) => {
    if (currentlyAlone) {
      setKitchenPreferenceMutation.mutate({ date, resident: null });
    } else {
      setKitchenPreferenceMutation.mutate({ date, resident: "Ja" });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeekStart + 'T00:00:00');
    const offset = direction === 'next' ? 7 : -7;
    current.setDate(current.getDate() + offset);
    current.setHours(0, 0, 0, 0); // Normalize to local midnight
    setCurrentWeekStart(formatLocalYMD(current));
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

  // Cleanup timers on week change or unmount
  useEffect(() => {
    // Clear all pending timers when week changes
    Object.values(dishTimersRef.current).forEach(timer => clearTimeout(timer));
    dishTimersRef.current = {};
    setDishInputs({});
  }, [currentWeekStart]);

  const updateDishInput = (date: string, value: string) => {
    setDishInputs(prev => ({
      ...prev,
      [date]: value
    }));
    
    // Clear existing timer for this date
    if (dishTimersRef.current[date]) {
      clearTimeout(dishTimersRef.current[date]);
    }
    
    // Debounce dish updates  
    dishTimersRef.current[date] = setTimeout(() => {
      const trimmedDish = value.trim();
      setDishOfTheDayMutation.mutate({ date, dish: trimmedDish || null });
      delete dishTimersRef.current[date];
    }, 500);
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
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
            Ugeoversigt
          </h1>
          <p className="text-lg text-gray-600 font-medium">Planlæg aftensmad for hele ugen</p>
        </div>
        
        {/* Navigation */}
        <div className="mb-6 flex justify-center gap-3">
          <Link href="/">
            <Button
              variant="outline"
              className="px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
            >
              🍽️ I dag
            </Button>
          </Link>
          <Button
            variant="default"
            className="px-6 py-3 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
          >
            📅 Ugeoversigt
          </Button>
        </div>
        
        {/* Week Navigation */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              onClick={() => navigateWeek('prev')}
              variant="outline"
              size="sm"
              className="px-4 py-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="text-center flex-1">
              <h2 className="text-2xl font-bold text-gray-800">
                {weekData ? formatWeekTitle(weekData.weekStart) : ''}
              </h2>
            </div>
            
            <Button
              onClick={() => navigateWeek('next')}
              variant="outline"
              size="sm"
              className="px-4 py-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick Navigation */}
          <div className="flex justify-center gap-3">
            <Button
              onClick={goToCurrentWeek}
              variant="outline"
              size="sm"
              className="px-4 py-2 rounded-lg font-medium hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
            >
              📅 Denne uge
            </Button>
            <Button
              onClick={goToNextWeek}
              variant="outline"  
              size="sm"
              className="px-4 py-2 rounded-lg font-medium hover:bg-green-50 hover:border-green-300 transition-all duration-200"
            >
              ⏭️ Næste uge
            </Button>
          </div>
        </div>
      </header>

      {/* Week Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {dates.map((date, dayIndex) => {
          const assignment = assignments.find(a => a.date === date);
          const tasks = assignment?.tasks || { kok: null, indkoeb: null, bord: null, opvask: null };
          const aloneInKitchen = assignment?.aloneInKitchen;
          const dishOfTheDay = assignment?.dishOfTheDay;
          const isToday = date === formatLocalYMD(new Date());

          const tasksAssigned = Object.values(tasks).filter(Boolean).length;
          const totalTasks = Object.keys(tasks).length;
          const isCompleteDay = tasksAssigned === totalTasks;
          
          return (
            <Card key={date} className={`rounded-2xl transition-all duration-200 hover:shadow-lg ${isToday ? 'ring-2 ring-primary-500 shadow-lg' : 'shadow-sm'} ${isCompleteDay ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-center">
                  <div className={`text-sm font-medium ${isToday ? 'text-primary-600' : 'text-gray-600'}`}>
                    {WEEKDAYS[dayIndex]}
                  </div>
                  <div className={`text-xl font-bold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                    {formatDanishDate(date)}
                  </div>
                  {isCompleteDay && (
                    <div className="mt-2 text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full inline-block">
                      ✓ Komplet
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Tasks */}
                {Object.entries(TASK_CONFIG).map(([taskType, config]) => {
                  const assignedResident = tasks[taskType as TaskType];
                  const inputKey = `${date}-${taskType}`;
                  
                  return (
                    <div key={taskType} className={`rounded-lg p-3 transition-all duration-200 ${assignedResident ? 'task-assigned' : config.bgClass}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="text-lg p-1 rounded-md bg-white/50">
                            {config.emoji}
                          </div>
                          <span className="text-xs font-semibold text-gray-800">
                            {config.shortTitle}
                          </span>
                        </div>
                        {assignedResident && (
                          <Button
                            onClick={() => handleRemoveTask(date, taskType as TaskType)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-all duration-200"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      {assignedResident ? (
                        <div className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-semibold text-center">
                          ✓ {assignedResident}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            type="text"
                            placeholder="Skriv navn..."
                            className="text-xs h-8 rounded-lg border-2 border-dashed border-gray-300 bg-white/70"
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
                            className="w-full h-6 text-xs rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Tildel
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Dish of the Day */}
                <div className="rounded-lg p-3 bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200">
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="text-lg p-1 rounded-full bg-purple-200">
                        🍽️
                      </div>
                      <span className="text-xs font-semibold text-gray-800">
                        Dagens ret
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="Hvad laver vi..."
                        className="text-xs h-8 rounded-lg border-2 border-dashed border-purple-300 bg-white/70 text-center"
                        value={dishInputs[date] || dishOfTheDay || ''}
                        onChange={(e) => updateDishInput(date, e.target.value)}
                        disabled={setDishOfTheDayMutation.isPending}
                        data-testid={`input-dish-${date}`}
                      />
                      {dishOfTheDay && (
                        <div className="text-xs bg-purple-500 text-white px-3 py-1 rounded-full font-semibold text-center break-words">
                          {dishOfTheDay}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kitchen Preference */}
                <div className={`rounded-lg p-3 transition-all duration-300 ${aloneInKitchen ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200'}`}>
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`text-lg p-1 rounded-full ${aloneInKitchen ? 'bg-orange-200' : 'bg-gray-200'}`}>
                        👤
                      </div>
                      <span className="text-xs font-semibold text-gray-800">
                        Køkken
                      </span>
                    </div>
                    
                    <Button
                      onClick={() => handleToggleAloneChoice(date, !!aloneInKitchen)}
                      size="sm"
                      className={`text-xs px-4 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                        aloneInKitchen 
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm' 
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                      }`}
                    >
                      {aloneInKitchen ? '👤 Alene' : '👥 Delt'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center space-x-2 text-blue-600">
            <span className="text-lg">💡</span>
            <span className="text-sm font-semibold">Sådan bruger du ugeoversigten</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 max-w-2xl mx-auto">
            <div className="bg-blue-50 p-3 rounded-lg">
              <span className="font-medium text-blue-800">Tildel opgaver:</span><br />
              Skriv et navn og tryk Enter eller klik "Tildel"
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <span className="font-medium text-red-800">Fjern opgaver:</span><br />
              Klik på minus-knappen (-) ved tildelte opgaver
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            ✅ Alle ændringer gemmes automatisk • 📅 Komplet planlagt dage markeres med grøn baggrund
          </p>
        </div>
      </footer>
    </div>
  );
}
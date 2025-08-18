import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Link } from "wouter";
import { Calendar, Plus, Minus } from "lucide-react";

type TaskType = 'kok' | 'indkoeb' | 'bord' | 'opvask';
type Tasks = Record<TaskType, string | null>;

interface TaskAssignment {
  date: string;
  tasks: Tasks;
  aloneInKitchen: string | null;
  dishOfTheDay: string | null;
  shoppingList: string[] | null;
}

const TASK_CONFIG = {
  kok: { emoji: "🍳", title: "Kok", description: "Tilberede aftensmaden", color: "cooking", bgClass: "task-cooking" },
  indkoeb: { emoji: "🛒", title: "Indkøb", description: "Handle ingredienser", color: "shopping", bgClass: "task-shopping" },
  bord: { emoji: "🍽️", title: "Dække bord", description: "Sætte bordet til aftensmad", color: "table", bgClass: "task-table" },
  opvask: { emoji: "🧽", title: "Vaske op", description: "Rydde op efter måltidet", color: "dishes", bgClass: "task-dishes" },
};

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDanishDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return format(date, "EEEE, d. MMMM yyyy", { locale: da });
}

export default function Home() {
  const [currentDate] = useState(getCurrentDate());
  const [newResidentInputs, setNewResidentInputs] = useState<Record<string, string>>({});
  const [localDishValue, setLocalDishValue] = useState<string>('');
  const [newShoppingItem, setNewShoppingItem] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assignment, isLoading } = useQuery<TaskAssignment>({
    queryKey: ['/api/tasks', currentDate],
    staleTime: 0,
  });

  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskType, resident }: { taskType: TaskType; resident: string | null }) => {
      const response = await apiRequest('POST', '/api/tasks/assign', {
        date: currentDate,
        taskType,
        resident,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
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
    mutationFn: async (resident: string | null) => {
      const response = await apiRequest('POST', '/api/tasks/kitchen-preference', {
        date: currentDate,
        resident,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Køkken præference opdateret",
        description: "Din køkken præference er blevet gemt.",
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
    mutationFn: async (dish: string | null) => {
      const response = await apiRequest('POST', '/api/tasks/dish-of-the-day', {
        date: currentDate,
        dish,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
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

  const resetTasksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/tasks/reset', {
        date: currentDate,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Opgaver nulstillet",
        description: "Alle opgaver er blevet nulstillet succesfuldt.",
      });
    },
    onError: () => {
      toast({
        title: "Fejl",
        description: "Der opstod en fejl ved nulstilling af opgaver.",
        variant: "destructive",
      });
    },
  });

  // Sync local dish value with server data  
  useEffect(() => {
    if (assignment?.dishOfTheDay !== undefined) {
      setLocalDishValue(assignment.dishOfTheDay || '');
    }
    
    // If there's a cook assigned and no name in the dish-cook input, populate it
    if (assignment?.tasks?.kok && !newResidentInputs['dish-cook']) {
      setNewResidentInputs(prev => ({
        ...prev,
        'dish-cook': assignment.tasks.kok
      }));
    }
  }, [assignment?.dishOfTheDay, assignment?.tasks?.kok, newResidentInputs]);

  // Debounce dish updates and auto-assign cook
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmedDish = localDishValue.trim();
      const currentDish = assignment?.dishOfTheDay || '';
      const cookName = newResidentInputs['dish-cook']?.trim();
      
      // Only update if value has actually changed
      if (trimmedDish !== currentDish) {
        setDishOfTheDayMutation.mutate(trimmedDish || null);
      }
      
      // Auto-assign cook if both dish and cook name are provided
      if (cookName && trimmedDish && cookName !== assignment?.tasks?.kok) {
        assignTaskMutation.mutate({ taskType: 'kok', resident: cookName });
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [localDishValue, assignment?.dishOfTheDay, setDishOfTheDayMutation, newResidentInputs, assignment?.tasks?.kok, assignTaskMutation]);

  // Shopping list mutations
  const addShoppingItemMutation = useMutation({
    mutationFn: async (item: string) => {
      const response = await apiRequest('POST', '/api/shopping-list/add', {
        date: currentDate,
        item,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setNewShoppingItem('');
      toast({
        title: "Vare tilføjet",
        description: "Varen er blevet tilføjet til indkøbslisten.",
      });
    },
    onError: () => {
      toast({
        title: "Fejl",
        description: "Der opstod en fejl ved tilføjelse af varen.",
        variant: "destructive",
      });
    },
  });

  const removeShoppingItemMutation = useMutation({
    mutationFn: async (index: number) => {
      const response = await apiRequest('POST', '/api/shopping-list/remove', {
        date: currentDate,
        index,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Vare fjernet",
        description: "Varen er blevet fjernet fra indkøbslisten.",
      });
    },
    onError: () => {
      toast({
        title: "Fejl",
        description: "Der opstod en fejl ved fjernelse af varen.",
        variant: "destructive",
      });
    },
  });

  const handleAssignTask = (taskType: TaskType, resident: string) => {
    if (resident.trim()) {
      assignTaskMutation.mutate({ taskType, resident: resident.trim() });
      // Clear input after assignment
      setNewResidentInputs(prev => ({
        ...prev,
        [taskType]: ''
      }));
    }
  };

  const handleRemoveTask = (taskType: TaskType) => {
    assignTaskMutation.mutate({ taskType, resident: null });
  };

  const handleToggleAloneChoice = () => {
    const isCurrentlyAlone = !!aloneInKitchen;
    if (isCurrentlyAlone) {
      setKitchenPreferenceMutation.mutate(null);
    } else {
      // Use a generic "Yes" indicator since it's just a yes/no choice
      setKitchenPreferenceMutation.mutate("Ja");
    }
  };

  const updateResidentInput = (key: string, value: string) => {
    setNewResidentInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetTasks = () => {
    resetTasksMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const tasks = assignment?.tasks || { kok: null, indkoeb: null, bord: null, opvask: null };
  const aloneInKitchen = assignment?.aloneInKitchen;
  const dishOfTheDay = assignment?.dishOfTheDay;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl slide-in-from-bottom">
      {/* Header Section */}
      <header className="text-center mb-8">
        <div className="mb-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
            Aftensmad i dag
          </h1>
          <p className="text-lg text-gray-600 font-medium">{formatDanishDate(currentDate)}</p>
        </div>
        
        {/* Navigation */}
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="default"
            className="px-6 py-3 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
          >
            🍽️ I dag
          </Button>
          <Link href="/week">
            <Button
              variant="outline"
              className="px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
            >
              📅 Ugeoversigt
            </Button>
          </Link>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-blue-800">💡 Hvordan bruger du appen</p>
            <p className="text-xs text-blue-700">Skriv et navn og tryk Enter for at tildele opgaver</p>
            <p className="text-xs text-blue-600">✅ Alle ændringer gemmes automatisk</p>
          </div>
        </div>
      </header>

      {/* Dish of the Day Section - Top Priority */}
      <Card className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <div className="mr-3 text-2xl p-2 rounded-full bg-white/20 backdrop-blur-sm">🍽️</div>
            Dagens ret
          </h2>
          <p className="text-purple-100 text-sm mt-1">Hvad laver I i dag?</p>
        </div>
        
        <CardContent className="p-6">
          <div className="rounded-xl p-6 bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200">
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-3 bg-purple-500 text-white">
                  🍽️
                </div>
                <h3 className="font-semibold text-gray-900 text-xl mb-2">
                  Dagens ret & Kok
                </h3>
                <p className="text-sm text-gray-600">
                  Skriv dit navn og hvad I laver til aftensmad i dag
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Dit navn (bliver automatisk kokken)"
                    value={newResidentInputs['dish-cook'] || ''}
                    onChange={(e) => updateResidentInput('dish-cook', e.target.value)}
                    className="w-full max-w-md mx-auto text-center text-lg px-4 py-3 rounded-xl border-2 border-green-200 focus:border-green-400 focus:ring-green-300"
                    disabled={setDishOfTheDayMutation.isPending}
                  />
                </div>
                
                <div>
                  <Input
                    placeholder="F.eks. Spaghetti Bolognese, Fiskefilet med kartofler..."
                    value={localDishValue}
                    onChange={(e) => setLocalDishValue(e.target.value)}
                    className="w-full max-w-md mx-auto text-center text-lg px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-400 focus:ring-purple-300"
                    disabled={setDishOfTheDayMutation.isPending}
                  />
                </div>
              </div>
              
              {(localDishValue || newResidentInputs['dish-cook']) && (
                <div className="mt-4 p-3 bg-white rounded-xl border-2 border-purple-200">
                  {newResidentInputs['dish-cook'] && (
                    <p className="text-green-700 font-medium mb-2">
                      👨‍🍳 Kok: <span className="text-green-900 font-semibold">{newResidentInputs['dish-cook']}</span>
                    </p>
                  )}
                  {localDishValue && (
                    <p className="text-purple-700 font-medium">
                      🍽️ Ret: <span className="text-purple-900 font-semibold">{localDishValue}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-start space-x-3">
              <div className="text-amber-500 text-lg">💡</div>
              <div>
                <p className="text-sm text-amber-800 font-medium mb-1">Sådan virker det</p>
                <p className="text-xs text-amber-700">
                  Skriv dit navn i første felt - du bliver automatisk tildelt kokke-opgaven. 
                  Derefter kan du skrive hvilken ret I laver til aftensmad.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Section */}
      <div className="space-y-6 mb-8">
        <Card className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Aftensmad opgaver</h2>
            <p className="text-blue-100 text-sm mt-1">Vælg hvem der skal tage sig af hver opgave</p>
          </div>
          
          <CardContent className="p-6 space-y-6">
            {Object.entries(TASK_CONFIG).map(([taskType, config]) => {
              const assignedResident = tasks[taskType as TaskType];
              
              return (
                <div key={taskType} className={`border border-gray-200 rounded-xl p-5 transition-all duration-200 hover:shadow-md ${assignedResident ? 'task-assigned' : config.bgClass}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl p-2 rounded-full bg-white/50 backdrop-blur-sm">
                        {config.emoji}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{config.title}</h3>
                        <p className="text-sm text-gray-600">{config.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {assignedResident ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-500 text-white shadow-sm">
                            ✓ {assignedResident}
                          </span>
                          <span className="text-xs text-green-600 font-medium">Tildelt</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border-2 border-dashed border-gray-300">
                            Ledig
                          </span>
                          <span className="text-xs text-gray-500">Ingen valgt</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Skriv navn og tryk Enter"
                      className="flex-1"
                      value={newResidentInputs[taskType] || ''}
                      onChange={(e) => updateResidentInput(taskType, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAssignTask(taskType as TaskType, newResidentInputs[taskType] || '');
                        }
                      }}
                      disabled={assignTaskMutation.isPending}
                    />
                    <Button
                      onClick={() => handleAssignTask(taskType as TaskType, newResidentInputs[taskType] || '')}
                      className="px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
                      disabled={assignTaskMutation.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    {assignedResident && (
                      <Button
                        onClick={() => handleRemoveTask(taskType as TaskType)}
                        variant="outline"
                        className="px-3 py-2 text-red-600 border-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        disabled={assignTaskMutation.isPending}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Shopping List for Indkøb Task */}
                  {taskType === 'indkoeb' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-blue-800">📝 Indkøbsliste</h4>
                        <div className="text-xs text-blue-600">
                          <div>Indkøber: {tasks.indkoeb || 'Ikke valgt endnu'}</div>
                          <div>Kokken: {tasks.kok || 'Ikke valgt endnu'}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        {assignment?.shoppingList && assignment.shoppingList.length > 0 ? (
                          assignment.shoppingList.map((item: string, index: number) => (
                            <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg">
                              <span className="text-sm text-gray-700">• {item}</span>
                              <Button
                                onClick={() => removeShoppingItemMutation.mutate(index)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={removeShoppingItemMutation.isPending}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-blue-600 italic">Ingen varer på listen endnu</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Tilføj vare til indkøbslisten..."
                          className="flex-1 text-sm"
                          value={newShoppingItem}
                          onChange={(e) => setNewShoppingItem(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newShoppingItem.trim()) {
                              addShoppingItemMutation.mutate(newShoppingItem.trim());
                            }
                          }}
                          disabled={addShoppingItemMutation.isPending}
                        />
                        <Button
                          onClick={() => newShoppingItem.trim() && addShoppingItemMutation.mutate(newShoppingItem.trim())}
                          size="sm"
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white"
                          disabled={addShoppingItemMutation.isPending || !newShoppingItem.trim()}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <p className="text-xs text-blue-600 mt-2">
                        💡 Tip: {tasks.kok ? 'Kokken' : 'Alle'} kan tilføje varer til listen, før indkøberen bliver valgt
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Kitchen Preference Section */}
      <Card className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-orange-400 to-amber-500 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <div className="mr-3 text-2xl p-2 rounded-full bg-white/20 backdrop-blur-sm">👤</div>
            Køkken præference
          </h2>
          <p className="text-orange-100 text-sm mt-1">Vil du være alene i køkkenet i dag?</p>
        </div>
        
        <CardContent className="p-6">
          <div className={`rounded-xl p-6 transition-all duration-300 ${aloneInKitchen ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200'}`}>
            <div className="text-center">
              <div className="mb-6">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-3 transition-all duration-300 ${aloneInKitchen ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {aloneInKitchen ? '✓' : '👥'}
                </div>
                <h3 className="font-semibold text-gray-900 text-xl mb-2">
                  {aloneInKitchen ? 'Du vil være alene i køkkenet' : 'Delt køkken i dag'}
                </h3>
                <p className="text-sm text-gray-600">
                  {aloneInKitchen 
                    ? 'Du har valgt at lave mad alene i dag' 
                    : 'Køkkenet er åbent for alle i dag'
                  }
                </p>
              </div>
              
              <Button
                onClick={handleToggleAloneChoice}
                className={`w-full max-w-xs mx-auto px-4 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 ${
                  aloneInKitchen 
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg' 
                    : 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg'
                }`}
                disabled={setKitchenPreferenceMutation.isPending}
              >
                {aloneInKitchen ? '🤝 Skift til delt køkken' : '👤 Vælg at være alene'}
              </Button>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="text-blue-500 text-lg">💡</div>
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">Hvordan virker det?</p>
                <p className="text-xs text-blue-700">
                  Hvis du vælger "være alene", kan de andre se det og respektere dit ønske om at have køkkenet for dig selv.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <Card className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-slate-600 to-slate-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <div className="mr-3 text-2xl p-2 rounded-full bg-white/20 backdrop-blur-sm">📋</div>
            Dagens oversigt
          </h2>
          <p className="text-slate-300 text-sm mt-1">Status på alle opgaver og præferencer</p>
        </div>
        
        <CardContent className="p-6">
          <div className="space-y-3">
            {Object.entries(TASK_CONFIG).map(([taskType, config]) => {
              const assignedResident = tasks[taskType as TaskType];
              
              return (
                <div key={taskType} className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${assignedResident ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200 border-dashed'}`}>
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl p-2 rounded-lg bg-white shadow-sm">
                      {config.emoji}
                    </div>
                    <span className="font-medium text-gray-800">
                      {config.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {assignedResident ? (
                      <>
                        <span className="text-green-600 text-lg">✓</span>
                        <span className="font-semibold text-gray-900 bg-white px-3 py-1 rounded-full border-2 border-green-200">
                          {assignedResident}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full border-2 border-dashed border-gray-300">
                        Ledig
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {aloneInKitchen && (
            <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200">
              <div className="flex items-center justify-center space-x-3">
                <div className="text-2xl p-2 rounded-full bg-orange-200">👤</div>
                <div className="text-center">
                  <p className="font-semibold text-orange-800">
                    Køkken præference: Alene
                  </p>
                  <p className="text-sm text-orange-700">
                    Køkkenet er reserveret til én person i dag
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dish of the Day in Summary */}
          {dishOfTheDay && (
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border-2 border-purple-200">
              <div className="flex items-center justify-center space-x-3">
                <div className="text-2xl p-2 rounded-full bg-purple-200">🍽️</div>
                <div className="text-center">
                  <p className="font-semibold text-purple-800">
                    Dagens ret: {dishOfTheDay}
                  </p>
                  <p className="text-sm text-purple-700">
                    Det laver I til aftensmad i dag
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Progress indicator */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Opgaver tildelt:</span>
              <span className="font-semibold text-gray-800">
                {Object.values(tasks).filter(Boolean).length} af {Object.keys(tasks).length}
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(Object.values(tasks).filter(Boolean).length / Object.keys(tasks).length) * 100}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <Button
          onClick={handleResetTasks}
          disabled={resetTasksMutation.isPending}
          variant="outline"
          className="px-6 py-3 rounded-xl font-semibold transition-colors duration-200"
        >
          🔄 Nulstil alle opgaver
        </Button>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Beboer App • Aftensmad koordinering</p>
        <p className="mt-1">
          Opdateret: {new Date().toLocaleTimeString('da-DK', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })} i dag
        </p>
      </footer>
    </div>
  );
}

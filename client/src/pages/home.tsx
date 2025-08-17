import { useState } from "react";
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
}

const TASK_CONFIG = {
  kok: { emoji: "🍳", title: "Kok", description: "Tilberede aftensmaden" },
  indkoeb: { emoji: "🛒", title: "Indkøb", description: "Handle ingredienser" },
  bord: { emoji: "🍽️", title: "Dække bord", description: "Sætte bordet til aftensmad" },
  opvask: { emoji: "🧽", title: "Vaske op", description: "Rydde op efter måltidet" },
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header Section */}
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Aftensmad i dag</h1>
        <p className="text-gray-600 font-medium">{formatDanishDate(currentDate)}</p>
        
        {/* Navigation */}
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            className="px-4 py-2"
          >
            I dag
          </Button>
          <Link href="/week">
            <Button
              variant="default"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Ugeoversigt
            </Button>
          </Link>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">💡 Skriv et navn og tryk Enter eller klik + for at tildele opgaver</p>
          <p className="text-xs text-blue-600 mt-1">Alle ændringer gemmes automatisk</p>
        </div>
      </header>

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
                <div key={taskType} className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{config.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{config.title}</h3>
                        <p className="text-sm text-gray-600">{config.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {assignedResident ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {assignedResident}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Ingen valgt
                        </span>
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
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Kitchen Preference Section */}
      <Card className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-warning-500 to-orange-500 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <span className="mr-2">👤</span>
            Køkken præference
          </h2>
          <p className="text-orange-100 text-sm mt-1">Vælg hvis du foretrækker at være alene i køkkenet</p>
        </div>
        
        <CardContent className="p-6">
          <div className="border border-gray-200 rounded-xl p-5 bg-warning-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Alene i køkkenet</h3>
                <p className="text-sm text-gray-600">Jeg foretrækker at lave mad alene</p>
              </div>
              <div className="text-right">
                {aloneInKitchen ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {aloneInKitchen}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Ingen valgt
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button
                onClick={handleToggleAloneChoice}
                className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  aloneInKitchen 
                    ? 'bg-success-500 hover:bg-success-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                disabled={setKitchenPreferenceMutation.isPending}
              >
                {aloneInKitchen ? 'Ja - Vil være alene' : 'Nej - Ikke alene'}
              </Button>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-medium">💡 Tip:</span> 
              Hvis ingen vælger "alene i køkkenet", kan alle være i køkkenet samtidig.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <Card className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Dagens oversigt</h2>
          <p className="text-gray-300 text-sm mt-1">Samlet overblik over aftensmad tildelinger</p>
        </div>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(TASK_CONFIG).map(([taskType, config]) => {
              const assignedResident = tasks[taskType as TaskType];
              
              return (
                <div key={taskType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">
                    {config.emoji} {config.title}:
                  </span>
                  <span className={`text-sm ${assignedResident ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                    {assignedResident || 'Ingen valgt'}
                  </span>
                </div>
              );
            })}
          </div>
          
          {aloneInKitchen && (
            <div className="mt-4 p-4 bg-warning-50 rounded-lg border border-warning-200">
              <div className="flex items-center">
                <span className="text-warning-600 mr-2">👤</span>
                <span className="text-sm font-medium text-warning-800">
                  Køkken præference: {aloneInKitchen} vil være alene
                </span>
              </div>
            </div>
          )}
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

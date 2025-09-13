import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Settings, Users, FileText, Edit, Save, X } from "lucide-react";

interface AppContent {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

export default function AdminPage() {
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ value: string; description: string }>({ value: "", description: "" });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to log in to access this page",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    if (!isLoading && isAuthenticated && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required to access this page",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }
  }, [isAuthenticated, isAdmin, isLoading, toast, setLocation]);

  // Fetch all app content
  const { data: contentList, isLoading: contentLoading } = useQuery<AppContent[]>({
    queryKey: ['/api/admin/content'],
    enabled: isAdmin,
  });

  // Update content mutation
  const updateContentMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      const response = await apiRequest('PUT', `/api/admin/content/${key}`, {
        value,
        description,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content'] });
      setEditingContent(null);
      toast({
        title: "Indhold opdateret",
        description: "Ændringerne er gemt succesfuldt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fejl",
        description: `Kunne ikke opdatere indholdet: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const makeAdminMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/make-admin");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admin access granted!",
      });
      // Refresh the page to update user data
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle editing content
  const handleEditContent = (content: AppContent) => {
    setEditingContent(content.key);
    setEditValues({
      value: content.value,
      description: content.description || "",
    });
  };

  const handleSaveContent = () => {
    if (!editingContent) return;
    
    updateContentMutation.mutate({
      key: editingContent,
      value: editValues.value,
      description: editValues.description,
    });
  };

  const handleCancelEdit = () => {
    setEditingContent(null);
    setEditValues({ value: "", description: "" });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Show button to become admin if user is not admin yet
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="rounded-2xl shadow-lg border border-orange-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-3">
              <Shield className="text-orange-500" size={32} />
              Administrator Adgang
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              Du skal have administrator rettigheder for at redigere indhold i appen.
            </p>
            <Button 
              onClick={() => makeAdminMutation.mutate()}
              disabled={makeAdminMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-make-admin"
            >
              {makeAdminMutation.isPending ? "Giver adgang..." : "Bliv Administrator"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="text-orange-500" size={36} />
          Administrator Panel
        </h1>
        <p className="text-gray-600 mt-2">Administrer indhold og indstillinger for Aftensmad appen</p>
      </div>

      {/* Content Management Section */}
      <Card className="rounded-2xl shadow-sm border border-gray-200 mb-8">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-3">
            <FileText className="text-blue-500" size={24} />
            App Indhold Management
          </CardTitle>
          <p className="text-gray-600 mt-2">Rediger tekster og beskrivelser som vises i appen</p>
        </CardHeader>
        <CardContent>
          {contentLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {contentList?.map((content) => (
                <div key={content.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{content.key}</h3>
                      {content.description && (
                        <p className="text-sm text-gray-600">{content.description}</p>
                      )}
                    </div>
                    {editingContent !== content.key && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditContent(content)}
                        data-testid={`button-edit-${content.key}`}
                      >
                        <Edit size={16} className="mr-1" />
                        Rediger
                      </Button>
                    )}
                  </div>
                  
                  {editingContent === content.key ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Indhold
                        </label>
                        <Textarea
                          value={editValues.value}
                          onChange={(e) => setEditValues(prev => ({ ...prev, value: e.target.value }))}
                          className="w-full"
                          rows={3}
                          data-testid={`input-content-value-${content.key}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Beskrivelse (valgfri)
                        </label>
                        <Input
                          value={editValues.description}
                          onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Beskrivelse af dette indhold..."
                          data-testid={`input-content-description-${content.key}`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveContent}
                          disabled={updateContentMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          data-testid={`button-save-${content.key}`}
                        >
                          <Save size={16} className="mr-1" />
                          {updateContentMutation.isPending ? "Gemmer..." : "Gem"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={updateContentMutation.isPending}
                          data-testid={`button-cancel-${content.key}`}
                        >
                          <X size={16} className="mr-1" />
                          Annuller
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-gray-900 whitespace-pre-wrap">{content.value}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current User Info */}
      <Card className="rounded-2xl shadow-sm border border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-xl text-green-800">Din Administrator Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {user?.profileImageUrl && (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <p className="font-semibold text-green-800">
                {user?.firstName} {user?.lastName} {!user?.firstName && !user?.lastName && user?.email}
              </p>
              <p className="text-sm text-green-600">Administrator</p>
              <p className="text-xs text-green-600">Fuld adgang til at redigere app indhold</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
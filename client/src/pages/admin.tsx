import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Settings, Users, FileText } from "lucide-react";

export default function AdminPage() {
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

      {/* Admin Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <FileText className="text-blue-500" size={24} />
              Indhold Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Rediger tekster, beskrivelser og meddelelser i appen</p>
            <Button variant="outline" className="w-full" data-testid="button-content-management">
              Administrer Indhold
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <Settings className="text-green-500" size={24} />
              Opgave Indstillinger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Konfigurer opgavetyper og beskrivelser</p>
            <Button variant="outline" className="w-full" data-testid="button-task-settings">
              Administrer Opgaver
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <Users className="text-purple-500" size={24} />
              Bruger Administration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Se brugere og administrer roller</p>
            <Button variant="outline" className="w-full" data-testid="button-user-management">
              Administrer Brugere
            </Button>
          </CardContent>
        </Card>
      </div>

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
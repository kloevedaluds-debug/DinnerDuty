import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { Link } from "wouter";

export function AdminButton() {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-orange-600 border-orange-300 hover:bg-orange-50"
        onClick={() => window.location.href = "/api/login"}
        data-testid="button-login"
      >
        Log ind
      </Button>
    );
  }

  if (isAdmin) {
    return (
      <Link href="/admin">
        <Button
          variant="outline"
          size="sm"
          className="text-orange-600 border-orange-300 hover:bg-orange-50 flex items-center gap-2"
          data-testid="button-admin-panel"
        >
          <Shield size={16} />
          Admin
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex gap-2">
      <Link href="/admin">
        <Button
          variant="outline"
          size="sm"
          className="text-orange-600 border-orange-300 hover:bg-orange-50"
          data-testid="button-become-admin"
        >
          Bliv Admin
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.location.href = "/api/logout"}
        data-testid="button-logout"
      >
        Log ud
      </Button>
    </div>
  );
}
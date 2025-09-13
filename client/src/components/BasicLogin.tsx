import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BasicLoginProps {
  onSuccess: () => void;
}

export function BasicLogin({ onSuccess }: BasicLoginProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email påkrævet",
        description: "Du skal indtaste en email adresse",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/basic/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, firstName, lastName }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      toast({
        title: "Login succesfuld",
        description: "Du er nu logget ind",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Login fejl",
        description: error.message || "Der skete en fejl under login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Log ind</CardTitle>
          <CardDescription className="text-center">
            Indtast dine oplysninger for at logge ind
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@email.dk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Fornavn</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Dit fornavn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                data-testid="input-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Efternavn</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Dit efternavn"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                data-testid="input-lastname"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Logger ind..." : "Log ind"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
import { useState, type FormEvent } from "react";
import { Mail, Lock, Loader2, UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "./Logo";
import { toast } from "sonner";

interface LoginViewProps {
  onLogin: (user: { user_id: number; email: string; username: string }) => void;
}

const LoginView = ({ onLogin }: LoginViewProps) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const isByuEmail = (value: string) =>
    /^[^\s@]+@byu\.edu$/i.test(value.trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        if (!isByuEmail(email)) {
          toast.error("Use a @byu.edu email", {
            description: "Only BYU email addresses can create an account.",
          });
          return;
        }
        const resp = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName: name }),
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          const msg = (data && typeof data.error === "string" && data.error) || "Could not create account";
          toast.error(msg);
          return;
        }

        const user = data?.user;
        if (!user?.user_id) {
          toast.error("Sign-up failed", { description: "Server response was missing user info." });
          return;
        }

        localStorage.setItem("blueride.user", JSON.stringify(user));
        toast.success("Account created!", { description: "You're signed in." });
        onLogin(user);
        return;
      }

      const resp = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = (data && typeof data.error === "string" && data.error) || "Sign-in failed";
        toast.error(msg);
        return;
      }

      const user = data?.user;
      if (!user?.user_id) {
        toast.error("Sign-in failed", { description: "Server response was missing user info." });
        return;
      }

      localStorage.setItem("blueride.user", JSON.stringify(user));
      toast.success("Welcome back!", { description: "Signed in successfully." });
      onLogin(user);
    } catch (err) {
      console.error(err);
      toast.error(isSignUp ? "Sign-up failed" : "Sign-in failed", {
        description: "Could not reach the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex flex-col items-center">
          <Logo />
          <p className="mt-3 text-center text-sm text-muted-foreground">
            BYU's trusted ride-sharing community
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {/* Trust badges */}
          <div className="mb-5 flex items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            <span className="text-xs font-medium text-primary-foreground">Verified BYU Students Only</span>
          </div>

          <h2 className="mb-5 text-center text-lg font-semibold text-foreground">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">BYU Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="netid@byu.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
              {isSignUp ? (
                <p className="text-xs text-muted-foreground">You must use an address ending in @byu.edu.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Create Account" : "Sign In")}
            </Button>
          </form>

          {/* <div className="mt-4 space-y-2">
            {!isSignUp && (
              <button className="w-full text-center text-sm text-primary hover:underline">
                Forgot password?
              </button>
            )} */}
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <span>{isSignUp ? "Already have an account?" : "New to Blue Ride?"}</span>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                {isSignUp ? "Sign In" : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Create Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
};

export default LoginView;

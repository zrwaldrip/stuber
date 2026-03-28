import { Radio } from "lucide-react";
import Logo from "./Logo";
import { useAppState } from "@/store/AppContext";

export type View = "login" | "profile" | "rides" | "post" | "my-rides" | "admin";

interface AppHeaderProps {
  onNavigate: (view: View) => void;
  isLoggedIn: boolean;
}

const AppHeader = ({ onNavigate, isLoggedIn }: AppHeaderProps) => {
  const { liveRideCount } = useAppState();

  if (!isLoggedIn) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <button onClick={() => onNavigate("rides")} className="flex items-center">
          <Logo />
        </button>

        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <button
            onClick={() => onNavigate("rides")}
            className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Radio className="h-3 w-3 animate-pulse" />
            {liveRideCount} Live
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

import { useState } from "react";
import { Menu, X, User, MapPin, PlusCircle, LogOut, Radio, BookMarked } from "lucide-react";
import Logo from "./Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAppState } from "@/store/AppContext";
import { toast } from "sonner";

export type View = "login" | "profile" | "rides" | "post" | "my-rides";

interface AppHeaderProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
}

const AppHeader = ({ currentView, onNavigate, isLoggedIn, onLogout }: AppHeaderProps) => {
  const [open, setOpen] = useState(false);
  const { liveRideCount } = useAppState();

  const navItems = [
    { label: "My Account", icon: User, view: "profile" as View },
    { label: "Find a Ride", icon: MapPin, view: "rides" as View },
    { label: "My Rides", icon: BookMarked, view: "my-rides" as View },
    { label: "Post a Ride", icon: PlusCircle, view: "post" as View },
  ];

  const frequentRoutes = [
    { from: "Heritage Halls", to: "Tanner Building" },
    { from: "The Village", to: "Campus Plaza" },
  ];

  const handleNav = (view: View) => {
    onNavigate(view);
    setOpen(false);
  };

  const handleLogout = () => {
    toast("Signed out", { description: "See you next ride!" });
    onLogout();
    setOpen(false);
  };

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

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-secondary p-0">
              <div className="flex h-full flex-col">
                <div className="border-b border-sidebar-border p-6">
                  <Logo />
                </div>
                <nav className="flex flex-1 flex-col gap-1 p-4">
                  {navItems.map((item) => (
                    <button
                      key={item.view}
                      onClick={() => handleNav(item.view)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                        currentView === item.view
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}

                  {/* Frequent Routes */}
                  <div className="mt-4 border-t border-sidebar-border pt-4">
                    <span className="px-4 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">Frequent Routes</span>
                    {frequentRoutes.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => handleNav("rides")}
                        className="mt-2 flex items-center gap-2 rounded-lg px-4 py-2 text-left text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                      >
                        <MapPin className="h-3 w-3 text-sidebar-primary" />
                        {r.from} → {r.to}
                      </button>
                    ))}
                  </div>
                </nav>
                <div className="border-t border-sidebar-border p-4">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

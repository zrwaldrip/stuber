import { User, MapPin, PlusCircle, BookMarked } from "lucide-react";
import type { View } from "./AppHeader";

interface BottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const BottomNav = ({ currentView, onNavigate }: BottomNavProps) => {
  const items = [
    { view: "rides" as View, icon: MapPin, label: "Rides" },
    { view: "my-rides" as View, icon: BookMarked, label: "My Rides" },
    { view: "post" as View, icon: PlusCircle, label: "Post" },
    { view: "profile" as View, icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {items.map((item) => {
          const active = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-4 py-1.5 transition-colors ${
                active
                  ? "text-foreground dark:bg-accent/15 dark:text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.view === "post" ? (
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"} transition-colors`}>
                  <item.icon className="h-5 w-5" />
                </div>
              ) : (
                <item.icon className="h-5 w-5" />
              )}
              {item.view !== "post" && (
                <span className="text-[10px] font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

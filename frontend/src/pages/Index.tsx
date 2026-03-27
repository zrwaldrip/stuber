import { useState } from "react";
import LoginView from "@/components/LoginView";
import ProfileView from "@/components/ProfileView";
import RidesView from "@/components/RidesView";
import PostRideView from "@/components/PostRideView";
import MyRidesView from "@/components/MyRidesView";
import AppHeader, { type View } from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { AppProvider } from "@/store/AppContext";

const AppContent = () => {
  const [currentView, setCurrentView] = useState<View>("login");
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const raw = localStorage.getItem("blueride.user");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return typeof parsed?.user_id === "number";
    } catch {
      return false;
    }
  });
  const [userId, setUserId] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem("blueride.user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed?.user_id === "number" ? parsed.user_id : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (user: { user_id: number }) => {
    setIsLoggedIn(true);
    setUserId(user.user_id);
    setCurrentView("rides");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserId(null);
    localStorage.removeItem("blueride.user");
    setCurrentView("login");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        currentView={currentView}
        onNavigate={setCurrentView}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />
      <main>
        {currentView === "login" && <LoginView onLogin={handleLogin} />}
        {currentView === "profile" && userId != null && <ProfileView userId={userId} />}
        {currentView === "rides" && <RidesView />}
        {currentView === "post" && userId != null && (
          <PostRideView userId={userId} onComplete={() => setCurrentView("rides")} />
        )}
        {currentView === "my-rides" && <MyRidesView />}
      </main>
      {isLoggedIn && <BottomNav currentView={currentView} onNavigate={setCurrentView} />}
    </div>
  );
};

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;

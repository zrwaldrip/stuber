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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentView("rides");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
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
        {currentView === "profile" && <ProfileView />}
        {currentView === "rides" && <RidesView />}
        {currentView === "post" && <PostRideView onComplete={() => setCurrentView("rides")} />}
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

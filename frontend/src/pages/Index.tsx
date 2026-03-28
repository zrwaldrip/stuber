import { useEffect, useState } from "react";
import LoginView from "@/components/LoginView";
import ProfileView from "@/components/ProfileView";
import RidesView from "@/components/RidesView";
import PostRideView from "@/components/PostRideView";
import MyRidesView from "@/components/MyRidesView";
import AdminUsersView from "@/components/AdminUsersView";
import AppHeader, { type View } from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { AppProvider } from "@/store/AppContext";

const getStoredUserId = () => {
  try {
    const raw = localStorage.getItem("blueride.user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const userId = Number(parsed?.user_id);
    return Number.isFinite(userId) ? userId : null;
  } catch {
    return null;
  }
};

const isStoredAdmin = () => {
  try {
    const raw = localStorage.getItem("blueride.user");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.user_level === "admin";
  } catch {
    return false;
  }
};

const AppContent = () => {
  const [userId, setUserId] = useState<number | null>(() => getStoredUserId());
  const [isLoggedIn, setIsLoggedIn] = useState(() => getStoredUserId() != null);
  const [currentView, setCurrentView] = useState<View>(() => (getStoredUserId() != null ? "rides" : "login"));

  const handleLogin = (user: { user_id: number; user_level?: string }) => {
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

  useEffect(() => {
    if (!isLoggedIn && currentView !== "login") {
      setCurrentView("login");
      return;
    }

    if (isLoggedIn && currentView === "login") {
      setCurrentView("rides");
    }
  }, [isLoggedIn, currentView]);

  useEffect(() => {
    if (currentView === "admin" && !isStoredAdmin()) {
      setCurrentView("profile");
    }
  }, [currentView]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        onNavigate={setCurrentView}
        isLoggedIn={isLoggedIn}
      />
      <main>
        {currentView === "login" && <LoginView onLogin={handleLogin} />}
        {currentView === "profile" && userId != null && (
          <ProfileView userId={userId} onLogout={handleLogout} onNavigate={setCurrentView} />
        )}
        {currentView === "admin" && userId != null && isStoredAdmin() && (
          <AdminUsersView actingUserId={userId} onNavigate={setCurrentView} />
        )}
        {currentView === "rides" && <RidesView />}
        {currentView === "post" && userId != null && (
          <PostRideView userId={userId} onComplete={() => setCurrentView("rides")} />
        )}
        {currentView === "my-rides" && <MyRidesView />}
      </main>
      {isLoggedIn && currentView !== "login" && <BottomNav currentView={currentView} onNavigate={setCurrentView} />}
    </div>
  );
};

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;

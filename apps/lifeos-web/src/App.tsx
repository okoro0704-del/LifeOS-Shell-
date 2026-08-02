import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { WelcomePage } from "./pages/Welcome";
import { CallbackPage } from "./pages/Callback";
import { HomePage } from "./pages/Home";
import { WalletPage } from "./pages/Wallet";
import { DiscoverPage } from "./pages/Discover";
import { ActivityPage } from "./pages/Activity";
import { ProfilePage } from "./pages/Profile";
import { NotificationsPage } from "./pages/Notifications";
import { SearchPage } from "./pages/Search";
import { ConnectionsPage } from "./pages/Connections";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="discover" element={<DiscoverPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="connections" element={<ConnectionsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

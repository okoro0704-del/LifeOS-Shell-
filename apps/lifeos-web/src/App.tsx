import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { CommandLayerProvider } from "./hooks/useCommandLayer";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { WelcomePage } from "./pages/Welcome";
import { CallbackPage } from "./pages/Callback";
import { Skeleton } from "@lifeos/ui";

const HomePage = lazy(() => import("./pages/Home").then((m) => ({ default: m.HomePage })));
const WalletPage = lazy(() => import("./pages/Wallet").then((m) => ({ default: m.WalletPage })));
const DiscoverPage = lazy(() =>
  import("./pages/Discover").then((m) => ({ default: m.DiscoverPage })),
);
const ActivityPage = lazy(() =>
  import("./pages/Activity").then((m) => ({ default: m.ActivityPage })),
);
const ProfilePage = lazy(() => import("./pages/Profile").then((m) => ({ default: m.ProfilePage })));
const NotificationsPage = lazy(() =>
  import("./pages/Notifications").then((m) => ({ default: m.NotificationsPage })),
);
const SearchPage = lazy(() => import("./pages/Search").then((m) => ({ default: m.SearchPage })));
const ConnectionsPage = lazy(() =>
  import("./pages/Connections").then((m) => ({ default: m.ConnectionsPage })),
);

function PageFallback() {
  return (
    <div className="page page-enter" aria-busy="true">
      <Skeleton height={48} label="Loading page" />
      <Skeleton height={120} />
      <Skeleton height={160} />
    </div>
  );
}

function ThemedApp() {
  const { user } = useAuth();
  return (
    <ThemeProvider initial={user?.preferences.theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route element={<RequireAuth />}>
            <Route
              path="/app"
              element={
                <CommandLayerProvider>
                  <AppShell />
                </CommandLayerProvider>
              }
            >
              <Route
                index
                element={
                  <Suspense fallback={<PageFallback />}>
                    <HomePage />
                  </Suspense>
                }
              />
              <Route
                path="wallet"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <WalletPage />
                  </Suspense>
                }
              />
              <Route
                path="discover"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <DiscoverPage />
                  </Suspense>
                }
              />
              <Route
                path="activity"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ActivityPage />
                  </Suspense>
                }
              />
              <Route
                path="profile"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="notifications"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <NotificationsPage />
                  </Suspense>
                }
              />
              <Route
                path="search"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <SearchPage />
                  </Suspense>
                }
              />
              <Route
                path="connections"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ConnectionsPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ThemedApp />
    </AuthProvider>
  );
}

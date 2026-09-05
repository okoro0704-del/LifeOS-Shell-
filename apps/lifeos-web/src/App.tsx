import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { CommandLayerProvider } from "./hooks/useCommandLayer";
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import { personalLandingPath } from "./lib/personalConnectivity";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { WelcomePage } from "./pages/Welcome";
import { LoginPage } from "./pages/Login";
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
const PlansPage = lazy(() => import("./pages/Plans").then((m) => ({ default: m.PlansPage })));
const SavedPage = lazy(() => import("./pages/Saved").then((m) => ({ default: m.SavedPage })));
const ServicesPage = lazy(() =>
  import("./pages/Services").then((m) => ({ default: m.ServicesPage })),
);
const ServiceCategoryPage = lazy(() =>
  import("./pages/Services").then((m) => ({ default: m.ServiceCategoryPage })),
);
const OfferingFeedPage = lazy(() =>
  import("./pages/OfferingFeed").then((m) => ({ default: m.OfferingFeedPage })),
);
const ServicesExplorePage = lazy(() =>
  import("./pages/ServicesExplore").then((m) => ({ default: m.ServicesExplorePage })),
);
const ServiceSellersPage = lazy(() =>
  import("./pages/ServiceSellers").then((m) => ({ default: m.ServiceSellersPage })),
);
const BusinessPage = lazy(() =>
  import("./pages/Business").then((m) => ({ default: m.BusinessPage })),
);
const MessagesPage = lazy(() =>
  import("./pages/Messages").then((m) => ({ default: m.MessagesPage })),
);
const ShellAppPage = lazy(() =>
  import("./pages/ShellApp").then((m) => ({ default: m.ShellAppPage })),
);
const ServiceOSCatalogPage = lazy(() =>
  import("./routes/app/serviceos").then((m) => ({ default: m.ServiceOSCatalogPage })),
);
const ServiceOSTrackPage = lazy(() =>
  import("./routes/app/serviceos").then((m) => ({ default: m.ServiceOSTrackPage })),
);
const PersonalRoutes = lazy(() =>
  import("./routes/personalRoutes").then((m) => ({ default: m.PersonalRoutes })),
);
const SharedRoutes = lazy(() =>
  import("./routes/sharedRoutes").then((m) => ({ default: m.SharedRoutes })),
);
const BusinessHomePage = lazy(() =>
  import("./pages/business/BusinessHomePage").then((m) => ({
    default: m.BusinessHomePage,
  })),
);
const BusinessModulesPage = lazy(() =>
  import("./pages/workspace/WorkspacePlaceholders").then((m) => ({
    default: m.BusinessModulesPage,
  })),
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

function WorkspaceHomeRedirect() {
  const { setMode } = useWorkspace();
  useEffect(() => {
    setMode("PERSONAL");
  }, [setMode]);
  return <Navigate to={personalLandingPath()} replace />;
}

function ThemedApp() {
  const { user } = useAuth();
  return (
    <ThemeProvider initial={user?.preferences.theme}>
      <WorkspaceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
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
                <Route index element={<WorkspaceHomeRedirect />} />
                <Route
                  path="personal/*"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <PersonalRoutes />
                    </Suspense>
                  }
                />
                <Route
                  path="shared/*"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <SharedRoutes />
                    </Suspense>
                  }
                />
                <Route
                  path="business"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <BusinessHomePage />
                    </Suspense>
                  }
                />
                <Route
                  path="business/modules"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <BusinessModulesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="legacy-home"
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
                  path="messages"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <MessagesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="shell/:appId"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ShellAppPage />
                    </Suspense>
                  }
                />
                <Route path="serviceos" element={<Navigate to="/app/serviceos/catalog" replace />} />
                <Route
                  path="serviceos/catalog"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ServiceOSCatalogPage />
                    </Suspense>
                  }
                />
                <Route
                  path="serviceos/track/:bookingId"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ServiceOSTrackPage />
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
                <Route
                  path="plans"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <PlansPage />
                    </Suspense>
                  }
                />
                <Route
                  path="saved"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <SavedPage />
                    </Suspense>
                  }
                />
                <Route
                  path="services"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ServicesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="services/explore"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ServicesExplorePage />
                    </Suspense>
                  }
                />
                <Route
                  path="services/explore/:conceptId"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ServiceSellersPage />
                    </Suspense>
                  }
                />
                <Route
                  path="business/:businessId"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <BusinessPage />
                    </Suspense>
                  }
                />
                <Route
                  path="services/:category/feed"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <OfferingFeedPage />
                    </Suspense>
                  }
                />
                <Route
                  path="services/:category"
                  element={
                    <Suspense fallback={<PageFallback />}>
                      <ServiceCategoryPage />
                    </Suspense>
                  }
                />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
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

import { Navigate, Route, Routes } from "react-router-dom";
import { IdentityPage } from "../pages/shared/IdentityPage";
import { SecurityPage } from "../pages/shared/SecurityPage";
import { SharedNotificationsPage } from "../pages/shared/NotificationsPage";
import { DataBridgePage } from "../pages/shared/DataBridgePage";

/** Shared settings routes under `/app/shared/*` (both workspaces). */
export function SharedRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="identity" replace />} />
      <Route path="identity" element={<IdentityPage />} />
      <Route path="security" element={<SecurityPage />} />
      <Route path="notifications" element={<SharedNotificationsPage />} />
      <Route path="bridge" element={<DataBridgePage />} />
      <Route path="*" element={<Navigate to="identity" replace />} />
    </Routes>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import { VaultPage } from "../pages/personal/VaultPage";
import { DiscoveryPage } from "../pages/personal/DiscoveryPage";
import { FinancePage } from "../pages/personal/FinancePage";
import { PersonalHomePage } from "../pages/personal/PersonalHomePage";
import { PersonalKernelGestures } from "../components/shell/PersonalKernelGestures";

/**
 * Personal space — Main home + Offline/Free kernels (body double-tap).
 * Bottom tabs stay Home · Activity · Finance.
 */
export function PersonalRoutes() {
  return (
    <PersonalKernelGestures>
      <Routes>
        <Route index element={<PersonalHomePage />} />
        <Route path="main" element={<Navigate to="/app/personal" replace />} />
        <Route path="offline" element={<VaultPage />} />
        <Route path="free" element={<DiscoveryPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="vault" element={<Navigate to="/app/personal/offline" replace />} />
        <Route path="discovery" element={<Navigate to="/app/personal/free" replace />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </PersonalKernelGestures>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import { VaultPage } from "../pages/personal/VaultPage";
import { DiscoveryPage } from "../pages/personal/DiscoveryPage";
import { PersonalHomePage } from "../pages/personal/PersonalHomePage";
import { PersonalKernelGestures } from "../components/shell/PersonalKernelGestures";

/**
 * Personal space — three kernels under `/app/personal/*`:
 * Offline (vault) · Main (default on login/switch) · Free (discovery).
 * Business (consume/patronize) lives under `/app/business`.
 */
export function PersonalRoutes() {
  return (
    <PersonalKernelGestures>
      <Routes>
        <Route index element={<PersonalHomePage />} />
        <Route path="main" element={<Navigate to="/app/personal" replace />} />
        <Route path="offline" element={<VaultPage />} />
        <Route path="free" element={<DiscoveryPage />} />
        {/* Legacy aliases */}
        <Route path="vault" element={<Navigate to="/app/personal/offline" replace />} />
        <Route path="discovery" element={<Navigate to="/app/personal/free" replace />} />
        <Route path="finance" element={<Navigate to="/app/wallet" replace />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </PersonalKernelGestures>
  );
}

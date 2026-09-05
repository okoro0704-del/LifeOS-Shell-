import { Navigate, Route, Routes } from "react-router-dom";
import { VaultPage } from "../pages/personal/VaultPage";
import { DiscoveryPage } from "../pages/personal/DiscoveryPage";
import { FinancePage } from "../pages/personal/FinancePage";
import { PersonalHomePage } from "../pages/personal/PersonalHomePage";

/** Nested personal workspace routes under `/app/personal/*`. */
export function PersonalRoutes() {
  return (
    <Routes>
      <Route index element={<PersonalHomePage />} />
      <Route path="vault" element={<VaultPage />} />
      <Route path="discovery" element={<DiscoveryPage />} />
      <Route path="finance" element={<FinancePage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import { FinancePage } from "../pages/personal/FinancePage";
import { PersonalHomePage } from "../pages/personal/PersonalHomePage";

/**
 * Consumer (personal) space routes under `/app/personal/*`.
 * Vault / Digiconomy kernels live in the personal user app — not this shell.
 */
export function PersonalRoutes() {
  return (
    <Routes>
      <Route index element={<PersonalHomePage />} />
      <Route path="finance" element={<FinancePage />} />
      {/* Legacy Digiconomy paths → consumer surfaces */}
      <Route path="vault" element={<Navigate to="/app/activity" replace />} />
      <Route path="discovery" element={<Navigate to="/app/personal/finance" replace />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import { VaultPage } from "../pages/personal/VaultPage";
import { DiscoveryPage } from "../pages/personal/DiscoveryPage";
import {
  PersonalCommunitiesPage,
  PersonalHomePage,
  PersonalPostPage,
  PersonalReelsPage,
} from "../pages/personal/PersonalHomePage";
import { LearnVerseRoutes } from "../pages/personal/LearnVersePage";
import { StreamifyRoutes } from "../pages/personal/StreamifyPage";
import { PersonalPlusPage } from "../pages/personal/PersonalPlusPage";
import { PersonalKernelGestures } from "../components/shell/PersonalKernelGestures";

/**
 * Personal space — Home (Post/Reels/Communities), LearnVerse, Streamify, Plus.
 * Kernels Offline/Free via body double-tap; Main requires Premium for paid streams.
 */
export function PersonalRoutes() {
  return (
    <PersonalKernelGestures>
      <Routes>
        <Route index element={<PersonalHomePage />} />
        <Route path="post" element={<PersonalPostPage />} />
        <Route path="reels" element={<PersonalReelsPage />} />
        <Route path="communities" element={<PersonalCommunitiesPage />} />
        <Route path="main" element={<Navigate to="/app/personal/post" replace />} />
        <Route path="learnverse/*" element={<LearnVerseRoutes />} />
        <Route path="streamify/*" element={<StreamifyRoutes />} />
        <Route path="plus" element={<PersonalPlusPage />} />
        <Route path="offline" element={<VaultPage />} />
        <Route path="free" element={<DiscoveryPage />} />
        <Route path="finance" element={<Navigate to="/app/wallet" replace />} />
        <Route path="vault" element={<Navigate to="/app/personal/offline" replace />} />
        <Route path="discovery" element={<Navigate to="/app/personal/free" replace />} />
        <Route path="*" element={<Navigate to="post" replace />} />
      </Routes>
    </PersonalKernelGestures>
  );
}

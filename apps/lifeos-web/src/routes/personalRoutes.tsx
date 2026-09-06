import { Navigate, Route, Routes } from "react-router-dom";
import {
  FreeCommunitiesPage,
  FreeConnectsPage,
  FreeKernelHome,
  FreePostPage,
  FreeReelsPage,
  OfflineCommunitiesPage,
  OfflineConnectsPage,
  OfflineKernelHome,
  OfflinePostPage,
  OfflineReelsPage,
  PersonalCommunitiesPage,
  PersonalConnectsPage,
  PersonalHomePage,
  PersonalPostPage,
  PersonalReelsPage,
} from "../pages/personal/PersonalHomePage";
import { LearnVerseRoutes } from "../pages/personal/LearnVersePage";
import { StreamifyRoutes } from "../pages/personal/StreamifyPage";
import { PersonalPlusPage } from "../pages/personal/PersonalPlusPage";
import { PersonalKernelGestures } from "../components/shell/PersonalKernelGestures";

/**
 * Personal space — same Home UI across Main / Free / Offline kernels.
 * Main: Premium · Free: creator-free · Offline: bought/consumed.
 */
export function PersonalRoutes() {
  return (
    <PersonalKernelGestures>
      <Routes>
        <Route index element={<PersonalHomePage />} />
        <Route path="post" element={<PersonalPostPage />} />
        <Route path="reels" element={<PersonalReelsPage />} />
        <Route path="connects" element={<PersonalConnectsPage />} />
        <Route path="communities" element={<PersonalCommunitiesPage />} />
        <Route path="main" element={<Navigate to="/app/personal/post" replace />} />

        <Route path="free" element={<FreeKernelHome />} />
        <Route path="free/post" element={<FreePostPage />} />
        <Route path="free/reels" element={<FreeReelsPage />} />
        <Route path="free/connects" element={<FreeConnectsPage />} />
        <Route path="free/communities" element={<FreeCommunitiesPage />} />
        <Route path="discovery" element={<Navigate to="/app/personal/free/post" replace />} />

        <Route path="offline" element={<OfflineKernelHome />} />
        <Route path="offline/post" element={<OfflinePostPage />} />
        <Route path="offline/reels" element={<OfflineReelsPage />} />
        <Route path="offline/connects" element={<OfflineConnectsPage />} />
        <Route path="offline/communities" element={<OfflineCommunitiesPage />} />
        <Route path="vault" element={<Navigate to="/app/personal/offline/post" replace />} />

        <Route path="learnverse/*" element={<LearnVerseRoutes />} />
        <Route path="streamify/*" element={<StreamifyRoutes />} />
        <Route path="plus" element={<PersonalPlusPage />} />
        <Route path="finance" element={<Navigate to="/app/wallet" replace />} />
        <Route path="*" element={<Navigate to="post" replace />} />
      </Routes>
    </PersonalKernelGestures>
  );
}

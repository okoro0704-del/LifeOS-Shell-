import { Navigate, Route, Routes } from "react-router-dom";
import {
  FreeCommunitiesPage,
  FreeKernelHome,
  FreePostPage,
  FreeProductsPage,
  FreeReelsPage,
  FreeSearchPage,
  OfflineCommunitiesPage,
  OfflineKernelHome,
  OfflinePostPage,
  OfflineProductsPage,
  OfflineReelsPage,
  OfflineSearchPage,
  PersonalCommunitiesPage,
  PersonalHomePage,
  PersonalPostPage,
  PersonalPremiumPage,
  PersonalProductsPage,
  PersonalReelsPage,
  PersonalSearchPage,
} from "../pages/personal/PersonalHomePage";
import { LearnVerseRoutes } from "../pages/personal/LearnVersePage";
import { StreamifyRoutes } from "../pages/personal/StreamifyPage";
import { PersonalPlusPage } from "../pages/personal/PersonalPlusPage";
import { CreatorPwaPage } from "../pages/personal/CreatorPwaPage";
import { PersonalKernelGestures } from "../components/shell/PersonalKernelGestures";

/**
 * Personal space — content streamed from creator PWAs; ElCom for Connect.
 */
export function PersonalRoutes() {
  return (
    <PersonalKernelGestures>
      <Routes>
        <Route index element={<PersonalHomePage />} />
        <Route path="post" element={<PersonalPostPage />} />
        <Route path="reels" element={<PersonalReelsPage />} />
        <Route path="products" element={<PersonalProductsPage />} />
        <Route path="communities" element={<PersonalCommunitiesPage />} />
        <Route path="search" element={<PersonalSearchPage />} />
        <Route path="connects" element={<Navigate to="../products" replace />} />
        <Route path="premium" element={<PersonalPremiumPage />} />
        <Route path="compose" element={<Navigate to="../post" replace />} />
        <Route path="creator/:creatorId" element={<CreatorPwaPage />} />
        <Route path="main" element={<Navigate to="/app/personal/post" replace />} />
        <Route path="learnverse/*" element={<LearnVerseRoutes />} />
        <Route path="streamify/*" element={<StreamifyRoutes />} />
        <Route path="plus" element={<PersonalPlusPage />} />

        <Route path="free" element={<FreeKernelHome />} />
        <Route path="free/post" element={<FreePostPage />} />
        <Route path="free/reels" element={<FreeReelsPage />} />
        <Route path="free/products" element={<FreeProductsPage />} />
        <Route path="free/communities" element={<FreeCommunitiesPage />} />
        <Route path="free/search" element={<FreeSearchPage />} />
        <Route path="free/connects" element={<Navigate to="../products" replace />} />
        <Route path="free/learnverse/*" element={<LearnVerseRoutes />} />
        <Route path="free/streamify/*" element={<StreamifyRoutes />} />
        <Route path="free/plus" element={<PersonalPlusPage />} />
        <Route path="free/compose" element={<Navigate to="/app/personal/free/post" replace />} />
        <Route path="discovery" element={<Navigate to="/app/personal/free/post" replace />} />

        <Route path="offline" element={<OfflineKernelHome />} />
        <Route path="offline/post" element={<OfflinePostPage />} />
        <Route path="offline/reels" element={<OfflineReelsPage />} />
        <Route path="offline/products" element={<OfflineProductsPage />} />
        <Route path="offline/communities" element={<OfflineCommunitiesPage />} />
        <Route path="offline/search" element={<OfflineSearchPage />} />
        <Route path="offline/connects" element={<Navigate to="../products" replace />} />
        <Route path="offline/learnverse/*" element={<LearnVerseRoutes />} />
        <Route path="offline/streamify/*" element={<StreamifyRoutes />} />
        <Route path="offline/plus" element={<PersonalPlusPage />} />
        <Route path="offline/compose" element={<Navigate to="/app/personal/offline/post" replace />} />
        <Route path="vault" element={<Navigate to="/app/personal/offline/post" replace />} />

        <Route path="finance" element={<Navigate to="/app/wallet" replace />} />
        <Route path="*" element={<Navigate to="post" replace />} />
      </Routes>
    </PersonalKernelGestures>
  );
}

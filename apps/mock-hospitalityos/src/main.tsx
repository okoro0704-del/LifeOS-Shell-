import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RequireHosSession } from "./components/RequireHosSession";
import { HotelHome } from "./pages/HotelHome";
import { RoomDetail } from "./pages/RoomDetail";
import { RestaurantPage } from "./pages/Restaurant";
import { ApartmentPage } from "./pages/Apartment";
import { LifeOsAuthPage } from "./pages/LifeOsAuth";
import "./styles.css";

const basename = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename === "/" ? undefined : basename}>
      <Routes>
        <Route path="/auth/lifeos" element={<LifeOsAuthPage />} />
        <Route
          path="/"
          element={
            <RequireHosSession>
              <HotelHome />
            </RequireHosSession>
          }
        />
        <Route
          path="/rooms/:id"
          element={
            <RequireHosSession>
              <RoomDetail />
            </RequireHosSession>
          }
        />
        <Route
          path="/restaurant"
          element={
            <RequireHosSession>
              <RestaurantPage />
            </RequireHosSession>
          }
        />
        <Route
          path="/apartment"
          element={
            <RequireHosSession>
              <ApartmentPage />
            </RequireHosSession>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);

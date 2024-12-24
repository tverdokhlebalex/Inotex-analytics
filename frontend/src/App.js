import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import Navigation from "./components/Navigation"; // Навигация по основным разделам
import TabNavigation from "./components/TabNavigation"; // Вкладки для разделов
// import PrivateRoute from "../src/components/PrivateRoute"; // Временно отключено
import UploadPage from "./pages/UploadPage";
import ProductionBudget from "./pages/ProductionBudget";
import ProductionSupply from "./pages/ProductionSupply";
import ProductionRepair from "./pages/ProductionRepair";
import ProductionQuality from "./pages/ProductionQuality";

function App() {
  return (
    <AuthProvider>
      <Router basename="/Inotex-analytics">
        <Routes>
          {/* Основная навигация */}
          <Route path="/" element={<Navigation />} />

          {/* Раздел "Производство" с вложенными маршрутами */}
          <Route
            path="/production/*"
            element={
              <div>
                <TabNavigation /> {/* Вкладки "Производства" */}
                <Routes>
                  <Route path="summary" element={<UploadPage />} />
                  <Route
                    path="budget"
                    element={
                      <div>
                        <ProductionBudget />
                        <div className="text-center text-gray-500 mt-4">
                          Страница временно недоступна
                        </div>
                      </div>
                    } // Страница недоступна
                  />
                  <Route path="supply" element={<ProductionSupply />} />
                  <Route
                    path="repair"
                    element={
                      <div>
                        <ProductionRepair />
                        <div className="text-center text-gray-500 mt-4">
                          Страница временно недоступна
                        </div>
                      </div>
                    } // Страница недоступна
                  />
                  <Route
                    path="quality"
                    element={
                      <div>
                        <ProductionQuality />
                        <div className="text-center text-gray-500 mt-4">
                          Страница временно недоступна
                        </div>
                      </div>
                    } // Страница недоступна
                  />
                </Routes>
              </div>
            }
          />

          {/* Обработка несуществующих маршрутов */}
          <Route path="*" element={<div>Страница не найдена</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

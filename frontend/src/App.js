import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "../src/components/PrivateRoute";

import LoginPage from "./pages/LoginPage";
import UploadPage from "./pages/UploadPage";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Маршрут для страницы авторизации */}
          <Route path="/" element={<LoginPage />} />

          {/* Защищенный маршрут для страницы загрузки */}
          <Route
            path="/upload"
            element={
              <PrivateRoute>
                <UploadPage />
              </PrivateRoute>
            }
          />

          {/* Дополнительные маршруты при необходимости */}
          <Route path="*" element={<div>Страница не найдена</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

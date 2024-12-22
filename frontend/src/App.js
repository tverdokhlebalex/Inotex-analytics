import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
// import PrivateRoute from "../src/components/PrivateRoute"; // Временно отключено
import UploadPage from "./pages/UploadPage";

function App() {
  return (
    <AuthProvider>
      <Router basename="/Inotex-analytics">
        <Routes>
          {/* Временно перенаправляем корневой маршрут на UploadPage */}
          <Route path="/" element={<UploadPage />} />

          {/* Дополнительные маршруты */}
          <Route path="*" element={<div>Страница не найдена</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

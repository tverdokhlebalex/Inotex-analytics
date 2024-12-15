import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";

function PrivateRoute({ children }) {
  const { authToken } = useContext(AuthContext); // Получаем токен из контекста
  const location = useLocation(); // Хук для получения текущего пути

  // Если пользователь не авторизован, перенаправляем на страницу логина,
  // сохраняя текущий маршрут для дальнейшего перенаправления
  if (!authToken) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Если пользователь авторизован, отображаем защищенные компоненты
  return children;
}

// Экспорт компонента по умолчанию
export default PrivateRoute;

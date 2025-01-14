import React from "react";

function PrivateRoute({ children }) {
  // Временно убрана проверка токена, чтобы пропускать всех пользователей
  return children;
}

export default PrivateRoute;

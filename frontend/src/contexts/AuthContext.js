import React, { createContext, useState } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(() => {
    // Инициализация токена из localStorage при первом рендере
    return localStorage.getItem("authToken") || null;
  });

  const login = (token) => {
    // Сохраняем токен в localStorage и обновляем состояние
    localStorage.setItem("authToken", token);
    setAuthToken(token);
  };

  const logout = () => {
    // Удаляем токен из localStorage и очищаем состояние
    localStorage.removeItem("authToken");
    setAuthToken(null);
  };

  // Вы можете добавить дополнительные проверки токена здесь (например, проверку срока действия токена)

  return (
    <AuthContext.Provider value={{ authToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  // Учетные данные пользователей
  const validUsers = [{ username: "inotex-admin", password: "123454321" }];

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = validUsers.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      navigate("/upload"); // Перенаправляем на страницу загрузки
    } else {
      alert("Неверное имя пользователя или пароль.");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-80">
        <h1 className="text-2xl font-bold text-center mb-4">Авторизация</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-1"
              placeholder="Введите имя пользователя"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-1"
              placeholder="Введите пароль"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
          >
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;

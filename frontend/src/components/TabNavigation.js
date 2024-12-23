import React from "react";
import { Link, useLocation } from "react-router-dom";

function TabNavigation() {
  const location = useLocation(); // Получаем текущий путь

  // Определяем активную вкладку по текущему маршруту
  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex bg-gray-200 p-2 justify-center space-x-4">
      {/* Вкладка "Сводка" */}
      <Link
        to="/production/summary"
        className={`px-4 py-2 rounded ${
          isActive("/production/summary")
            ? "bg-blue-500 text-white"
            : "bg-gray-300 text-gray-600 hover:bg-gray-400"
        }`}
      >
        Сводка
      </Link>

      {/* Вкладка "Бюджет" */}
      <div
        className={`px-4 py-2 rounded ${
          isActive("/production/budget")
            ? "bg-blue-500 text-white"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
        onClick={() => alert("Раздел находится в разработке.")}
      >
        Бюджет
      </div>

      {/* Вкладка "Обеспечение" */}
      <div
        className={`px-4 py-2 rounded ${
          isActive("/production/supply")
            ? "bg-blue-500 text-white"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
        onClick={() => alert("Раздел находится в разработке.")}
      >
        Обеспечение
      </div>

      {/* Вкладка "Ремонт" */}
      <div
        className={`px-4 py-2 rounded ${
          isActive("/production/repair")
            ? "bg-blue-500 text-white"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
        onClick={() => alert("Раздел находится в разработке.")}
      >
        Ремонт
      </div>

      {/* Вкладка "Качество" */}
      <div
        className={`px-4 py-2 rounded ${
          isActive("/production/quality")
            ? "bg-blue-500 text-white"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
        onClick={() => alert("Раздел находится в разработке.")}
      >
        Качество
      </div>
    </div>
  );
}

export default TabNavigation;

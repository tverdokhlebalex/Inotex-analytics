import React from "react";
import { Link, useLocation } from "react-router-dom";

function TabNavigation() {
  const location = useLocation(); // Получаем текущий путь

  // Определяем активную вкладку по текущему маршруту
  const isActive = (path) => location.pathname === path;

  // Список вкладок
  const tabs = [
    { name: "Сводка", path: "/production/summary", isEnabled: true },
    { name: "Бюджет", path: "/production/budget", isEnabled: false },
    { name: "Обеспечение", path: "/production/supply", isEnabled: true },
    { name: "Ремонт", path: "/production/repair", isEnabled: false },
    { name: "Качество", path: "/production/quality", isEnabled: false },
  ];

  return (
    <div className="flex bg-gray-200 p-2 justify-center space-x-4">
      {tabs.map((tab) =>
        tab.isEnabled ? (
          <Link
            key={tab.name}
            to={tab.path}
            className={`px-4 py-2 rounded ${
              isActive(tab.path)
                ? "bg-blue-500 text-white"
                : "bg-gray-300 text-gray-600 hover:bg-gray-400"
            }`}
          >
            {tab.name}
          </Link>
        ) : (
          <div
            key={tab.name}
            className={`px-4 py-2 rounded bg-gray-300 text-gray-600 cursor-not-allowed`}
            onClick={() => alert("Раздел находится в разработке.")}
          >
            {tab.name}
          </div>
        )
      )}
    </div>
  );
}

export default TabNavigation;

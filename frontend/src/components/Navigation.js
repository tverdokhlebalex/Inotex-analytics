import React from "react";
import { Link } from "react-router-dom";

function Navigation() {
  // Обработчик для неактивных вкладок
  const handleUnavailable = (e) => {
    e.preventDefault(); // Предотвращает переход по ссылке
    alert("Раздел находится в разработке.");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Навигация по приложению
      </h1>
      <div className="grid grid-cols-2 gap-6">
        {/* Активный раздел "Производство" */}
        <Link
          to="/production/summary"
          className="bg-blue-500 text-white p-6 rounded shadow hover:bg-blue-600 text-center"
        >
          Производство
        </Link>

        {/* Неактивные разделы */}
        <div
          onClick={handleUnavailable}
          className="bg-gray-300 text-gray-500 p-6 rounded shadow text-center cursor-not-allowed"
        >
          Сбыт
        </div>
        <div
          onClick={handleUnavailable}
          className="bg-gray-300 text-gray-500 p-6 rounded shadow text-center cursor-not-allowed"
        >
          Финансы
        </div>
        <div
          onClick={handleUnavailable}
          className="bg-gray-300 text-gray-500 p-6 rounded shadow text-center cursor-not-allowed"
        >
          Снабжение
        </div>
      </div>
    </div>
  );
}

export default Navigation;

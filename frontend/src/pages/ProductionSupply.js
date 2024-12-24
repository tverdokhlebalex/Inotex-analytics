// src/pages/ProductionSupply.jsx

import React, { useState } from "react";
import axios from "axios";
import { Doughnut } from "react-chartjs-2";
import "chart.js/auto";

function ProductionSupply() {
  const [file, setFile] = useState(null);
  const [supplyData, setSupplyData] = useState([]);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Пожалуйста, выберите файл.");
      return;
    }

    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "https://inotex-analytics.onrender.com/upload/", // Укажите корректный эндпоинт
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSupplyData(response.data.summary); // Предполагается, что сервер возвращает данные в поле summary
    } catch (err) {
      setError("Ошибка загрузки файла. Проверьте структуру файла.");
    }
  };

  // Группируем данные по градациям обеспеченности
  const categorizeData = (data) => {
    const low = [];
    const medium = [];
    const high = [];

    data.forEach((row) => {
      const percentage = parseFloat(row["% обеспеченности"]) || 0;

      if (percentage < 30) {
        low.push(row);
      } else if (percentage >= 30 && percentage < 60) {
        medium.push(row);
      } else if (percentage >= 60) {
        high.push(row);
      }
    });

    return { low, medium, high };
  };

  const getChartData = () => {
    const categories = categorizeData(supplyData);

    return {
      labels: ["Низкий процент", "Средний процент", "Высокий процент"],
      datasets: [
        {
          data: [
            categories.low.length,
            categories.medium.length,
            categories.high.length,
          ],
          backgroundColor: [
            "rgb(252, 0, 0)",
            "rgb(255, 205, 86)",
            "rgb(0, 255, 42)",
          ],
          hoverOffset: 4,
        },
      ],
    };
  };

  const handleChartClick = (event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const categories = ["low", "medium", "high"];
      const selected = categories[index];
      const categorized = categorizeData(supplyData);
      setSelectedCategory(categorized[selected]);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">Обеспеченность</h1>

      {/* Блок загрузки файла */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleUpload();
        }}
        className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-center"
      >
        <input
          type="file"
          onChange={handleFileChange}
          className="p-2 border rounded w-full md:w-1/3"
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full md:w-auto"
        >
          Загрузить
        </button>
      </form>

      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Диаграмма обеспеченности */}
      <div className="my-8">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Распределение по уровням обеспеченности
        </h2>
        <div className="flex justify-center">
          <Doughnut
            data={getChartData()}
            options={{
              onClick: handleChartClick,
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (context) =>
                      `${context.label}: ${context.raw} позиций`,
                  },
                },
                title: {
                  display: true,
                  text: "Уровни обеспеченности",
                },
              },
            }}
          />
        </div>
      </div>

      {/* Список номенклатуры */}
      {selectedCategory && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Детализация</h2>
          <table className="table-auto border-collapse w-full">
            <thead>
              <tr>
                <th className="border px-4 py-2">Название</th>
                <th className="border px-4 py-2">% Обеспеченности</th>
                <th className="border px-4 py-2">Потребность</th>
                <th className="border px-4 py-2">Прогнозный дефицит</th>
                <th className="border px-4 py-2">Ответственное лицо</th>
              </tr>
            </thead>
            <tbody>
              {selectedCategory.map((row, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2">
                    {row["Дефицитная номенклатура"]}
                  </td>
                  <td className="border px-4 py-2">
                    {row["% обеспеченности"]}
                  </td>
                  <td className="border px-4 py-2">{row["Потребность"]}</td>
                  <td className="border px-4 py-2">
                    {row["Прогнозный дефицит"]}
                  </td>
                  <td className="border px-4 py-2">
                    {row["Ответственное лицо"]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ProductionSupply;

import React, { useState } from "react";
import axios from "axios";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";

function UploadPage() {
  // Состояния для файлов
  const [sbytFile, setSbytFile] = useState(null);
  const [budgetFile, setBudgetFile] = useState(null);
  const [remontFile, setRemontFile] = useState(null);

  // Состояния для ответа сервера
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Обработчики выбора файлов
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (type === "sbyt") setSbytFile(file);
    if (type === "budget") setBudgetFile(file);
    if (type === "remont") setRemontFile(file);
  };

  // Отправка файлов на бекенд
  const handleUpload = async () => {
    if (!sbytFile || !budgetFile || !remontFile) {
      setError("Пожалуйста, загрузите все три файла (Сбыт, Бюджет, Ремонт).");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("sbyt", sbytFile);
      formData.append("budget", budgetFile);
      formData.append("remont", remontFile);

      // Адрес вашего FastAPI-бэкенда на Render (роут "/upload")
      const response = await axios.post(
        "https://inotex-analytics.onrender.com/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setData(response.data);
    } catch (err) {
      console.error(err);
      setError("Ошибка загрузки файлов. Попробуйте снова.");
    }

    setIsLoading(false);
  };

  // Функция для Doughnut-диаграммы
  // Т.к. сервер уже возвращает строку вида "96.00%",
  // придётся извлекать число. Пример: "96.00%" -> 96.00
  const createDoughnutData = (valueStr) => {
    if (!valueStr || typeof valueStr !== "string") {
      return {
        labels: ["% выполнения плана", "Отклонение 100%"],
        datasets: [{ data: [0, 100], backgroundColor: ["#4CAF50", "#FF7043"] }],
      };
    }
    const numeric = parseFloat(valueStr.replace("%", "")) || 0;
    return {
      labels: ["% выполнения плана", "Отклонение 100%"],
      datasets: [
        {
          data: [numeric, 100 - numeric],
          backgroundColor: ["#4CAF50", "#FF7043"],
          hoverBackgroundColor: ["#66BB6A", "#FF8A65"],
        },
      ],
    };
  };

  // Функция для Bar-графика
  const createBarData = (labels, arr1, arr2, label1, label2) => {
    const safeLabels = Array.isArray(labels) ? labels : [];
    const safeArr1 = Array.isArray(arr1)
      ? arr1.map((v) => parseFloat(v) || 0)
      : [];
    const safeArr2 = Array.isArray(arr2)
      ? arr2.map((v) => parseFloat(v) || 0)
      : [];

    return {
      labels: safeLabels,
      datasets: [
        {
          label: label1,
          data: safeArr1,
          backgroundColor: "#2196F3",
        },
        {
          label: label2,
          data: safeArr2,
          backgroundColor: "#4CAF50",
        },
      ],
    };
  };

  // Основной рендер аналитики
  const renderAnalytics = () => {
    if (!data) return null;

    const { sbyt, budget, remont } = data;

    // Пример: sbyt.factPercentPlan уже "96.00%"
    return (
      <div className="w-full flex flex-col gap-4">
        {/* ВЕРХНЯЯ ПОЛОСА - 4 карточки + дата справа */}
        <div className="grid grid-cols-5 gap-2">
          {/* Карточка 1: % выполнения плана */}
          <div className="bg-white rounded-md shadow-md p-3 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-600">
              Фактический % выполнения плана
            </p>
            <p className="text-2xl font-bold mt-2">
              {sbyt.factPercentPlan ?? "—"}
            </p>
          </div>

          {/* Карточка 2: Сдача на склад */}
          <div className="bg-white rounded-md shadow-md p-3 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-600">Сдача на склад</p>
            <p className="text-2xl font-bold mt-2">{sbyt.sklad ?? "—"}</p>
          </div>

          {/* Карточка 3: Процент исполнения бюджета */}
          <div className="bg-white rounded-md shadow-md p-3 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-600">Процент исполнения бюджета</p>
            <p className="text-2xl font-bold mt-2">{budget.percent ?? "—"}</p>
          </div>

          {/* Карточка 4: Остаток средств планового бюджета */}
          <div className="bg-white rounded-md shadow-md p-3 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-600">
              Остаток средств планового бюджета
            </p>
            <p className="text-2xl font-bold mt-2">{budget.remaining ?? "—"}</p>
          </div>

          {/* Карточка 5: Дата (справа) */}
          <div className="bg-white rounded-md shadow-md p-3 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-600">Дата</p>
            <p className="text-xl font-bold mt-2">{sbyt.date ?? "—"}</p>
          </div>
        </div>

        {/* НИЖНЯЯ ЧАСТЬ: 2 колонки: слева 2 круговых, справа 2 бар-графика */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Левая колонка: 2 Doughnut */}
          <div className="flex flex-col gap-4">
            {/* Первый pie-chart: Однофазные */}
            <div className="bg-white rounded-md shadow-md p-4 flex flex-col items-center">
              <p className="text-lg font-bold mb-2">
                % выполнения по однофазным приборам
              </p>
              <div className="w-64 h-64">
                <Doughnut data={createDoughnutData(sbyt.onePhasePercent)} />
              </div>
            </div>

            {/* Второй pie-chart: Трехфазные */}
            <div className="bg-white rounded-md shadow-md p-4 flex flex-col items-center">
              <p className="text-lg font-bold mb-2">
                % выполнения по трехфазным приборам
              </p>
              <div className="w-64 h-64">
                <Doughnut data={createDoughnutData(sbyt.threePhasePercent)} />
              </div>
            </div>
          </div>

          {/* Правая колонка (2 Bar) */}
          <div className="grid grid-rows-2 gap-4">
            {/* Исполнение бюджета */}
            <div className="bg-white rounded-md shadow-md p-4">
              <p className="text-lg font-bold mb-2">Исполнение бюджета</p>
              <div className="h-60">
                <Bar
                  data={createBarData(
                    budget.dates,
                    budget.plan,
                    budget.fact,
                    "План",
                    "Факт"
                  )}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: { beginAtZero: true },
                    },
                  }}
                />
              </div>
            </div>

            {/* Ремонт */}
            <div className="bg-white rounded-md shadow-md p-4">
              <p className="text-lg font-bold mb-2">Ремонт</p>
              <div className="h-60">
                <Bar
                  data={createBarData(
                    remont.dates,
                    remont.inRepair,
                    remont.repaired,
                    "Попало в ремонт",
                    "Отремонтировано"
                  )}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: { beginAtZero: true },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gray-100">
      {/* Шапка с логотипом и названием */}
      <header className="w-full bg-white p-4 shadow-md mb-4">
        <div className="max-w-7xl mx-auto flex items-center">
          {/* Логотип (заглушка) */}
          <div className="w-32 h-8 bg-gray-300 flex items-center justify-center text-sm">
            Лого МОСАР
          </div>
          <h1 className="text-xl font-bold ml-4">Производство</h1>
        </div>
      </header>

      {/* Блок загрузки файлов */}
      <div className="max-w-7xl mx-auto px-4 mb-4">
        <div className="bg-white p-4 rounded-md shadow-md flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex flex-col">
            <label className="font-semibold mb-1">Таблица "Сбыт"</label>
            <input type="file" onChange={(e) => handleFileChange(e, "sbyt")} />
          </div>
          <div className="flex flex-col">
            <label className="font-semibold mb-1">Таблица "Бюджет"</label>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, "budget")}
            />
          </div>
          <div className="flex flex-col">
            <label className="font-semibold mb-1">Таблица "Ремонт"</label>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, "remont")}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mt-2 md:mt-0 md:ml-auto"
          >
            {isLoading ? "Загружается..." : "Загрузить"}
          </button>
        </div>
      </div>

      {/* Контейнер для вывода аналитики + ошибок */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Ошибка (если есть) */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}

        {/* Основной блок аналитики */}
        {renderAnalytics()}
      </div>
    </div>
  );
}

export default UploadPage;

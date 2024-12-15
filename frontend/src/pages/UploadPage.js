import React, { useState, useContext, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Select from "react-select";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [allData, setAllData] = useState([]);
  const [summary, setSummary] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(
    "Сдача на склад сбыта - всего"
  );
  const [selectedSummaryMetric, setSelectedSummaryMetric] = useState(
    "Сдача на склад сбыта - Маркс"
  );
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const { authToken, logout } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    if (!file) return;

    setStatus("Загрузка...");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload/", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Ошибка загрузки файла");
      const result = await response.json();

      setAllData(result.all_data);
      setSummary(result.summary);
      setStatus("Файл успешно загружен и обработан");
    } catch (err) {
      setError(err.message || "Ошибка при загрузке");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const filterOptions = allData.map((item) => ({
    value: item["Наименование продукции"],
    label: item["Наименование продукции"],
  }));

  const metricOptions = [
    { value: "Сдача на склад сбыта - всего", label: "Всего" },
    { value: "Сдача на склад сбыта - Маркс", label: "Счетчики (Маркс)" },
    {
      value: "Сдача на склад сбыта - ОП Москва",
      label: "Счетчики (ОП Москва)",
    },
  ];

  const filteredData = selectedType
    ? allData.filter(
        (item) => item["Наименование продукции"] === selectedType.value
      )
    : [];

  const doughnutData = {
    labels: ["Процент выполнения плана", "Оставшаяся часть"],
    datasets: [
      {
        data: [
          filteredData.length > 0
            ? filteredData[0][
                `Фактический % выполнения плана - ${
                  selectedMetric.split(" - ")[1]
                }`
              ] || 0
            : 0,
          100 -
            (filteredData.length > 0
              ? filteredData[0][
                  `Фактический % выполнения плана - ${
                    selectedMetric.split(" - ")[1]
                  }`
                ] || 0
              : 0),
        ],
        backgroundColor: (context) => {
          const percentage =
            filteredData.length > 0
              ? filteredData[0][
                  `Фактический % выполнения плана - ${
                    selectedMetric.split(" - ")[1]
                  }`
                ] || 0
              : 0;

          const gradient = context.chart.ctx.createLinearGradient(
            0,
            0,
            200,
            200
          );
          gradient.addColorStop(0, "red");
          gradient.addColorStop(0.5, "yellow");
          gradient.addColorStop(1, "green");

          return [gradient, "rgba(200, 200, 200, 0.2)"];
        },
        hoverOffset: 4,
      },
    ],
  };

  const barData = {
    labels: summary.map((item) => item["Наименование продукции"]),
    datasets: [
      {
        label: selectedSummaryMetric,
        data: summary.map((item) => {
          const value = item[selectedSummaryMetric] || 0;

          // Увеличиваем видимость "Итого (сетевое оборудование)"
          if (
            item["Наименование продукции"] === "Итого (сетевое оборудование)"
          ) {
            return value * 10; // Увеличение значения
          }
          return value;
        }),
        backgroundColor: (context) => {
          const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "red");
          gradient.addColorStop(0.5, "yellow");
          gradient.addColorStop(1, "green");
          return gradient;
        },
      },
    ],
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">Аналитика данных</h1>
      <form onSubmit={handleSubmit} className="mb-4 flex gap-4 items-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="p-2 border rounded w-1/3"
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Загрузить
        </button>
      </form>

      {error && <p className="text-red-500">{error}</p>}
      {status && <p className="text-gray-700">{status}</p>}

      {allData.length > 0 && (
        <div>
          <div className="my-4">
            <Select
              options={filterOptions}
              onChange={setSelectedType}
              placeholder="Выберите номенклатуру..."
              isClearable
            />
            <Select
              options={metricOptions}
              onChange={(option) => setSelectedMetric(option?.value || "")}
              placeholder="Выберите показатель..."
              defaultValue={metricOptions[0]}
            />
          </div>

          {selectedType && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-2xl font-bold mb-4">
                Круговая диаграмма по показателям
              </h2>
              <Doughnut data={doughnutData} />
            </div>
          )}

          <div className="bg-white p-4 rounded shadow mt-6">
            <h2 className="text-2xl font-bold mb-4">Итоговые показатели</h2>
            <Select
              options={metricOptions}
              onChange={(option) =>
                setSelectedSummaryMetric(option?.value || "")
              }
              placeholder="Выберите фильтр..."
              defaultValue={metricOptions[1]}
            />
            <Bar data={barData} />
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadPage;

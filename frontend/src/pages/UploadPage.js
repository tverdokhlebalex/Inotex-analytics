import React, { useState, useContext, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Select from "react-select";
import { Doughnut, Line } from "react-chartjs-2";
import "chart.js/auto";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [allData, setAllData] = useState([]);
  const [summary, setSummary] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(
    "Сдача на склад сбыта - всего"
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
    : allData;

  const doughnutData = {
    labels: filteredData.map((item) => item["Наименование продукции"]),
    datasets: [
      {
        label: "Процент выполнения плана",
        data: filteredData.map(
          (item) =>
            item[
              `Фактический % выполнения плана - ${
                selectedMetric.split(" - ")[1]
              }`
            ] || 0
        ),
        backgroundColor: [
          "rgba(75, 192, 192, 0.6)",
          "rgba(153, 102, 255, 0.6)",
          "rgba(255, 159, 64, 0.6)",
          "rgba(255, 99, 132, 0.6)",
        ],
        hoverOffset: 4,
      },
    ],
  };

  const lineData = {
    labels: summary.map((item) => item["Наименование продукции"]),
    datasets: [
      {
        label: selectedMetric,
        data: summary.map((item) => item[selectedMetric] || 0),
        borderColor: "rgba(75, 192, 192, 1)",
        fill: false,
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

          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">
              Круговая диаграмма по показателям
            </h2>
            {filteredData.length > 0 ? (
              <Doughnut data={doughnutData} />
            ) : (
              <p className="text-gray-700">Нет данных для отображения.</p>
            )}
          </div>

          <div className="bg-white p-4 rounded shadow mt-6">
            <h2 className="text-2xl font-bold mb-4">Итоговые показатели</h2>
            {summary.length > 0 ? (
              <Line data={lineData} />
            ) : (
              <p className="text-gray-700">
                Нет итоговых данных для отображения.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadPage;

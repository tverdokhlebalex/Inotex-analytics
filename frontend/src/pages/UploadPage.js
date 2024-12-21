import React, { useState, useContext, useRef, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import Select from "react-select";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState([]);
  const [filteredSummary, setFilteredSummary] = useState([]);
  const [selectedFactory, setSelectedFactory] = useState({
    value: "всего",
    label: "Всего",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { authToken } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Пожалуйста, выберите файл.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/upload/",
        formData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const rawSummary = response.data.summary;

      // Проверяем, существует ли уже строка "ВСЕГО"
      const hasTotal = rawSummary.some(
        (row) => row["Наименование продукции"] === "ВСЕГО"
      );

      if (!hasTotal) {
        const lastRow = rawSummary[rawSummary.length - 1];
        if (lastRow) {
          lastRow["Наименование продукции"] = "ВСЕГО";
          rawSummary.push(lastRow);
        }
      }

      // Фильтруем итоговые строки
      const filteredData = rawSummary.filter(
        (row) =>
          row["Наименование продукции"] === "Итого (однофазные)" ||
          row["Наименование продукции"] === "Итого (трехфазные)" ||
          row["Наименование продукции"] === "Итого (перепрошивка)" ||
          row["Наименование продукции"] === "ВСЕГО"
      );

      setSummary(filteredData);
      setFilteredSummary(filteredData);
      setIsLoading(false);
    } catch (err) {
      setError("Ошибка загрузки файла. Проверьте структуру файла.");
      setIsLoading(false);
    }
  };

  const factoryOptions = [
    { value: "всего", label: "Всего" },
    { value: "Маркс", label: "Счетчики (Маркс)" },
    { value: "ОП Москва", label: "Счетчики (ОП Москва)" },
  ];

  // Обновляем данные при изменении фильтра
  useEffect(() => {
    if (selectedFactory.value === "всего") {
      setFilteredSummary(summary);
    } else {
      const filtered = summary.map((item) => ({
        ...item,
        "Сдача на склад сбыта - Маркс":
          selectedFactory.value === "Маркс"
            ? item["Сдача на склад сбыта - Маркс"]
            : 0,
        "Сдача на склад сбыта - ОП Москва":
          selectedFactory.value === "ОП Москва"
            ? item["Сдача на склад сбыта - ОП Москва"]
            : 0,
      }));
      setFilteredSummary(filtered);
    }
  }, [selectedFactory, summary]);

  const getDoughnutData = (type) => {
    const dataItem = filteredSummary.find(
      (item) => item["Наименование продукции"] === type
    );
    if (!dataItem) return null;

    const planValue = parseFloat(dataItem["Плановый % сдачи на склад"]) || 0;
    const actualValue =
      parseFloat(dataItem["Фактический % выполнения плана - всего"]) || 0;

    let color = "green";
    if (actualValue < planValue) {
      color = "red";
    } else if (actualValue < 100) {
      color = "yellow";
    }

    return {
      labels: ["Выполнено", "Остаток"],
      datasets: [
        {
          data: [actualValue, 100 - actualValue],
          backgroundColor: [color, "rgba(200, 200, 200, 0.2)"],
        },
      ],
    };
  };

  const barData = {
    labels: filteredSummary.map((item) => item["Наименование продукции"]),
    datasets: [
      {
        label: "Всего",
        data: filteredSummary.map(
          (item) => item["Сдача на склад сбыта - всего"]
        ),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
      {
        label: "Маркс",
        data: filteredSummary.map(
          (item) => item["Сдача на склад сбыта - Маркс"]
        ),
        backgroundColor: "rgba(255, 99, 132, 0.6)",
      },
      {
        label: "ОП Москва",
        data: filteredSummary.map(
          (item) => item["Сдача на склад сбыта - ОП Москва"]
        ),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">Аналитика данных</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleUpload();
        }}
        className="mb-4 flex gap-4 items-center"
      >
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
          {isLoading ? "Загружается..." : "Загрузить"}
        </button>
      </form>

      {error && <p className="text-red-500">{error}</p>}

      <div className="my-4">
        <Select
          options={factoryOptions}
          onChange={(option) => setSelectedFactory(option)}
          value={selectedFactory}
          placeholder="Выберите завод..."
          isClearable
        />
      </div>

      {/* Круговые диаграммы */}
      <h2 className="text-2xl font-bold mb-4">
        Итоговые показатели выполнения плана в %
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          "Итого (однофазные)",
          "Итого (трехфазные)",
          "Итого (перепрошивка)",
          "ВСЕГО", // Добавлен обратно "ВСЕГО"
        ].map((type) => {
          const doughnutData = getDoughnutData(type);
          return (
            doughnutData && (
              <div key={type} className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-2">{type}</h2>
                <Doughnut data={doughnutData} />
              </div>
            )
          );
        })}
      </div>

      {/* Столбчатый график */}
      <div className="bg-white p-4 rounded shadow mt-6">
        <h2 className="text-2xl font-bold mb-4">Итоговые показатели</h2>
        <Bar data={barData} />
      </div>
    </div>
  );
}

export default UploadPage;

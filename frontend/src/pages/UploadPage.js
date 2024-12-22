import React, { useState, useContext, useRef, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import Select from "react-select";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState([]);
  const [filteredSummaryPercent, setFilteredSummaryPercent] = useState([]);
  const [filteredSummaryUnits, setFilteredSummaryUnits] = useState([]);
  const [selectedFactoryPercent, setSelectedFactoryPercent] = useState({
    value: "всего",
    label: "Всего",
  });
  const [selectedFactoryUnits, setSelectedFactoryUnits] = useState({
    value: "всего",
    label: "Всего",
  });
  const [planPercent, setPlanPercent] = useState(0); // Плановый % сдачи на склад
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
      const planPercentValue = parseFloat(response.data.plan_percent) || 0;
      setPlanPercent(planPercentValue);

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

      // Фильтруем итоговые строки, удаляя ненужные
      const filteredData = rawSummary.filter(
        (row) =>
          row["Наименование продукции"] === "Итого (однофазные)" ||
          row["Наименование продукции"] === "Итого (трехфазные)" ||
          row["Наименование продукции"] === "Итого (перепрошивка)" ||
          row["Наименование продукции"] === "ВСЕГО"
      );

      setSummary(filteredData);
      setFilteredSummaryPercent(filteredData);
      setFilteredSummaryUnits(filteredData);
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

  // Обновляем данные для процентов при изменении фильтра
  useEffect(() => {
    if (selectedFactoryPercent.value === "всего") {
      setFilteredSummaryPercent(summary);
    } else {
      const factoryKey =
        selectedFactoryPercent.value === "Маркс"
          ? "Сдача на склад сбыта - Маркс"
          : "Сдача на склад сбыта - ОП Москва";

      const filtered = summary.map((item) => ({
        ...item,
        // Обнуляем ненужные значения
        "Сдача на склад сбыта - всего":
          selectedFactoryPercent.value === "всего"
            ? item["Сдача на склад сбыта - всего"]
            : 0,
        [factoryKey]: item[factoryKey],
      }));
      setFilteredSummaryPercent(filtered);
    }
  }, [selectedFactoryPercent, summary]);

  // Обновляем данные для единиц при изменении фильтра
  useEffect(() => {
    if (selectedFactoryUnits.value === "всего") {
      setFilteredSummaryUnits(summary);
    } else {
      const factoryKey =
        selectedFactoryUnits.value === "Маркс"
          ? "Сдача на склад сбыта - Маркс"
          : "Сдача на склад сбыта - ОП Москва";

      const planKey =
        selectedFactoryUnits.value === "Маркс"
          ? "Плановый % сдачи на склад - Маркс"
          : "Плановый % сдачи на склад - ОП Москва";

      const filtered = summary.map((item) => ({
        ...item,
        // Обнуляем ненужные значения
        "Сдача на склад сбыта - всего":
          selectedFactoryUnits.value === "всего"
            ? item["Сдача на склад сбыта - всего"]
            : 0,
        [factoryKey]: item[factoryKey],
        [`Плановая сдача на склад - ${selectedFactoryUnits.value}`]:
          selectedFactoryUnits.value === "всего"
            ? item["Плановый % сдачи на склад"]
            : item[planKey],
      }));

      setFilteredSummaryUnits(filtered);
    }
  }, [selectedFactoryUnits, summary]);

  const getDoughnutData = (type) => {
    const dataItem = filteredSummaryPercent.find(
      (item) => item["Наименование продукции"] === type
    );
    if (!dataItem) return null;

    const actualValue =
      parseFloat(dataItem["Фактический % выполнения плана - всего"]) || 0;

    // Используем общеплановый процент
    const planValue = planPercent;

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
          borderWidth: 1,
        },
      ],
    };
  };

  const getBarDataUnits = () => {
    return {
      labels: filteredSummaryUnits.map(
        (item) => item["Наименование продукции"]
      ),
      datasets: [
        {
          label: "Фактические",
          data: filteredSummaryUnits.map(
            (item) => item["Сдача на склад сбыта - всего"]
          ),
          backgroundColor: filteredSummaryUnits.map((item) => {
            const actual = item["Сдача на склад сбыта - всего"];
            const plan =
              selectedFactoryUnits.value === "всего"
                ? item["Плановый % сдачи на склад"]
                : item[
                    `Плановая сдача на склад - ${selectedFactoryUnits.value}`
                  ];
            return actual >= plan
              ? "rgba(75, 192, 192, 0.6)"
              : "rgba(255, 99, 132, 0.6)";
          }),
        },
        {
          label: "Плановые",
          data: filteredSummaryUnits.map((item) =>
            selectedFactoryUnits.value === "всего"
              ? item["Плановый % сдачи на склад"]
              : item[`Плановая сдача на склад - ${selectedFactoryUnits.value}`]
          ),
          backgroundColor: "rgba(153, 102, 255, 0.6)",
        },
      ],
    };
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">Аналитика данных</h1>

      {/* Загрузка файла */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleUpload();
        }}
        className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-center"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="p-2 border rounded w-full md:w-1/3"
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full md:w-auto"
        >
          {isLoading ? "Загружается..." : "Загрузить"}
        </button>
      </form>

      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Блок аналитики 1: Итоговые показатели выполнения плана в % */}
      <div className="my-8">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Итоговые показатели выполнения плана в %
        </h2>
        {/* Фильтр заводов для процентов */}
        <div className="mb-4 flex justify-center">
          <Select
            options={factoryOptions}
            onChange={(option) => setSelectedFactoryPercent(option)}
            value={selectedFactoryPercent}
            placeholder="Выберите завод..."
            isClearable
            className="w-1/2 md:w-1/4"
          />
        </div>
        {/* Круговые диаграммы */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "Итого (однофазные)",
            "Итого (трехфазные)",
            "Итого (перепрошивка)",
            "ВСЕГО",
          ].map((type) => {
            const doughnutData = getDoughnutData(type);
            return (
              doughnutData && (
                <div key={type} className="bg-white p-4 rounded shadow">
                  <h3 className="text-xl font-semibold mb-2 text-center">
                    {type}
                  </h3>
                  <Doughnut data={doughnutData} />
                </div>
              )
            );
          })}
        </div>
      </div>

      {/* Блок аналитики 2: Итоговые показатели в единицах сбыта */}
      <div className="my-8">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Итоговые показатели в единицах сбыта
        </h2>
        {/* Фильтр заводов для единиц */}
        <div className="mb-4 flex justify-center">
          <Select
            options={factoryOptions}
            onChange={(option) => setSelectedFactoryUnits(option)}
            value={selectedFactoryUnits}
            placeholder="Выберите завод..."
            isClearable
            className="w-1/2 md:w-1/4"
          />
        </div>
        {/* Столбчатый график */}
        <div className="bg-white p-4 rounded shadow">
          <Bar
            data={getBarDataUnits()}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: "top",
                },
                title: {
                  display: true,
                  text: "Фактические vs Плановые показатели",
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default UploadPage;

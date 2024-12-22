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

  // Mapping factories to their corresponding fields
  const factoryMapping = {
    всего: {
      actualField: "Фактический % выполнения плана - всего",
      planField: "Плановый % сдачи на склад",
      unitsActualField: "Сдача на склад сбыта - всего",
      unitsPlanField: "Плановый % сдачи на склад",
    },
    Маркс: {
      actualField: "Фактический % выполнения плана - Маркс",
      planField: "Плановый % сдачи на склад - Маркс",
      unitsActualField: "Сдача на склад сбыта - Маркс",
      unitsPlanField: "Плановый % сдачи на склад - Маркс",
    },
    "ОП Москва": {
      actualField: "Фактический % выполнения плана - ОП Москва",
      planField: "Плановый % сдачи на склад - ОП Москва",
      unitsActualField: "Сдача на склад сбыта - ОП Москва",
      unitsPlanField: "Плановый % сдачи на склад - ОП Москва",
    },
  };

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
    const mapping = factoryMapping[selectedFactoryPercent.value];

    if (selectedFactoryPercent.value === "всего") {
      setFilteredSummaryPercent(summary);
    } else {
      const { actualField, planField } = mapping;

      const filtered = summary.map((item) => ({
        ...item,
        // Обнуляем ненужные значения для корректного отображения диаграммы
        "Фактический % выполнения плана - всего":
          selectedFactoryPercent.value === "всего"
            ? item["Фактический % выполнения плана - всего"]
            : 0,
        // Добавляем фактическое значение для выбранного завода
        [actualField]: item[actualField],
        // Добавляем плановый процент для выбранного завода
        "Плановый % сдачи на склад":
          selectedFactoryPercent.value === "всего"
            ? planPercent
            : item[planField],
      }));
      setFilteredSummaryPercent(filtered);
    }
  }, [selectedFactoryPercent, summary, planPercent, factoryMapping]);

  // Обновляем данные для единиц при изменении фильтра
  useEffect(() => {
    const mapping = factoryMapping[selectedFactoryUnits.value];

    if (selectedFactoryUnits.value === "всего") {
      setFilteredSummaryUnits(summary);
    } else {
      const { unitsActualField, unitsPlanField } = mapping;

      const filtered = summary.map((item) => ({
        ...item,
        // Обнуляем ненужные значения для корректного отображения графика
        "Сдача на склад сбыта - всего":
          selectedFactoryUnits.value === "всего"
            ? item["Сдача на склад сбыта - всего"]
            : 0,
        // Добавляем фактическое значение для выбранного завода
        [unitsActualField]: item[unitsActualField],
        // Добавляем плановую сдачу для выбранного завода
        "Плановая сдача на склад":
          selectedFactoryUnits.value === "всего"
            ? item["Плановый % сдачи на склад"]
            : item[unitsPlanField],
      }));

      setFilteredSummaryUnits(filtered);
    }
  }, [selectedFactoryUnits, summary, factoryMapping]);

  // Функция для получения данных для Doughnut диаграммы
  const getDoughnutData = (item) => {
    let actualValue, planValue;

    if (selectedFactoryPercent.value === "всего") {
      actualValue =
        parseFloat(item["Фактический % выполнения плана - всего"]) || 0;
      planValue = planPercent;
    } else {
      actualValue =
        parseFloat(
          item[factoryMapping[selectedFactoryPercent.value].actualField]
        ) || 0;
      planValue = parseFloat(item["Плановый % сдачи на склад"]) || 0;
    }

    // Определение цвета диаграммы
    let color;
    if (actualValue < planValue) {
      color = "rgba(252, 0, 0, 0.6)"; // Красный
    } else if (actualValue >= planValue && actualValue < 100) {
      color = "rgba(251, 255, 0, 0.6)"; // Жёлтый
    } else if (actualValue >= 100) {
      color = "rgba(0, 255, 42, 0.6)"; // Зелёный
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

  // Функция для получения данных для Bar графика
  const getBarDataUnits = () => {
    return {
      labels: filteredSummaryUnits.map(
        (item) => item["Наименование продукции"]
      ),
      datasets: [
        {
          label: "Фактические",
          data: filteredSummaryUnits.map((item) => {
            if (selectedFactoryUnits.value === "всего") {
              return item["Сдача на склад сбыта - всего"];
            } else {
              // Используем только соответствующее поле без запасных вариантов
              return selectedFactoryUnits.value === "Маркс"
                ? item["Сдача на склад сбыта - Маркс"] || 0
                : item["Сдача на склад сбыта - ОП Москва"] || 0;
            }
          }),
          backgroundColor: filteredSummaryUnits.map((item) => {
            let actual, plan;
            if (selectedFactoryUnits.value === "всего") {
              actual = item["Сдача на склад сбыта - всего"];
              plan = item["Плановый % сдачи на склад"];
            } else {
              actual =
                selectedFactoryUnits.value === "Маркс"
                  ? item["Сдача на склад сбыта - Маркс"]
                  : item["Сдача на склад сбыта - ОП Москва"];
              plan =
                selectedFactoryUnits.value === "Маркс"
                  ? item["Плановый % сдачи на склад - Маркс"]
                  : item["Плановый % сдачи на склад - ОП Москва"];
            }
            return actual >= plan
              ? "rgba(0, 255, 42, 0.6)" // Зелёный
              : "rgba(252, 0, 0, 0.6)"; // Красный
          }),
        },
        {
          label: "Плановые",
          data: filteredSummaryUnits.map((item) => {
            if (selectedFactoryUnits.value === "всего") {
              return item["Плановый % сдачи на склад"];
            } else {
              return selectedFactoryUnits.value === "Маркс"
                ? item["Плановый % сдачи на склад - Маркс"] || 0
                : item["Плановый % сдачи на склад - ОП Москва"] || 0;
            }
          }),
          backgroundColor: "rgba(0, 26, 255, 0.6)", // Синий для плановых
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
            const item = filteredSummaryPercent.find(
              (row) => row["Наименование продукции"] === type
            );
            const doughnutData = item ? getDoughnutData(item) : null;
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

import React, { useState } from "react";

function SalesReportUpload() {
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState("TotalPlan,TotalShipped");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Пожалуйста, загрузите файл.");
      return;
    }

    setStatus("Загрузка файла на сервер...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("columns", columns);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload/sales/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ошибка: ${response.statusText}`);
      }

      const responseData = await response.json();
      setData(responseData.data);
      setStatus(responseData.message);
    } catch (error) {
      console.error("Ошибка:", error);
      setStatus("Произошла ошибка при загрузке файла.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">Загрузка "Сводки по сбыту"</h1>

      <form
        className="w-full max-w-lg bg-white p-6 rounded shadow-md"
        onSubmit={handleSubmit}
      >
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-800">
            Выберите файл:
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded mt-2"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-800">
            Укажите столбцы (через запятую):
          </label>
          <input
            type="text"
            value={columns}
            onChange={(e) => setColumns(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mt-2"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
        >
          Отправить файл
        </button>
      </form>

      {status && <p className="mt-4 text-gray-700">{status}</p>}

      {data && (
        <div className="w-full max-w-5xl mt-6">
          <h2 className="text-lg font-bold mb-4">Результаты:</h2>
          <table className="w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr>
                {Object.keys(data[0]).map((key) => (
                  <th
                    key={key}
                    className="border border-gray-300 p-2 bg-gray-100"
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, idx) => (
                    <td key={idx} className="border border-gray-300 p-2">
                      {value !== null && value !== undefined ? value : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SalesReportUpload;

import React, { useState, useContext, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [data, setData] = useState({ all_data: [], summary: [] });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { authToken, logout } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Пожалуйста, выберите файл для загрузки.");
      return;
    }

    setStatus("Загрузка файла на сервер...");
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file); // Ключ "file" совпадает с серверным параметром

    try {
      const response = await fetch("http://127.0.0.1:8000/upload/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) logout();
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка на сервере.");
      }

      const result = await response.json();
      setData(result);
      setStatus("Файл успешно загружен и обработан.");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const DataTable = ({ title, tableData }) => {
    if (!tableData || tableData.length === 0) {
      return (
        <p className="mt-4 text-gray-700">
          {title}: Нет данных для отображения.
        </p>
      );
    }

    return (
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <table className="w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr>
              {Object.keys(tableData[0]).map((col) => (
                <th key={col} className="border p-2 bg-gray-100">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                {Object.values(row).map((value, idx) => (
                  <td key={idx} className="border p-2">
                    {value || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">Загрузка файла</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white p-6 rounded shadow-md"
      >
        <input
          type="file"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="w-full p-2 border rounded mb-4"
        />
        <button
          type="submit"
          className={`w-full bg-green-500 text-white p-2 rounded ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isLoading}
        >
          {isLoading ? "Загрузка..." : "Отправить"}
        </button>
        {status && <p className="mt-4 text-gray-700">{status}</p>}
        {error && <p className="mt-4 text-red-500">{error}</p>}
      </form>

      {/* Отображение всех данных */}
      {data.all_data && (
        <DataTable title="Все данные" tableData={data.all_data} />
      )}

      {/* Отображение итоговых строк */}
      {data.summary && (
        <DataTable title="Итоговые показатели" tableData={data.summary} />
      )}
    </div>
  );
}

export default UploadPage;

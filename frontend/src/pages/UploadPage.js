import React, { useState, useContext, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";

function UploadPage() {
  const [files, setFiles] = useState({ file1: null, file2: null, file3: null });
  const [status, setStatus] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { authToken, logout } = useContext(AuthContext);

  const fileInputRefs = {
    file1: useRef(null),
    file2: useRef(null),
    file3: useRef(null),
  };

  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ];
  const maxSize = 10 * 1024 * 1024; // 10 МБ

  const handleFileChange = (e) => {
    const { name, files: uploadedFiles } = e.target;
    const file = uploadedFiles[0];

    if (file) {
      if (!allowedTypes.includes(file.type)) {
        alert("Пожалуйста, выберите файл Excel или CSV формата.");
        e.target.value = "";
        return;
      }

      if (file.size > maxSize) {
        alert("Файл слишком большой. Максимальный размер 10 МБ.");
        e.target.value = "";
        return;
      }

      setFiles({ ...files, [name]: file }); // Заменено на правильный синтаксис
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.file1 || !files.file2 || !files.file3) {
      alert("Пожалуйста, загрузите все три файла");
      return;
    }

    setStatus("Загрузка файлов на сервер...");
    setError(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file1", files.file1);
    formData.append("file2", files.file2);
    formData.append("file3", files.file3);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Токен недействителен или истек
          logout();
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || "Ошибка на сервере");
      }

      const responseData = await response.json();
      setData(responseData.data);
      setStatus("Файлы успешно загружены и обработаны.");

      // Очистка полей ввода файлов
      setFiles({ file1: null, file2: null, file3: null });
      Object.values(fileInputRefs).forEach((ref) => {
        if (ref.current) ref.current.value = "";
      });
    } catch (error) {
      console.error("Ошибка:", error);
      setError(error.message || "Произошла ошибка при загрузке файлов.");
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !files.file1 || !files.file2 || !files.file3 || isLoading;

  // Компонент для отображения таблицы данных
  const DataTable = ({ title, tableData }) => {
    if (!tableData || tableData.length === 0) {
      return <p className="mt-4 text-gray-700">Нет данных для отображения.</p>;
    }

    return (
      <div className="w-full max-w-5xl mt-6 overflow-x-auto">
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <table className="w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr>
              {Object.keys(tableData[0]).map((col) => (
                <th
                  key={col}
                  className="border border-gray-300 p-2 bg-gray-100"
                  style={{ position: "sticky", top: 0 }}
                >
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
                {Object.values(row).map((value, colIndex) => (
                  <td key={colIndex} className="border border-gray-300 p-2">
                    {typeof value === "number"
                      ? value.toLocaleString("ru-RU")
                      : value || "-"}
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
      <h1 className="text-2xl font-bold mb-6">Загрузка файлов</h1>
      <form
        className="w-full max-w-lg bg-white p-6 rounded shadow-md"
        onSubmit={handleSubmit}
      >
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-800">
            Таблица 1: Сводка по сбыту
          </label>
          <input
            ref={fileInputRefs.file1}
            type="file"
            name="file1"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded mt-2"
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-800">
            Таблица 2: Отчет по ремонту
          </label>
          <input
            ref={fileInputRefs.file2}
            type="file"
            name="file2"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded mt-2"
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-800">
            Таблица 3: Отчет по проблемам
          </label>
          <input
            ref={fileInputRefs.file3}
            type="file"
            name="file3"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded mt-2"
          />
        </div>
        <button
          type="submit"
          className={`w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition ${
            isDisabled ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={isDisabled}
        >
          {isLoading ? "Отправка..." : "Отправить файлы"}
        </button>
        {status && <p className="mt-4 text-gray-700">{status}</p>}
        {error && <p className="mt-4 text-red-500">{error}</p>}
      </form>

      {/* Отображение данных, полученных от сервера */}
      {data && (
        <>
          {data.sales && (
            <DataTable title="Сводка по сбыту" tableData={data.sales} />
          )}
          {data.repairs && (
            <DataTable title="Отчет по ремонту" tableData={data.repairs} />
          )}
          {data.issues && (
            <DataTable title="Отчет по проблемам" tableData={data.issues} />
          )}
        </>
      )}
    </div>
  );
}

export default UploadPage;

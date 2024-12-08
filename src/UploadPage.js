import React, { useState } from "react";

function UploadPage() {
  const [files, setFiles] = useState({
    file1: null,
    file2: null,
    file3: null,
  });

  const [status, setStatus] = useState(""); // Для отображения статуса

  const handleFileChange = (e) => {
    const { name, files: uploadedFiles } = e.target;
    setFiles({ ...files, [name]: uploadedFiles[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Проверяем, что все файлы загружены
    if (!files.file1 || !files.file2 || !files.file3) {
      alert("Пожалуйста, загрузите все три файла.");
      return;
    }

    setStatus("Загрузка файлов на сервер...");

    // Создаем FormData для отправки файлов
    const formData = new FormData();
    formData.append("file1", files.file1);
    formData.append("file2", files.file2);
    formData.append("file3", files.file3);

    try {
      // Отправляем файлы на сервер
      const response = await fetch("http://localhost:8000/upload/", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("Файлы успешно загружены!");
      } else {
        setStatus(`Ошибка: ${data.detail || "Произошла ошибка при загрузке."}`);
      }
    } catch (error) {
      console.error("Ошибка:", error);
      setStatus("Произошла ошибка при загрузке файлов.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold text-center mb-6">Загрузка файлов</h1>

      <div className="w-full max-w-lg bg-white p-6 rounded shadow-md">
        {/* Блок загрузки таблицы 1 */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-800">
            Таблица 1 (Сводка по сбыту)
          </h2>
          <input
            type="file"
            name="file1"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded mt-2"
          />
          {files.file1 && (
            <p className="text-sm text-green-600 mt-2">
              Загружен: {files.file1.name}
            </p>
          )}
        </div>

        {/* Блок загрузки таблицы 2 */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-800">
            Таблица 2 (Отчет по ремонту)
          </h2>
          <input
            type="file"
            name="file2"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded mt-2"
          />
          {files.file2 && (
            <p className="text-sm text-green-600 mt-2">
              Загружен: {files.file2.name}
            </p>
          )}
        </div>

        {/* Блок загрузки таблицы 3 */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-800">
            Таблица 3 (Отчет по проблемам)
          </h2>
          <input
            type="file"
            name="file3"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded mt-2"
          />
          {files.file3 && (
            <p className="text-sm text-green-600 mt-2">
              Загружен: {files.file3.name}
            </p>
          )}
        </div>

        {/* Кнопка отправки */}
        <button
          onClick={handleSubmit}
          disabled={!files.file1 || !files.file2 || !files.file3}
          className={`w-full p-2 rounded text-white transition ${
            files.file1 && files.file2 && files.file3
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Отправить файлы
        </button>

        {/* Статус */}
        {status && (
          <p className="mt-4 text-center text-sm text-gray-700">{status}</p>
        )}
      </div>
    </div>
  );
}

export default UploadPage;

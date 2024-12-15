import React, { useState, useContext, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [data, setData] = useState(null);
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
      setData(result.data);
      setStatus("Файл успешно загружен и обработан.");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
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
      {data && (
        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-xl font-bold mb-4">Результаты обработки</h2>
          <pre className="bg-gray-200 p-4 rounded overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default UploadPage;

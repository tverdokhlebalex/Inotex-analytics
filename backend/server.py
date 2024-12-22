from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os
import tempfile
import logging
import uvicorn

# Настройка логирования
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Инициализация FastAPI
app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене ограничить доверенными доменами
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модель данных для логина
class LoginRequest(BaseModel):
    username: str
    password: str

# Функция для обработки Excel-файла
def process_excel_file(file_path: str) -> dict:
    """
    Обработка Excel-файла:
    - Извлечение планового процента из ячейки Y4.
    - Чтение данных с 11 строки.
    - Выбор необходимых столбцов.
    - Формирование итоговых строк.
    """
    try:
        # Извлечение планового процента из Y4
        full_df = pd.read_excel(file_path, header=None)
        plan_percent = full_df.at[3, 24]  # Ячейка Y4 (индексация с 0)

        # Чтение данных с 11 строки
        df = pd.read_excel(file_path, skiprows=10)

        # Формирование структуры данных
        data = {
            "Наименование продукции": df.iloc[:, 1].fillna(""),
            "Сдача на склад сбыта - всего": df.iloc[:, 21].fillna(0),
            "Сдача на склад сбыта - Маркс": df.iloc[:, 22].fillna(0),
            "Сдача на склад сбыта - ОП Москва": df.iloc[:, 20].fillna(0),
            "Плановый % сдачи на склад": df.iloc[:, 12].fillna(0),
            "Плановый % сдачи на склад - Маркс": df.iloc[:, 13].fillna(0),
            "Плановый % сдачи на склад - ОП Москва": df.iloc[:, 14].fillna(0),
            "Фактический % выполнения плана - всего": df.iloc[:, 24].fillna(0),
            "Фактический % выполнения плана - Маркс": df.iloc[:, 25].fillna(0),
            "Фактический % выполнения плана - ОП Москва": df.iloc[:, 26].fillna(0),
        }

        processed_data = pd.DataFrame(data)

        # Фильтрация итоговых строк
        summary_keywords = ["Итого (однофазные)", "Итого (трехфазные)", "Итого (перепрошивка)", "ВСЕГО"]
        summary_rows = processed_data[
            processed_data["Наименование продукции"].str.strip().isin(summary_keywords)
        ]

        # Добавление строки "ВСЕГО", если отсутствует
        if "ВСЕГО" not in summary_rows["Наименование продукции"].values:
            total_row = processed_data.iloc[-1].to_dict()
            total_row["Наименование продукции"] = "ВСЕГО"
            summary_rows = pd.concat([summary_rows, pd.DataFrame([total_row])], ignore_index=True)

        summary_rows.replace([float("inf"), float("-inf")], 0, inplace=True)

        logger.info("Файл успешно обработан.")
        return {"plan_percent": plan_percent, "summary": summary_rows.to_dict(orient="records")}

    except Exception as e:
        logger.error(f"Ошибка обработки файла: {e}")
        raise ValueError("Ошибка обработки файла. Проверьте его структуру.")

# Эндпоинт для загрузки файла
@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    """
    Загружает Excel-файл, обрабатывает его и возвращает результат.
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name

        result = process_excel_file(temp_file_path)
        os.remove(temp_file_path)

        return JSONResponse(
            content={"message": "Файл успешно обработан", "plan_percent": result["plan_percent"], "summary": result["summary"]},
            status_code=200,
        )
    except ValueError as e:
        logger.error(f"Ошибка обработки файла: {e}")
        return JSONResponse(status_code=400, content={"message": str(e)})
    except Exception as e:
        logger.error(f"Ошибка на сервере: {e}")
        return JSONResponse(status_code=500, content={"message": "Произошла ошибка на сервере."})

# Эндпоинт для авторизации
@app.post("/api/login")
async def login(request: LoginRequest):
    """
    Проверка авторизации пользователя.
    """
    if request.username == "admin" and request.password == "password":
        return {"access_token": "example_token_123", "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Неверное имя пользователя или пароль")

# Проверка работоспособности сервера
@app.get("/")
def read_root():
    """
    Проверка статуса сервера.
    """
    return JSONResponse(content={"message": "Сервер работает!"}, media_type="application/json; charset=utf-8")

# Запуск сервера
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

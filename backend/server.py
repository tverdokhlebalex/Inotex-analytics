from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os
import tempfile
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация FastAPI
app = FastAPI()

# Настройка CORS для взаимодействия с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модель данных для логина
class LoginRequest(BaseModel):
    username: str
    password: str

# Функция для обработки Excel-файла
def process_excel_file(file_path):
    """
    Обрабатывает Excel-файл:
    - Считывает данные из определённых столбцов.
    - Разделяет на все данные и итоговые строки.
    """
    try:
        # Чтение данных начиная с 11 строки (skiprows=10)
        df = pd.read_excel(file_path, skiprows=10)

        # Формируем данные по необходимым столбцам
        data = {
            "Наименование продукции": df.iloc[:, 1].fillna(""),  # Столбец B
            "Сдача на склад сбыта - всего": df.iloc[:, 21].fillna(0),  # Столбец V
            "Сдача на склад сбыта - Маркс": df.iloc[:, 22].fillna(0),  # Столбец W
            "Сдача на склад сбыта - ОП Москва": df.iloc[:, 23].fillna(0),  # Столбец X
            "Фактический % выполнения плана - всего": df.iloc[:, 24].fillna(0),  # Столбец Y
            "Фактический % выполнения плана - Маркс": df.iloc[:, 25].fillna(0),  # Столбец Z
            "Фактический % выполнения плана - ОП Москва": df.iloc[:, 26].fillna(0),  # Столбец AA
        }

        # Создаём DataFrame
        processed_data = pd.DataFrame(data)

        # Выделение итоговых строк по ключевым словам
        summary_keywords = [
            "Итого (однофазные)",
            "Итого (трехфазные)",
            "Итого (сетевое оборудование)",
            "Итого (муляжи)",
            "Итого (перепрошивка)",
            "ВСЕГО",
        ]
        summary_rows = processed_data[
            processed_data["Наименование продукции"].str.strip().isin(summary_keywords)
        ]

        # Исключаем итоговые строки из всех данных
        main_data = processed_data[
            ~processed_data["Наименование продукции"].str.strip().isin(summary_keywords)
        ]

        # Очистка бесконечностей и null
        main_data.replace([float("inf"), float("-inf")], 0, inplace=True)
        summary_rows.replace([float("inf"), float("-inf")], 0, inplace=True)

        logger.info("Файл успешно обработан.")
        return {
            "all_data": main_data.to_dict(orient="records"),
            "summary": summary_rows.to_dict(orient="records"),
        }

    except Exception as e:
        logger.error(f"Ошибка обработки файла: {e}")
        raise ValueError("Ошибка обработки файла. Проверьте его структуру.")

# Эндпоинт для загрузки файла
@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    """
    Загружает Excel-файл, обрабатывает его и возвращает данные.
    """
    try:
        # Сохраняем временный файл
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
        with open(temp_file.name, "wb") as f:
            f.write(await file.read())

        # Обрабатываем файл
        result = process_excel_file(temp_file.name)

        # Удаляем временный файл
        os.remove(temp_file.name)

        return JSONResponse(
            content={
                "message": "Файл успешно обработан",
                "all_data": result["all_data"],
                "summary": result["summary"],
            },
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
    return {"message": "Сервер работает!"}

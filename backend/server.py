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

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем запросы со всех источников (для разработки)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модель данных для входа
class LoginRequest(BaseModel):
    username: str
    password: str

# Обработка данных из Excel
def process_sales_report(file_path):
    """
    Обрабатывает данные из файла "Сводка по сбыту" с указанием конкретных столбцов.
    """
    try:
        # Загружаем данные начиная с 11 строки (skiprows=10)
        df = pd.read_excel(file_path, skiprows=10, usecols="B,M,Y,Z,AA,AB,AD")

        # Переименование нужных столбцов
        df.rename(columns={
            "B": "Наименование продукции",
            "M": "План отгрузки",
            "Y": "Фактический % выполнения плана - всего",
            "Z": "Фактический % выполнения плана - Маркс",
            "AA": "Фактический % выполнения плана - ОП Москва",
            "AB": "Отгружено счетчиков",
            "AD": "Процент выполнения плана"
        }, inplace=True)

        # Убираем строки, где отсутствуют значения в ключевых столбцах
        df = df.dropna(subset=["Наименование продукции", "План отгрузки"])

        return df
    except Exception as e:
        logger.error(f"Ошибка при обработке файла: {str(e)}")
        raise ValueError(f"Ошибка обработки файла: {str(e)}")

# Эндпоинт для загрузки файлов
@app.post("/upload/")
async def upload_files(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    file3: UploadFile = File(...),
):
    """
    Обрабатывает три файла и возвращает их содержимое.
    """
    try:
        file_paths = []

        # Сохраняем файлы временно с использованием tempfile
        for idx, file in enumerate([file1, file2, file3], start=1):
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
            with open(temp_file.name, "wb") as f:
                f.write(await file.read())
            file_paths.append(temp_file.name)

        # Обрабатываем данные
        sales_data = process_sales_report(file_paths[0])

        # Очистка временных файлов
        for path in file_paths:
            if os.path.exists(path):
                os.remove(path)

        # Возвращаем результат
        return JSONResponse(
            content={
                "message": "Файлы успешно загружены и обработаны",
                "data": {
                    "sales": sales_data.to_dict(orient="records"),
                },
            }
        )
    except ValueError as e:
        logger.error(f"Ошибка обработки файлов: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={"message": f"Ошибка при обработке файлов: {str(e)}"}
        )
    except Exception as e:
        logger.error(f"Непредвиденная ошибка: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Ошибка при обработке файлов: {str(e)}"}
        )

# Эндпоинт для авторизации пользователя
@app.post("/api/login")
async def login(request: LoginRequest):
    """
    Эндпоинт для авторизации пользователя.
    Проверяет имя пользователя и пароль.
    """
    # Пример проверки логина и пароля (замените на свою логику)
    if request.username == "admin" and request.password == "password":
        return {"access_token": "example_token_123", "token_type": "bearer"}
    else:
        raise HTTPException(status_code=401, detail="Неверное имя пользователя или пароль.")

# Очистка временных файлов при завершении работы приложения
@app.on_event("shutdown")
def cleanup_temp_files():
    """
    Удаляет временные файлы при завершении работы приложения.
    """
    for file in os.listdir(tempfile.gettempdir()):
        if file.startswith("temp_") and file.endswith(".xlsx"):
            try:
                os.remove(os.path.join(tempfile.gettempdir(), file))
            except OSError as e:
                logger.error(f"Ошибка при удалении временного файла: {file}, {str(e)}")

# Эндпоинт для проверки работоспособности сервера
@app.get("/")
def read_root():
    return {"message": "Сервер работает!"}

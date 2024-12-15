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

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модель для логина
class LoginRequest(BaseModel):
    username: str
    password: str

# Обработка Excel-файла
def process_excel_file(file_path):
    """
    Обрабатывает Excel-файл: считывает определённые столбцы и возвращает данные.
    """
    try:
        # Чтение данных начиная с 11 строки (skiprows=10)
        df = pd.read_excel(file_path, skiprows=10)

        # Формирование необходимых данных
        data = {
            "Наименование продукции": df.iloc[:, 1].fillna(""),  # Столбец B
            "Сдача на склад сбыта - всего": df.iloc[:, 21].fillna(0),  # Столбец V
            "Сдача на склад сбыта - Маркс": df.iloc[:, 22].fillna(0),  # Столбец W
            "Сдача на склад сбыта - ОП Москва": df.iloc[:, 23].fillna(0),  # Столбец X
            "Фактический % выполнения плана - всего": df.iloc[:, 24].fillna(0),  # Столбец Y
            "Фактический % выполнения плана - Маркс": df.iloc[:, 25].fillna(0),  # Столбец Z
            "Фактический % выполнения плана - ОП Москва": df.iloc[:, 26].fillna(0),  # Столбец AA
        }

        # Создание DataFrame с обработанными значениями
        processed_data = pd.DataFrame(data)

        # Удаляем строки с некорректными значениями и заменяем их на 0
        processed_data = processed_data.replace([float("inf"), float("-inf")], 0)

        logger.info("Файл успешно обработан.")
        return processed_data

    except Exception as e:
        logger.error(f"Ошибка обработки файла: {e}")
        raise ValueError("Ошибка обработки файла. Проверьте его структуру.")

# Эндпоинт для загрузки файла
@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    """
    Принимает файл с любым именем, обрабатывает и возвращает данные.
    """
    try:
        # Сохранение файла временно
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
        with open(temp_file.name, "wb") as f:
            f.write(await file.read())

        # Обработка файла
        result = process_excel_file(temp_file.name)

        # Удаление временного файла
        os.remove(temp_file.name)

        # Возвращаем результат
        return JSONResponse(
            content={"message": "Файл успешно обработан", "data": result.to_dict(orient="records")},
            status_code=200,
        )

    except ValueError as e:
        return JSONResponse(status_code=400, content={"message": str(e)})
    except Exception as e:
        logger.error(f"Ошибка на сервере: {e}")
        return JSONResponse(status_code=500, content={"message": "Произошла ошибка на сервере"})

# Эндпоинт для авторизации
@app.post("/api/login")
async def login(request: LoginRequest):
    """
    Авторизация пользователя.
    """
    if request.username == "admin" and request.password == "password":
        return {"access_token": "example_token_123", "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Неверное имя пользователя или пароль")

# Проверка сервера
@app.get("/")
def read_root():
    return {"message": "Сервер работает!"}

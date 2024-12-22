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
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация FastAPI
app = FastAPI()

# Настройка CORS для взаимодействия с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене ограничьте доверенными доменами
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
    - Считывает плановый процент выполнения из ячейки Y4.
    - Считывает данные начиная с 11 строки (skiprows=10).
    - Извлекает необходимые столбцы.
    - Формирует итоговые строки, исключая ненужные.
    """
    try:
        # Чтение всего файла для извлечения планового процента из Y4
        full_df = pd.read_excel(file_path, header=None)
        plan_percent = full_df.at[3, 24]  # Ячейка Y4 (индексация с 0)

        # Чтение данных начиная с 11 строки (skiprows=10)
        df = pd.read_excel(file_path, skiprows=10)

        # Формируем данные по необходимым столбцам
        data = {
            "Наименование продукции": df.iloc[:, 1].fillna(""),  # Столбец B (1)
            "Сдача на склад сбыта - всего": df.iloc[:, 21].fillna(0),  # Столбец V (21)
            "Сдача на склад сбыта - Маркс": df.iloc[:, 22].fillna(0),  # Столбец W (22)
            "Сдача на склад сбыта - ОП Москва": df.iloc[:, 20].fillna(0),  # Столбец U (20)
            "Плановый % сдачи на склад": df.iloc[:, 12].fillna(0),  # Столбец M (12) - План отгрузки всего
            "Плановый % сдачи на склад - Маркс": df.iloc[:, 13].fillna(0),  # Столбец N (13) - План отгрузки Маркс
            "Плановый % сдачи на склад - ОП Москва": df.iloc[:, 14].fillna(0),  # Столбец O (14) - План отгрузки ОП Москва
            "Фактический % выполнения плана - всего": df.iloc[:, 24].fillna(0),  # Столбец Y (24)
            "Фактический % выполнения плана - Маркс": df.iloc[:, 25].fillna(0),  # Столбец Z (25)
            "Фактический % выполнения плана - ОП Москва": df.iloc[:, 26].fillna(0),  # Столбец AA (26)
        }

        # Создаём DataFrame
        processed_data = pd.DataFrame(data)

        # Выделение итоговых строк по ключевым словам, исключая ненужные
        summary_keywords = [
            "Итого (однофазные)",
            "Итого (трехфазные)",
            "Итого (перепрошивка)",
            "ВСЕГО",
        ]
        summary_rows = processed_data[
            processed_data["Наименование продукции"].str.strip().isin(summary_keywords)
        ]

        # Удаляем строки без данных "ВСЕГО"
        if "ВСЕГО" not in summary_rows["Наименование продукции"].values:
            total_row = processed_data.iloc[-1].to_dict()
            total_row["Наименование продукции"] = "ВСЕГО"
            summary_rows = pd.concat([summary_rows, pd.DataFrame([total_row])], ignore_index=True)

        # Очистка бесконечностей и null
        summary_rows.replace([float("inf"), float("-inf")], 0, inplace=True)

        logger.info("Файл успешно обработан.")
        return {
            "plan_percent": plan_percent,
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
                "plan_percent": result["plan_percent"],
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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
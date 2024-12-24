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
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Инициализация FastAPI
app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tverdokhlebalex.github.io",
        "https://tverdokhlebalex.github.io/Inotex-analytics",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модель данных для логина
class LoginRequest(BaseModel):
    username: str
    password: str

# Функция для обработки данных "Сводка"
def process_summary_file(file_path: str) -> dict:
    try:
        full_df = pd.read_excel(file_path, header=None)
        plan_percent = full_df.at[3, 24]  # Ячейка Y4

        df = pd.read_excel(file_path, skiprows=10)

        data = {
            "Наименование продукции": df.iloc[:, 1].fillna(""),
            "Сдача на склад сбыта - всего": df.iloc[:, 21].fillna(0),
            "Сдача на склад сбыта - Маркс": df.iloc[:, 22].fillna(0),
            "Сдача на склад сбыта - ОП Москва": df.iloc[:, 20].fillna(0),
            "Плановый % сдачи на склад": df.iloc[:, 12].fillna(0),
            "Фактический % выполнения плана - всего": df.iloc[:, 24].fillna(0),
        }

        processed_data = pd.DataFrame(data)
        summary_keywords = ["Итого (однофазные)", "Итого (трехфазные)", "Итого (перепрошивка)", "ВСЕГО"]
        summary_rows = processed_data[
            processed_data["Наименование продукции"].str.strip().isin(summary_keywords)
        ]

        if "ВСЕГО" not in summary_rows["Наименование продукции"].values:
            if processed_data.empty:
                raise ValueError("Файл не содержит данных для обработки.")
            total_row = processed_data.iloc[-1].to_dict()
            total_row["Наименование продукции"] = "ВСЕГО"
            summary_rows = pd.concat([summary_rows, pd.DataFrame([total_row])], ignore_index=True)

        summary_rows.replace([float("inf"), float("-inf")], 0, inplace=True)
        return {"plan_percent": plan_percent, "summary": summary_rows.to_dict(orient="records")}

    except Exception as e:
        logger.error(f"Ошибка обработки файла для сводки: {e}")
        raise ValueError("Ошибка обработки файла. Проверьте его структуру.")

# Функция для обработки данных "Обеспечение"
def process_supply_file(file_path: str) -> dict:
    try:
        df = pd.read_excel(file_path, skiprows=4)  # Пропускаем ненужные строки

        # Фильтруем данные по % обеспеченности
        low_supply = df[df["% обеспеченности"] <= 30]
        medium_supply = df[(df["% обеспеченности"] > 30) & (df["% обеспеченности"] <= 60)]
        high_supply = df[df["% обеспеченности"] > 60]

        supply_data = {
            "low": low_supply[[
                "Дефицитная номенклатура", "% обеспеченности", "Потребность", "Прогнозный дефицит", "Ответственное лицо"
            ]].to_dict(orient="records"),
            "medium": medium_supply[[
                "Дефицитная номенклатура", "% обеспеченности", "Потребность", "Прогнозный дефицит", "Ответственное лицо"
            ]].to_dict(orient="records"),
            "high": high_supply[[
                "Дефицитная номенклатура", "% обеспеченности", "Потребность", "Прогнозный дефицит", "Ответственное лицо"
            ]].to_dict(orient="records"),
        }

        logger.info("Файл для обеспечения успешно обработан.")
        return supply_data

    except Exception as e:
        logger.error(f"Ошибка обработки файла для обеспечения: {e}")
        raise ValueError("Ошибка обработки файла. Проверьте его структуру.")

# Эндпоинт для загрузки файла "Сводка"
@app.post("/upload/")
async def upload_summary_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Неправильный формат файла. Требуется .xlsx")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name

        result = process_summary_file(temp_file_path)
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

# Эндпоинт для загрузки файла "Обеспечение"
@app.post("/supply/")
async def upload_supply_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Неправильный формат файла. Требуется .xlsx")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name

        result = process_supply_file(temp_file_path)
        os.remove(temp_file_path)

        return JSONResponse(
            content={"message": "Файл успешно обработан", "supply_data": result},
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
    if request.username == "admin" and request.password == "password":
        return {"access_token": "example_token_123", "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Неверное имя пользователя или пароль")

# Проверка работоспособности сервера
@app.get("/")
def read_root():
    return JSONResponse(content={"message": "Сервер работает!"}, media_type="application/json; charset=utf-8")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

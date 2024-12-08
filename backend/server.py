from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import openpyxl
import logging
from typing import List
from datetime import datetime

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def serialize_cell_value(value):
    """
    Преобразует значения, которые не сериализуются в JSON.
    """
    if value is None:
        return None  # Оставляем None для фильтрации
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    return value

def calculate_performance(data: List[List]):
    """
    Рассчитывает выполнение плана и возвращает сводные данные.
    Пропускает строки с пустыми критическими значениями.
    """
    summary = []
    for row in data:
        try:
            # Пропускаем строку, если "План" или "Факт" пустые
            if row[1] is None or row[2] is None:
                continue

            nomenclature = row[0] or "Не указано"
            plan = float(row[1])
            fact = float(row[2])
            performance = (fact / plan) * 100 if plan > 0 else 0

            summary.append({
                "Номенклатура": nomenclature,
                "План": plan,
                "Факт": fact,
                "Выполнение (%)": round(performance, 2),
                "Статус": "Выполнено" if performance >= 90 else "Не выполнено"
            })
        except Exception as e:
            logger.error(f"Ошибка при расчёте строки {row}: {e}")
    return summary

@app.post("/upload/")
async def upload_files(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    file3: UploadFile = File(...),
):
    """
    Обработка загрузки трёх файлов, выполнение расчётов и возврат сводных данных.
    """
    try:
        logger.info("Началась обработка файлов...")

        extracted_data = []

        for file in [file1, file2, file3]:
            logger.info(f"Обрабатывается файл: {file.filename}")

            content = await file.read()
            temp_file_path = f"temp_{file.filename}"

            with open(temp_file_path, "wb") as temp_file:
                temp_file.write(content)
            logger.info(f"Файл временно сохранен: {temp_file_path}")

            workbook = openpyxl.load_workbook(temp_file_path)
            sheet = workbook.active

            # Извлекаем данные
            header = [serialize_cell_value(cell) for cell in sheet[1]]
            rows = [
                [serialize_cell_value(cell) for cell in row]
                for row in sheet.iter_rows(min_row=2, values_only=True)
            ]

            if "План" in header and "Факт" in header:
                logger.info(f"Рассчитываются данные выполнения для файла: {file.filename}")
                summary = calculate_performance(rows)
                extracted_data.append({"file": file.filename, "summary": summary})
            else:
                extracted_data.append({"file": file.filename, "data": rows})

        logger.info("Все файлы успешно обработаны")

        return JSONResponse(content={"message": "Файлы обработаны!", "data": extracted_data})

    except Exception as e:
        logger.error(f"Общая ошибка при обработке файлов: {e}")
        return JSONResponse(
            status_code=500, content={"message": f"Произошла ошибка: {str(e)}"}
        )

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
    allow_origins=["*"],  # Разрешить запросы со всех источников
    allow_credentials=True,
    allow_methods=["*"],  # Разрешить все методы (GET, POST и т.д.)
    allow_headers=["*"],  # Разрешить все заголовки
)

def serialize_cell_value(value):
    """
    Преобразует значения, которые не сериализуются в JSON.
    """
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")  # Форматируем как строку
    return value

@app.post("/upload/")
async def upload_files(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    file3: UploadFile = File(...),
):
    try:
        logger.info("Началась обработка файлов...")

        # Список для хранения извлечённых данных
        extracted_data = []

        # Обработка каждого файла
        for file in [file1, file2, file3]:
            logger.info(f"Обрабатывается файл: {file.filename}")

            # Чтение содержимого файла
            content = await file.read()
            temp_file_path = f"temp_{file.filename}"

            # Сохраняем файл временно
            with open(temp_file_path, "wb") as temp_file:
                temp_file.write(content)
            logger.info(f"Файл временно сохранен: {temp_file_path}")

            # Открываем файл с помощью openpyxl
            try:
                workbook = openpyxl.load_workbook(temp_file_path)
                sheet = workbook.active

                # Извлекаем данные из заголовков (первая строка)
                header = [serialize_cell_value(cell.value) for cell in sheet[1]]

                # Извлекаем первые 5 строк данных (пример)
                rows = [
                    [serialize_cell_value(cell.value) for cell in row]
                    for row in sheet.iter_rows(min_row=2, max_row=6)
                ]

                extracted_data.append({"file": file.filename, "header": header, "rows": rows})
                logger.info(f"Данные успешно извлечены из файла: {file.filename}")

            except Exception as e:
                logger.error(f"Ошибка при чтении файла {file.filename}: {e}")
                return JSONResponse(
                    status_code=500,
                    content={"message": f"Ошибка при чтении файла {file.filename}: {str(e)}"},
                )

        logger.info("Все файлы успешно обработаны")

        # Возвращаем извлечённые данные
        return JSONResponse(content={"message": "Файлы обработаны!", "data": extracted_data})

    except Exception as e:
        logger.error(f"Общая ошибка при обработке файлов: {e}")
        return JSONResponse(
            status_code=500, content={"message": f"Произошла ошибка: {str(e)}"}
        )

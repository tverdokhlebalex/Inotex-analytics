from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешить запросы со всех источников
    allow_credentials=True,
    allow_methods=["*"],  # Разрешить все методы (GET, POST и т.д.)
    allow_headers=["*"],  # Разрешить все заголовки
)

@app.post("/upload/")
async def upload_files(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    file3: UploadFile = File(...),
):
    """
    Обработка загрузки трёх файлов.
    """
    try:
        # Сохраняем файлы в папке, где запущен сервер
        for file in [file1, file2, file3]:
            content = await file.read()
            with open(f"uploaded_{file.filename}", "wb") as f:
                f.write(content)

        return JSONResponse(content={"message": "Файлы успешно загружены!"})

    except Exception as e:
        return JSONResponse(
            status_code=500, content={"message": f"Произошла ошибка: {str(e)}"}
        )

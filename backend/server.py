from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import tempfile
import logging
import uvicorn
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Разрешаем запросы с нужных доменов
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


def _strip_time(value) -> str:
    """
    Убираем время из ячеек, если там datetime. 
    Если строка содержит пробел — берем до пробела.
    Иначе возвращаем как есть.
    """
    if isinstance(value, datetime):
        return value.strftime("%d.%m.%Y")  # или любой другой нужный формат
    if isinstance(value, str) and " " in value:
        return value.split(" ")[0]
    return str(value)


# ------------------ СБЫТ ------------------
def process_sbyt(file_path: str) -> dict:
    """
    - «Фактический % выполнения плана»: столбец V (col=21) в последней строке.
      Нужно умножать на 100, если это число < 1.
    - «Сдача на склад»: столбец S (col=18) в последней строке.
    - «Дата»: B1 => df.iloc[0, 1].
    - «% выполнения по однофазным» и «% выполнения по трехфазным»:
       Смотрим с 3-й строки (индекс 2) до последней,
       Где столбец D (col=3) = «однофазный»/«трехфазный»
       Берём столбец V (col=21) и **среднее** по группе (или сумму) — зависит от реальных данных.
       После этого умножаем на 100, если < 1.
    """

    df = pd.read_excel(file_path, header=None)
    df.dropna(how='all', inplace=True)  # удаляем пустые строки

    # Дата из B1
    try:
        date_value = df.iloc[0, 1]
    except:
        date_value = ""

    # Фактический % выполнения плана (последняя строка, col=21)
    try:
        fact_val = df.iloc[-1, 21]
    except:
        fact_val = 0

    # Если там коэффициент (0.96), умножим на 100 => 96
    if isinstance(fact_val, (float, int)) and fact_val < 1.5:  # простая эвристика
        fact_val = fact_val * 100
    fact_percent_plan = f"{fact_val:.2f}%"  # Добавляем знак %

    # Сдача на склад (col=18)
    try:
        sklad = df.iloc[-1, 18]
    except:
        sklad = 0

    # === Посчитаем % однофазных / трехфазных ===
    # c 3-й строки => индекс = 2
    # «Вид продукции» = col=3 => "однофазный"/"трехфазный"
    # «Выполнение (доля)» = col=21 => нужно усреднить по каждой группе.
    df_sbyt = df.iloc[2:, :]  # начиная с 3-й строки
    one_phase_vals = []
    three_phase_vals = []

    for idx, row in df_sbyt.iterrows():
        product_type = row[3]
        val = row[21]
        if pd.isna(val):
            continue
        # Если val < 1.5, умножаем на 100
        if isinstance(val, (float, int)) and val < 1.5:
            val = val * 100

        if isinstance(product_type, str):
            product_type_lower = product_type.strip().lower()
            if "однофаз" in product_type_lower:
                one_phase_vals.append(val)
            elif "трехфаз" in product_type_lower:
                three_phase_vals.append(val)

    # Среднее
    if one_phase_vals:
        one_phase_percent = sum(one_phase_vals) / len(one_phase_vals)
    else:
        one_phase_percent = 0
    if three_phase_vals:
        three_phase_percent = sum(three_phase_vals) / len(three_phase_vals)
    else:
        three_phase_percent = 0

    # Округлим до 2 знаков + добавим %
    one_phase_percent_str = f"{one_phase_percent:.2f}%"
    three_phase_percent_str = f"{three_phase_percent:.2f}%"

    return {
        "date": _strip_time(date_value),
        "factPercentPlan": fact_percent_plan,
        "sklad": str(sklad),
        "onePhasePercent": one_phase_percent_str,
        "threePhasePercent": three_phase_percent_str,
    }


# ------------------ БЮДЖЕТ ------------------
def process_budget(file_path: str) -> dict:
    """
    - «Процент исполнения бюджета»: столбец F (col=5), 
      предпоследняя заполненная строка => умножаем на 100, если <1, + "%" 
    - «Остаток средств планового бюджета»: 
      по требованию: берем E4 (df.iloc[3, 4]) как начальный остаток,
      вычитаем сумму столбца F (col=5) НИЖЕ этой строки (начиная с 4-й или 5-й).
    - График «Исполнение бюджета»:
      Даты => col=1 (B), с 4-й строки (индекс=3)
      План => col=2 (C)
      Факт => col=3 (D)
      При выводе дат убираем время.
    """

    df = pd.read_excel(file_path, header=None)
    df.dropna(how='all', inplace=True)
    if df.empty:
        return {
            "percent": "0%",
            "remaining": "0",
            "dates": [],
            "plan": [],
            "fact": []
        }

    # Попробуем найти последний индекс и предпоследний
    last_idx = df.index[-1]          # последний
    second_last_idx = last_idx - 1   # предпоследний

    # Читаем значение в F (col=5) предпоследней строки
    try:
        raw_percent = df.iloc[second_last_idx, 5]
    except:
        raw_percent = 0

    if isinstance(raw_percent, (float, int)) and raw_percent < 1.5:
        raw_percent = raw_percent * 100
    percent_val = f"{raw_percent:.2f}%"

    # Остаток планового бюджета
    # Требование: взять E4 (df.iloc[3,4]) как нач. остаток
    # Вычесть сумму столбца F (col=5), начиная с 4-й или 5-й строки (уточните)
    # Допустим, начиная с 4-й строки => индекс=3
    # Но строка 3 — это E4, тогда «ниже» — это индекс=4
    try:
        start_budget = df.iloc[3, 4]  # E4
        if pd.isna(start_budget):
            start_budget = 0
    except:
        start_budget = 0

    try:
        spent_series = df.iloc[4:, 5]  # всё, что ниже стр.4, столбец F
        spent_sum = spent_series.fillna(0).sum()
    except:
        spent_sum = 0

    leftover_val = start_budget - spent_sum

    # Подготовим данные для графика
    sub_df = df.iloc[3:, :]  # с 4-й строки
    dates = []
    plan = []
    fact = []
    for idx in sub_df.index:
        rowB = sub_df.loc[idx, 1]  # col=1 (дата)
        rowC = sub_df.loc[idx, 2]  # план
        rowD = sub_df.loc[idx, 3]  # факт

        dates.append(_strip_time(rowB))
        plan.append(rowC if pd.notna(rowC) else 0)
        fact.append(rowD if pd.notna(rowD) else 0)

    return {
        "percent": percent_val,
        "remaining": str(leftover_val),
        "dates": dates,
        "plan": plan,
        "fact": fact
    }


# ------------------ РЕМОНТ ------------------
def process_remont(file_path: str) -> dict:
    """
    - Даты => col=0 (A), с 2-й строки (index=1)
    - Попало в ремонт => col=4 (E)
    - Отремонтировано => col=5 (F)
    Убираем время в датах.
    """

    df = pd.read_excel(file_path, header=None)
    df.dropna(how='all', inplace=True)

    if len(df) <= 1:
        return {"dates": [], "inRepair": [], "repaired": []}

    sub_df = df.iloc[1:, :]  # со 2-й строки
    dates = []
    in_repair = []
    repaired = []
    for idx in sub_df.index:
        rowA = sub_df.loc[idx, 0]
        rowE = sub_df.loc[idx, 4]
        rowF = sub_df.loc[idx, 5]

        dates.append(_strip_time(rowA))
        in_repair.append(rowE if pd.notna(rowE) else 0)
        repaired.append(rowF if pd.notna(rowF) else 0)

    return {
        "dates": dates,
        "inRepair": in_repair,
        "repaired": repaired
    }


@app.post("/upload")
async def upload_files(
    sbyt: UploadFile = File(...),
    budget: UploadFile = File(...),
    remont: UploadFile = File(...)
):
    """
    Принимаем все три файла, обрабатываем, отдаём JSON.
    """
    try:
        # 1) Сбыт
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp_s:
            tmp_s.write(await sbyt.read())
            tmp_s_path = tmp_s.name
        sbyt_data = process_sbyt(tmp_s_path)
        os.remove(tmp_s_path)

        # 2) Бюджет
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp_b:
            tmp_b.write(await budget.read())
            tmp_b_path = tmp_b.name
        budget_data = process_budget(tmp_b_path)
        os.remove(tmp_b_path)

        # 3) Ремонт
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp_r:
            tmp_r.write(await remont.read())
            tmp_r_path = tmp_r.name
        remont_data = process_remont(tmp_r_path)
        os.remove(tmp_r_path)

        return JSONResponse(
            content={
                "sbyt": sbyt_data,
                "budget": budget_data,
                "remont": remont_data
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"Ошибка при обработке файлов: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/")
def root():
    return JSONResponse({"message": "Сервер работает!"}, status_code=200)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

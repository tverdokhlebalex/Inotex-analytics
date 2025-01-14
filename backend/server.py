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
        return value.strftime("%d.%m.%Y")  
    if isinstance(value, str) and " " in value:
        return value.split(" ")[0]
    return str(value)

# ------------------ СБЫТ ------------------
def process_sbyt(file_path: str) -> dict:
    """
    - «Фактический % выполнения плана»: столбец V (col=21) в последней строке.
      Если < 1.5, умножаем на 100 и добавляем «%».
    - «Сдача на склад»: столбец S (col=18) в последней строке.
    - «Дата» (B1 => df.iloc[0, 1]).
    - «% выполнения по однофазным / трехфазным»:
       Столбец D (col=3) = «однофазный»/«трехфазный», столбец V (col=21) = значение.
       С 3-й строки (index=2) до конца, среднее по каждой группе.
    """

    df = pd.read_excel(file_path, header=None)
    df.dropna(how='all', inplace=True)

    # Дата (B1)
    try:
        date_value = df.iloc[0, 1]
    except:
        date_value = ""

    # Фактический % выполнения плана
    try:
        fact_val = df.iloc[-1, 21]  # столбец V
    except:
        fact_val = 0
    if isinstance(fact_val, (float, int)) and fact_val < 1.5:
        fact_val = fact_val * 100
    fact_percent_plan = f"{fact_val:.2f}%"

    # Сдача на склад (S=18)
    try:
        sklad = df.iloc[-1, 18]
    except:
        sklad = 0

    # Однофазные / Трехфазные
    df_sbyt = df.iloc[2:, :]  # с 3-й строки
    one_phase_vals = []
    three_phase_vals = []

    for _, row in df_sbyt.iterrows():
        product_type = row[3]   # col=3
        val = row[21]          # col=21
        if pd.isna(val):
            continue

        # Если это коэффициент < 1.5, умножаем на 100
        if isinstance(val, (float, int)) and val < 1.5:
            val = val * 100

        if isinstance(product_type, str):
            pt_lower = product_type.lower()
            if "однофаз" in pt_lower:
                one_phase_vals.append(val)
            elif "трехфаз" in pt_lower:
                three_phase_vals.append(val)

    if one_phase_vals:
        op_avg = sum(one_phase_vals) / len(one_phase_vals)
    else:
        op_avg = 0

    if three_phase_vals:
        tp_avg = sum(three_phase_vals) / len(three_phase_vals)
    else:
        tp_avg = 0

    one_phase_str = f"{op_avg:.2f}%"
    three_phase_str = f"{tp_avg:.2f}%"

    return {
        "date": _strip_time(date_value),
        "factPercentPlan": fact_percent_plan,
        "sklad": str(sklad),
        "onePhasePercent": one_phase_str,
        "threePhasePercent": three_phase_str,
    }

# ------------------ БЮДЖЕТ ------------------
def process_budget(file_path: str) -> dict:
    """
    - «Процент исполнения бюджета»: столбец F (col=5) в предпоследней заполненной строке 
      (умножаем на 100, если <1).
    - «Остаток средств планового бюджета»:
      Берём последнюю **заполненную** ячейку столбца E (col=4).
      Если она получается типа "0.258", умножим на 1e8 => "25800000".
    - «Исполнение бюджета» (график):
      С 4-й строки (index=3) и ниже,
      Но берём только те строки, где столбец B (col=1) НЕ `NaN` (значит дата заполнена).
      План => col=2 (C)
      Факт => col=3 (D)
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

    # Находим индекс последней и предпоследней заполненной строки
    last_idx = df.index[-1]
    second_last_idx = last_idx - 1 if last_idx >= 1 else 0

    # Процент исполнения (столбец F=5) в предпоследней строке
    try:
        raw_percent = df.iloc[second_last_idx, 5]  # col=5
    except:
        raw_percent = 0
    if isinstance(raw_percent, (float, int)) and raw_percent < 1.5:
        raw_percent = raw_percent * 100
    percent_str = f"{raw_percent:.2f}%"

    # Остаток средств планового бюджета => последняя заполненная ячейка столбца E=4
    colE = df[4].dropna()  # все непустые из столбца E
    if not colE.empty:
        leftover_val = colE.iloc[-1]  # берем последнее непустое
        # Если leftover_val похоже на коэффициент (например, 0.258),
        # умножаем на 1e8 и приводим к целому
        if isinstance(leftover_val, float) and leftover_val < 1.0:
            leftover_val = leftover_val * 100000000
        leftover_val = int(leftover_val)  # округлим до целого
    else:
        leftover_val = 0

    # График исполнения
    sub_df = df.iloc[3:, :].copy()
    sub_df = sub_df[sub_df[1].notna()]

    dates = []
    plan = []
    fact = []
    for _, row in sub_df.iterrows():
        dt_val = _strip_time(row[1])
        plan_val = row[2] if pd.notna(row[2]) else 0
        fact_val = row[3] if pd.notna(row[3]) else 0

        dates.append(dt_val)
        plan.append(plan_val)
        fact.append(fact_val)

    return {
        "percent": percent_str,
        "remaining": str(leftover_val),
        "dates": dates,
        "plan": plan,
        "fact": fact
    }

# ------------------ РЕМОНТ ------------------
def process_remont(file_path: str) -> dict:
    """
    - Даты => col=0, с 2-й строки (index=1)
    - Попало в ремонт => col=4
    - Отремонтировано => col=5
    Убираем время.
    """
    df = pd.read_excel(file_path, header=None)
    df.dropna(how='all', inplace=True)

    if len(df) <= 1:
        return {
            "dates": [],
            "inRepair": [],
            "repaired": []
        }

    sub_df = df.iloc[1:, :]
    dates = []
    in_repair = []
    repaired = []
    for _, row in sub_df.iterrows():
        dt = _strip_time(row[0])
        e_val = row[4] if pd.notna(row[4]) else 0
        f_val = row[5] if pd.notna(row[5]) else 0

        dates.append(dt)
        in_repair.append(e_val)
        repaired.append(f_val)

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

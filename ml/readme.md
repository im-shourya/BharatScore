# BharatScore ML Pipeline

Alternative credit scoring ensemble for BharatScore / CredSaathi.

## Architecture

- **M1 Behavioral** — XGBoost
- **M2 Psychometric** — Random Forest
- **M3 Liquidity** — LSTM (6-month cashflow sequences)
- **Meta** — Logistic Regression → BharatScore 300–900

## Setup

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
python train.py          # creates artifacts/ and models/
```

## Run API (for backend / frontend integration)

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

- Swagger: http://localhost:8000/docs
- Frontend endpoint: `POST /score/survey`
- Demo: `GET /demo`

## Streamlit test UI (local only)

```bash
streamlit run streamlit_app.py
```

## Files

| File | Purpose |
|------|---------|
| `data_generator.py` | Synthetic borrower data |
| `feature_engineering.py` | Feature composites |
| `train.py` | Train + save models |
| `inference.py` | Score + explainability |
| `app.py` | FastAPI for frontend |
| `notebooks/` | Jupyter demo notebook |

**Author:** Anmol — ML pipeline for hackathon integration.

"""
BharatScore AI — FastAPI demo application.
Run: uvicorn app:app --reload
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from data_generator import BharatDataGenerator
from inference import BharatScoreInference

app = FastAPI(
    title="BharatScore AI",
    description="Alternative credit scoring for India's credit-invisible borrowers",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Allow your teammate's frontend (React/Next/Vite) to call this API from another port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_pipeline: Optional[BharatScoreInference] = None


class BorrowerProfile(BaseModel):
    recharge_consistency_score: float = Field(0.7, ge=0, le=1)
    upi_txn_count_monthly: float = Field(30, ge=0)
    upi_txn_amount_mean: float = Field(300, ge=0)
    upi_txn_amount_std: float = Field(100, ge=0)
    late_payment_rate: float = Field(0.1, ge=0, le=1)
    payment_gap_max_days: float = Field(10, ge=0)
    spending_volatility: float = Field(0.25, ge=0, le=1)
    p2p_ratio: float = Field(0.25, ge=0, le=1)
    ecomm_return_rate: float = Field(0.08, ge=0, le=1)
    luxury_spend_ratio: float = Field(0.15, ge=0, le=1)
    grocery_utility_ratio: float = Field(0.35, ge=0, le=1)
    digital_payment_ratio: float = Field(0.6, ge=0, le=1)
    financial_discipline_score: float = Field(3.5, ge=1, le=5)
    repayment_ethics_score: float = Field(3.5, ge=1, le=5)
    future_orientation_score: float = Field(3.5, ge=1, le=5)
    impulsiveness_score: float = Field(2.5, ge=1, le=5)
    financial_literacy_score: float = Field(3.0, ge=1, le=5)
    cash_flow_ratio: float = Field(1.1, ge=0)
    savings_rate: float = Field(0.12, ge=0, le=1)
    overdraft_events_6m: float = Field(1, ge=0)
    balance_volatility: float = Field(0.25, ge=0, le=1)
    monthly_inflow_mean: float = Field(25000, ge=0)
    monthly_inflow_std: float = Field(5000, ge=0)
    monthly_outflow_mean: float = Field(22000, ge=0)
    inflow_trend_slope: float = 0.0
    home_location_stability: float = Field(0.75, ge=0, le=1)
    night_location_consistency: float = Field(0.7, ge=0, le=1)
    state_crossing_frequency: float = Field(1, ge=0)
    unique_locations_monthly: float = Field(5, ge=1)
    work_home_distance_km: float = Field(12, ge=0)
    merchant_diversity_score: float = Field(0.55, ge=0, le=1)
    trusted_merchant_ratio: float = Field(0.6, ge=0, le=1)
    loan_app_txn_count: float = Field(0, ge=0)
    gambling_adjacent_txn_flag: int = Field(0, ge=0, le=1)
    employment_type: str = "gig_platform"
    education: str = "graduate"
    liquidity_sequence: Optional[List[List[float]]] = None


@app.on_event("startup")
def load_models() -> None:
    global _pipeline
    _pipeline = BharatScoreInference()


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "BharatScore AI"}


@app.post("/score")
def score_borrower(profile: BorrowerProfile) -> Dict[str, Any]:
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    return _pipeline.score(profile.model_dump())


@app.get("/demo")
def demo_score() -> Dict[str, Any]:
    from inference import demo_score as run_demo

    return run_demo()


class SurveyScoreRequest(BaseModel):
    """
    Minimal payload for frontend — user fills survey + basic KYC only.
    Passive signals (UPI, location, liquidity) are simulated server-side
    using a deterministic seed from mobile number (hackathon demo).
    """

    mobile: str = Field(..., min_length=10, max_length=15, examples=["9876543210"])
    employment_type: str = "gig_platform"
    education: str = "graduate"
    financial_discipline_score: float = Field(3.5, ge=1, le=5)
    repayment_ethics_score: float = Field(3.5, ge=1, le=5)
    future_orientation_score: float = Field(3.5, ge=1, le=5)
    impulsiveness_score: float = Field(2.5, ge=1, le=5)
    financial_literacy_score: float = Field(3.0, ge=1, le=5)


@app.post("/score/survey")
def score_from_survey(body: SurveyScoreRequest) -> Dict[str, Any]:
    """
    Recommended endpoint for frontend integration.
    User enters phone + survey; backend attaches simulated passive data.
    """
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

    seed = sum(ord(c) for c in body.mobile if c.isdigit()) % 9000 + 1
    raw, seq = BharatDataGenerator(n_users=1, seed=seed).generate()
    profile = raw.iloc[0].to_dict()
    profile["liquidity_sequence"] = seq[0].tolist()

    # Override with user-provided survey / KYC fields
    profile["employment_type"] = body.employment_type
    profile["education"] = body.education
    profile["financial_discipline_score"] = body.financial_discipline_score
    profile["repayment_ethics_score"] = body.repayment_ethics_score
    profile["future_orientation_score"] = body.future_orientation_score
    profile["impulsiveness_score"] = body.impulsiveness_score
    profile["financial_literacy_score"] = body.financial_literacy_score

    result = _pipeline.score(profile)
    result["data_source"] = {
        "passive_signals": "simulated_from_mobile_seed",
        "seed": seed,
        "user_provided": ["mobile", "employment_type", "education", "psychometric_survey"],
    }
    return result

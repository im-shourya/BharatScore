"""
BharatScore AI — Feature engineering (minimal high-signal composites).
"""

from __future__ import annotations

import pandas as pd


class BharatFeatureEngineer:
    """Stateless feature transforms — safe for train and inference."""

    MEDIAN_COMMUTE_KM = 12.0

    @staticmethod
    def transform(df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()
        eps = 1e-6

        # --- Behavioral composites (M1) ---
        rcs = out["recharge_consistency_score"].fillna(0.5)
        lpr = out["late_payment_rate"].fillna(0.2)
        pgmd = out["payment_gap_max_days"].fillna(15)
        utam = out["upi_txn_amount_mean"].fillna(300)
        utas = out["upi_txn_amount_std"].fillna(150)
        lux = out["luxury_spend_ratio"].fillna(0.15)
        groc = out["grocery_utility_ratio"].fillna(0.35)
        sv = out["spending_volatility"].fillna(0.3)
        ecr = out["ecomm_return_rate"].fillna(0.1)
        p2p = out["p2p_ratio"].fillna(0.25)
        dpr = out.get("digital_payment_ratio", pd.Series(0.6, index=out.index)).fillna(0.6)

        out["payment_regularity_index"] = (rcs * (1.0 - lpr) * (1.0 / (1.0 + pgmd / 30.0))).clip(0, 1)
        out["transaction_stability_score"] = (1.0 - utas / (utam + eps)).clip(0, 1)
        out["spending_discipline_score"] = (groc / (lux + groc + eps)).clip(0, 1)
        p2p_extreme = (p2p - 0.3).abs() / 0.3
        out["behavioral_risk_composite"] = (0.35 * sv + 0.25 * ecr + 0.20 * p2p_extreme + 0.20 * lpr).clip(0, 1)

        # --- Psychometric composites (M2) ---
        fds = out["financial_discipline_score"].fillna(3.0) / 5.0
        res = out["repayment_ethics_score"].fillna(3.0) / 5.0
        fos = out["future_orientation_score"].fillna(3.0) / 5.0
        imp = out["impulsiveness_score"].fillna(3.0) / 5.0
        fls = out["financial_literacy_score"].fillna(3.0) / 5.0

        out["financial_character_score"] = (0.35 * fds + 0.30 * res + 0.20 * fos - 0.15 * imp).clip(0, 1)
        observed = (1.0 - sv).clip(0, 1)
        out["behavioral_consistency_index"] = (1.0 - (fds - observed).abs()).clip(0, 1)

        # --- Liquidity composites (M3 tabular fallback + meta) ---
        cfr = out["cash_flow_ratio"].fillna(1.0)
        bv = out["balance_volatility"].fillna(0.3)
        sr = out["savings_rate"].fillna(0.1)
        ode = out["overdraft_events_6m"].fillna(1).astype(float)
        mim = out["monthly_inflow_mean"].fillna(20000)
        mis = out["monthly_inflow_std"].fillna(5000)
        mout = out["monthly_outflow_mean"].fillna(mim * 0.85)

        out["net_liquidity_score"] = ((cfr - 1.0) / (1.0 + bv)).clip(-2, 2)
        inflow_stability = (1.0 - mis / (mim + eps)).clip(0, 1)
        out["liquidity_sustainability_index"] = (sr * (1.0 - ode / 12.0) * inflow_stability).clip(-0.5, 1)
        out["cash_stress_indicator"] = ((ode + 0) / (mim / 5000.0 + 1.0)).clip(0, 20)
        out["liquidity_reserve_ratio"] = ((mim - mout) / (mim + eps)).clip(-1, 1)

        # --- Merchant (M1) ---
        mds = out["merchant_diversity_score"].fillna(0.5)
        tmr = out["trusted_merchant_ratio"].fillna(0.5)
        gaf = out["gambling_adjacent_txn_flag"].fillna(0)
        ltc = out["loan_app_txn_count"].fillna(0).astype(float)
        utcm = out["upi_txn_count_monthly"].fillna(20).astype(float)

        out["merchant_trust_score"] = (tmr * mds * (1.0 - gaf * 0.5)).clip(0, 1)
        out["predatory_exposure_index"] = (ltc / (utcm + 1.0) * 10.0).clip(0, 10)

        # --- Geolocation (light — used in liquidity/geo context only) ---
        hls = out["home_location_stability"].fillna(0.7)
        nlc = out["night_location_consistency"].fillna(0.7)
        scf = out["state_crossing_frequency"].fillna(1)
        out["lifestyle_stability_score"] = (
            0.5 * hls + 0.3 * nlc + 0.2 * (1.0 - scf.clip(0, 12) / 12.0)
        ).clip(0, 1)

        # --- Cross-domain interaction (M1) ---
        pri = out["payment_regularity_index"]
        fcs = out["financial_character_score"]
        mts = out["merchant_trust_score"]
        pei = out["predatory_exposure_index"]
        out["behavioral_psychometric_alignment"] = (1.0 - (pri - fcs).abs()).clip(0, 1)
        out["digital_trust_score"] = (dpr * mts * (1.0 - pei / 10.0)).clip(0, 1)

        return out


# Feature sets for each model
BEHAVIORAL_FEATURES = [
    "payment_regularity_index",
    "transaction_stability_score",
    "spending_discipline_score",
    "behavioral_risk_composite",
    "recharge_consistency_score",
    "late_payment_rate",
    "upi_txn_count_monthly",
    "p2p_ratio",
    "ecomm_return_rate",
    "merchant_trust_score",
    "predatory_exposure_index",
    "behavioral_psychometric_alignment",
    "digital_trust_score",
]

PSYCHOMETRIC_FEATURES = [
    "financial_character_score",
    "behavioral_consistency_index",
    "financial_discipline_score",
    "repayment_ethics_score",
    "future_orientation_score",
    "impulsiveness_score",
    "financial_literacy_score",
    "payment_regularity_index",
    "spending_discipline_score",
]

LIQUIDITY_TABULAR_FEATURES = [
    "net_liquidity_score",
    "liquidity_sustainability_index",
    "cash_stress_indicator",
    "liquidity_reserve_ratio",
    "cash_flow_ratio",
    "savings_rate",
    "overdraft_events_6m",
    "balance_volatility",
    "monthly_inflow_mean",
    "monthly_inflow_std",
    "lifestyle_stability_score",
]

CATEGORICAL_FEATURES = ["employment_type", "education"]

TARGET = "repaid"

"""
BharatScore AI — Inference pipeline with explainability bundle.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

from data_generator import BharatDataGenerator, LIQUIDITY_CHANNELS, LIQUIDITY_MONTHS
from feature_engineering import (
    BEHAVIORAL_FEATURES,
    CATEGORICAL_FEATURES,
    PSYCHOMETRIC_FEATURES,
    BharatFeatureEngineer,
)
from train import classify_risk_band, predict_m3, probability_to_bharat_score

ARTIFACTS_DIR = Path("artifacts")
MODELS_DIR = Path("models")


class BharatScoreInference:
    """Load trained models and score a single borrower profile."""

    def __init__(self, artifacts_dir: Path = ARTIFACTS_DIR) -> None:
        self.artifacts_dir = Path(artifacts_dir)
        with open(self.artifacts_dir / "config.json", encoding="utf-8") as f:
            self.config = json.load(f)

        self.prep_m1 = joblib.load(self.artifacts_dir / "prep_m1.joblib")
        self.prep_m2 = joblib.load(self.artifacts_dir / "prep_m2.joblib")
        self.m1 = joblib.load(self.artifacts_dir / "m1_xgb_calibrated.joblib")
        self.m2 = joblib.load(self.artifacts_dir / "m2_rf_calibrated.joblib")
        self.meta = joblib.load(self.artifacts_dir / "meta_lr.joblib")
        self.m1_raw = joblib.load(self.artifacts_dir / "m1_xgb_raw.joblib")

        self.m3_is_keras = self.config["m3_is_keras"]
        m3_path = self.config["m3_model_path"]
        if self.m3_is_keras:
            from tensorflow import keras

            self.m3 = keras.models.load_model(m3_path)
            norm_npz = np.load(self.artifacts_dir / "m3_lstm_norm.npz")
            self.m3_norm = (norm_npz["mean"], norm_npz["std"])
        else:
            self.m3 = joblib.load(m3_path)
            self.m3_norm = None

    def _build_sequence_from_profile(self, profile: Dict[str, Any]) -> np.ndarray:
        """Build 6×3 sequence from aggregates if monthly data not supplied."""
        if "liquidity_sequence" in profile:
            seq = np.array(profile["liquidity_sequence"], dtype=np.float32)
            return seq.reshape(1, LIQUIDITY_MONTHS, len(LIQUIDITY_CHANNELS))

        inflow = float(profile.get("monthly_inflow_mean", 20000))
        outflow = float(profile.get("monthly_outflow_mean", inflow * 0.85))
        cfr = float(profile.get("cash_flow_ratio", 1.0))
        savings = float(profile.get("savings_rate", 0.1))
        bal = inflow * savings * 2
        seq = np.zeros((1, LIQUIDITY_MONTHS, 3), dtype=np.float32)
        for t in range(LIQUIDITY_MONTHS):
            inf = inflow * (1 + 0.05 * np.sin(2 * np.pi * t / 12))
            out = inf / max(cfr, 0.4)
            bal = max(0, bal + inf - out)
            seq[0, t, 0] = inf
            seq[0, t, 1] = out
            seq[0, t, 2] = bal
        return seq

    def score(self, raw_profile: Dict[str, Any]) -> Dict[str, Any]:
        df = pd.DataFrame([raw_profile])
        df = BharatFeatureEngineer.transform(df)

        X1 = self.prep_m1.transform(df)
        X2 = self.prep_m2.transform(df)
        seq = self._build_sequence_from_profile(raw_profile)

        p1 = float(self.m1.predict_proba(X1)[0, 1])
        p2 = float(self.m2.predict_proba(X2)[0, 1])
        p3 = float(predict_m3(self.m3, seq, self.m3_is_keras, self.m3_norm)[0])

        meta_X = np.array([[p1, p2, p3]])
        p_repay = float(self.meta.predict_proba(meta_X)[0, 1])
        p_default = 1.0 - p_repay
        score = int(probability_to_bharat_score(np.array([p_repay]))[0])
        band = str(classify_risk_band(np.array([score]))[0])

        report = self._explainability_report(df.iloc[0], p1, p2, p3, p_repay, score, band)

        return {
            "repayment_probability": round(p_repay, 4),
            "default_probability": round(p_default, 4),
            "bharat_score": score,
            "risk_band": band,
            "model_probabilities": {
                "M1_behavioral": round(p1, 4),
                "M2_psychometric": round(p2, 4),
                "M3_liquidity": round(p3, 4),
            },
            "explainability_report": report,
        }

    def _explainability_report(
        self,
        row: pd.Series,
        p1: float,
        p2: float,
        p3: float,
        p_repay: float,
        score: int,
        band: str,
    ) -> Dict[str, Any]:
        positive: List[str] = []
        negative: List[str] = []

        checks = [
            ("payment_regularity_index", 0.6, "Consistent payment behavior", "Irregular payments"),
            ("financial_character_score", 0.55, "Strong financial character", "Weak financial mindset"),
            ("net_liquidity_score", 0.0, "Healthy cash flow buffer", "Cash flow stress"),
            ("merchant_trust_score", 0.5, "Trusted merchant interactions", "Risky merchant patterns"),
            ("predatory_exposure_index", 3.0, None, "Exposure to predatory lending apps"),
        ]
        for feat, threshold, pos_msg, neg_msg in checks:
            val = float(row.get(feat, 0))
            if pos_msg and val >= threshold:
                positive.append(f"{pos_msg} ({feat}={val:.2f})")
            if neg_msg and ((feat == "predatory_exposure_index" and val >= threshold) or (feat != "predatory_exposure_index" and val < threshold)):
                negative.append(f"{neg_msg} ({feat}={val:.2f})")

        narrative = (
            f"BharatScore {score} ({band}). "
            f"Behavioral model: {p1:.0%}, Psychometric: {p2:.0%}, Liquidity: {p3:.0%}. "
            f"Combined repayment probability: {p_repay:.0%}."
        )

        return {
            "narrative": narrative,
            "positive_signals": positive[:3],
            "negative_signals": negative[:3],
            "improvement_tips": [
                "Maintain consistent UPI and mobile recharge payments for 3+ months",
                "Reduce dependence on instant-loan apps",
                "Build savings buffer to improve liquidity trajectory",
            ],
        }

    def shap_top_features(self, raw_profile: Dict[str, Any], top_k: int = 5) -> List[Tuple[str, float]]:
        try:
            import shap
        except ImportError:
            imp = self.m1_raw.feature_importances_
            names = BEHAVIORAL_FEATURES
            pairs = sorted(zip(names, imp), key=lambda x: x[1], reverse=True)
            return [(n, float(v)) for n, v in pairs[:top_k]]

        df = BharatFeatureEngineer.transform(pd.DataFrame([raw_profile]))
        X = self.prep_m1.transform(df)
        explainer = shap.TreeExplainer(self.m1_raw)
        sv = explainer.shap_values(X)
        if isinstance(sv, list):
            sv = sv[1]
        pairs = sorted(zip(BEHAVIORAL_FEATURES, sv[0]), key=lambda x: abs(x[1]), reverse=True)
        return [(n, float(v)) for n, v in pairs[:top_k]]


def demo_score() -> Dict[str, Any]:
    """Score a sample borrower from the generator."""
    raw, seq = BharatDataGenerator(n_users=1, seed=99).generate()
    profile = raw.iloc[0].to_dict()
    profile["liquidity_sequence"] = seq[0].tolist()
    pipeline = BharatScoreInference()
    return pipeline.score(profile)


if __name__ == "__main__":
    result = demo_score()
    print(json.dumps(result, indent=2))

"""
BharatScore AI — Training pipeline.

Architecture:
  M1 Behavioral  → XGBoost
  M2 Psychometric  → Random Forest
  M3 Liquidity     → LSTM (6×3 monthly sequences) with tabular fallback
  Meta Ensemble    → Logistic Regression on [P_M1, P_M2, P_M3]
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

from data_generator import BharatDataGenerator, SEED
from feature_engineering import (
    BEHAVIORAL_FEATURES,
    CATEGORICAL_FEATURES,
    LIQUIDITY_TABULAR_FEATURES,
    PSYCHOMETRIC_FEATURES,
    TARGET,
    BharatFeatureEngineer,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger("BharatScore.train")

ARTIFACTS_DIR = Path("artifacts")
MODELS_DIR = Path("models")


def build_numeric_pipeline() -> Pipeline:
    return Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )


def build_preprocessor(numeric_features: list, categorical: Optional[list] = None) -> ColumnTransformer:
    transformers = [("num", build_numeric_pipeline(), numeric_features)]
    if categorical:
        cat_pipe = Pipeline(
            [
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)),
            ]
        )
        transformers.append(("cat", cat_pipe, categorical))
    return ColumnTransformer(transformers, remainder="drop")


def probability_to_bharat_score(p_repay: np.ndarray) -> np.ndarray:
    p = np.clip(p_repay, 0.001, 0.999)
    return np.round(300 + (p ** 0.7) * 600).astype(int)


def classify_risk_band(scores: np.ndarray) -> np.ndarray:
    return np.where(
        scores >= 750,
        "Low Risk",
        np.where(scores >= 550, "Medium Risk", "High Risk"),
    )


def build_lstm_model(seq_len: int = 6, n_features: int = 3):
    try:
        import tensorflow as tf
        from tensorflow import keras
        from tensorflow.keras import layers

        tf.random.set_seed(SEED)
        inputs = keras.Input(shape=(seq_len, n_features), name="liquidity_sequence")
        x = layers.Masking(mask_value=0.0)(inputs)
        x = layers.LSTM(32, dropout=0.2)(x)
        x = layers.Dense(16, activation="relu")(x)
        outputs = layers.Dense(1, activation="sigmoid", name="p_repay")(x)
        model = keras.Model(inputs, outputs, name="LiquidityLSTM")
        model.compile(
            optimizer=keras.optimizers.Adam(0.001),
            loss="binary_crossentropy",
            metrics=[keras.metrics.AUC(name="auc")],
        )
        return model, True
    except ImportError:
        logger.warning("TensorFlow not installed — M3 will use Random Forest on tabular liquidity features.")
        return None, False


def train_m3_lstm(
    X_seq_train: np.ndarray,
    y_train: np.ndarray,
    X_seq_val: np.ndarray,
    y_val: np.ndarray,
    epochs: int = 40,
) -> Tuple[Any, bool]:
    model, is_keras = build_lstm_model(X_seq_train.shape[1], X_seq_train.shape[2])
    if not is_keras:
        rf = RandomForestClassifier(
            n_estimators=200, max_depth=8, class_weight="balanced", random_state=SEED, n_jobs=-1
        )
        rf.fit(X_seq_train.reshape(len(X_seq_train), -1), y_train)
        return rf, False

    from tensorflow.keras.callbacks import EarlyStopping

    # Normalize sequences per sample
    mean = X_seq_train.mean(axis=(0, 1), keepdims=True)
    std = X_seq_train.std(axis=(0, 1), keepdims=True) + 1e-6
    X_tr = (X_seq_train - mean) / std
    X_va = (X_seq_val - mean) / std

    model.fit(
        X_tr,
        y_train,
        validation_data=(X_va, y_val),
        epochs=epochs,
        batch_size=128,
        verbose=0,
        callbacks=[EarlyStopping(patience=8, restore_best_weights=True, monitor="val_auc", mode="max")],
    )
    model._norm_mean = mean  # type: ignore[attr-defined]
    model._norm_std = std  # type: ignore[attr-defined]
    return model, True


def predict_m3(model, X_seq: np.ndarray, is_keras: bool, norm: Optional[Tuple[np.ndarray, np.ndarray]] = None) -> np.ndarray:
    if is_keras:
        if norm is None:
            mean, std = model._norm_mean, model._norm_std  # type: ignore[attr-defined]
        else:
            mean, std = norm
        X = (X_seq - mean) / std
        pred = model.predict(X, verbose=0).squeeze()
        return np.atleast_1d(pred)
    return model.predict_proba(X_seq.reshape(len(X_seq), -1))[:, 1]


def evaluate_model(name: str, y_true: np.ndarray, y_prob: np.ndarray) -> Dict[str, float]:
    auc = roc_auc_score(y_true, y_prob)
    ap = average_precision_score(y_true, y_prob)
    y_pred = (y_prob >= 0.5).astype(int)
    cm = confusion_matrix(y_true, y_pred)
    logger.info(
        "%s | ROC-AUC=%.4f | PR-AUC=%.4f | CM=\n%s",
        name,
        auc,
        ap,
        cm,
    )
    return {"roc_auc": auc, "pr_auc": ap}


def train_pipeline(
    n_users: int = 8000,
    test_size: float = 0.2,
    seed: int = SEED,
) -> Dict[str, Any]:
    ARTIFACTS_DIR.mkdir(exist_ok=True)
    MODELS_DIR.mkdir(exist_ok=True)

    logger.info("Generating synthetic data (%d users)...", n_users)
    raw_df, liq_seq = BharatDataGenerator(n_users=n_users, seed=seed).generate()
    df = BharatFeatureEngineer.transform(raw_df)

    idx = np.arange(len(df))
    train_idx, test_idx = train_test_split(idx, test_size=test_size, random_state=seed, stratify=df[TARGET])

    X_train = df.iloc[train_idx].reset_index(drop=True)
    X_test = df.iloc[test_idx].reset_index(drop=True)
    y_train = X_train[TARGET].values
    y_test = X_test[TARGET].values
    seq_train = liq_seq[train_idx]
    seq_test = liq_seq[test_idx]

    # --- Preprocessors ---
    prep_m1 = build_preprocessor(BEHAVIORAL_FEATURES)
    prep_m2 = build_preprocessor(PSYCHOMETRIC_FEATURES, CATEGORICAL_FEATURES)
    prep_m3_tab = build_preprocessor(LIQUIDITY_TABULAR_FEATURES)

    X1_train = prep_m1.fit_transform(X_train)
    X1_test = prep_m1.transform(X_test)
    X2_train = prep_m2.fit_transform(X_train)
    X2_test = prep_m2.transform(X_test)

    # --- M1 XGBoost ---
    logger.info("Training M1 Behavioral (XGBoost)...")
    m1_base = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.8,
        scale_pos_weight=(y_train == 0).sum() / max((y_train == 1).sum(), 1),
        random_state=seed,
        eval_metric="logloss",
        n_jobs=-1,
    )
    m1_base.fit(X1_train, y_train)
    m1 = CalibratedClassifierCV(m1_base, method="isotonic", cv=3)
    m1.fit(X1_train, y_train)
    p1_test = m1.predict_proba(X1_test)[:, 1]
    m1_metrics = evaluate_model("M1 XGBoost", y_test, p1_test)

    # --- M2 Random Forest ---
    logger.info("Training M2 Psychometric (Random Forest)...")
    m2_base = RandomForestClassifier(
        n_estimators=300,
        max_depth=10,
        min_samples_leaf=15,
        class_weight="balanced",
        random_state=seed,
        n_jobs=-1,
    )
    m2_base.fit(X2_train, y_train)
    m2 = CalibratedClassifierCV(m2_base, method="sigmoid", cv=3)
    m2.fit(X2_train, y_train)
    p2_test = m2.predict_proba(X2_test)[:, 1]
    m2_metrics = evaluate_model("M2 Random Forest", y_test, p2_test)

    # --- M3 LSTM on monthly sequences ---
    logger.info("Training M3 Liquidity (LSTM on 6-month cashflow)...")
    m3_model, m3_is_keras = train_m3_lstm(seq_train, y_train, seq_test, y_test)
    p3_test = predict_m3(m3_model, seq_test, m3_is_keras)
    m3_metrics = evaluate_model("M3 LSTM", y_test, p3_test)

    # --- Meta ensemble: OOF base probabilities to avoid stacking leakage ---
    logger.info("Training Meta Ensemble (Logistic Regression on OOF probs)...")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)

    p1_oof = cross_val_predict(m1, X1_train, y_train, cv=skf, method="predict_proba")[:, 1]
    p2_oof = cross_val_predict(m2, X2_train, y_train, cv=skf, method="predict_proba")[:, 1]

    if m3_is_keras:
        p3_oof = np.zeros(len(y_train))
        for tr, va in skf.split(seq_train, y_train):
            fold_model, fold_keras = train_m3_lstm(
                seq_train[tr], y_train[tr], seq_train[va], y_train[va], epochs=25
            )
            p3_oof[va] = predict_m3(fold_model, seq_train[va], fold_keras)
    else:
        p3_oof = cross_val_predict(
            m3_model, seq_train.reshape(len(seq_train), -1), y_train, cv=skf, method="predict_proba"
        )[:, 1]

    meta_X_train = np.column_stack([p1_oof, p2_oof, p3_oof])
    meta_X_test = np.column_stack([p1_test, p2_test, p3_test])

    meta = LogisticRegression(C=1.0, max_iter=1000, random_state=seed)
    meta.fit(meta_X_train, y_train)
    p_ens_test = meta.predict_proba(meta_X_test)[:, 1]
    ens_metrics = evaluate_model("Meta Ensemble", y_test, p_ens_test)

    scores = probability_to_bharat_score(p_ens_test)
    bands = classify_risk_band(scores)

    # Calibration data for notebook/plots
    prob_true, prob_pred = calibration_curve(y_test, p_ens_test, n_bins=10)

    # --- Save artifacts ---
    joblib.dump(prep_m1, ARTIFACTS_DIR / "prep_m1.joblib")
    joblib.dump(prep_m2, ARTIFACTS_DIR / "prep_m2.joblib")
    joblib.dump(prep_m3_tab, ARTIFACTS_DIR / "prep_m3_tabular.joblib")
    joblib.dump(m1, ARTIFACTS_DIR / "m1_xgb_calibrated.joblib")
    joblib.dump(m2, ARTIFACTS_DIR / "m2_rf_calibrated.joblib")
    joblib.dump(meta, ARTIFACTS_DIR / "meta_lr.joblib")
    joblib.dump(m1_base, ARTIFACTS_DIR / "m1_xgb_raw.joblib")  # for SHAP

    if m3_is_keras:
        m3_model.save(MODELS_DIR / "m3_liquidity_lstm.keras")
        m3_path = str(MODELS_DIR / "m3_liquidity_lstm.keras")
        np.savez(
            ARTIFACTS_DIR / "m3_lstm_norm.npz",
            mean=m3_model._norm_mean,  # type: ignore[attr-defined]
            std=m3_model._norm_std,  # type: ignore[attr-defined]
        )
    else:
        joblib.dump(m3_model, ARTIFACTS_DIR / "m3_rf_fallback.joblib")
        m3_path = str(ARTIFACTS_DIR / "m3_rf_fallback.joblib")

    config = {
        "seed": seed,
        "behavioral_features": BEHAVIORAL_FEATURES,
        "psychometric_features": PSYCHOMETRIC_FEATURES,
        "liquidity_tabular_features": LIQUIDITY_TABULAR_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "m3_is_keras": m3_is_keras,
        "m3_model_path": m3_path,
        "metrics": {
            "m1": m1_metrics,
            "m2": m2_metrics,
            "m3": m3_metrics,
            "ensemble": ens_metrics,
        },
        "meta_coefficients": {
            "P_M1_behavioral": float(meta.coef_[0][0]),
            "P_M2_psychometric": float(meta.coef_[0][1]),
            "P_M3_liquidity": float(meta.coef_[0][2]),
        },
    }
    with open(ARTIFACTS_DIR / "config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    np.savez(
        ARTIFACTS_DIR / "eval_arrays.npz",
        y_test=y_test,
        p1_test=p1_test,
        p2_test=p2_test,
        p3_test=p3_test,
        p_ens_test=p_ens_test,
        prob_true=prob_true,
        prob_pred=prob_pred,
        scores=scores,
        risk_bands=bands,
    )

    logger.info("Artifacts saved to %s", ARTIFACTS_DIR.resolve())
    return config


if __name__ == "__main__":
    train_pipeline(n_users=8000)

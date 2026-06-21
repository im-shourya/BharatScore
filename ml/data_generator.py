"""
BharatScore AI — Synthetic borrower data generator.

Persona-driven generation with correlated features, realistic missingness,
and 6-month liquidity sequences for the LSTM liquidity model.
No Faker dependency. No fraud injection module.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

SEED = 42

BORROWER_ARCHETYPES: Dict[str, Dict] = {
    "reliable_salaried": {
        "weight": 0.22,
        "default_rate": 0.04,
        "params": {
            "income_mean": 35000,
            "income_std": 8000,
            "recharge_consistency": (0.88, 0.07),
            "upi_txn_per_month": (42, 8),
            "spending_volatility": (0.12, 0.05),
            "geolocation_stability": (0.91, 0.06),
            "psychometric_discipline": (0.82, 0.09),
            "cash_flow_ratio": (1.35, 0.18),
            "savings_rate": (0.22, 0.08),
            "overdraft_events": (0.3, 0.5),
        },
    },
    "gig_worker": {
        "weight": 0.28,
        "default_rate": 0.18,
        "params": {
            "income_mean": 18000,
            "income_std": 7000,
            "recharge_consistency": (0.74, 0.14),
            "upi_txn_per_month": (68, 22),
            "spending_volatility": (0.38, 0.12),
            "geolocation_stability": (0.62, 0.18),
            "psychometric_discipline": (0.58, 0.15),
            "cash_flow_ratio": (0.98, 0.28),
            "savings_rate": (0.09, 0.07),
            "overdraft_events": (1.8, 1.2),
        },
    },
    "rural_msme": {
        "weight": 0.20,
        "default_rate": 0.24,
        "params": {
            "income_mean": 22000,
            "income_std": 12000,
            "recharge_consistency": (0.65, 0.20),
            "upi_txn_per_month": (28, 12),
            "spending_volatility": (0.45, 0.18),
            "geolocation_stability": (0.85, 0.10),
            "psychometric_discipline": (0.64, 0.14),
            "cash_flow_ratio": (1.05, 0.42),
            "savings_rate": (0.12, 0.10),
            "overdraft_events": (2.1, 1.5),
        },
    },
    "urban_youth": {
        "weight": 0.20,
        "default_rate": 0.31,
        "params": {
            "income_mean": 28000,
            "income_std": 9000,
            "recharge_consistency": (0.79, 0.11),
            "upi_txn_per_month": (55, 18),
            "spending_volatility": (0.52, 0.16),
            "geolocation_stability": (0.72, 0.14),
            "psychometric_discipline": (0.44, 0.17),
            "cash_flow_ratio": (0.88, 0.25),
            "savings_rate": (0.06, 0.08),
            "overdraft_events": (2.5, 1.8),
        },
    },
    "high_risk_distressed": {
        "weight": 0.10,
        "default_rate": 0.72,
        "params": {
            "income_mean": 12000,
            "income_std": 5000,
            "recharge_consistency": (0.42, 0.22),
            "upi_txn_per_month": (15, 9),
            "spending_volatility": (0.68, 0.20),
            "geolocation_stability": (0.48, 0.22),
            "psychometric_discipline": (0.28, 0.15),
            "cash_flow_ratio": (0.62, 0.32),
            "savings_rate": (0.01, 0.04),
            "overdraft_events": (5.2, 2.5),
        },
    },
}

ARCHETYPE_NAMES = list(BORROWER_ARCHETYPES.keys())
ARCHETYPE_WEIGHTS = np.array([BORROWER_ARCHETYPES[n]["weight"] for n in ARCHETYPE_NAMES])

INDIAN_STATES = [
    "Maharashtra", "Uttar Pradesh", "Karnataka", "Tamil Nadu", "Rajasthan",
    "Gujarat", "West Bengal", "Madhya Pradesh", "Bihar", "Telangana",
    "Andhra Pradesh", "Kerala", "Haryana", "Punjab", "Odisha",
]
STATE_WEIGHTS = np.array([
    0.14, 0.13, 0.10, 0.09, 0.08, 0.08, 0.07, 0.07, 0.06, 0.05,
    0.05, 0.04, 0.04, 0.03, 0.02,
], dtype=np.float64)
STATE_WEIGHTS = STATE_WEIGHTS / STATE_WEIGHTS.sum()

EMPLOYMENT_TYPES = [
    "salaried_private", "salaried_govt", "gig_platform", "self_employed",
    "small_merchant", "daily_wage", "agricultural",
]
EDUCATION_LEVELS = [
    "below_10th", "secondary_10th", "higher_secondary", "diploma",
    "graduate", "postgraduate",
]

LIQUIDITY_MONTHS = 6
LIQUIDITY_CHANNELS = ("inflow", "outflow", "balance")


@dataclass
class BharatDataGenerator:
    """Generate synthetic Indian borrower profiles for BharatScore AI."""

    n_users: int = 10_000
    seed: int = SEED

    def __post_init__(self) -> None:
        self.rng = np.random.default_rng(self.seed)

    def _clip01(self, arr: np.ndarray) -> np.ndarray:
        return np.clip(arr, 0.0, 1.0).astype(np.float32)

    def _gauss(
        self, mean: float, std: float, size: int, low: float = 0.0, high: float = 1.0
    ) -> np.ndarray:
        return np.clip(self.rng.normal(mean, std, size), low, high).astype(np.float32)

    def _persona_gauss(
        self,
        personas: np.ndarray,
        param_key: str,
        low: float = 0.0,
        high: float = 1.0,
    ) -> np.ndarray:
        out = np.zeros(self.n_users, dtype=np.float32)
        for name in ARCHETYPE_NAMES:
            mask = personas == name
            if not mask.any():
                continue
            mean, std = BORROWER_ARCHETYPES[name]["params"][param_key]
            out[mask] = self._gauss(mean, std, int(mask.sum()), low, high)
        return out

    def _assign_personas(self) -> np.ndarray:
        return self.rng.choice(
            ARCHETYPE_NAMES, size=self.n_users, p=ARCHETYPE_WEIGHTS, replace=True
        )

    def _inject_missing(self, df: pd.DataFrame, cols: List[str], rate: float = 0.04) -> None:
        """Random MCAR missingness — common in real telco/UPI pipelines."""
        for col in cols:
            mask = self.rng.random(self.n_users) < rate
            df.loc[mask, col] = np.nan

    def _generate_demographics(self, personas: np.ndarray) -> pd.DataFrame:
        n = self.n_users
        ages = np.round(np.clip(self.rng.normal(31, 8, n), 18, 65)).astype(int)

        urban_prob = np.where(
            np.isin(personas, ["gig_worker", "urban_youth"]),
            0.78,
            np.where(np.isin(personas, ["rural_msme"]), 0.22, 0.50),
        )
        urban_rural = np.array(
            ["urban" if self.rng.random() < p else "rural" for p in urban_prob]
        )

        edu_map = {
            "reliable_salaried": [0.02, 0.08, 0.18, 0.20, 0.38, 0.14],
            "gig_worker": [0.08, 0.18, 0.28, 0.22, 0.20, 0.04],
            "rural_msme": [0.18, 0.30, 0.28, 0.12, 0.10, 0.02],
            "urban_youth": [0.02, 0.06, 0.16, 0.14, 0.44, 0.18],
            "high_risk_distressed": [0.25, 0.32, 0.26, 0.10, 0.06, 0.01],
        }
        emp_map = {
            "reliable_salaried": [0.50, 0.20, 0.05, 0.15, 0.05, 0.03, 0.02],
            "gig_worker": [0.10, 0.02, 0.55, 0.18, 0.08, 0.05, 0.02],
            "rural_msme": [0.05, 0.02, 0.05, 0.28, 0.40, 0.10, 0.10],
            "urban_youth": [0.38, 0.08, 0.20, 0.20, 0.08, 0.04, 0.02],
            "high_risk_distressed": [0.10, 0.03, 0.18, 0.15, 0.10, 0.30, 0.14],
        }

        education = np.array([self.rng.choice(EDUCATION_LEVELS, p=edu_map[p]) for p in personas])
        employment_type = np.array([self.rng.choice(EMPLOYMENT_TYPES, p=emp_map[p]) for p in personas])

        return pd.DataFrame(
            {
                "user_id": [f"BS{self.seed:04d}{i:06d}" for i in range(n)],
                "age": ages,
                "state_region": self.rng.choice(INDIAN_STATES, n, p=STATE_WEIGHTS),
                "urban_rural": urban_rural,
                "education": education,
                "employment_type": employment_type,
                "years_employment": np.clip(self.rng.exponential(4.5, n), 0, 35).round(1),
            }
        )

    def _generate_behavioral(self, personas: np.ndarray) -> pd.DataFrame:
        n = self.n_users
        income_proxy = np.array(
            [BORROWER_ARCHETYPES[p]["params"]["income_mean"] for p in personas], dtype=np.float32
        )
        recharge = self._persona_gauss(personas, "recharge_consistency")
        spending_vol = self._persona_gauss(personas, "spending_volatility")
        upi_count = np.clip(
            self._persona_gauss(personas, "upi_txn_per_month", 1, 200), 1, 200
        )
        upi_mean = np.clip(income_proxy / 80 + self.rng.normal(0, 80, n), 50, 5000)
        upi_std = (upi_mean * spending_vol * 1.2 + self.rng.exponential(50, n)).astype(np.float32)
        late_pay = self._clip01((1.0 - recharge) * 0.6 + self.rng.exponential(0.05, n))
        p2p_base = np.where(np.isin(personas, ["gig_worker"]), 0.45, 0.25)

        return pd.DataFrame(
            {
                "recharge_consistency_score": recharge,
                "upi_txn_count_monthly": upi_count,
                "upi_txn_amount_mean": upi_mean.astype(np.float32),
                "upi_txn_amount_std": upi_std,
                "late_payment_rate": late_pay,
                "payment_gap_max_days": np.clip(
                    (1.0 - recharge) * 90 + self.rng.exponential(10, n), 0, 180
                ).astype(np.float32),
                "spending_volatility": spending_vol,
                "p2p_ratio": self._clip01(self.rng.normal(p2p_base, 0.12, n)),
                "ecomm_return_rate": self._clip01(spending_vol * 0.5 + self.rng.exponential(0.05, n)),
                "luxury_spend_ratio": self._clip01(
                    np.where(np.isin(personas, ["urban_youth"]), 0.30, 0.10)
                    + self.rng.normal(0, 0.08, n)
                ),
                "grocery_utility_ratio": self._clip01(
                    0.40 - np.where(np.isin(personas, ["urban_youth"]), 0.30, 0.10) * 0.5
                    + self.rng.normal(0, 0.06, n)
                ),
                "digital_payment_ratio": self._clip01(
                    recharge * 0.5 + 0.35 + self.rng.normal(0, 0.08, n)
                ),
            }
        )

    def _generate_psychometric(self, personas: np.ndarray) -> pd.DataFrame:
        discipline = self._persona_gauss(personas, "psychometric_discipline")
        base = discipline * 5.0

        def likert(center: np.ndarray, spread: float = 0.6) -> np.ndarray:
            return np.clip(np.round(center + self.rng.normal(0, spread, self.n_users)), 1, 5)

        return pd.DataFrame(
            {
                "financial_discipline_score": likert(base),
                "repayment_ethics_score": likert(base + 0.3),
                "future_orientation_score": likert(base),
                "impulsiveness_score": likert(5.0 - base + 0.5),
                "financial_literacy_score": likert(base * 0.9 + 0.5),
            }
        )

    def _generate_liquidity(self, personas: np.ndarray) -> Tuple[pd.DataFrame, np.ndarray]:
        """Aggregate liquidity features + 6-month sequences (timesteps × 3 channels)."""
        n = self.n_users
        cfr = self._persona_gauss(personas, "cash_flow_ratio", 0.3, 2.5)
        savings = self._persona_gauss(personas, "savings_rate", 0.0, 0.5)
        overdraft = np.clip(
            self._persona_gauss(personas, "overdraft_events", 0, 12), 0, 12
        )
        income_mean = np.array(
            [BORROWER_ARCHETYPES[p]["params"]["income_mean"] for p in personas], dtype=np.float32
        )
        income_std = np.array(
            [BORROWER_ARCHETYPES[p]["params"]["income_std"] for p in personas], dtype=np.float32
        )
        monthly_inflow = np.clip(income_mean + self.rng.normal(0, income_std * 0.3, n), 5000, 120000)
        monthly_outflow = monthly_inflow / np.clip(cfr, 0.4, 3.0)
        balance_vol = np.clip(0.15 + (1.0 - savings) * 0.5 + self.rng.normal(0, 0.08, n), 0.05, 0.95)

        # Monthly sequences correlated with persona liquidity profile
        seq = np.zeros((n, LIQUIDITY_MONTHS, len(LIQUIDITY_CHANNELS)), dtype=np.float32)
        for i in range(n):
            trend = self.rng.normal(0, 0.03)
            bal = monthly_inflow[i] * savings[i] * 2
            for t in range(LIQUIDITY_MONTHS):
                season = 1.0 + 0.08 * np.sin(2 * np.pi * t / 12)
                if personas[i] == "rural_msme":
                    season = 1.0 + 0.25 * np.sin(2 * np.pi * t / 6)
                inf = monthly_inflow[i] * season * (1 + trend * t) * (1 + self.rng.normal(0, 0.06))
                out = inf / cfr[i] * (1 + self.rng.normal(0, balance_vol[i] * 0.15))
                bal = max(0, bal + inf - out)
                seq[i, t, 0] = inf
                seq[i, t, 1] = out
                seq[i, t, 2] = bal

        agg = pd.DataFrame(
            {
                "cash_flow_ratio": cfr,
                "savings_rate": savings,
                "overdraft_events_6m": overdraft,
                "balance_volatility": balance_vol.astype(np.float32),
                "monthly_inflow_mean": monthly_inflow.astype(np.float32),
                "monthly_inflow_std": (income_std * 0.35).astype(np.float32),
                "monthly_outflow_mean": monthly_outflow.astype(np.float32),
                "inflow_trend_slope": self.rng.normal(0, 0.05, n).astype(np.float32),
            }
        )
        return agg, seq

    def _generate_geolocation(self, personas: np.ndarray) -> pd.DataFrame:
        stability = self._persona_gauss(personas, "geolocation_stability")
        return pd.DataFrame(
            {
                "home_location_stability": stability,
                "night_location_consistency": self._clip01(stability + self.rng.normal(0, 0.08, self.n_users)),
                "state_crossing_frequency": np.clip(
                    (1.0 - stability) * 8 + self.rng.poisson(1, self.n_users), 0, 12
                ).astype(np.float32),
                "unique_locations_monthly": np.clip(
                    (1.0 - stability) * 15 + self.rng.poisson(3, self.n_users), 1, 30
                ).astype(np.float32),
                "work_home_distance_km": np.clip(
                    self.rng.lognormal(np.log(12), 0.5, self.n_users), 1, 80
                ).astype(np.float32),
            }
        )

    def _generate_merchant(self, personas: np.ndarray) -> pd.DataFrame:
        n = self.n_users
        merchant_heavy = np.isin(personas, ["rural_msme", "gig_worker"])
        return pd.DataFrame(
            {
                "merchant_diversity_score": self._clip01(
                    np.where(merchant_heavy, 0.65, 0.45) + self.rng.normal(0, 0.12, n)
                ),
                "trusted_merchant_ratio": self._clip01(
                    np.where(merchant_heavy, 0.70, 0.55) + self.rng.normal(0, 0.10, n)
                ),
                "loan_app_txn_count": np.clip(
                    np.where(np.isin(personas, ["high_risk_distressed"]), 4, 0.5)
                    + self.rng.poisson(0.8, n),
                    0,
                    20,
                ).astype(np.float32),
                "gambling_adjacent_txn_flag": (
                    self.rng.random(n) < np.where(np.isin(personas, ["high_risk_distressed"]), 0.18, 0.03)
                ).astype(np.int32),
            }
        )

    def _generate_labels(self, personas: np.ndarray, df: pd.DataFrame) -> pd.Series:
        """Repayment label from latent risk score — no direct leakage from label into features."""
        risk = (
            0.35 * (1.0 - df["recharge_consistency_score"].fillna(0.5))
            + 0.25 * df["spending_volatility"].fillna(0.3)
            + 0.20 * (1.0 - df["cash_flow_ratio"].fillna(1.0).clip(0, 2) / 2.0)
            + 0.20 * (df["overdraft_events_6m"].fillna(1) / 12.0)
        ).values

        for name in ARCHETYPE_NAMES:
            mask = personas == name
            base = BORROWER_ARCHETYPES[name]["default_rate"]
            risk[mask] = 0.55 * risk[mask] + 0.45 * base

        noise = self.rng.normal(0, 0.08, self.n_users)
        prob_repay = np.clip(1.0 - risk + noise, 0.05, 0.98)
        repaid = (self.rng.random(self.n_users) < prob_repay).astype(np.int32)
        return pd.Series(repaid, name="repaid")

    def generate(self) -> Tuple[pd.DataFrame, np.ndarray]:
        """
        Returns
        -------
        df : pd.DataFrame
            Tabular borrower features + repaid label.
        liquidity_sequences : np.ndarray
            Shape (n_users, 6, 3) — monthly inflow, outflow, balance for LSTM.
        """
        personas = self._assign_personas()
        parts = [
            pd.DataFrame({"archetype": personas}),
            self._generate_demographics(personas),
            self._generate_behavioral(personas),
            self._generate_psychometric(personas),
        ]
        liq_df, liq_seq = self._generate_liquidity(personas)
        parts.extend([liq_df, self._generate_geolocation(personas), self._generate_merchant(personas)])
        df = pd.concat(parts, axis=1)

        self._inject_missing(
            df,
            [
                "recharge_consistency_score",
                "upi_txn_amount_mean",
                "financial_discipline_score",
                "monthly_inflow_mean",
                "home_location_stability",
                "trusted_merchant_ratio",
            ],
            rate=0.05,
        )

        df["repaid"] = self._generate_labels(personas, df)
        return df, liq_seq


if __name__ == "__main__":
    gen = BharatDataGenerator(n_users=5000, seed=SEED)
    data, sequences = gen.generate()
    print(data.shape, sequences.shape)
    print(f"Default rate: {(1 - data['repaid'].mean()):.2%}")
    print(f"Missing cells: {data.isnull().sum().sum()}")

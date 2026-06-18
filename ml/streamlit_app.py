"""
BharatScore AI — Streamlit test UI.
Run: streamlit run streamlit_app.py
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import streamlit as st

from data_generator import BharatDataGenerator, EMPLOYMENT_TYPES, EDUCATION_LEVELS, BORROWER_ARCHETYPES
from inference import BharatScoreInference

st.set_page_config(
    page_title="BharatScore AI",
    page_icon="🇮🇳",
    layout="wide",
    initial_sidebar_state="expanded",
)

RISK_COLORS = {
    "Low Risk": "#0E9F6E",
    "Medium Risk": "#FF8A4C",
    "High Risk": "#E02424",
}


@st.cache_resource
def load_pipeline() -> BharatScoreInference:
    if not Path("artifacts/config.json").exists():
        raise FileNotFoundError(
            "Trained models not found. Run `python train.py` first."
        )
    return BharatScoreInference()


def risk_color(band: str) -> str:
    return RISK_COLORS.get(band, "#6B7280")


def render_score_gauge(score: int, band: str) -> None:
    color = risk_color(band)
    st.markdown(
        f"""
        <div style="text-align:center;padding:1.5rem;border-radius:12px;
                    background:linear-gradient(135deg,#f8faff,#eef2ff);
                    border:2px solid {color};">
            <div style="font-size:0.9rem;color:#6B7280;letter-spacing:1px;">BHARATSCORE</div>
            <div style="font-size:3.5rem;font-weight:800;color:{color};">{score}</div>
            <div style="font-size:1rem;color:#374151;">out of 900</div>
            <div style="margin-top:0.5rem;font-size:1.1rem;font-weight:600;color:{color};">{band}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def main() -> None:
    st.title("🇮🇳 BharatScore AI")
    st.caption("Alternative credit scoring — test interface before frontend integration")

    # Sidebar
    with st.sidebar:
        st.header("Quick actions")
        demo_seed = st.number_input("Demo seed", min_value=1, max_value=9999, value=42)
        if st.button("🎲 Load random demo borrower", use_container_width=True):
            raw, seq = BharatDataGenerator(n_users=1, seed=int(demo_seed)).generate()
            profile = raw.iloc[0].to_dict()
            profile["liquidity_sequence"] = seq[0].tolist()
            st.session_state["profile"] = profile
            st.session_state["archetype"] = profile.get("archetype", "unknown")
            st.rerun()

        st.divider()
        st.markdown("**API for your teammate**")
        st.code("POST http://localhost:8000/score", language="text")
        st.markdown("Start API: `uvicorn app:app --reload`")

        try:
            pipeline = load_pipeline()
            st.success("Models loaded ✓")
        except FileNotFoundError as e:
            st.error(str(e))
            st.stop()

    profile = st.session_state.get("profile", {})

    tabs = st.tabs(["📋 Borrower form", "📊 Score result"])

    with tabs[0]:
        col_l, col_r = st.columns(2)

        with col_l:
            st.subheader("Behavioral & UPI")
            recharge = st.slider("Recharge consistency", 0.0, 1.0, float(profile.get("recharge_consistency_score", 0.7)))
            upi_count = st.number_input("UPI txns / month", 1, 200, int(profile.get("upi_txn_count_monthly", 35)))
            late_pay = st.slider("Late payment rate", 0.0, 1.0, float(profile.get("late_payment_rate", 0.1)))
            pay_gap = st.number_input("Max payment gap (days)", 0, 180, int(profile.get("payment_gap_max_days", 10)))
            spend_vol = st.slider("Spending volatility", 0.0, 1.0, float(profile.get("spending_volatility", 0.25)))
            p2p = st.slider("P2P ratio", 0.0, 1.0, float(profile.get("p2p_ratio", 0.25)))
            ecomm_ret = st.slider("E-commerce return rate", 0.0, 1.0, float(profile.get("ecomm_return_rate", 0.08)))
            digital_pay = st.slider("Digital payment ratio", 0.0, 1.0, float(profile.get("digital_payment_ratio", 0.6)))

            st.subheader("Psychometric (1–5)")
            fin_disc = st.slider("Financial discipline", 1.0, 5.0, float(profile.get("financial_discipline_score", 3.5)))
            repay_eth = st.slider("Repayment ethics", 1.0, 5.0, float(profile.get("repayment_ethics_score", 3.5)))
            future_ori = st.slider("Future orientation", 1.0, 5.0, float(profile.get("future_orientation_score", 3.5)))
            impulsive = st.slider("Impulsiveness", 1.0, 5.0, float(profile.get("impulsiveness_score", 2.5)))
            fin_lit = st.slider("Financial literacy", 1.0, 5.0, float(profile.get("financial_literacy_score", 3.0)))

        with col_r:
            st.subheader("Liquidity & income")
            inflow = st.number_input("Monthly inflow (₹)", 5000, 150000, int(profile.get("monthly_inflow_mean", 25000)))
            outflow = st.number_input("Monthly outflow (₹)", 5000, 150000, int(profile.get("monthly_outflow_mean", 22000)))
            cfr = st.slider("Cash flow ratio", 0.3, 2.5, float(profile.get("cash_flow_ratio", 1.1)))
            savings = st.slider("Savings rate", 0.0, 0.5, float(profile.get("savings_rate", 0.12)))
            overdraft = st.number_input("Overdraft events (6m)", 0, 12, int(profile.get("overdraft_events_6m", 1)))
            bal_vol = st.slider("Balance volatility", 0.0, 1.0, float(profile.get("balance_volatility", 0.25)))

            st.subheader("Location & merchant")
            home_stab = st.slider("Home location stability", 0.0, 1.0, float(profile.get("home_location_stability", 0.75)))
            night_stab = st.slider("Night location consistency", 0.0, 1.0, float(profile.get("night_location_consistency", 0.7)))
            merchant_div = st.slider("Merchant diversity", 0.0, 1.0, float(profile.get("merchant_diversity_score", 0.55)))
            trusted_m = st.slider("Trusted merchant ratio", 0.0, 1.0, float(profile.get("trusted_merchant_ratio", 0.6)))
            loan_apps = st.number_input("Loan-app txn count", 0, 20, int(profile.get("loan_app_txn_count", 0)))

            emp_default = profile.get("employment_type", "gig_platform")
            edu_default = profile.get("education", "graduate")
            employment = st.selectbox("Employment", EMPLOYMENT_TYPES, index=EMPLOYMENT_TYPES.index(emp_default) if emp_default in EMPLOYMENT_TYPES else 2)
            education = st.selectbox("Education", EDUCATION_LEVELS, index=EDUCATION_LEVELS.index(edu_default) if edu_default in EDUCATION_LEVELS else 4)

        if st.session_state.get("archetype"):
            st.info(f"Loaded archetype: **{st.session_state['archetype']}** (from demo generator)")

        score_clicked = st.button("🚀 Calculate BharatScore", type="primary", use_container_width=True)

    built_profile = {
        "recharge_consistency_score": recharge,
        "upi_txn_count_monthly": float(upi_count),
        "upi_txn_amount_mean": float(profile.get("upi_txn_amount_mean", 300)),
        "upi_txn_amount_std": float(profile.get("upi_txn_amount_std", 100)),
        "late_payment_rate": late_pay,
        "payment_gap_max_days": float(pay_gap),
        "spending_volatility": spend_vol,
        "p2p_ratio": p2p,
        "ecomm_return_rate": ecomm_ret,
        "luxury_spend_ratio": float(profile.get("luxury_spend_ratio", 0.15)),
        "grocery_utility_ratio": float(profile.get("grocery_utility_ratio", 0.35)),
        "digital_payment_ratio": digital_pay,
        "financial_discipline_score": fin_disc,
        "repayment_ethics_score": repay_eth,
        "future_orientation_score": future_ori,
        "impulsiveness_score": impulsive,
        "financial_literacy_score": fin_lit,
        "cash_flow_ratio": cfr,
        "savings_rate": savings,
        "overdraft_events_6m": float(overdraft),
        "balance_volatility": bal_vol,
        "monthly_inflow_mean": float(inflow),
        "monthly_inflow_std": float(profile.get("monthly_inflow_std", 5000)),
        "monthly_outflow_mean": float(outflow),
        "inflow_trend_slope": float(profile.get("inflow_trend_slope", 0.0)),
        "home_location_stability": home_stab,
        "night_location_consistency": night_stab,
        "state_crossing_frequency": float(profile.get("state_crossing_frequency", 1)),
        "unique_locations_monthly": float(profile.get("unique_locations_monthly", 5)),
        "work_home_distance_km": float(profile.get("work_home_distance_km", 12)),
        "merchant_diversity_score": merchant_div,
        "trusted_merchant_ratio": trusted_m,
        "loan_app_txn_count": float(loan_apps),
        "gambling_adjacent_txn_flag": int(profile.get("gambling_adjacent_txn_flag", 0)),
        "employment_type": employment,
        "education": education,
    }
    if "liquidity_sequence" in profile:
        built_profile["liquidity_sequence"] = profile["liquidity_sequence"]

    with tabs[1]:
        if score_clicked or "last_result" in st.session_state:
            if score_clicked:
                pipeline = load_pipeline()
                with st.spinner("Scoring borrower..."):
                    result = pipeline.score(built_profile)
                    try:
                        shap_top = pipeline.shap_top_features(built_profile, top_k=8)
                    except Exception:
                        shap_top = []
                    st.session_state["last_result"] = result
                    st.session_state["shap_top"] = shap_top
                    st.session_state["last_profile"] = built_profile

            result = st.session_state.get("last_result")
            if not result:
                st.info("Fill the form and click **Calculate BharatScore**.")
                st.stop()

            shap_top = st.session_state.get("shap_top", [])
            report = result["explainability_report"]
            probs = result["model_probabilities"]

            c1, c2, c3 = st.columns([1, 1, 1])
            with c1:
                render_score_gauge(result["bharat_score"], result["risk_band"])
            with c2:
                st.metric("Repayment probability", f"{result['repayment_probability']:.1%}")
                st.metric("Default probability", f"{result['default_probability']:.1%}")
            with c3:
                st.markdown("**Model breakdown**")
                st.progress(probs["M1_behavioral"], text=f"M1 Behavioral: {probs['M1_behavioral']:.1%}")
                st.progress(probs["M2_psychometric"], text=f"M2 Psychometric: {probs['M2_psychometric']:.1%}")
                st.progress(probs["M3_liquidity"], text=f"M3 Liquidity: {probs['M3_liquidity']:.1%}")

            st.divider()
            col_a, col_b = st.columns(2)
            with col_a:
                st.subheader("✅ Positive signals")
                for s in report.get("positive_signals") or ["No strong positive flags in current profile"]:
                    st.markdown(f"- {s}")
                st.subheader("💡 Improvement tips")
                for t in report.get("improvement_tips", []):
                    st.markdown(f"- {t}")
            with col_b:
                st.subheader("⚠️ Risk signals")
                for s in report.get("negative_signals") or ["None flagged"]:
                    st.markdown(f"- {s}")
                st.subheader("📝 Narrative")
                st.write(report.get("narrative", ""))

            if shap_top:
                st.subheader("SHAP — top behavioral drivers (M1)")
                shap_df = pd.DataFrame(shap_top, columns=["Feature", "SHAP impact"])
                shap_df["Direction"] = shap_df["SHAP impact"].apply(
                    lambda x: "↑ Repay" if x > 0 else "↓ Repay"
                )
                st.bar_chart(shap_df.set_index("Feature")["SHAP impact"])

            with st.expander("Full JSON response (for frontend dev)"):
                st.code(json.dumps(result, indent=2), language="json")

            with st.expander("Request payload sent to model"):
                st.code(json.dumps(st.session_state.get("last_profile", built_profile), indent=2, default=str), language="json")
        else:
            st.info("Score results appear here after you calculate.")


if __name__ == "__main__":
    main()

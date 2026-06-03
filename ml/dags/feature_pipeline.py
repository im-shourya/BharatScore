"""
BharatScore / CredSaathi — Feature Pipeline DAG (Airflow)
Section 16 of the database specification

Schedule: Daily at 1 AM IST
Pipeline: MongoDB raw data → Feature computation → Redis → S3 Parquet → ClickHouse PSI
"""

from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'ml-team',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2),
    'email_on_failure': True,
    'email': ['ml-alerts@credsaathi.in'],
}

with DAG(
    dag_id='credsaathi_feature_pipeline',
    default_args=default_args,
    schedule_interval='0 1 * * *',  # 1 AM IST
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['feature-engineering', 'ml'],
    description='Daily feature computation pipeline: MongoDB → Redis → S3 → ClickHouse',
) as dag:

    def compute_behavioral_features(**ctx):
        """Pull MongoDB phone/ecom/geo → compute 20 behavioral features → Redis"""
        from feature_service.behavioral import BehavioralFeatureComputer
        date = ctx['ds']
        computer = BehavioralFeatureComputer()
        updated = computer.compute_all(since_date=date)
        return {'updated_users': updated}

    def compute_cashflow_features(**ctx):
        """Pull MongoDB bank data → compute 7 cash flow features → Redis"""
        from feature_service.cashflow import CashflowFeatureComputer
        computer = CashflowFeatureComputer()
        updated = computer.compute_all()
        return {'updated_users': updated}

    def compute_psychometric_features(**ctx):
        """Pull MongoDB psychometric responses → compute 5 scores → Redis"""
        from feature_service.psychometric import PsychometricFeatureComputer
        computer = PsychometricFeatureComputer()
        updated = computer.compute_all()
        return {'updated_users': updated}

    def merge_feature_vectors(**ctx):
        """Merge behavioral + cashflow + psychometric → unified feature vector in Redis"""
        from feature_service.merge import FeatureMerger
        merger = FeatureMerger()
        merged = merger.merge_all()
        return {'merged_users': merged}

    def snapshot_to_s3(**ctx):
        """Dump all Redis feature vectors to S3 Parquet for ML training"""
        import pandas as pd
        from feature_service.snapshot import FeatureSnapshotter
        snapshotter = FeatureSnapshotter()
        path = snapshotter.snapshot_to_parquet(ctx['ds'])
        return {'s3_path': path}

    def compute_psi(**ctx):
        """Compare today's feature distribution against 30-day baseline → ClickHouse"""
        from feature_service.monitoring import PsiComputer
        psi = PsiComputer()
        alerts = psi.compute_and_store(ctx['ds'])
        if alerts:
            # Trigger PagerDuty/Slack alert for drifted features
            from feature_service.alerting import send_drift_alert
            send_drift_alert(alerts)
        return {'alerts': alerts}

    t1 = PythonOperator(
        task_id='compute_behavioral',
        python_callable=compute_behavioral_features,
    )
    t2 = PythonOperator(
        task_id='compute_cashflow',
        python_callable=compute_cashflow_features,
    )
    t3 = PythonOperator(
        task_id='compute_psychometric',
        python_callable=compute_psychometric_features,
    )
    t4 = PythonOperator(
        task_id='merge_features',
        python_callable=merge_feature_vectors,
    )
    t5 = PythonOperator(
        task_id='snapshot_s3',
        python_callable=snapshot_to_s3,
    )
    t6 = PythonOperator(
        task_id='compute_psi',
        python_callable=compute_psi,
    )

    # Behavioral + Cashflow + Psychometric run in parallel
    # Then merge → snapshot → PSI check
    [t1, t2, t3] >> t4 >> t5 >> t6

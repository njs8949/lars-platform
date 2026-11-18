"""
Iceberg StorageLayer Extension for LARS Platform
"""

import pandas as pd
from pyspark.sql import DataFrame
from typing import Optional, List
from iceberg_config import iceberg_config, IcebergConfig

class IcebergStorageLayer:
    """Iceberg 기반 데이터 레이크 저장소"""
    
    def __init__(self):
        self.spark = iceberg_config.create_spark_session()
        self.catalog = "glue_catalog"
        self.database = "lars_iceberg_catalog"
    
    def create_table(self, table_name: str, data_df: DataFrame, partition_by: Optional[List[str]] = None):
        """
        Iceberg 테이블 생성
        
        Args:
            table_name: 테이블명
            data_df: Spark DataFrame
            partition_by: 파티션 컬럼 (예: ['year', 'month', 'day'])
        """
        full_table_name = f"{self.catalog}.{self.database}.{table_name}"
        
        if partition_by:
            data_df.writeTo(full_table_name) \
                .partitionedBy(*partition_by) \
                .createOrReplace()
        else:
            data_df.writeTo(full_table_name).createOrReplace()
        
        print(f"✅ 테이블 생성: {full_table_name}")
    
    def write_table(self, table_name: str, data_df: DataFrame, mode: str = "append"):
        """
        데이터 쓰기 (Append/Upsert)
        
        Args:
            table_name: 테이블명
            data_df: Spark DataFrame
            mode: "append" 또는 "overwrite"
        """
        full_table_name = f"{self.catalog}.{self.database}.{table_name}"
        
        data_df.writeTo(full_table_name).mode(mode).append()
        print(f"✅ 데이터 입력: {table_name} ({mode})")
    
    def read_table(self, table_name: str) -> DataFrame:
        """테이블 읽기"""
        full_table_name = f"{self.catalog}.{self.database}.{table_name}"
        return self.spark.read.table(full_table_name)
    
    def read_table_at_version(self, table_name: str, version: int) -> DataFrame:
        """특정 버전의 테이블 읽기 (Time Travel)"""
        full_table_name = f"{self.catalog}.{self.database}.{table_name}"
        return self.spark.read.option("version-as-of", version).table(full_table_name)
    
    def read_table_at_timestamp(self, table_name: str, timestamp: str) -> DataFrame:
        """특정 시점의 테이블 읽기 (Time Travel)
        
        Args:
            timestamp: "2026-09-01 10:00:00" 형식
        """
        full_table_name = f"{self.catalog}.{self.database}.{table_name}"
        return self.spark.read.option("as-of-timestamp", timestamp).table(full_table_name)
    
    def get_table_history(self, table_name: str):
        """테이블 변경 이력 조회"""
        full_table_name = f"{self.catalog}.{self.database}.{table_name}"
        history_df = self.spark.sql(f"SELECT * FROM {full_table_name}.history")
        return history_df
    
    def vacuum_table(self, table_name: str, retention_days: int = 7):
        """불필요한 파일 정리"""
        full_table_name = f"{self.catalog}.{self.database}.{table_name}"
        self.spark.sql(f"CALL system.remove_orphan_files('{full_table_name}')")
        print(f"✅ Vacuum 완료: {table_name}")


# Iceberg 저장소 인스턴스
iceberg_storage = IcebergStorageLayer()

print(f"""
✅ Iceberg StorageLayer Ready:
   - Catalog: {iceberg_storage.catalog}
   - Database: {iceberg_storage.database}
   - Spark Session: Active
""")

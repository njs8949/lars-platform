"""
Apache Iceberg Configuration for LARS Platform
"""

import os
from pyspark.sql import SparkSession

class IcebergConfig:
    """Iceberg 데이터 레이크 설정"""
    
    def __init__(self):
        self.s3_bucket = "lars-iceberg-datalake-1788343640"
        self.aws_region = "ap-northeast-2"
        self.glue_catalog = "lars_iceberg_catalog"
        self.warehouse_path = f"s3://{self.s3_bucket}/warehouse"
        self.iam_role = "arn:aws:iam::177346908333:role/lars-iceberg-service-role"
    
    def create_spark_session(self):
        """Iceberg와 함께 Spark 세션 생성"""
        spark = SparkSession.builder \
            .appName("LARS-Iceberg") \
            .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
            .config("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog") \
            .config("spark.sql.catalog.glue_catalog.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog") \
            .config("spark.sql.catalog.glue_catalog.warehouse", self.warehouse_path) \
            .config("spark.sql.catalog.glue_catalog.io-impl", "org.apache.iceberg.aws.s3.S3FileIO") \
            .config("spark.sql.defaultCatalog", "glue_catalog") \
            .config("spark.hadoop.fs.s3a.aws.credentials.provider", "com.amazonaws.auth.DefaultAWSCredentialsProviderChain") \
            .getOrCreate()
        
        return spark
    
    def get_s3_path(self, table_name: str) -> str:
        """테이블의 S3 경로 반환"""
        return f"{self.warehouse_path}/{table_name}"


# Iceberg 데이터 레이크 초기화
iceberg_config = IcebergConfig()

print(f"""
✅ Iceberg Configuration Ready:
   - S3 Bucket: {iceberg_config.s3_bucket}
   - Glue Catalog: {iceberg_config.glue_catalog}
   - Warehouse: {iceberg_config.warehouse_path}
   - Region: {iceberg_config.aws_region}
""")

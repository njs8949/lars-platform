"""
PostgreSQL to Iceberg Migration Script
LARS Platform 데이터 레이크 마이그레이션
"""

import os
import sys
from datetime import datetime
from iceberg_config import iceberg_config
from iceberg_storage import iceberg_storage
import psycopg2
from pyspark.sql import DataFrame

class PostgresToIcebergMigration:
    """PostgreSQL 데이터를 Iceberg로 마이그레이션"""
    
    def __init__(self):
        self.spark = iceberg_config.create_spark_session()
        self.pg_host = os.getenv("POSTGRES_HOST", "db")
        self.pg_user = os.getenv("POSTGRES_USER", "postgres")
        self.pg_password = os.getenv("POSTGRES_PASSWORD", "postgres")
        self.pg_db = os.getenv("POSTGRES_DB", "lars")
        self.pg_port = os.getenv("POSTGRES_PORT", "5432")
    
    def get_postgres_connection(self):
        """PostgreSQL 연결"""
        return psycopg2.connect(
            host=self.pg_host,
            user=self.pg_user,
            password=self.pg_password,
            database=self.pg_db,
            port=self.pg_port
        )
    
    def read_postgres_table(self, table_name: str) -> DataFrame:
        """PostgreSQL 테이블을 Spark DataFrame으로 읽기"""
        print(f"📖 Reading PostgreSQL table: {table_name}")
        
        url = f"jdbc:postgresql://{self.pg_host}:{self.pg_port}/{self.pg_db}"
        
        df = self.spark.read \
            .format("jdbc") \
            .option("url", url) \
            .option("dbtable", table_name) \
            .option("user", self.pg_user) \
            .option("password", self.pg_password) \
            .option("driver", "org.postgresql.Driver") \
            .load()
        
        print(f"   ✅ Loaded {df.count()} rows, {len(df.columns)} columns")
        return df
    
    def migrate_table(self, pg_table_name: str, iceberg_table_name: str, 
                     partition_by: list = None):
        """테이블 마이그레이션"""
        print(f"\n🔄 Migrating {pg_table_name} → {iceberg_table_name}")
        
        # PostgreSQL에서 데이터 읽기
        df = self.read_postgres_table(pg_table_name)
        
        # Iceberg 테이블 생성
        iceberg_storage.create_table(
            iceberg_table_name, 
            df, 
            partition_by=partition_by
        )
        
        print(f"✅ Migration complete: {iceberg_table_name}")
        print(f"   Location: {iceberg_config.get_s3_path(iceberg_table_name)}")
        
        return iceberg_table_name
    
    def migrate_all_tables(self):
        """모든 테이블 마이그레이션"""
        print("=" * 60)
        print("PostgreSQL → Iceberg Migration")
        print("=" * 60)
        
        try:
            conn = self.get_postgres_connection()
            cursor = conn.cursor()
            
            # 테이블 목록 조회
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            
            tables = cursor.fetchall()
            
            if not tables:
                print("⚠️  No tables found in PostgreSQL")
                return
            
            migrated_tables = []
            
            for (table_name,) in tables:
                try:
                    # 특수 테이블 제외
                    if table_name.startswith('_') or table_name in ['migrations']:
                        print(f"⏭️  Skipping {table_name}")
                        continue
                    
                    iceberg_name = f"pg_{table_name}"
                    
                    # 시계열 데이터 테이블은 날짜별 파티션
                    if 'log' in table_name or 'event' in table_name or 'trace' in table_name:
                        self.migrate_table(
                            table_name, 
                            iceberg_name, 
                            partition_by=['year', 'month', 'day']
                        )
                    else:
                        self.migrate_table(table_name, iceberg_name)
                    
                    migrated_tables.append(iceberg_name)
                
                except Exception as e:
                    print(f"❌ Error migrating {table_name}: {str(e)}")
            
            cursor.close()
            conn.close()
            
            print("\n" + "=" * 60)
            print(f"✅ Migration Complete: {len(migrated_tables)} tables migrated")
            print("=" * 60)
            
            for table in migrated_tables:
                print(f"   • {table}")
            
            return migrated_tables
        
        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            return []


if __name__ == "__main__":
    migrator = PostgresToIcebergMigration()
    migrator.migrate_all_tables()

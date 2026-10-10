import csv
import os
from django.core.management.base import BaseCommand
from projects.models import Project

class Command(BaseCommand):
    help = 'Import project records from the CSV dataset'

    def handle(self, *args, **options):
        self.stdout.write("Clearing existing projects...")
        Project.objects.all().delete()
        
        # Look for the dataset in backend/data/mock/projects.csv
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        dataset_path = os.path.join(base_dir, 'data', 'mock', 'projects.csv')
        
        if not os.path.exists(dataset_path):
            self.stderr.write(f"Dataset not found at {dataset_path}")
            return

        self.stdout.write(f"Starting data ingestion from {dataset_path}...")

        imported = 0
        errors = 0

        with open(dataset_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    data = {
                        "project_id": row["project_id"],
                        "project_name": row["project_name"],
                        "state": row["state"],
                        "source_project_id": row["source_project_id"],
                        "department": row.get("sector", ""),
                        "project_category": row.get("sector", ""),
                        
                        "original_cost": float(row["original_cost_cr"]) * 10000000 if row.get("original_cost_cr") else None,
                        "revised_cost": float(row["revised_cost_cr"]) * 10000000 if row.get("revised_cost_cr") else None,
                        "expenditure": float(row["expenditure_cr"]) * 10000000 if row.get("expenditure_cr") else None,
                        "reported_progress": float(row["reported_progress_pct"]) if row.get("reported_progress_pct") else None,
                        
                        "financial_utilization_pct": float(row["financial_utilization_pct"]) if row.get("financial_utilization_pct") else None,
                        "cost_deviation_pct": float(row["cost_deviation_pct"]) if row.get("cost_deviation_pct") else None,
                        
                        "data_source_type": row["data_source_type"],
                        "source_name": row["source_name"],
                        "source_reference": row["source_reference"],
                        "source_url": row["source_url"],
                    }

                    Project.objects.create(**data)
                    imported += 1
                except Exception as e:
                    self.stderr.write(f"Validation error for {row.get('project_id')}: {str(e)}")
                    errors += 1

        self.stdout.write(self.style.SUCCESS(
            f"Import complete: {imported} imported, {errors} errors."
        ))

from django.db import models
from core.models import User

class Project(models.Model):
    # Data Source Classification
    SOURCE_TYPES = (
        ('OFFICIAL', 'Official'),
        ('DERIVED', 'Derived'),
        ('SYNTHETIC_DEMO', 'Synthetic Demo'),
    )

    VERIFICATION_STATUSES = (
        ('NOT_REVIEWED', 'Not Reviewed'),
        ('IN_REVIEW', 'In Review'),
        ('VERIFIED', 'Verified'),
        ('CLOSED', 'Closed'),
    )

    # Core Identifiers
    project_id = models.CharField(max_length=100, unique=True, db_index=True)
    source_project_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    project_name = models.CharField(max_length=500, db_index=True)
    project_description = models.TextField(blank=True, null=True)

    # Administrative
    state = models.CharField(max_length=100, db_index=True)
    district = models.CharField(max_length=100, db_index=True, blank=True, null=True)
    scheme = models.CharField(max_length=200, db_index=True, blank=True, null=True)
    department = models.CharField(max_length=200, db_index=True, blank=True, null=True)
    ministry = models.CharField(max_length=200, blank=True, null=True)
    project_category = models.CharField(max_length=200, blank=True, null=True)
    work_type = models.CharField(max_length=200, blank=True, null=True)

    # Location Details
    location_from = models.CharField(max_length=200, blank=True, null=True)
    location_to = models.CharField(max_length=200, blank=True, null=True)
    length_or_quantity = models.CharField(max_length=100, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)

    # Financial
    original_cost = models.DecimalField(max_digits=20, decimal_places=2, blank=True, null=True)
    revised_cost = models.DecimalField(max_digits=20, decimal_places=2, blank=True, null=True)
    expenditure = models.DecimalField(max_digits=20, decimal_places=2, blank=True, null=True)

    # Derived Financial (can be calculated on save or left to be updated by ingest)
    financial_utilization_pct = models.FloatField(blank=True, null=True)
    cost_deviation_pct = models.FloatField(blank=True, null=True)

    # Timeline
    original_end_date = models.DateField(blank=True, null=True)
    revised_end_date = models.DateField(blank=True, null=True)
    delay_days = models.IntegerField(blank=True, null=True)

    # Progress
    reported_progress = models.FloatField(blank=True, null=True)  # 0 to 100
    expected_progress = models.FloatField(blank=True, null=True)
    progress_gap_pct = models.FloatField(blank=True, null=True)
    expenditure_progress_ratio = models.FloatField(blank=True, null=True)

    # Provenance
    data_source_type = models.CharField(max_length=50, choices=SOURCE_TYPES, db_index=True)
    source_name = models.CharField(max_length=200, blank=True, null=True)
    source_url = models.URLField(max_length=500, blank=True, null=True)
    source_reference = models.CharField(max_length=500, blank=True, null=True)
    last_source_update = models.DateTimeField(blank=True, null=True)
    
    # Verification
    verification_status = models.CharField(max_length=50, choices=VERIFICATION_STATUSES, default='NOT_REVIEWED', db_index=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Placeholders for future phases
    # rule_signals, ml_score, anomaly_flag, attention_level etc will be added later or stored in a separate document referencing project_id.

    def __str__(self):
        return f"[{self.project_id}] {self.project_name}"

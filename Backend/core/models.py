from django.contrib.auth.models import AbstractUser
from django.db import models

class Role(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    GOVERNMENT_OFFICER = 'GOVERNMENT_OFFICER', 'Government Officer'
    FIELD_OFFICER = 'FIELD_OFFICER', 'Field Officer'
    CITIZEN = 'CITIZEN', 'Citizen'

class User(AbstractUser):
    role = models.CharField(
        max_length=50,
        choices=Role.choices,
        default=Role.CITIZEN
    )
    # Scope definitions for filtering
    state = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class ProjectAssignment(models.Model):
    """Explicit project assignment for field officers and implementing agencies."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_assignments')
    project_id = models.CharField(max_length=100, db_index=True)

    class Meta:
        unique_together = ('user', 'project_id')

    def __str__(self):
        return f"{self.user.username} -> {self.project_id}"

class AuditEvent(models.Model):
    EVENT_TYPES = (
        ('PROJECT_CREATED', 'Project Created'),
        ('PROJECT_UPDATED', 'Project Updated'),
        ('PROJECT_SOURCE_UPDATED', 'Project Source Updated'),
        ('PROJECT_STATUS_UPDATED', 'Project Status Updated'),
    )
    
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    entity_type = models.CharField(max_length=50) # e.g. 'Project'
    entity_id = models.CharField(max_length=100)  # String to match project_id
    timestamp = models.DateTimeField(auto_now_add=True)
    change_summary = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.event_type} on {self.entity_type} {self.entity_id} at {self.timestamp}"

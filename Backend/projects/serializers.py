from rest_framework import serializers
from .models import Project

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ('project_id', 'source_project_id', 'data_source_type', 'created_at', 'updated_at')


class PublicProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = (
            'project_id',
            'source_project_id',
            'project_name',
            'project_description',
            'state',
            'district',
            'scheme',
            'department',
            'project_category',
            'work_type',
            'location_from',
            'location_to',
            'latitude',
            'longitude',
            'original_cost',
            'revised_cost',
            'reported_progress',
            'data_source_type',
            'verification_status',
            'is_public',
        )
        read_only_fields = fields

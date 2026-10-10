from rest_framework import serializers
from .models import Project

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ('project_id', 'source_project_id', 'data_source_type', 'created_at', 'updated_at')

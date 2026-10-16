from rest_framework import serializers
from core.models import User, Role, ProjectAssignment
from core.rbac import assigned_project_ids, get_role


def serialize_user(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'state': user.state,
        'district': user.district,
        'department': user.department,
        'is_active': user.is_active,
        'assigned_project_ids': sorted(assigned_project_ids(user)),
    }


class UserAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    assigned_project_ids = serializers.ListField(
        child=serializers.CharField(), required=False, write_only=True
    )

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'password',
            'role', 'state', 'district', 'department', 'is_active', 'assigned_project_ids',
        )

    def validate_role(self, value):
        valid = {choice[0] for choice in Role.choices}
        if value not in valid:
            raise serializers.ValidationError('Invalid role.')
        return value

    def create(self, validated_data):
        assigned = validated_data.pop('assigned_project_ids', [])
        password = validated_data.pop('password', None) or User.objects.make_random_password()
        user = User.objects.create_user(password=password, **validated_data)
        self._set_assignments(user, assigned)
        return user

    def update(self, instance, validated_data):
        request = self.context.get('request')
        assigned = validated_data.pop('assigned_project_ids', None)
        password = validated_data.pop('password', None)

        if 'role' in validated_data and request and instance.pk == request.user.pk:
            if validated_data['role'] != instance.role and get_role(request.user) != Role.ADMIN:
                raise serializers.ValidationError({'role': 'You cannot change your own role.'})

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if assigned is not None:
            self._set_assignments(instance, assigned)
        return instance

    def _set_assignments(self, user, project_ids):
        wanted = set(project_ids or [])
        existing = set(user.project_assignments.values_list('project_id', flat=True))
        user.project_assignments.filter(project_id__in=(existing - wanted)).delete()
        for project_id in wanted - existing:
            ProjectAssignment.objects.get_or_create(user=user, project_id=project_id)

    def to_representation(self, instance):
        return serialize_user(instance)

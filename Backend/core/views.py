from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        
        # Format response matching frontend expectations
        data['token'] = data['access']
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'state': user.state,
            'district': user.district,
            'department': user.department,
        }
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'role': user.role,
        'state': user.state,
        'district': user.district,
        'department': user.department,
    })

@api_view(['POST'])
def logout_view(request):
    # For JWT, client discards the token. Server-side logout is mostly empty.
    return Response({"detail": "Successfully logged out."})

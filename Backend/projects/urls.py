from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet
from .corrective_actions import CorrectiveActionViewSet
from .reports import OversightDashboardView, ReportsListView, ReportsExportView

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'corrective-actions', CorrectiveActionViewSet, basename='corrective-action')

urlpatterns = [
    path('reports/dashboard/', OversightDashboardView.as_view(), name='reports_dashboard'),
    path('reports/export/', ReportsExportView.as_view(), name='reports_export'),
    path('reports/', ReportsListView.as_view(), name='reports_list'),
    path('', include(router.urls)),
]

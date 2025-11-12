from django.urls import include, path
from rest_framework.routers import DefaultRouter

from charts.views import ChartViewSet

router = DefaultRouter()
router.register(r"", ChartViewSet, basename="chart")

urlpatterns = [
    path("", include(router.urls)),
]

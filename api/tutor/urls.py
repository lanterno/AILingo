from django.urls import include, path
from rest_framework.routers import DefaultRouter

from tutor.views import QuestionViewSet

router = DefaultRouter()
router.register(r"", QuestionViewSet, basename="chart")

urlpatterns = [
    path("", include(router.urls)),
]

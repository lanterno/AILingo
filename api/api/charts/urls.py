from django.urls import path
from api.charts.views import ChartViewSet

urlpatterns = [
    path("generate-question/", ChartViewSet.as_view({"post": "generate_question"}), name="generate-question"),
    path("evaluate/", ChartViewSet.as_view({"post": "evaluate_solution"}), name="evaluate"),
]

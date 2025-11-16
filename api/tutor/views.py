import os

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .ai_tutor import AITutor
from .serializers import EmptySerializer, EvaluateAnswerSerializer

# Initialize AI Tutor instance
api_key = os.environ.get("OPENAI_API_KEY")
ai_tutor = AITutor(api_key=api_key)


class QuestionViewSet(viewsets.GenericViewSet):
    serializer_class = EmptySerializer

    @action(detail=False, methods=["post"], url_path="generate-question")
    def generate_question(self, request):
        # ToDO: save the created question to DB
        # Question: which db should the question be stored in?
        question_data = ai_tutor.generate_question()
        return Response(question_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="evaluate")
    def evaluate_answer(self, request):
        serializer = EvaluateAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        question = validated_data["question"]
        original_question = validated_data["original_question"]
        student_solution = validated_data["student_solution"]

        evaluation_result = ai_tutor.evaluate_answer(
            question=question,
            original_question=original_question,
            student_solution=student_solution,
        )

        return Response(evaluation_result, status=status.HTTP_200_OK)

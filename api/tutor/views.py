import os

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .ai_tutor import AITutor

# Initialize AI Tutor instance
api_key = os.environ.get("OPENAI_API_KEY")
ai_tutor = AITutor(api_key=api_key)


class QuestionViewSet(viewsets.GenericViewSet):
    @action(detail=False, methods=["post"], url_path="generate-question")
    def generate_question(self, request):
        # ToDO: save the created question to DB
        # Question: which db should the question be stored in?
        question_data = ai_tutor.generate_question()
        return Response(question_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="evaluate")
    def evaluate_answer(self, request):
        # ToDo: Retrieve the question from the database
        question = request.data.get("question", "")
        answer = request.data.get("answer", [])

        evaluation_result = ai_tutor.evaluate_answer(
            question=question, student_answer=answer
        )

        return Response(evaluation_result, status=status.HTTP_200_OK)

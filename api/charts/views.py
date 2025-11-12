from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .ai_tutor import AITutor

# Initialize AI Tutor instance
ai_tutor = AITutor()


class ChartViewSet(viewsets.ViewSet):
    """ViewSet for managing chart questions and evaluations."""

    @action(detail=False, methods=["post"], url_path="generate-question")
    def generate_question(self, request):
        """Generate a new question using AI."""
        try:
            question_data = ai_tutor.generate_question()
            return Response(question_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Failed to generate question: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["post"], url_path="evaluate")
    def evaluate_solution(self, request):
        """Evaluate student's solution using AI."""
        try:
            question = request.data.get("question", "")
            student_solution = request.data.get("studentSolution", [])
            correct_answer = request.data.get("correctAnswer", {})

            evaluation_result = ai_tutor.evaluate_solution(
                question=question,
                student_solution=student_solution,
                correct_answer=correct_answer
            )

            return Response(evaluation_result, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {"correct": False, "feedback": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to evaluate solution: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

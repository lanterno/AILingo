import json
import os
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from openai import OpenAI

# Get OpenAI API key from environment variable
openai_api_key = os.environ.get("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError(
        "OPENAI_API_KEY environment variable is required. "
        "Please set it before running the server."
    )

client = OpenAI(api_key=openai_api_key)


class ChartViewSet(viewsets.ViewSet):
    """ViewSet for managing chart questions and evaluations."""

    @action(detail=False, methods=["post"])
    def generate_question(self, request):
        """Generate a new question using AI."""
        try:
            prompt = """You are a tutor teaching students   about the concept of RANGE and DOMAIN in graphs. 

IMPORTANT DEFINITIONS:
- DOMAIN refers to the INPUT values (X-axis) - the set of all possible input values
- RANGE refers to the OUTPUT values (Y-axis) - the set of all possible output values

The student will interact with a bubble chart where they can move points in any direction.

CRITICAL: The question should NOT explicitly mention which axis to control. 
The student must figure out that RANGE refers to the Y-axis (output values). 
The question should only mention "range" without saying "Y-axis" or "Y values".

Generate a JSON response with the following structure:
{
    "title": "A descriptive title for the graph (e.g., 'Population Density in Major Cities')",
    "question": "A clear, educational question about RANGE that the student needs to solve by moving bubbles. 
    DO NOT mention Y-axis or Y values explicitly. Just ask about 'range' and let the student figure out it refers to the Y-axis. 
    Examples: 'Arrange the bubbles to maximize the range', 'Position the points so the range is minimized', 
    'Move the bubbles so the range is between X and Y'",
    "dataset": [
        {"x": number, "y": number, "r": number, "label": "string", "color": "#hexcolor"},
        ... (4-10 points)
    ],
    "xAxisLabel": "Descriptive label for X axis (input/domain)",
    "yAxisLabel": "Descriptive label for Y axis (output/range)",
    "xAxisValues": ["Value1", "Value2", "Value3", ...],  // Optional: specific values for X axis
    "yAxisValues": ["Value1", "Value2", "Value3", ...],  // Optional: specific values for Y axis
    "correctAnswer": {
        "description": "What the correct answer should look like - focus on the RANGE (Y-axis values)",
        "expectedRange": {
            "y": {"min": number, "max": number}  // Only Y-axis range matters
        },
        "expectedDomain": {
            "x": {"min": number, "max": number}  // X-axis domain constraints (if any)
        }
    }
}

The question should be about RANGE but WITHOUT explicitly mentioning Y-axis. For example:
- "Arrange the bubbles so that the range is maximized"
- "Move the points to minimize the range"
- "Position the bubbles so the range is between X and Y"
- "Can you make the range as large as possible?"

DO NOT use phrases like "range of Y values" or "Y-axis range" - just say "range" and let students discover it refers to the Y-axis.

Make the dataset interesting with varied sizes and positions. Use different colors for each point.
Choose a real-world scenario (like population, temperature, sales, etc.) to make it engaging."""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an educational tutor. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
            )

            content = response.choices[0].message.content.strip()
            # Remove markdown code blocks if present
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            question_data = json.loads(content)
            return Response(question_data, status=status.HTTP_200_OK)

        except json.JSONDecodeError as e:
            raw_content = locals().get("content", "Unable to retrieve raw content")
            return Response(
                {"error": f"Failed to parse AI response: {str(e)}", "raw": raw_content},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to generate question: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["post"])
    def evaluate_solution(self, request):
        """Evaluate student's solution using AI."""
        try:
            question = request.data.get("question", "")
            dataset = request.data.get("dataset", [])
            student_solution = request.data.get("studentSolution", [])
            correct_answer = request.data.get("correctAnswer", {})
            x_axis_label = request.data.get("xAxisLabel", "X Axis")
            y_axis_label = request.data.get("yAxisLabel", "Y Axis")

            # Calculate actual ranges
            if not student_solution:
                return Response(
                    {"correct": False, "feedback": "No solution provided."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            x_values = [p["x"] for p in student_solution]
            y_values = [p["y"] for p in student_solution]
            x_domain = max(x_values) - min(x_values) if x_values else 0
            y_range = max(y_values) - min(y_values) if y_values else 0

            expected_range = correct_answer.get("expectedRange", {})
            expected_domain = correct_answer.get("expectedDomain", {})
            expected_y_range = expected_range.get("y", {})
            expected_x_domain = expected_domain.get("x", {})

            # Check if solution is correct - focus on RANGE (Y-axis)
            y_min_ok = min(y_values) >= expected_y_range.get("min", float("-inf"))
            y_max_ok = max(y_values) <= expected_y_range.get("max", float("inf"))
            
            # Domain (X-axis) constraints are optional
            x_min_ok = min(x_values) >= expected_x_domain.get("min", float("-inf")) if expected_x_domain else True
            x_max_ok = max(x_values) <= expected_x_domain.get("max", float("inf")) if expected_x_domain else True

            is_correct = y_min_ok and y_max_ok and x_min_ok and x_max_ok

            # Get AI feedback
            feedback_prompt = f"""You are a tutor evaluating a student's solution to a graph RANGE problem.

IMPORTANT: RANGE refers to Y-axis (output values), DOMAIN refers to X-axis (input values).

Question: {question}

Expected answer description: {correct_answer.get('description', 'N/A')}
Expected RANGE (Y-axis): {expected_y_range}
Expected DOMAIN (X-axis): {expected_x_domain if expected_x_domain else 'No specific constraints'}

Student's solution:
X values (domain): {x_values} (domain span: {x_domain:.2f})
Y values (range): {y_values} (range: {y_range:.2f})

Is the solution correct? {is_correct}

Provide personalized, encouraging feedback. Focus on whether the RANGE (Y-axis output values) is correct. 
If incorrect, explain what they need to adjust regarding the RANGE. If correct, celebrate their success! 
Keep it concise (2-3 sentences)."""

            feedback_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a supportive, encouraging tutor."},
                    {"role": "user", "content": feedback_prompt}
                ],
                temperature=0.7,
            )

            feedback = feedback_response.choices[0].message.content.strip()

            return Response({
                "correct": is_correct,
                "feedback": feedback,
                "domain": {
                    "x": {"min": min(x_values), "max": max(x_values), "span": x_domain},
                },
                "range": {
                    "y": {"min": min(y_values), "max": max(y_values), "range": y_range},
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Failed to evaluate solution: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

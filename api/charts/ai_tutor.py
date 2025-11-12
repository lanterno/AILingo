"""AI Tutor module for generating questions and evaluating solutions."""
import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from openai import OpenAI


class AITutor:
    """AI-powered tutor for generating educational questions and evaluating solutions."""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the AI Tutor.

        Args:
            api_key: OpenAI API key. If not provided, will try to get from OPENAI_API_KEY env var.
        
        Raises:
            ValueError: If API key is not provided and not found in environment.
        """
        if api_key is None:
            api_key = os.environ.get("OPENAI_API_KEY")
        
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY environment variable is required. "
                "Please set it before running the server."
            )
        
        self.client = OpenAI(api_key=api_key)
        self.prompts_dir = Path(__file__).parent / "prompts"
        self.model = "gpt-4o-mini"
        self.temperature = 0.7

    def _load_prompt(self, filename: str) -> str:
        """Load a prompt template from a file."""
        prompt_path = self.prompts_dir / filename
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()

    def _clean_json_response(self, content: str) -> str:
        """Remove markdown code blocks from AI response."""
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        return content.strip()

    def generate_question(self) -> Dict[str, Any]:
        """
        Generate a new educational question using AI.

        Returns:
            Dictionary containing the question data (title, question, dataset, etc.)

        Raises:
            json.JSONDecodeError: If the AI response cannot be parsed as JSON.
            Exception: For other errors during question generation.
        """
        prompt = self._load_prompt("generate_question.txt")

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an educational tutor. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=self.temperature,
        )

        content = response.choices[0].message.content.strip()
        content = self._clean_json_response(content)
        
        return json.loads(content)

    def evaluate_solution(
        self,
        question: str,
        student_solution: List[Dict[str, float]],
        correct_answer: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Evaluate a student's solution and provide feedback.

        Args:
            question: The original question text.
            student_solution: List of points with x, y coordinates.
            correct_answer: Dictionary containing expected answer details.

        Returns:
            Dictionary containing:
                - correct: Boolean indicating if solution is correct
                - feedback: AI-generated feedback message
                - domain: Calculated domain (X-axis) values
                - range: Calculated range (Y-axis) values

        Raises:
            ValueError: If student_solution is empty.
            Exception: For other errors during evaluation.
        """
        if not student_solution:
            raise ValueError("No solution provided.")

        # Calculate actual ranges
        x_values = [p["x"] for p in student_solution]
        y_values = [p["y"] for p in student_solution]
        x_domain = max(x_values) - min(x_values) if x_values else 0
        y_range = max(y_values) - min(y_values) if y_values else 0

        expected_range = correct_answer.get("expectedRange", {})
        expected_domain = correct_answer.get("expectedDomain", {})
        expected_y_range = expected_range.get("y", {})
        expected_x_domain = expected_domain.get("x", {})

        # Let AI determine correctness - provide context but don't pre-judge
        feedback_template = self._load_prompt("evaluate_solution.txt")
        feedback_prompt = feedback_template.format(
            question=question,
            expected_description=correct_answer.get('description', 'N/A'),
            x_values=x_values,
            x_domain=x_domain,
            y_values=y_values,
            y_range=y_range,
        )

        feedback_response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a supportive, encouraging tutor. Always respond with valid JSON only."},
                {"role": "user", "content": feedback_prompt}
            ],
            temperature=self.temperature,
        )

        content = feedback_response.choices[0].message.content.strip()
        content = self._clean_json_response(content)
        
        # Parse AI's evaluation
        evaluation_data = json.loads(content)
        is_correct = evaluation_data.get("correct", False)
        feedback = evaluation_data.get("feedback", "Thank you for your solution!")

        return {
            "correct": is_correct,
            "feedback": feedback,
            "domain": {
                "x": {"min": min(x_values), "max": max(x_values), "span": x_domain},
            },
            "range": {
                "y": {"min": min(y_values), "max": max(y_values), "range": y_range},
            }
        }


"""AI Tutor module for generating questions and evaluating solutions."""

import json
from pathlib import Path
from typing import Any

from openai import OpenAI


class AITutor:
    """
    This Tutor is an AI-based decision layer.
    Its role is to
        1. Choose which questions to show the user
        2. Choose which question interface to display
            For example, every question type - Multipl-Question, Graph-based, free text, etc.
            have specific UI that suits them.
        3. Provide question data in a format suitable for the question and the interface
    """

    def __init__(self, api_key: str = None):
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"
        self.temperature = 0.7

    def _load_prompt(self, filename: str) -> str:
        """Load a prompt template from a file."""
        prompts_dir = Path(__file__).parent / "prompts"
        prompt_path = prompts_dir / filename
        with open(prompt_path, encoding="utf-8") as f:
            return f.read()

    def generate_question(self) -> dict[str, Any]:
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
                {
                    "role": "system",
                    "content": "You are an educational tutor. Always respond with valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=self.temperature,
        )

        content = response.choices[0].message.content.strip()

        try:
            question_as_json = json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON response from AI: {content}") from e

        return question_as_json

    def evaluate_answer(
        self,
        question: str,
        student_answer: dict,
    ) -> dict[str, Any]:
        """
        Evaluate a student's answer and provide feedback.

        Args:
            question: The original question text.
            student_solution: List of points with x, y coordinates.

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

        # Let AI determine correctness - provide context but don't pre-judge
        feedback_template = self._load_prompt("evaluate_solution.txt")
        feedback_prompt = feedback_template.format(
            question=question,
            expected_description=student_answer,
        )

        feedback_response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a supportive, encouraging tutor. Always respond with valid JSON only.",
                },
                {"role": "user", "content": feedback_prompt},
            ],
            temperature=self.temperature,
        )

        content = feedback_response.choices[0].message.content.strip()

        evaluation_data = json.loads(content)

        return evaluation_data

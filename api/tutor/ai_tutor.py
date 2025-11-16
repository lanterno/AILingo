"""AI Tutor module for generating questions and evaluating solutions"""

import json
import logging

from pathlib import Path
from typing import Any

from openai import OpenAI

logger = logging.getLogger(__name__)


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
        self.model = "gpt-5-mini"

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
        logger.info("Generating a new question")
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
        )

        content = response.choices[0].message.content.strip()

        try:
            question_as_json = json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON response from AI: {content}") from e

        logger.info("Finished generating question")
        return question_as_json

    def evaluate_answer(
        self,
        question: str,
        original_question: dict[str, Any],
        student_solution: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Evaluate a student's answer and provide feedback.

        Args:
            question: The question text (subtitle or title).
            original_question: The full original question data that was generated.
            student_solution: List of points with x, y, r, color coordinates.

        Returns:
            Dictionary containing:
                - correct: Boolean indicating if solution is correct
                - feedback: AI-generated feedback message

        Raises:
            ValueError: If student_solution is empty.
            Exception: For other errors during evaluation.
        """
        if not student_solution:
            raise ValueError("Student solution cannot be empty")

        # Load both prompts
        generate_prompt = self._load_prompt("generate_question.txt")
        evaluate_prompt_template = self._load_prompt("evaluate_solution.txt")

        # Format the student answer as JSON string
        student_answer_json = json.dumps(student_solution, indent=2)

        # Construct the full evaluation prompt in the required order:
        # 1. The question generation prompt (reconstructed)
        # 2. The actual question that was generated
        # 3. The question text
        # 4. The evaluation prompt template
        # 5. The student's answer (inserted into the template)
        full_prompt = f"""{generate_prompt}
            ---

            The question that was generated (in JSON format):
            {json.dumps(original_question, indent=2)}

            ---

            The question text for the student:
            {question}

            ---

            {evaluate_prompt_template.format(student_answer=student_answer_json)}
        """

        feedback_response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a supportive, encouraging tutor. Always respond with valid JSON only.",
                },
                {"role": "user", "content": full_prompt},
            ],
        )

        content = feedback_response.choices[0].message.content.strip()

        evaluation_data = json.loads(content)

        return evaluation_data

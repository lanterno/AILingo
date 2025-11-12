const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ChartPoint {
  x: number;
  y: number;
  r: number;
  label?: string;
  color?: string;
}

export interface QuestionData {
  title: string;
  question: string;
  dataset: ChartPoint[];
  xAxisLabel: string;
  yAxisLabel: string;
  xAxisValues?: string[];
  yAxisValues?: string[];
  correctAnswer: {
    description: string;
    expectedRange: {
      y: { min: number; max: number };
    };
    expectedDomain?: {
      x: { min: number; max: number };
    };
  };
}

export interface EvaluationResult {
  correct: boolean;
  feedback: string;
  domain: {
    x: { min: number; max: number; span: number };
  };
  range: {
    y: { min: number; max: number; range: number };
  };
}

export const chartApi = {
  async generateQuestion(): Promise<QuestionData> {
    const response = await fetch(`${API_BASE_URL}/api/charts/generate-question/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to generate question');
    }
    return response.json();
  },

  async evaluateSolution(
    question: string,
    dataset: ChartPoint[],
    studentSolution: ChartPoint[],
    correctAnswer: QuestionData['correctAnswer'],
    xAxisLabel: string,
    yAxisLabel: string
  ): Promise<EvaluationResult> {
    const response = await fetch(`${API_BASE_URL}/api/charts/evaluate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        dataset,
        studentSolution,
        correctAnswer,
        xAxisLabel,
        yAxisLabel,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to evaluate solution');
    }
    return response.json();
  },
};

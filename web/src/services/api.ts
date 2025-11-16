const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ChartPoint {
  x: number;
  y: number;
  r: number;
  title?: string;
  label?: string;
  color?: string;
}

export interface LegendItem {
  size: number;
  label: string;
}

export interface Legend {
  title: string;
  items: LegendItem[];
}

export interface QuestionData {
  title: string;
  subtitle?: string;
  question: string;
  graphTitle?: string;
  dataset: ChartPoint[];
  xAxisLabel: string;
  yAxisLabel: string;
  xAxisValues?: string[];
  yAxisValues?: string[];
  legend: Legend;
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

export function transformQuestionData(data: any): QuestionData {
  if (data.format_input) {
    const formatInput = data.format_input;
    
    if (!formatInput.dataset || !Array.isArray(formatInput.dataset)) {
      throw new Error('Invalid API response: dataset is missing or not an array');
    }
    
    let correctAnswer;
    if (formatInput.dataset.length > 0) {
      const initialYValues = formatInput.dataset.map((p: ChartPoint) => p.y);
      const yMin = Math.min(...initialYValues);
      const yMax = Math.max(...initialYValues);
      const initialXValues = formatInput.dataset.map((p: ChartPoint) => p.x);
      const xMin = Math.min(...initialXValues);
      const xMax = Math.max(...initialXValues);
      
      correctAnswer = {
        description: data.subtitle || data.title || 'Adjust the points to match the required range',
        expectedRange: { y: { min: yMin, max: yMax } },
        expectedDomain: { x: { min: xMin, max: xMax } },
      };
    } else {
      correctAnswer = {
        description: '',
        expectedRange: { y: { min: 0, max: 0 } },
      };
    }
    
    return {
      title: data.title || '',
      subtitle: data.subtitle,
      question: data.subtitle || data.title || '',
      graphTitle: formatInput.title,
      dataset: formatInput.dataset || [],
      xAxisLabel: formatInput.xAxisLabel || 'X Axis',
      yAxisLabel: formatInput.yAxisLabel || 'Y Axis',
      xAxisValues: formatInput.xAxisValues,
      yAxisValues: formatInput.yAxisValues,
      legend: formatInput.legend || {
        title: 'Size',
        items: [],
      },
      correctAnswer,
    };
  }
  
  return {
    title: data.title || '',
    subtitle: data.subtitle,
    question: data.subtitle || (typeof data.question === 'string' ? data.question : (data.hint || data.title || '')),
    graphTitle: data.graphTitle,
    dataset: data.dataset || [],
    xAxisLabel: data.xAxisLabel || 'X Axis',
    yAxisLabel: data.yAxisLabel || 'Y Axis',
    xAxisValues: data.xAxisValues,
    yAxisValues: data.yAxisValues,
    legend: data.legend || {
      title: 'Size',
      items: [],
    },
    correctAnswer: data.correctAnswer || {
      description: '',
      expectedRange: { y: { min: 0, max: 0 } },
    },
  };
}

export const chartApi = {
  async generateQuestion(): Promise<QuestionData> {
    const response = await fetch(`${API_BASE_URL}/api/tutor/generate-question/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to generate question');
    }
    const responseData = await response.json();
    const data = responseData.question || responseData;
    
    if (data.format && data.format !== 'Bubble Chart') {
      console.warn(`Unexpected question format: ${data.format}. Expected "Bubble Chart"`);
    }
    
    return transformQuestionData(data);
  },

  async evaluateSolution(
    question: string,
    studentSolution: ChartPoint[],
    originalQuestion: QuestionData
  ): Promise<EvaluationResult> {
    if (studentSolution.length === 0) {
      throw new Error('Student solution cannot be empty');
    }
    
    const xValues = studentSolution.map(p => p.x);
    const yValues = studentSolution.map(p => p.y);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    const domain = {
      x: {
        min: xMin,
        max: xMax,
        span: xMax - xMin,
      },
    };
    const range = {
      y: {
        min: yMin,
        max: yMax,
        range: yMax - yMin,
      },
    };

    const response = await fetch(`${API_BASE_URL}/api/tutor/evaluate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        original_question: originalQuestion,
        student_solution: studentSolution,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to evaluate solution');
    }
    const apiResult = await response.json();
    
    return {
      correct: apiResult.correct,
      feedback: apiResult.feedback,
      domain,
      range,
    };
  },
};

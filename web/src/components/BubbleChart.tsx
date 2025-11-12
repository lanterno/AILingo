import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bubble } from 'react-chartjs-2';
import dragDataPlugin from 'chartjs-plugin-dragdata';
import { chartApi, ChartPoint, QuestionData, EvaluationResult } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  dragDataPlugin
);

const STORAGE_KEY = 'schole-question-data';

const BubbleChart: React.FC = () => {
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chartRef = useRef<ChartJS<'bubble', ChartPoint[]>>(null);

  const loadQuestion = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to load from localStorage first
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setQuestionData(parsed);
        setPoints(parsed.dataset);
        setLoading(false);
        return;
      }

      // Generate new question if none exists
      const newQuestion = await chartApi.generateQuestion();
      setQuestionData(newQuestion);
      setPoints(newQuestion.dataset);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuestion));
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question');
      setLoading(false);
    }
  }, []);

  const generateNewQuestion = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setEvaluation(null);
      setIsCelebrating(false);
      
      const newQuestion = await chartApi.generateQuestion();
      setQuestionData(newQuestion);
      setPoints(newQuestion.dataset);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuestion));
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate question');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  const handleDragEnd = useCallback(
    async (event: any, datasetIndex: number, index: number, value: any) => {
      // Update local state immediately for smooth dragging
      setPoints((prev) =>
        prev.map((p, idx) =>
          idx === index ? { ...p, x: value.x, y: value.y } : p
        )
      );
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!questionData) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const result = await chartApi.evaluateSolution(
        questionData.question,
        questionData.dataset,
        points,
        questionData.correctAnswer,
        questionData.xAxisLabel,
        questionData.yAxisLabel
      );
      
      setEvaluation(result);
      
      if (result.correct) {
        setIsCelebrating(true);
        setTimeout(() => setIsCelebrating(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate solution');
    } finally {
      setIsSubmitting(false);
    }
  }, [questionData, points]);

  // Get unique radius values for the legend - show only 3 sizes (min, middle, max)
  const uniqueRadii = React.useMemo(() => {
    const radii = [...new Set(points.map((p) => p.r))].sort((a, b) => a - b);
    if (radii.length === 0) return [];
    if (radii.length === 1) return [radii[0]];
    if (radii.length === 2) return [radii[0], radii[1]];
    const min = radii[0];
    const max = radii[radii.length - 1];
    const middleIndex = Math.floor(radii.length / 2);
    const middle = radii[middleIndex];
    return [min, middle, max];
  }, [points]);

  const chartData = {
    datasets: [
      {
        label: 'Bubble Chart',
        data: points.map((p) => ({
          x: p.x,
          y: p.y,
          r: p.r,
        })),
        backgroundColor: points.map((p) => p.color || '#3B82F6'),
        borderColor: points.map((p) => p.color || '#3B82F6'),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: questionData?.xAxisLabel || 'X Axis',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: questionData?.yAxisLabel || 'Y Axis',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const point = points[context.dataIndex];
            return [
              point.label || `Point ${context.dataIndex + 1}`,
              `X: ${point.x.toFixed(2)}`,
              `Y: ${point.y.toFixed(2)}`,
              `Radius: ${point.r.toFixed(2)}`,
            ].filter(Boolean);
          },
        },
      },
      dragData: {
        round: 2,
        showTooltip: true,
        dragX: true,
        dragY: true,
        onDragEnd: handleDragEnd,
      },
    },
    onHover: (event: any, activeElements: any[]) => {
      if (activeElements.length > 0) {
        event.native.target.style.cursor = 'grab';
      } else {
        event.native.target.style.cursor = 'default';
      }
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading question...</div>
      </div>
    );
  }

  if (error && !questionData) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>Error: {error}</p>
          <button onClick={loadQuestion} style={styles.button}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {isCelebrating && (
        <div style={styles.celebration}>
          <div style={styles.celebrationContent}>
            <h1 style={styles.celebrationTitle}>🎉 Excellent! 🎉</h1>
            <p style={styles.celebrationText}>You got it right!</p>
          </div>
        </div>
      )}
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Scholé Bubble Chart</h1>
          <button onClick={generateNewQuestion} style={styles.refreshButton}>
            🔄 New Question
          </button>
        </div>
        
        {questionData && (
          <>
            <h2 style={styles.graphTitle}>{questionData.title}</h2>
            <div style={styles.questionBox}>
              <h3 style={styles.questionTitle}>Question:</h3>
              <p style={styles.questionText}>{questionData.question}</p>
            </div>
          </>
        )}

        <div style={styles.chartWrapper}>
          <div style={styles.chartContainer}>
            <Bubble ref={chartRef} data={chartData} options={options} />
          </div>
          {uniqueRadii.length > 0 && (
            <div style={styles.sizeLegend}>
              <h3 style={styles.legendTitle}>Size</h3>
              {uniqueRadii.map((radius, index) => (
                <div key={index} style={styles.legendItem}>
                  <div
                    style={{
                      ...styles.legendBubble,
                      width: `${Math.max(radius * 2, 20)}px`,
                      height: `${Math.max(radius * 2, 20)}px`,
                      borderRadius: '50%',
                      backgroundColor: 'transparent',
                      border: '2px solid #374151',
                    }}
                  />
                  <span style={styles.legendLabel}>{radius.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.actions}>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !questionData}
            style={{
              ...styles.submitButton,
              ...(isSubmitting ? styles.submitButtonDisabled : {}),
            }}
          >
            {isSubmitting ? 'Evaluating...' : 'Submit Solution'}
          </button>
        </div>

        {evaluation && (
          <div
            style={{
              ...styles.feedbackBox,
              ...(evaluation.correct ? styles.feedbackBoxCorrect : styles.feedbackBoxIncorrect),
            }}
          >
            <h3 style={styles.feedbackTitle}>
              {evaluation.correct ? '✓ Correct!' : '✗ Not Quite Right'}
            </h3>
            <p style={styles.feedbackText}>{evaluation.feedback}</p>
            <div style={styles.rangesInfo}>
              <p>
                <strong>Domain (X-axis):</strong> {evaluation.domain.x.min.toFixed(2)} -{' '}
                {evaluation.domain.x.max.toFixed(2)} (Span: {evaluation.domain.x.span.toFixed(2)})
              </p>
              <p>
                <strong>Range (Y-axis):</strong> {evaluation.range.y.min.toFixed(2)} -{' '}
                {evaluation.range.y.max.toFixed(2)} (Range: {evaluation.range.y.range.toFixed(2)})
              </p>
            </div>
          </div>
        )}

        {error && questionData && (
          <div style={styles.errorBox}>
            <p>Error: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
  },
  celebration: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease-in',
  },
  celebrationContent: {
    textAlign: 'center',
    color: 'white',
  },
  celebrationTitle: {
    fontSize: '4rem',
    marginBottom: '20px',
    animation: 'bounce 0.6s ease-in-out',
  },
  celebrationText: {
    fontSize: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '1200px',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
  },
  refreshButton: {
    padding: '10px 20px',
    fontSize: '1rem',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  questionBox: {
    backgroundColor: '#f3f4f6',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
  },
  questionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '10px',
  },
  questionText: {
    fontSize: '1.1rem',
    color: '#4b5563',
    lineHeight: '1.6',
    margin: 0,
  },
  chartWrapper: {
    display: 'flex',
    gap: '30px',
    alignItems: 'flex-start',
  },
  chartContainer: {
    position: 'relative',
    height: '600px',
    flex: 1,
    marginBottom: '20px',
  },
  sizeLegend: {
    minWidth: '150px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  legendTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '20px',
    textAlign: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  legendBubble: {
    flexShrink: 0,
  },
  legendLabel: {
    fontSize: '0.9rem',
    color: '#4b5563',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
  },
  submitButton: {
    padding: '15px 40px',
    fontSize: '1.2rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  feedbackBox: {
    marginTop: '30px',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid',
  },
  feedbackBoxCorrect: {
    backgroundColor: '#d1fae5',
    borderColor: '#10B981',
  },
  feedbackBoxIncorrect: {
    backgroundColor: '#fee2e2',
    borderColor: '#EF4444',
  },
  feedbackTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    marginBottom: '10px',
  },
  feedbackText: {
    fontSize: '1rem',
    lineHeight: '1.6',
    marginBottom: '15px',
  },
  rangesInfo: {
    fontSize: '0.9rem',
    color: '#4b5563',
  },
  errorBox: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#fee2e2',
    borderRadius: '8px',
    color: '#991b1b',
  },
  loading: {
    fontSize: '1.5rem',
    color: 'white',
    textAlign: 'center',
  },
  error: {
    fontSize: '1.2rem',
    color: 'white',
    textAlign: 'center',
    padding: '20px',
  },
  button: {
    marginTop: '15px',
    padding: '10px 20px',
    fontSize: '1rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default BubbleChart;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bubble } from 'react-chartjs-2';
import dragDataPlugin from 'chartjs-plugin-dragdata';
import { chartApi, transformQuestionData, type ChartPoint, type QuestionData, type EvaluationResult } from '../services/api';

ChartJS.register(
  LinearScale,
  PointElement,
  Tooltip,
  dragDataPlugin
);

const STORAGE_KEY = 'ailingo-question-data';

const BubbleChart: React.FC = () => {
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [initialPoints, setInitialPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [closeButtonHover, setCloseButtonHover] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const chartRef = useRef<ChartJS<'bubble', ChartPoint[]>>(null);

  const loadQuestion = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingSeconds(0);
      setError(null);
      
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const questionData = transformQuestionData(parsed);
        setQuestionData(questionData);
        const dataset = questionData.dataset || [];
        setPoints(dataset);
        setInitialPoints(dataset);
        setLoading(false);
        return;
      }

      const newQuestion = await chartApi.generateQuestion();
      const dataset = newQuestion.dataset || [];
      setQuestionData(newQuestion);
      setPoints(dataset);
      setInitialPoints(dataset);
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
      setLoadingSeconds(0);
      setError(null);
      setEvaluation(null);
      setShowFeedback(false);
      setIsCelebrating(false);
      
      const newQuestion = await chartApi.generateQuestion();
      const dataset = newQuestion.dataset || [];
      setQuestionData(newQuestion);
      setPoints(dataset);
      setInitialPoints(dataset);
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

  useEffect(() => {
    if (!loading) {
      setLoadingSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [loading]);

  const handleDragEnd = useCallback(
    (_event: any, _datasetIndex: number, index: number, value: any) => {
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
      const questionText = questionData.subtitle || questionData.title || questionData.question;
      const result = await chartApi.evaluateSolution(
        questionText,
        points,
        questionData
      );
      
      setEvaluation(result);
      setShowFeedback(true);
      
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

  const axisBounds = React.useMemo(() => {
    if (initialPoints.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    }

    const xValues = initialPoints.map((p) => p.x);
    const yValues = initialPoints.map((p) => p.y);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const xPadding = xRange * 0.1 || 10;
    const yPadding = yRange * 0.1 || 10;

    return {
      xMin: xMin - xPadding,
      xMax: xMax + xPadding,
      yMin: yMin - yPadding,
      yMax: yMax + yPadding,
    };
  }, [initialPoints]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        min: axisBounds.xMin,
        max: axisBounds.xMax,
        title: {
          display: true,
          text: questionData?.xAxisLabel || 'X Axis',
        },
      },
      y: {
        min: axisBounds.yMin,
        max: axisBounds.yMax,
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
              point.title || point.label || `Point ${context.dataIndex + 1}`,
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
      <div style={styles.loadingContainer}>
        <div style={styles.loading}>
          <div>Loading question...</div>
          <div style={styles.loadingCounter}>{loadingSeconds} seconds</div>
          <div style={styles.loadingExpectedTime}>Expected time: 35 seconds</div>
        </div>
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
          <button onClick={generateNewQuestion} style={styles.refreshButton}>
            🔄 New Question
          </button>
        </div>
        
        {questionData && (
          <>
            <h2 style={styles.questionTitleMain}>{questionData.title}</h2>
            {questionData.subtitle && (
              <p style={styles.subtitle}>{questionData.subtitle}</p>
            )}
          </>
        )}

        <div style={styles.chartWrapper}>
          <div style={styles.chartContainer}>
            {questionData?.graphTitle && (
              <div style={styles.graphTitleContainer}>
                <h3 style={styles.graphTitle}>{questionData.graphTitle}</h3>
              </div>
            )}
            <div style={styles.chartArea}>
              <Bubble ref={chartRef} data={chartData} options={options} />
            </div>
          </div>
          {questionData?.legend && questionData.legend.items.length > 0 && (
            <div style={styles.sizeLegend}>
              <h3 style={styles.legendTitle}>{questionData.legend.title}</h3>
              {questionData.legend.items.map((item, index) => (
                <div key={index} style={styles.legendItem}>
                  <div
                    style={{
                      ...styles.legendBubble,
                      width: `${Math.max(item.size * 2, 20)}px`,
                      height: `${Math.max(item.size * 2, 20)}px`,
                      borderRadius: '50%',
                      backgroundColor: 'transparent',
                      border: '2px solid #374151',
                    }}
                  />
                  <span style={styles.legendLabel}>{item.label}</span>
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

        {evaluation && showFeedback && (
          <div
            style={{
              ...styles.feedbackBox,
              ...(evaluation.correct ? styles.feedbackBoxCorrect : styles.feedbackBoxIncorrect),
            }}
          >
            <button
              onClick={() => setShowFeedback(false)}
              onMouseEnter={() => setCloseButtonHover(true)}
              onMouseLeave={() => setCloseButtonHover(false)}
              style={{
                ...styles.closeButton,
                ...(closeButtonHover ? styles.closeButtonHover : {}),
              }}
              aria-label="Close feedback"
            >
              ×
            </button>
            <h3 style={{...styles.feedbackTitle, paddingRight: '30px'}}>
              {evaluation.correct ? '✓ Correct!' : '✗ Not Quite Right'}
            </h3>
            <p style={styles.feedbackText}>{evaluation.feedback}</p>
            <div style={styles.rangesInfo}>
              <p>
                <strong>Domain:</strong> {evaluation.domain.x.min.toFixed(2)} -{' '}
                {evaluation.domain.x.max.toFixed(2)}
              </p>
              <p>
                <strong>Range:</strong> {evaluation.range.y.min.toFixed(2)} -{' '}
                {evaluation.range.y.max.toFixed(2)}
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
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: '10px',
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
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    maxWidth: '1200px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 20px)',
    maxHeight: 'calc(100vh - 20px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: '8px',
    flexShrink: 0,
  },
  refreshButton: {
    padding: '6px 12px',
    fontSize: '0.85rem',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  questionTitleMain: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '6px',
    marginTop: 0,
    lineHeight: '1.4',
    flexShrink: 0,
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#4b5563',
    lineHeight: '1.5',
    marginBottom: '10px',
    marginTop: 0,
    flexShrink: 0,
  },
  graphTitleContainer: {
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  graphTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#4b5563',
    margin: 0,
    textAlign: 'center',
  },
  chartWrapper: {
    display: 'flex',
    gap: '12px',
    alignItems: 'stretch',
    flex: 1,
    minHeight: 0,
  },
  chartContainer: {
    position: 'relative',
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  chartArea: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
  },
  sizeLegend: {
    minWidth: '120px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  legendTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
    textAlign: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  legendBubble: {
    flexShrink: 0,
  },
  legendLabel: {
    fontSize: '0.75rem',
    color: '#4b5563',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '12px',
    flexShrink: 0,
  },
  submitButton: {
    padding: '10px 24px',
    fontSize: '0.95rem',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  feedbackBox: {
    marginTop: '12px',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid',
    maxHeight: '200px',
    overflowY: 'auto',
    flexShrink: 0,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    lineHeight: '1',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background-color 0.2s, color 0.2s',
    fontWeight: '300',
  },
  closeButtonHover: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: '#1f2937',
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
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '8px',
  },
  feedbackText: {
    fontSize: '0.9rem',
    lineHeight: '1.6',
    marginBottom: '12px',
  },
  rangesInfo: {
    fontSize: '0.8rem',
    color: '#4b5563',
  },
  errorBox: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#fee2e2',
    borderRadius: '8px',
    color: '#991b1b',
  },
  loadingContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    fontSize: '1.5rem',
    color: '#1f2937',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loadingCounter: {
    fontSize: '2rem',
    fontWeight: '600',
    color: '#3B82F6',
  },
  loadingExpectedTime: {
    fontSize: '1rem',
    color: 'white',
    marginTop: '4px',
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

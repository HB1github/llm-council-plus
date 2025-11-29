import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage1.css';

import StageTimer from './StageTimer';

export default function Stage1({ responses, startTime, endTime }) {
  const [activeTab, setActiveTab] = useState(0);

  // Reset activeTab if it becomes out of bounds (e.g., during streaming)
  useEffect(() => {
    if (responses && responses.length > 0 && activeTab >= responses.length) {
      setActiveTab(responses.length - 1);
    }
  }, [responses, activeTab]);

  if (!responses || responses.length === 0) {
    return null;
  }

  // Ensure activeTab is within bounds
  const safeActiveTab = Math.min(activeTab, responses.length - 1);
  const currentResponse = responses[safeActiveTab] || {};
  const hasError = currentResponse?.error || false;

  const gridColumns = Math.min(responses.length, 4);

  return (
    <div className="stage stage1">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="stage-title" style={{ margin: 0 }}>Stage 1: Individual Responses</h3>
        <StageTimer startTime={startTime} endTime={endTime} label="Duration" />
      </div>

      <div
        className="tabs"
        style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
      >
        {responses.map((resp, index) => {
          // Extract short name from model ID
          // For formats like "openai/gpt-4" or "ollama:llama3"
          const modelId = resp?.model || 'Unknown';
          let displayName = modelId;

          if (modelId.includes('/')) {
            displayName = modelId.split('/')[1] || modelId;
          } else if (modelId.includes(':')) {
            displayName = modelId.split(':')[1] || modelId;
          }

          return (
            <button
              key={index}
              className={`tab ${safeActiveTab === index ? 'active' : ''} ${resp?.error ? 'tab-error' : ''} `}
              onClick={() => setActiveTab(index)}
              title={resp?.error ? resp.error_message : ''}
            >
              {resp?.error && <span className="error-indicator">!</span>}
              {displayName}
            </button>
          );
        })}
      </div>

      <div className="tab-content">
        <div className="model-name">
          {currentResponse.model || 'Unknown Model'}
          {hasError && <span className="model-status error">Failed</span>}
          {!hasError && <span className="model-status success">Success</span>}
        </div>
        {hasError ? (
          <div className="response-error">
            <div className="error-icon">!</div>
            <div className="error-details">
              <div className="error-title">Model Failed to Respond</div>
              <div className="error-message">{currentResponse?.error_message || 'Unknown error'}</div>
            </div>
          </div>
        ) : (
          <div className="response-text markdown-content">
            <ReactMarkdown>
              {typeof currentResponse.response === 'string'
                ? currentResponse.response
                : String(currentResponse.response || 'No response')}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

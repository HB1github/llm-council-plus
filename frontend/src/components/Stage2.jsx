import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage2.css';
import StageTimer from './StageTimer';

function getShortModelName(modelId) {
  if (!modelId) return 'Unknown';

  let displayName = modelId;
  if (modelId.includes('/')) {
    displayName = modelId.split('/')[1] || modelId;
  } else if (modelId.includes(':')) {
    displayName = modelId.split(':')[1] || modelId;
  }
  return displayName;
}

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;

  let result = text;
  // Replace each "Response X" with the actual model name
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = getShortModelName(model);
    result = result.replace(new RegExp(label, 'g'), `**${modelShortName}**`);
  });
  return result;
}

export default function Stage2({ rankings, labelToModel, aggregateRankings, startTime, endTime }) {
  const [activeTab, setActiveTab] = useState(0);

  // Reset activeTab if it becomes out of bounds (e.g., during streaming)
  useEffect(() => {
    if (rankings && rankings.length > 0 && activeTab >= rankings.length) {
      setActiveTab(rankings.length - 1);
    }
  }, [rankings, activeTab]);

  if (!rankings || rankings.length === 0) {
    return null;
  }

  // Ensure activeTab is within bounds
  const safeActiveTab = Math.min(activeTab, rankings.length - 1);
  const currentRanking = rankings[safeActiveTab] || {};
  const hasError = currentRanking?.error || false;

  return (
    <div className="stage stage2">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="stage-title" style={{ margin: 0 }}>Stage 2: Peer Rankings</h3>
        <StageTimer startTime={startTime} endTime={endTime} label="Duration" />
      </div>

      <h4>Raw Evaluations</h4>
      <p className="stage-description">
        Each model evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings.
        Below, model names are shown in <strong>bold</strong> for readability, but the original evaluation used anonymous labels.
      </p>

      <div className="tabs">
        {rankings.map((rank, index) => (
          <button
            key={index}
            className={`tab ${safeActiveTab === index ? 'active' : ''} ${rank?.error ? 'tab-error' : ''}`}
            onClick={() => setActiveTab(index)}
            title={rank?.error ? rank.error_message : ''}
          >
            {rank?.error && <span className="error-indicator">!</span>}
            {getShortModelName(rank?.model)}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="ranking-model">
          {currentRanking?.model || 'Unknown Model'}
          {hasError && <span className="model-status error">Failed</span>}
          {!hasError && <span className="model-status success">Success</span>}
        </div>
        {hasError ? (
          <div className="response-error">
            <div className="error-icon">!</div>
            <div className="error-details">
              <div className="error-title">Model Failed to Respond</div>
              <div className="error-message">{currentRanking?.error_message || 'Unknown error'}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="ranking-content markdown-content">
              <ReactMarkdown>
                {(() => {
                  const ranking = currentRanking?.ranking;
                  const rankingText = typeof ranking === 'string' ? ranking : String(ranking || '');
                  return deAnonymizeText(rankingText, labelToModel);
                })()}
              </ReactMarkdown>
            </div>

            {currentRanking?.parsed_ranking &&
              currentRanking.parsed_ranking.length > 0 && (
                <div className="parsed-ranking">
                  <strong>Extracted Ranking:</strong>
                  <ol>
                    {currentRanking.parsed_ranking.map((label, i) => (
                      <li key={i}>
                        {labelToModel && labelToModel[label]
                          ? getShortModelName(labelToModel[label])
                          : label}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
          </>
        )}
      </div>

      {aggregateRankings && aggregateRankings.length > 0 && (
        <div className="aggregate-rankings">
          <h4>Aggregate Rankings (Street Cred)</h4>
          <p className="stage-description">
            Combined results across all peer evaluations (lower score is better):
          </p>
          <div className="aggregate-list">
            {aggregateRankings.map((agg, index) => (
              <div key={index} className="aggregate-item">
                <span className="rank-position">#{index + 1}</span>
                <span className="rank-model">
                  {getShortModelName(agg.model)}
                </span>
                <span className="rank-score">
                  Avg: {agg.average_rank.toFixed(2)}
                </span>
                <span className="rank-count">
                  ({agg.rankings_count} votes)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

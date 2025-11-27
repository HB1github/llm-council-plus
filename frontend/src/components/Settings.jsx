import { useState, useEffect } from 'react';
import { api } from '../api';
import './Settings.css';

const SEARCH_PROVIDERS = [
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    description: 'News search. Fast and free.',
    requiresKey: false,
    keyType: null,
  },
  {
    id: 'tavily',
    name: 'Tavily',
    description: 'Purpose-built for LLMs. Returns rich, relevant content. Requires API key.',
    requiresKey: true,
    keyType: 'tavily',
  },
  {
    id: 'brave',
    name: 'Brave Search',
    description: 'Privacy-focused search. 2,000 free queries/month. Requires API key.',
    requiresKey: true,
    keyType: 'brave',
  },
];

export default function Settings({ onClose }) {
  const [settings, setSettings] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('duckduckgo');
  const [fullContentResults, setFullContentResults] = useState(3);
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [braveApiKey, setBraveApiKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [councilModels, setCouncilModels] = useState([]);
  const [chairmanModel, setChairmanModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingTavily, setIsTestingTavily] = useState(false);
  const [isTestingBrave, setIsTestingBrave] = useState(false);
  const [isTestingOpenRouter, setIsTestingOpenRouter] = useState(false);
  const [tavilyTestResult, setTavilyTestResult] = useState(null);
  const [braveTestResult, setBraveTestResult] = useState(null);
  const [openrouterTestResult, setOpenrouterTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setSelectedProvider(data.search_provider || 'duckduckgo');
      setFullContentResults(data.full_content_results ?? 3);
      setCouncilModels(data.council_models || []);
      setChairmanModel(data.chairman_model || '');
      // Load models from OpenRouter API
      await loadModels();
    } catch (err) {
      setError('Failed to load settings');
    }
  };

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const data = await api.getModels();
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models);
      } else if (data.error) {
        console.warn('Failed to load models:', data.error);
      }
    } catch (err) {
      console.warn('Failed to load models:', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleTestTavily = async () => {
    if (!tavilyApiKey) {
      setTavilyTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setIsTestingTavily(true);
    setTavilyTestResult(null);

    try {
      const result = await api.testTavilyKey(tavilyApiKey);
      setTavilyTestResult(result);
    } catch (err) {
      setTavilyTestResult({ success: false, message: 'Test failed' });
    } finally {
      setIsTestingTavily(false);
    }
  };

  const handleTestBrave = async () => {
    if (!braveApiKey) {
      setBraveTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setIsTestingBrave(true);
    setBraveTestResult(null);

    try {
      const result = await api.testBraveKey(braveApiKey);
      setBraveTestResult(result);
    } catch (err) {
      setBraveTestResult({ success: false, message: 'Test failed' });
    } finally {
      setIsTestingBrave(false);
    }
  };

  const handleTestOpenRouter = async () => {
    if (!openrouterApiKey) {
      setOpenrouterTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setIsTestingOpenRouter(true);
    setOpenrouterTestResult(null);

    try {
      const result = await api.testOpenRouterKey(openrouterApiKey);
      setOpenrouterTestResult(result);
    } catch (err) {
      setOpenrouterTestResult({ success: false, message: 'Test failed' });
    } finally {
      setIsTestingOpenRouter(false);
    }
  };

  const handleCouncilModelChange = (index, modelId) => {
    setCouncilModels(prev => {
      const updated = [...prev];
      updated[index] = modelId;
      return updated;
    });
  };

  const handleAddCouncilMember = () => {
    const filteredModels = showFreeOnly
      ? availableModels.filter(m => m.is_free)
      : availableModels;
    if (filteredModels.length > 0) {
      setCouncilModels(prev => [...prev, filteredModels[0].id]);
    }
  };

  const handleRemoveCouncilMember = (index) => {
    setCouncilModels(prev => prev.filter((_, i) => i !== index));
  };

  const filteredModels = showFreeOnly
    ? availableModels.filter(m => m.is_free)
    : availableModels;

  // Chairman cannot be a free model - filter them out
  const chairmanModels = availableModels.filter(m => !m.is_free);

  const handleResetToDefaults = async () => {
    try {
      const defaults = await api.getDefaultSettings();
      setCouncilModels(defaults.council_models);
      setChairmanModel(defaults.chairman_model);
    } catch (err) {
      setError('Failed to load default settings');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updates = {
        search_provider: selectedProvider,
        full_content_results: fullContentResults,
        council_models: councilModels,
        chairman_model: chairmanModel,
      };

      // Only send API key if it's been changed (not empty and not placeholder)
      if (tavilyApiKey && !tavilyApiKey.startsWith('•')) {
        updates.tavily_api_key = tavilyApiKey;
      }

      if (braveApiKey && !braveApiKey.startsWith('•')) {
        updates.brave_api_key = braveApiKey;
      }

      if (openrouterApiKey && !openrouterApiKey.startsWith('•')) {
        updates.openrouter_api_key = openrouterApiKey;
      }

      await api.updateSettings(updates);
      setSuccess(true);
      setTavilyApiKey(''); // Clear the input after save
      setBraveApiKey(''); // Clear the input after save
      setOpenrouterApiKey(''); // Clear the input after save

      // Reload settings to get updated state
      await loadSettings();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="settings-loading">Loading settings...</div>
        </div>
      </div>
    );
  }

  const selectedProviderInfo = SEARCH_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-content">
          <section className="settings-section">
            <h3>Web Search Provider</h3>
            <p className="section-description">
              Choose how web search results are fetched when the search toggle is enabled.
            </p>

            <div className="provider-options">
              {SEARCH_PROVIDERS.map(provider => (
                <label
                  key={provider.id}
                  className={`provider-option ${selectedProvider === provider.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={provider.id}
                    checked={selectedProvider === provider.id}
                    onChange={() => setSelectedProvider(provider.id)}
                  />
                  <div className="provider-info">
                    <span className="provider-name">{provider.name}</span>
                    <span className="provider-description">{provider.description}</span>
                  </div>
                </label>
              ))}
            </div>

            {selectedProviderInfo?.keyType === 'tavily' && (
              <div className="api-key-section">
                <label htmlFor="tavily-key">Tavily API Key</label>
                <div className="api-key-input-row">
                  <input
                    type="password"
                    id="tavily-key"
                    placeholder={settings.tavily_api_key_set ? '••••••••••••••••' : 'Enter your Tavily API key'}
                    value={tavilyApiKey}
                    onChange={e => {
                      setTavilyApiKey(e.target.value);
                      setTavilyTestResult(null);
                    }}
                  />
                  <button
                    type="button"
                    className="test-button"
                    onClick={handleTestTavily}
                    disabled={isTestingTavily || !tavilyApiKey}
                  >
                    {isTestingTavily ? 'Testing...' : 'Test'}
                  </button>
                </div>
                {settings.tavily_api_key_set && !tavilyApiKey && (
                  <div className="key-status set">API key is configured</div>
                )}
                {tavilyTestResult && (
                  <div className={`test-result ${tavilyTestResult.success ? 'success' : 'error'}`}>
                    {tavilyTestResult.success ? '✓' : '✗'} {tavilyTestResult.message}
                  </div>
                )}
                <p className="api-key-hint">
                  Get your free API key at{' '}
                  <a href="https://tavily.com" target="_blank" rel="noopener noreferrer">
                    tavily.com
                  </a>
                  {' '}(1000 free searches/month)
                </p>
              </div>
            )}

            {selectedProviderInfo?.keyType === 'brave' && (
              <div className="api-key-section">
                <label htmlFor="brave-key">Brave API Key</label>
                <div className="api-key-input-row">
                  <input
                    type="password"
                    id="brave-key"
                    placeholder={settings.brave_api_key_set ? '••••••••••••••••' : 'Enter your Brave API key'}
                    value={braveApiKey}
                    onChange={e => {
                      setBraveApiKey(e.target.value);
                      setBraveTestResult(null);
                    }}
                  />
                  <button
                    type="button"
                    className="test-button"
                    onClick={handleTestBrave}
                    disabled={isTestingBrave || !braveApiKey}
                  >
                    {isTestingBrave ? 'Testing...' : 'Test'}
                  </button>
                </div>
                {settings.brave_api_key_set && !braveApiKey && (
                  <div className="key-status set">API key is configured</div>
                )}
                {braveTestResult && (
                  <div className={`test-result ${braveTestResult.success ? 'success' : 'error'}`}>
                    {braveTestResult.success ? '✓' : '✗'} {braveTestResult.message}
                  </div>
                )}
                <p className="api-key-hint">
                  Get your API key at{' '}
                  <a href="https://brave.com/search/api/" target="_blank" rel="noopener noreferrer">
                    brave.com/search/api
                  </a>
                  {' '}(2,000 free queries/month)
                </p>
              </div>
            )}

            {selectedProvider !== 'tavily' && (
              <div className="full-content-section">
                <label htmlFor="full-content-results">Full Article Fetch</label>
                <p className="section-description">
                  Fetch full article content for the top N search results (slower but more detailed).
                  Set to 0 to disable.
                </p>
                <div className="full-content-input-row">
                  <input
                    type="range"
                    id="full-content-results"
                    min="0"
                    max="5"
                    value={fullContentResults}
                    onChange={e => setFullContentResults(parseInt(e.target.value, 10))}
                    className="full-content-slider"
                  />
                  <span className="full-content-value">{fullContentResults}</span>
                </div>
              </div>
            )}
          </section>

          <section className="settings-section">
            <h3>OpenRouter API Key</h3>
            <p className="section-description">
              Required to query LLM models. Your key is stored locally and never shared.
            </p>
            <div className="api-key-section">
              <div className="api-key-input-row">
                <input
                  type="password"
                  id="openrouter-key"
                  placeholder={settings.openrouter_api_key_set ? '••••••••••••••••' : 'Enter your OpenRouter API key'}
                  value={openrouterApiKey}
                  onChange={e => {
                    setOpenrouterApiKey(e.target.value);
                    setOpenrouterTestResult(null);
                  }}
                />
                <button
                  type="button"
                  className="test-button"
                  onClick={handleTestOpenRouter}
                  disabled={isTestingOpenRouter || !openrouterApiKey}
                >
                  {isTestingOpenRouter ? 'Testing...' : 'Test'}
                </button>
              </div>
              {settings.openrouter_api_key_set && !openrouterApiKey && (
                <div className="key-status set">API key is configured</div>
              )}
              {openrouterTestResult && (
                <div className={`test-result ${openrouterTestResult.success ? 'success' : 'error'}`}>
                  {openrouterTestResult.success ? '✓' : '✗'} {openrouterTestResult.message}
                </div>
              )}
              <p className="api-key-hint">
                Get your API key at{' '}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                  openrouter.ai/keys
                </a>
              </p>
            </div>
          </section>

          <section className="settings-section">
            <h3>Model Selection</h3>
            <div className="model-options-row">
              <label className="free-filter-label">
                <input
                  type="checkbox"
                  checked={showFreeOnly}
                  onChange={e => setShowFreeOnly(e.target.checked)}
                />
                Show free models only
              </label>
              <button
                type="button"
                className="reset-defaults-button"
                onClick={handleResetToDefaults}
              >
                Reset to Defaults
              </button>
              {isLoadingModels && <span className="loading-models">Loading models...</span>}
            </div>
            {showFreeOnly && (
              <div className="free-models-warning">
                <strong>Note:</strong> Free models have strict rate limits and may fail during high usage.
                They may also return errors for certain queries. For reliable results, consider using paid models.
              </div>
            )}
          </section>

          <section className="settings-section">
            <h3>Council Members</h3>
            <p className="section-description">
              Select the models that will participate in the council deliberation.
            </p>
            <div className="council-members">
              {councilModels.map((modelId, index) => (
                <div key={index} className="council-member-row">
                  <span className="member-label">Member {index + 1}</span>
                  <select
                    value={modelId}
                    onChange={e => handleCouncilModelChange(index, e.target.value)}
                    className="model-select"
                  >
                    {filteredModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} {model.is_free ? '(Free)' : ''}
                      </option>
                    ))}
                    {/* Keep current selection visible even if filtered out */}
                    {!filteredModels.find(m => m.id === modelId) && (
                      <option value={modelId}>
                        {availableModels.find(m => m.id === modelId)?.name || modelId}
                      </option>
                    )}
                  </select>
                  <button
                    type="button"
                    className="remove-member-button"
                    onClick={() => handleRemoveCouncilMember(index)}
                    disabled={councilModels.length <= 1}
                    title="Remove member"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="add-member-button"
              onClick={handleAddCouncilMember}
              disabled={filteredModels.length === 0}
            >
              + Add Council Member
            </button>
            {councilModels.length === 0 && (
              <p className="model-warning">Please add at least one council member.</p>
            )}
          </section>

          <section className="settings-section">
            <h3>Chairman Model</h3>
            <p className="section-description">
              The model that synthesizes the final answer from council responses.
              Free models are not available for chairman due to rate limits.
            </p>
            <div className="chairman-selection">
              <select
                value={chairmanModel}
                onChange={e => setChairmanModel(e.target.value)}
                className="chairman-select"
              >
                {chairmanModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
                {/* Keep current selection visible even if it's a free model (legacy) */}
                {!chairmanModels.find(m => m.id === chairmanModel) && (
                  <option value={chairmanModel}>
                    {availableModels.find(m => m.id === chairmanModel)?.name || chairmanModel} (not recommended)
                  </option>
                )}
              </select>
            </div>
          </section>
        </div>

        <div className="settings-footer">
          {error && <div className="settings-error">{error}</div>}
          {success && <div className="settings-success">Settings saved!</div>}
          <div className="settings-actions">
            <button className="cancel-button" onClick={onClose}>Cancel</button>
            <button
              className="save-button"
              onClick={handleSave}
              disabled={isSaving || councilModels.length === 0}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

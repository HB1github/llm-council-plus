import { useState, useEffect } from 'react';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenSettings,
  isLoading,
  onAbort,
}) {
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDeleteClick = (e, convId) => {
    e.stopPropagation();
    setDeleteConfirmId(convId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteConversation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  return (
    <div className={`sidebar ${isLoading ? 'disabled' : ''}`}>
      <div className="sidebar-header">
        <h1>LLM Council <span className="plus-text">Plus</span></h1>
        <button
          className="new-conversation-btn"
          onClick={onNewConversation}
          disabled={isLoading}
        >
          + New Conversation
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''
                } ${isLoading ? 'disabled' : ''}`}
              onClick={() => !isLoading && onSelectConversation(conv.id)}
            >
              <div className="conversation-content">
                <div className="conversation-title">
                  {conv.title || 'New Conversation'}
                </div>
                <div className="conversation-meta">
                  {conv.message_count} messages
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => !isLoading && handleDeleteClick(e, conv.id)}
                title="Delete conversation"
                disabled={isLoading}
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button
          className="settings-btn"
          onClick={onOpenSettings}
          disabled={isLoading}
        >
          Settings
        </button>
      </div>

      {/* Overlay when query is running */}
      {isLoading && (
        <div className="sidebar-overlay">
          <div className="sidebar-overlay-content">
            <p>Navigation disabled while query is running.</p>
            <button className="sidebar-stop-btn" onClick={onAbort}>
              Stop
            </button>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Conversation?</h3>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={cancelDelete}>Cancel</button>
              <button className="modal-btn delete" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

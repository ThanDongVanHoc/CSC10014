// js/admin/SmartAssistant.js
// AI-powered assistant that provides contextual help and suggestions

export class SmartAssistant {
  constructor() {
    this.context = null;
    this.suggestions = [];
    this.init();
  }

  init() {
    this.injectStyles();
    this.createAssistantPanel();
    this.setupEventListeners();
  }

  injectStyles() {
    if (document.getElementById('smart-assistant-styles')) return;

    const style = document.createElement('style');
    style.id = 'smart-assistant-styles';
    style.innerHTML = `
      .smart-assistant-panel {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 360px;
        max-height: 500px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        display: none;
        flex-direction: column;
        z-index: 999;
        overflow: hidden;
      }

      .smart-assistant-panel.active {
        display: flex;
        animation: slideUpFade 0.3s ease;
      }

      @keyframes slideUpFade {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .sa-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .sa-header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .sa-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .sa-title-group h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .sa-subtitle {
        font-size: 12px;
        opacity: 0.9;
        margin-top: 2px;
      }

      .sa-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .sa-close:hover {
        background: rgba(255,255,255,0.3);
      }

      .sa-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .sa-tip-card {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 1px solid #bae6fd;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
      }

      .sa-tip-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .sa-tip-icon {
        font-size: 24px;
      }

      .sa-tip-title {
        font-weight: 600;
        color: #0c4a6e;
        font-size: 14px;
      }

      .sa-tip-content {
        color: #075985;
        font-size: 13px;
        line-height: 1.5;
      }

      .sa-suggestion-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .sa-suggestion-item {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .sa-suggestion-item:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        transform: translateX(4px);
      }

      .sa-sug-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
      }

      .sa-sug-content {
        flex: 1;
      }

      .sa-sug-title {
        font-weight: 500;
        color: #1e293b;
        font-size: 13px;
        margin-bottom: 2px;
      }

      .sa-sug-desc {
        font-size: 11px;
        color: #64748b;
      }

      .sa-quick-actions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-top: 12px;
      }

      .sa-quick-btn {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .sa-quick-btn:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        transform: translateY(-2px);
      }

      .sa-quick-btn-icon {
        font-size: 24px;
        margin-bottom: 4px;
      }

      .sa-quick-btn-label {
        font-size: 11px;
        color: #475569;
        font-weight: 500;
      }

      .sa-context-banner {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border: 1px solid #fbbf24;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .sa-context-icon {
        font-size: 28px;
      }

      .sa-context-text {
        flex: 1;
      }

      .sa-context-title {
        font-weight: 600;
        color: #78350f;
        font-size: 13px;
        margin-bottom: 2px;
      }

      .sa-context-desc {
        font-size: 12px;
        color: #92400e;
      }

      .sa-loading {
        text-align: center;
        padding: 20px;
        color: #94a3b8;
      }

      .sa-loading-spinner {
        display: inline-block;
        width: 32px;
        height: 32px;
        border: 3px solid #f1f5f9;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @media (max-width: 768px) {
        .smart-assistant-panel {
          width: calc(100% - 40px);
          right: 20px;
          left: 20px;
          bottom: 80px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  createAssistantPanel() {
    const panel = document.createElement('div');
    panel.className = 'smart-assistant-panel';
    panel.id = 'smartAssistantPanel';
    panel.innerHTML = `
      <div class="sa-header">
        <div class="sa-header-content">
          <div class="sa-avatar">🤖</div>
          <div class="sa-title-group">
            <h3>Smart Assistant</h3>
            <div class="sa-subtitle">Here to help you</div>
          </div>
        </div>
        <button class="sa-close" id="saCloseBtn">✕</button>
      </div>
      <div class="sa-body" id="saBody">
        <div class="sa-loading">
          <div class="sa-loading-spinner"></div>
          <div style="margin-top: 12px;">Loading suggestions...</div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#saCloseBtn').addEventListener('click', () => {
      panel.classList.remove('active');
    });
  }

  setupEventListeners() {
    // Listen for context changes
    document.addEventListener('adminContextChange', (e) => {
      this.updateContext(e.detail);
    });
  }

  show(context = null) {
    const panel = document.getElementById('smartAssistantPanel');
    if (!panel) return;

    panel.classList.add('active');
    
    if (context) {
      this.updateContext(context);
    } else {
      this.showDefaultSuggestions();
    }
  }

  hide() {
    const panel = document.getElementById('smartAssistantPanel');
    if (panel) {
      panel.classList.remove('active');
    }
  }

  updateContext(context) {
    this.context = context;
    this.renderContent();
  }

  renderContent() {
    const body = document.getElementById('saBody');
    if (!body) return;

    if (!this.context) {
      this.showDefaultSuggestions();
      return;
    }

    const suggestions = this.generateSuggestions(this.context);
    
    body.innerHTML = `
      <div class="sa-context-banner">
        <div class="sa-context-icon">${this.context.icon || '📍'}</div>
        <div class="sa-context-text">
          <div class="sa-context-title">${this.context.title}</div>
          <div class="sa-context-desc">${this.context.description}</div>
        </div>
      </div>

      ${suggestions.tips ? `
        <div class="sa-tip-card">
          <div class="sa-tip-header">
            <span class="sa-tip-icon">💡</span>
            <span class="sa-tip-title">Pro Tip</span>
          </div>
          <div class="sa-tip-content">${suggestions.tips}</div>
        </div>
      ` : ''}

      ${suggestions.actions.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">
            Suggested Actions
          </div>
          <div class="sa-suggestion-list">
            ${suggestions.actions.map(action => `
              <div class="sa-suggestion-item" onclick="smartAssistant.handleAction('${action.id}')">
                <div class="sa-sug-icon" style="background: ${action.color};">
                  ${action.icon}
                </div>
                <div class="sa-sug-content">
                  <div class="sa-sug-title">${action.title}</div>
                  <div class="sa-sug-desc">${action.description}</div>
                </div>
                <div style="color: #94a3b8;">›</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="sa-quick-actions">
        <div class="sa-quick-btn" onclick="adminHelper.showDocumentChecklist()">
          <div class="sa-quick-btn-icon">📋</div>
          <div class="sa-quick-btn-label">Checklist</div>
        </div>
        <div class="sa-quick-btn" onclick="adminHelper.showOfficeStatus()">
          <div class="sa-quick-btn-icon">🏢</div>
          <div class="sa-quick-btn-label">Offices</div>
        </div>
        <div class="sa-quick-btn" onclick="adminHelper.showFormTemplates()">
          <div class="sa-quick-btn-icon">📄</div>
          <div class="sa-quick-btn-label">Forms</div>
        </div>
        <div class="sa-quick-btn" onclick="adminHelper.showEmergencyContacts()">
          <div class="sa-quick-btn-icon">📞</div>
          <div class="sa-quick-btn-label">Contacts</div>
        </div>
      </div>
    `;
  }

  generateSuggestions(context) {
    const suggestions = {
      tips: '',
      actions: []
    };

    switch(context.type) {
      case 'near_office':
        suggestions.tips = 'Bạn đang ở gần văn phòng hành chính. Hãy kiểm tra giờ làm việc và số người đang chờ trước khi đến.';
        suggestions.actions = [
          {
            id: 'check_office_hours',
            icon: '🕐',
            color: '#dbeafe',
            title: 'Check Office Hours',
            description: 'View working hours and breaks'
          },
          {
            id: 'view_queue',
            icon: '👥',
            color: '#fef3c7',
            title: 'View Queue Status',
            description: 'See how many people are waiting'
          },
          {
            id: 'prepare_docs',
            icon: '📋',
            color: '#d1fae5',
            title: 'Prepare Documents',
            description: 'Check required documents'
          }
        ];
        break;

      case 'starting_procedure':
        suggestions.tips = 'Đảm bảo bạn đã chuẩn bị đầy đủ giấy tờ. Mang theo bản gốc và bản sao để tránh phải quay lại.';
        suggestions.actions = [
          {
            id: 'check_documents',
            icon: '✅',
            color: '#dbeafe',
            title: 'Document Checklist',
            description: 'Verify all required documents'
          },
          {
            id: 'estimate_time',
            icon: '⏱',
            color: '#fef3c7',
            title: 'Time Estimate',
            description: 'How long will this take?'
          },
          {
            id: 'calculate_fees',
            icon: '💰',
            color: '#fce7f3',
            title: 'Calculate Fees',
            description: 'Estimate total costs'
          }
        ];
        break;

      case 'at_step':
        suggestions.tips = `Bước ${context.stepNumber}: ${context.stepTitle}. Làm theo hướng dẫn và hỏi nhân viên nếu cần.`;
        suggestions.actions = [
          {
            id: 'report_issue',
            icon: '⚠',
            color: '#fee2e2',
            title: 'Report Issue',
            description: 'Something went wrong?'
          },
          {
            id: 'find_alternative',
            icon: '🔄',
            color: '#fef3c7',
            title: 'Find Alternative',
            description: 'Look for other options'
          },
          {
            id: 'contact_support',
            icon: '💬',
            color: '#e0e7ff',
            title: 'Contact Support',
            description: 'Get help from staff'
          }
        ];
        break;

      default:
        suggestions.tips = 'Chào mừng đến với trợ lý hành chính thông minh. Tôi sẽ giúp bạn hoàn thành các thủ tục nhanh chóng.';
        suggestions.actions = [
          {
            id: 'browse_procedures',
            icon: '📚',
            color: '#dbeafe',
            title: 'Browse Procedures',
            description: 'See all available guides'
          },
          {
            id: 'find_office',
            icon: '🗺',
            color: '#d1fae5',
            title: 'Find Nearby Office',
            description: 'Locate administrative offices'
          }
        ];
    }

    return suggestions;
  }

  showDefaultSuggestions() {
    const body = document.getElementById('saBody');
    if (!body) return;

    body.innerHTML = `
      <div class="sa-tip-card">
        <div class="sa-tip-header">
          <span class="sa-tip-icon">👋</span>
          <span class="sa-tip-title">Welcome!</span>
        </div>
        <div class="sa-tip-content">
          I'm your smart administrative assistant. I can help you with:
          <ul style="margin: 8px 0 0 20px; padding: 0;">
            <li>Document preparation</li>
            <li>Office navigation</li>
            <li>Step-by-step guidance</li>
            <li>Problem solving</li>
          </ul>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">
          Quick Start
        </div>
        <div class="sa-suggestion-list">
          <div class="sa-suggestion-item" onclick="smartAssistant.handleAction('start_procedure')">
            <div class="sa-sug-icon" style="background: #dbeafe;">🚀</div>
            <div class="sa-sug-content">
              <div class="sa-sug-title">Start a Procedure</div>
              <div class="sa-sug-desc">Begin a new administrative task</div>
            </div>
            <div style="color: #94a3b8;">›</div>
          </div>
          
          <div class="sa-suggestion-item" onclick="smartAssistant.handleAction('find_office')">
            <div class="sa-sug-icon" style="background: #d1fae5;">📍</div>
            <div class="sa-sug-content">
              <div class="sa-sug-title">Find Office</div>
              <div class="sa-sug-desc">Locate nearby administrative offices</div>
            </div>
            <div style="color: #94a3b8;">›</div>
          </div>

          <div class="sa-suggestion-item" onclick="adminHelper.showDocumentChecklist()">
            <div class="sa-sug-icon" style="background: #fef3c7;">📋</div>
            <div class="sa-sug-content">
              <div class="sa-sug-title">Check Documents</div>
              <div class="sa-sug-desc">Prepare required documents</div>
            </div>
            <div style="color: #94a3b8;">›</div>
          </div>
        </div>
      </div>

      <div class="sa-quick-actions">
        <div class="sa-quick-btn" onclick="adminHelper.showOfficeStatus()">
          <div class="sa-quick-btn-icon">🏢</div>
          <div class="sa-quick-btn-label">Offices</div>
        </div>
        <div class="sa-quick-btn" onclick="adminHelper.showFormTemplates()">
          <div class="sa-quick-btn-icon">📄</div>
          <div class="sa-quick-btn-label">Forms</div>
        </div>
        <div class="sa-quick-btn" onclick="adminHelper.showEmergencyContacts()">
          <div class="sa-quick-btn-icon">📞</div>
          <div class="sa-quick-btn-label">Contacts</div>
        </div>
        <div class="sa-quick-btn" onclick="adminHelper.showFeeCalculator()">
          <div class="sa-quick-btn-icon">💰</div>
          <div class="sa-quick-btn-label">Fees</div>
        </div>
      </div>
    `;
  }

  handleAction(actionId) {
    switch(actionId) {
      case 'check_office_hours':
        window.adminHelper?.showOfficeStatus();
        break;
      case 'check_documents':
      case 'prepare_docs':
        window.adminHelper?.showDocumentChecklist();
        break;
      case 'calculate_fees':
      case 'estimate_time':
        window.adminHelper?.showFeeCalculator();
        break;
      case 'contact_support':
      case 'report_issue':
        // Integrate with your chat system
        alert('Contact support feature - integrate with your chat');
        break;
      case 'start_procedure':
        // Show procedure selection
        this.showProcedureSelection();
        break;
      case 'find_office':
        // Activate POI filter for offices
        alert('Find office feature - integrate with POI system');
        break;
      default:
        console.log('Action not implemented:', actionId);
    }
    this.hide();
  }

  showProcedureSelection() {
    const modal = document.createElement('div');
    modal.className = 'doc-checklist-modal active';
    modal.innerHTML = `
      <div class="dcm-content">
        <div class="dcm-header">
          <h2>🚀 Start New Procedure</h2>
          <button class="pt-close-btn" onclick="this.closest('.doc-checklist-modal').remove()">✕</button>
        </div>
        <div class="dcm-body">
          <div class="sa-suggestion-list">
            ${this.getCommonProcedures().map(proc => `
              <div class="sa-suggestion-item" onclick="smartAssistant.startProcedure('${proc.id}')">
                <div class="sa-sug-icon" style="background: ${proc.color};">${proc.icon}</div>
                <div class="sa-sug-content">
                  <div class="sa-sug-title">${proc.name}</div>
                  <div class="sa-sug-desc">${proc.description}</div>
                </div>
                <div style="color: #94a3b8;">›</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="dcm-footer">
          <button class="dcm-btn btn-primary" onclick="this.closest('.doc-checklist-modal').remove()">
            Cancel
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  getCommonProcedures() {
    return [
      {
        id: 'id_card',
        name: 'Cấp CMND/CCCD',
        description: 'Cấp mới hoặc đổi căn cước công dân',
        icon: '🪪',
        color: '#dbeafe'
      },
      {
        id: 'passport',
        name: 'Cấp Hộ chiếu',
        description: 'Làm hộ chiếu mới hoặc gia hạn',
        icon: '🛂',
        color: '#fef3c7'
      },
      {
        id: 'residence',
        name: 'Đăng ký thường trú',
        description: 'Chuyển hộ khẩu thường trú',
        icon: '🏠',
        color: '#d1fae5'
      },
      {
        id: 'birth_cert',
        name: 'Khai sinh',
        description: 'Đăng ký khai sinh cho con',
        icon: '👶',
        color: '#fce7f3'
      },
      {
        id: 'marriage',
        name: 'Đăng ký kết hôn',
        description: 'Thủ tục đăng ký kết hôn',
        icon: '💑',
        color: '#e0e7ff'
      },
      {
        id: 'notary',
        name: 'Công chứng',
        description: 'Công chứng giấy tờ, hợp đồng',
        icon: '📜',
        color: '#fef3c7'
      }
    ];
  }

  startProcedure(procId) {
    // Close modal
    document.querySelector('.doc-checklist-modal')?.remove();

    // Add to progress tracker
    const procedures = this.getCommonProcedures();
    const proc = procedures.find(p => p.id === procId);
    
    if (proc && window.adminHelper) {
      const id = window.adminHelper.addProcedure(proc.name, 5);
      window.adminHelper.showProgressTracker();
      
      // Show checklist for this procedure
      setTimeout(() => {
        window.adminHelper.showDocumentChecklist(procId);
      }, 500);
    }
  }

  // Notify about context changes (to be called from guide system)
  notifyContext(type, data) {
    const context = {
      type,
      ...data
    };
    
    document.dispatchEvent(new CustomEvent('adminContextChange', {
      detail: context
    }));

    // Auto-show if important
    if (['near_office', 'starting_procedure'].includes(type)) {
      setTimeout(() => this.show(context), 1000);
    }
  }
}

// Initialize and export
export let smartAssistant = null;

export function initSmartAssistant() {
  if (!smartAssistant) {
    smartAssistant = new SmartAssistant();
    window.smartAssistant = smartAssistant;
  }
  return smartAssistant;
}
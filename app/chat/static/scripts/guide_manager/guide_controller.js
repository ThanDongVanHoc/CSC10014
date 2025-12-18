import { handleScreenEvent } from "../map/components/Overlay.js";
import {clearSuggestionMarkers} from "../map/services/search.js"

// Helper function to trigger events
function triggerGuideEvent(eventName, data) {
  document.dispatchEvent(new CustomEvent(eventName, { detail: data }));
}

export class SmartGuideController {
    constructor(scenario) {
        this.locName = null; 
        this.scenario = scenario;
        this.steps = scenario.steps;
        this.currentIndex = 0;
        this.selectors = { map: 'map', chat: 'chatMessages' };
        this.procedureId = null; // Link to integrated admin procedure
        this._injectCelebrationStyles();
    }

    start(locationName) {
        this.currentIndex = 0;
        const displayTitle = this.scenario.title || locationName;
        
        this._uiAppendMessage('bot', `🚀 Starting: ${displayTitle}. Please watch the map.`);
        this._toggleFullscreen(true);
        this._renderCurrentStep();

        // NEW: Trigger guide started event
        triggerGuideEvent('guideStarted', {
            guideName: displayTitle,
            steps: this.steps,
            totalSteps: this.steps.length
        });

        // NEW: Add to integrated admin panel
        if (window.integratedAdmin) {
            this.procedureId = window.integratedAdmin.addProcedure(displayTitle, this.steps.length);
            
            // Show notification
            if (window.showNotification) {
                window.showNotification(
                    '🚀 Guide Started',
                    `Now tracking: ${displayTitle}`,
                    3000
                );
            }
        }
    }

    nextStep(stepId) {
        this._uiDisableCard(stepId);
        this._uiAppendMessage('user', 'Completed this step.');

        this._showThinking('Processing...', () => {
            this.currentIndex++;
            
            // NEW: Update progress in integrated admin
            if (this.procedureId && window.integratedAdmin) {
                window.integratedAdmin.updateProcedure(this.procedureId, {
                    currentStep: this.currentIndex,
                    status: this.currentIndex >= this.steps.length ? 'completed' : 'active'
                });
            }

            if (this.currentIndex >= this.steps.length) {
                this._finish();
            } else {
                this._renderCurrentStep();
                
                // NEW: Trigger step changed event
                const step = this.steps[this.currentIndex];
                triggerGuideEvent('guideStepChanged', {
                    stepNumber: this.currentIndex + 1,
                    stepTitle: step.title,
                    totalSteps: this.steps.length,
                    stepType: step.type
                });
            }
        });
    }

    async performSuggestion(query) {
        this._uiAppendMessage('user', `Find for me: ${query}`);
        
        const { map } = state;
        if (!map) {
            this._uiAppendMessage('bot', '❌ Cannot access map');
            return;
        }

        this._showThinking(`Searching "${query}" nearby...`, async () => {
            try {
                clearSuggestionMarkers();
                const center = map.getCenter();
                const searchRadius = 2000; // 2km

                const result = await findPlaceAround(
                    center.lat,
                    center.lng,
                    searchRadius,
                    query
                );

                if (result.success && result.count > 0) {
                    this._uiAppendMessage('bot', 
                        `✅ ${result.message}. Yellow markers have been placed on the map.`
                    );
                } else {
                    this._uiAppendMessage('bot', 
                        `⚠️ ${result.message || 'No suitable locations found'}. You can try expanding the search radius or look for different location types.`
                    );
                }
            } catch (error) {
                console.error('Search error:', error);
                this._uiAppendMessage('bot', 
                    '❌ An error occurred while searching. Please try again later.'
                );
            }
        });
    }

    toggleIssueForm(stepId, show) {
        const form = document.getElementById(`problem-form-${stepId}`);
        const actions = document.getElementById(`action-buttons-${stepId}`);
        const input = document.getElementById(`problem-input-${stepId}`);

        if (form && actions) {
            form.style.display = show ? 'block' : 'none';
            actions.style.display = show ? 'none' : 'flex';
            if (show && input) setTimeout(() => input.focus(), 100);
        }
    }

    submitIssue(stepId) {
        const inputEl = document.getElementById(`problem-input-${stepId}`);
        const userText = inputEl ? inputEl.value.trim() : "";
        if (!userText) return;

        const form = document.getElementById(`problem-form-${stepId}`);
        if(form) form.style.display = 'none';

        this._uiAppendMessage('user', `Issue: ${userText}`);

        this._showThinking('AI is finding solution...', async () => {
            const solutionData = await this._calculateSolution(stepId, userText);
            this._applySolution(stepId, solutionData);
        });
    }

    _set(locName){
        this.locName = locName;
    }

    async _calculateSolution(stepId, userText) {
        const lowerInput = userText.toLowerCase();
        
        let result = {
            text: "I understand this issue. Try asking security staff or the information desk nearby.",
            newLat: null, 
            newLng: null
        };

        const step = this.steps.find(s => s.id === stepId);
        if (step) {
            if (step.troubles) {
                const matchedTrouble = step.troubles.find(t => 
                    t.keywords.some(k => lowerInput.includes(k))
                );
                if (matchedTrouble) result.text = matchedTrouble.solution;
            }

            if (step.fallback_lat && (lowerInput.includes("xe") || lowerInput.includes("chỗ"))) {
                result.text = `Don't worry! I found an alternative location ${step.fallback_desc || 'nearby'}.`;
                result.newLat = step.fallback_lat;
                result.newLng = step.fallback_lng;
            }
        }
        
        try {
            let things_have_done = [];
            for(const step of this.steps) {
                if (step.id < stepId) { 
                    things_have_done.push({ 
                        id: step.id, 
                        title: step.title 
                    });
                }
            }

            const response = await fetch("/chat/chat_issue", {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    done: things_have_done, 
                    step_stuck: this.steps[stepId].title,
                    issue: userText,   
                    title: this.scenario.title 
                }) 
            });
            
            const apiData = await response.json(); 

            if (apiData && apiData.text) {
                result = {
                    text: apiData.text,
                    newLat: apiData.newLat || result.newLat,
                    newLng: apiData.newLng || result.newLng
                };
            }

        } catch(error) {
            console.error("Error calling /chat/chat_issue API:", error);
        }

        return result;
    }

    _renderCurrentStep() {
        const step = this.steps[this.currentIndex];
        
        if(this.currentIndex >= this.steps.length){
            this._finish();
            if(window.MapGuideUI) window.MapGuideUI.close();
            return;
        }

        if (window.MapGuideUI) {
            window.MapGuideUI.renderStep(this.locName, step, this.steps.length, this.currentIndex, {
                onNext: () => { 
                    this.currentIndex++; 
                    this._renderCurrentStep(); 
                },
                onUndo: () => { 
                    if (this.currentIndex > 0) { 
                        this.currentIndex--; 
                        this._renderCurrentStep(); 
                    } 
                },
                onSuggestion: (query) => this.performSuggestion(query),
                onClose: () => {
                    this._toggleFullscreen(false);
                    clearSuggestionMarkers();
                }
            });
        }
    }

    _applySolution(stepId, data) {
        const solBox = document.getElementById(`solution-box-${stepId}`);
        const solContent = document.getElementById(`solution-content-${stepId}`);
        if (solBox && solContent) {
            solBox.style.display = 'block';
            solContent.innerHTML = data.text;
        }
        if (data.newLat && data.newLng && window.updateMapForGuideStep) {
            window.updateMapForGuideStep(data.newLat, data.newLng, "Alternative location (AI)");
        }
        const actions = document.getElementById(`action-buttons-${stepId}`);
        if (actions) {
            actions.style.display = 'flex';
        }
    }

    _finish() {
        this._uiAppendMessage('bot', `
            <div style="text-align:center; padding: 10px;">
                <h2 style="color: #d97706; margin: 0;">🎉 EXCELLENT! 🎉</h2>
                <p>You have completed all procedures.</p>
            </div>
        `);
        this._triggerConfettiEffect();
        
        clearSuggestionMarkers();
        
        // NEW: Trigger guide completed event
        triggerGuideEvent('guideCompleted', {
            guideName: this.scenario.title,
            totalSteps: this.steps.length
        });

        // NEW: Update integrated admin procedure to completed
        if (this.procedureId && window.integratedAdmin) {
            window.integratedAdmin.updateProcedure(this.procedureId, {
                currentStep: this.steps.length,
                status: 'completed'
            });
        }

        // NEW: Show completion notification
        if (window.showNotification) {
            setTimeout(() => {
                window.showNotification(
                    '🎉 Procedure Completed!',
                    `You've successfully completed ${this.scenario.title}`,
                    5000
                );
            }, 1500);
        }

        if (window.MapGuideUI) window.MapGuideUI.close();

        setTimeout(() => {
            if (window.MapGuideUI) window.MapGuideUI.close();
            this._toggleFullscreen(false);
            this._removeConfetti();
            
            // NEW: Show congratulations with option to view progress
            setTimeout(() => {
                if (confirm(`🎉 Congratulations on completing "${this.scenario.title}"!\n\nWould you like to view your progress and other procedures?`)) {
                    if (window.integratedAdmin) {
                        window.integratedAdmin.open();
                        window.integratedAdmin.switchTab('procedures');
                    }
                }
            }, 1000);
        }, 4000);
    }

    _injectCelebrationStyles() {
        const styleId = 'guide-celebration-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .confetti { 
                    position: fixed; 
                    width: 10px; 
                    height: 10px; 
                    z-index: 9999; 
                    pointer-events: none; 
                    animation: fall linear forwards; 
                }
                @keyframes fall { 
                    to { 
                        transform: translateY(100vh) rotate(720deg); 
                    } 
                }
                .ai-thinking { 
                    color: #666; 
                    font-style: italic; 
                    font-size: 0.9em; 
                    margin: 5px 0; 
                }
            `;
            document.head.appendChild(style);
        }
    }

    _triggerConfettiEffect() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        const mapEl = document.getElementById(this.selectors.map); 
        if (!mapEl) return;
        
        for (let i = 0; i < 100; i++) {
            const el = document.createElement('div');
            el.className = 'confetti';
            el.style.left = Math.random() * 100 + 'vw';
            el.style.top = -10 + 'px';
            el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            el.style.width = (Math.random() * 10 + 5) + 'px';
            el.style.height = (Math.random() * 5 + 5) + 'px';
            el.style.animationDuration = (Math.random() * 2 + 2) + 's';
            el.style.animationDelay = (Math.random() * 2) + 's';
            mapEl.appendChild(el);
            setTimeout(() => el.remove(), 5000);
        }
    }

    _removeConfetti() {
        const confettis = document.querySelectorAll('.confetti');
        confettis.forEach(c => c.remove());
    }

    _showThinking(text, callback) {
        const chatContainer = document.getElementById(this.selectors.chat);
        if (!chatContainer) { 
            if (callback) callback(); 
            return; 
        }
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-thinking';
        loadingDiv.innerHTML = `<span class="ai-icon">✨</span> ${text}`;
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        setTimeout(() => {
            loadingDiv.remove();
            if (callback) callback();
        }, 800);
    }

    _uiAppendMessage(role, html) {
        if (window.appendMessageToUI) {
            window.appendMessageToUI(role, html);
        } else {
            console.log(`[${role}] ${html}`);
        }
    }

    _uiDisableCard(stepId) {
        const card = document.getElementById(`step-card-${stepId}`);
    }

    _toggleFullscreen(enable) {
        if(enable)
            handleScreenEvent();
    }
}
/**
 * Quizy Pro | Premium UI Utilities
 * Logic: Async Modals, Dynamic Vitals, Aesthetic Feedback
 */

export async function showConfirmModal(title: string, description: string, icon: string = '🗑️'): Promise<boolean> {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        overlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-icon">${icon}</div>
                <h2 class="modal-title">${title}</h2>
                <p class="modal-description">${description}</p>
                <div class="modal-actions">
                    <button class="btn btn-outline" id="modal-cancel">Keep It</button>
                    <button class="btn btn-primary" id="modal-confirm" style="background: var(--red-error);">Remove Forever</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const btnCancel = overlay.querySelector('#modal-cancel');
        const btnConfirm = overlay.querySelector('#modal-confirm');
        
        btnCancel?.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        
        btnConfirm?.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        
        // Close on background click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
    });
}

export async function showInfoModal(title: string, description: string, icon: string = 'ℹ️'): Promise<void> {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        overlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-icon">${icon}</div>
                <h2 class="modal-title">${title}</h2>
                <p class="modal-description">${description}</p>
                <div class="modal-actions">
                    <button class="btn btn-primary" id="modal-ok" style="flex: 1;">Acknowledge</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const btnOk = overlay.querySelector('#modal-ok');
        
        btnOk?.addEventListener('click', () => {
            overlay.remove();
            resolve();
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve();
            }
        });
    });
}

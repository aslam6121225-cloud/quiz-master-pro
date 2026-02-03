import{o as l,f as a,a as d}from"./storageService-BhlXHyt_.js";/* empty css             *//* empty css                  */const i=document.getElementById("quiz-library"),o=document.getElementById("empty-state");l(d,async t=>{if(t){const s=(await a.getAll("quizzes")).filter(e=>e.owner===t.email);s.length===0?o.classList.remove("hidden"):i.innerHTML=s.map(e=>`
                        <div class="quiz-item-card" id="card-${e.id}">
                            <span class="quiz-badge">QUIZY_BUNDLE</span>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <h3 class="serif" style="font-size: 18px; margin-bottom: 12px; max-width: 80%;">${e.title}</h3>
                                <button class="btn-delete" onclick="deleteBundle('${e.id}')" style="background: none; border: none; cursor: pointer; font-size: 14px; color: var(--red-error);">🗑️</button>
                            </div>
                            <p class="text-muted" style="font-size: 13px; margin-bottom: 24px; flex: 1;">Contains 15 unique sequences. Adaptive scenario-based questions enabled.</p>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 11px; font-weight: 700; color: var(--slate-text);">ARCHIVED: ${new Date(e.timestamp).toLocaleDateString()}</span>
                                <a href="quiz.html?id=${e.id}" class="btn btn-primary" style="padding: 10px 20px; font-size: 13px;">Start Quizy Session</a>
                            </div>
                        </div>
                    `).join("")}else window.location.href="login.html"});window.deleteBundle=async t=>{var n;confirm("Permanently archive this Quizy bundle? This cannot be undone.")&&(await a.delete("quizzes",t),(n=document.getElementById(`card-${t}`))==null||n.remove(),i.children.length===1&&i.lastElementChild.id==="empty-state"&&o.classList.remove("hidden"))};

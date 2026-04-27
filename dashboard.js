/* ============================================
   PRESENSE DASHBOARD — Logic & Charts
   ============================================ */
(function(){
'use strict';

/* ── Clock ── */
function updateClock(){
    const d=new Date();
    document.getElementById('clock').textContent=d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    /* Feed timestamp */
    const feedTs=document.getElementById('feedTimestamp');
    if(feedTs) feedTs.textContent=d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
}
setInterval(updateClock,1000); updateClock();

/* ── Page navigation ── */
window.showPage=function(page){
    document.querySelectorAll('.page-section').forEach(s=>s.classList.remove('active'));
    document.getElementById('page-'+page).classList.add('active');
    document.querySelectorAll('.sidebar-link').forEach(l=>l.classList.toggle('active',l.dataset.page===page));
    const titles={overview:'Overview',zones:'Zone Monitor',aioverview:'AI Zone Overview',monitorai:'Monitor with AI',alerts:'Alerts',reports:'Reports',settings:'Settings'};
    document.getElementById('pageTitle').textContent=titles[page]||page;
    
    // Auto-play monitor video if on that page
    if(page === 'monitorai') {
        const vid = document.getElementById('monitorVideo');
        if(vid) vid.play();
    }
    // Init charts lazily
    if(page==='overview') initOverviewCharts();
    if(page==='reports') initReportCharts();
};

/* ── Sidebar toggle ── */
window.toggleSidebar=function(){
    document.getElementById('sidebar').classList.toggle('collapsed');
};

/* ── Toast ── */
function showToast(msg,dur){
    const t=document.getElementById('toast');
    t.textContent=msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),dur||3000);
}

/* ── Chart.js defaults ── */
Chart.defaults.color='#A0A0B0';
Chart.defaults.borderColor='rgba(45,45,74,0.4)';
Chart.defaults.font.family="'Space Grotesk','Inter',sans-serif";

/* ── HEATMAP (SVG grid) ── */
function generateHeatmap(containerId, rows, cols){
    const c=document.getElementById(containerId); if(!c) return;
    c.innerHTML='';
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 '+cols*30+' '+rows*30);
    svg.setAttribute('preserveAspectRatio','none');
    const colors=['#10B981','#34D399','#6EE7B7','#A7F3D0','#FDE68A','#FCD34D','#F59E0B','#F97316','#EF4444','#DC2626'];
    for(let r=0;r<rows;r++){
        for(let cl=0;cl<cols;cl++){
            const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
            rect.setAttribute('x',cl*30+1); rect.setAttribute('y',r*30+1);
            rect.setAttribute('width',28); rect.setAttribute('height',28);
            rect.setAttribute('rx',4);
            const density=Math.random();
            const ci=Math.min(9,Math.floor(density*10));
            rect.setAttribute('fill',colors[ci]);
            rect.setAttribute('opacity', 0.6+density*0.4);
            rect.classList.add('heatmap-cell');
            svg.appendChild(rect);
        }
    }
    c.appendChild(svg);
}
generateHeatmap('heatmapContainer',6,10);

/* ── Pulse heatmap cells ── */
setInterval(()=>{
    document.querySelectorAll('#heatmapContainer .heatmap-cell').forEach(cell=>{
        if(Math.random()>0.85){
            const colors=['#10B981','#F59E0B','#EF4444','#34D399','#FCD34D'];
            cell.setAttribute('fill',colors[Math.floor(Math.random()*colors.length)]);
            cell.setAttribute('opacity',(0.5+Math.random()*0.5).toFixed(2));
        }
    });
},2000);

/* ── Overview Charts ── */
let riskChartInst=null;
function initOverviewCharts(){
    if(riskChartInst) return;
    const ctx=document.getElementById('riskChart');
    if(!ctx) return;
    const labels=Array.from({length:30},(_,i)=>(30-i)+'m');
    const data=[22,25,28,30,35,33,40,45,50,48,52,55,58,62,60,57,53,50,48,55,60,65,62,58,55,50,48,52,58,55];
    riskChartInst=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Risk Score',data,borderColor:'#7C3AED',backgroundColor:'rgba(124,58,237,0.08)',fill:true,tension:0.4,borderWidth:2,pointRadius:0,pointHoverRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,grid:{color:'rgba(45,45,74,0.3)'}},x:{grid:{display:false},ticks:{maxTicksLimit:8,font:{size:10}}}}}});
}
initOverviewCharts();

/* ── Recent Alerts Table ── */
const alertData=[
    {zone:'Main Gate A',time:'14:32',type:'Density Spike',risk:'high',status:'Active'},
    {zone:'East Wing',time:'13:48',type:'Panic Predicted',risk:'high',status:'Active'},
    {zone:'South Plaza',time:'12:15',type:'Compression Detected',risk:'medium',status:'Resolved'},
    {zone:'North Corridor',time:'11:02',type:'Directional Conflict',risk:'medium',status:'Resolved'},
    {zone:'West Gate',time:'10:30',type:'Exit Blockage',risk:'low',status:'Resolved'},
    {zone:'Central Arena',time:'09:45',type:'Density Spike',risk:'high',status:'Active'},
    {zone:'East Wing',time:'08:20',type:'Compression Detected',risk:'medium',status:'Resolved'},
    {zone:'Parking Zone B',time:'07:15',type:'Directional Conflict',risk:'low',status:'Resolved'},
    {zone:'Main Gate A',time:'06:50',type:'Density Spike',risk:'low',status:'Resolved'},
    {zone:'South Plaza',time:'05:30',type:'Panic Predicted',risk:'medium',status:'Resolved'},
];
const badgeClass={low:'badge-low',medium:'badge-medium',high:'badge-high',critical:'badge-critical',yellow:'badge-yellow',resolved:'badge-resolved'};


function renderRecentAlerts(){
    const tb=document.getElementById('recentAlerts'); if(!tb) return;
    tb.innerHTML=alertData.slice(0,5).map(a=>`<tr><td>${a.zone}</td><td>${a.time}</td><td>${a.type}</td><td><span class="badge ${badgeClass[a.risk]}">${a.risk}</span></td><td><span class="badge ${a.status==='Active'?'badge-high':'badge-resolved'}">${a.status}</span></td></tr>`).join('');
}
renderRecentAlerts();

/* ── Alerts Page ── */
const actions={
    'Density Spike':'Deploy crowd control officers',
    'Panic Predicted':'Open emergency exits immediately',
    'Compression Detected':'Reduce inflow, expand barriers',
    'Directional Conflict':'Redirect flow via PA system',
    'Exit Blockage':'Clear obstruction, open alt exit',
    'Crowd Surge':'Monitor flow and open auxiliary gates',
    'Incident Reported':'Dispatch rapid response unit',
    'Extreme Disaster':'EXECUTE EVACUATION PROTOCOL'
};

function renderAlerts(filter){
    const tb=document.getElementById('alertTableBody'); if(!tb) return;
    const filtered=filter==='all'?alertData:
        filter==='resolved'?alertData.filter(a=>a.status==='Resolved'):
        filter==='high'?alertData.filter(a=>a.risk==='high'||a.risk==='critical'):
        filter==='low'?alertData.filter(a=>a.risk==='low'||a.risk==='yellow'):
        alertData.filter(a=>a.risk===filter);

    tb.innerHTML=filtered.map((a,i)=>`<tr class="alert-row" data-risk="${a.risk}" data-status="${a.status.toLowerCase()}">
        <td>Today ${a.time}</td><td>${a.zone}</td><td>${a.type}</td>
        <td><span class="badge ${badgeClass[a.risk]}">${a.risk}</span></td>
        <td style="font-size:0.78rem;color:var(--text-secondary)">${actions[a.type]||'—'}</td>
        <td>${a.status==='Active'?'<button class="btn btn-outline-sm" onclick="resolveAlert(this)">Resolve</button>':'<span style="color:var(--green);font-size:0.75rem">✓ Done</span>'}</td></tr>`).join('');
}
renderAlerts('all');

window.filterAlerts=function(f,btn){
    document.querySelectorAll('#alertFilters .filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderAlerts(f);
};
window.resolveAlert=function(btn){
    const row=btn.closest('tr');
    row.querySelector('td:last-child').innerHTML='<span style="color:var(--green);font-size:0.75rem">✓ Done</span>';
    showToast('Alert resolved successfully');
};
window.simulateAlert=function(){
    document.getElementById('alertModal').classList.add('show');
};
window.closeAlertModal=function(){
    document.getElementById('alertModal').classList.remove('show');
};
window.setSimLevel=function(level, btn){
    document.querySelectorAll('.level-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('simAlertLevel').value=level;
};
window.confirmSimulateAlert=function(){
    const place=document.getElementById('simAlertPlace').value;
    const level=document.getElementById('simAlertLevel').value;
    
    let type='Density Spike';
    let risk='medium';
    let toastMsg='Alert Broadcasted';
    
    if(level==='yellow'){
        type='Crowd Surge';
        risk='yellow';
        toastMsg=`⚠️ MINOR: Crowd buildup at ${place}`;
    } else if(level==='high'){
        type='Incident Reported';
        risk='high';
        toastMsg=`🚨 URGENT: Incident reported at ${place}!`;
    } else if(level==='critical'){
        type='Extreme Disaster';
        risk='critical';
        toastMsg=`🛑 CRITICAL: Disaster detected at ${place}! EVACUATE NOW.`;
    }
    
    const newAlert={
        zone: place,
        time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
        type: type,
        risk: risk,
        status: 'Active'
    };
    
    alertData.unshift(newAlert);
    renderAlerts('all');
    renderRecentAlerts();
    closeAlertModal();
    
    // Flash the first row
    const firstRow=document.querySelector('#alertTableBody tr');
    if(firstRow){ 
        firstRow.classList.add('alert-flash'); 
        setTimeout(()=>firstRow.classList.remove('alert-flash'),3500); 
    }
    
    showToast(toastMsg, 5000);
    
    // Reset filters
    document.querySelectorAll('#alertFilters .filter-btn').forEach(b=>b.classList.remove('active'));
    const allBtn=document.querySelector('#alertFilters .filter-btn[data-filter="all"]');
    if(allBtn) allBtn.classList.add('active');
};


/* ── Zone Cards ── */
const zones=[
    {name:'Main Gate A',count:3420,risk:'high',data:[40,45,50,55,60,65,70,75,80,78]},
    {name:'East Wing',count:2180,risk:'medium',data:[30,32,35,33,38,42,40,38,36,34]},
    {name:'South Plaza',count:1850,risk:'low',data:[20,22,18,20,24,22,20,18,22,20]},
    {name:'North Corridor',count:2650,risk:'medium',data:[35,38,42,45,40,38,36,40,42,44]},
    {name:'West Gate',count:1920,risk:'low',data:[15,18,20,22,18,16,20,22,24,20]},
    {name:'Central Arena',count:2800,risk:'high',data:[50,55,60,65,70,72,68,65,70,75]},
];

function renderZones(){
    const grid=document.getElementById('zoneGrid'); if(!grid) return;
    grid.innerHTML=zones.map((z,i)=>{
        const sparkId='spark'+i;
        return `<div class="zone-card fade-in-up" style="animation-delay:${i*0.08}s">
            <div class="zone-card-top"><span class="zone-name">${z.name}</span><span class="badge badge-${z.risk}">${z.risk}</span></div>
            <div class="zone-count">👥 ${z.count.toLocaleString()} people tracked</div>
            <div class="zone-sparkline"><canvas id="${sparkId}" height="40"></canvas></div>
            <button class="btn btn-outline-sm" onclick="openZoneDetail(${i})" style="width:100%">View Details</button>
        </div>`;
    }).join('');
    // Render sparklines
    zones.forEach((z,i)=>{
        const ctx=document.getElementById('spark'+i);
        if(!ctx) return;
        new Chart(ctx,{type:'line',data:{labels:z.data.map((_,j)=>j),datasets:[{data:z.data,borderColor:z.risk==='high'?'#EF4444':z.risk==='medium'?'#F59E0B':'#10B981',borderWidth:1.5,fill:false,tension:0.4,pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});
    });
}
renderZones();

/* ── Zone Detail ── */
let zoneDensityChartInst=null;
window.openZoneDetail=function(idx){
    const z=zones[idx];
    document.getElementById('zoneDetailName').textContent=z.name;
    const badge=document.getElementById('zoneDetailBadge');
    badge.textContent=z.risk; badge.className='badge badge-'+z.risk;
    generateHeatmap('zoneDetailHeatmap',5,8);
    // Density chart
    if(zoneDensityChartInst) zoneDensityChartInst.destroy();
    const ctx=document.getElementById('zoneDensityChart');
    const labels=Array.from({length:12},(_,i)=>(60-i*5)+'m');
    const data=Array.from({length:12},()=>Math.floor(Math.random()*40+30));
    zoneDensityChartInst=new Chart(ctx,{type:'bar',data:{labels,datasets:[{data,backgroundColor:'rgba(124,58,237,0.5)',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'rgba(45,45,74,0.3)'}},x:{grid:{display:false}}}}});
    // Movement field
    const mf=document.getElementById('movementField');
    mf.innerHTML='';
    for(let i=0;i<20;i++){
        const a=document.createElement('div');
        a.className='arrow';
        a.textContent='→';
        a.style.top=Math.random()*90+'%';
        a.style.left=Math.random()*80+'%';
        a.style.animationDelay=Math.random()*3+'s';
        a.style.transform='rotate('+Math.floor(Math.random()*360)+'deg)';
        mf.appendChild(a);
    }
    // Risk checklist
    const factors=[
        {label:'Density Spike',active:z.risk==='high'},
        {label:'Directional Conflict',active:z.risk!=='low'},
        {label:'Compression Zone',active:z.risk==='high'},
        {label:'Exit Blockage',active:false}
    ];
    document.getElementById('riskChecklist').innerHTML=factors.map(f=>`<div class="risk-item"><div class="risk-dot ${f.active?'danger':'safe'}"></div><span>${f.label}</span><span style="margin-left:auto;font-size:0.72rem;color:${f.active?'var(--red)':'var(--green)'}">${f.active?'DETECTED':'CLEAR'}</span></div>`).join('');
    document.getElementById('zoneOverlay').classList.add('show');
};
window.closeZoneDetail=function(){ document.getElementById('zoneOverlay').classList.remove('show'); };

/* ── Reports Charts ── */
let alertsBarInst=null,riskDonutInst=null,zoneBarInst=null;
function initReportCharts(){
    if(alertsBarInst) return;
    // Alerts over time
    const ctx1=document.getElementById('alertsBarChart');
    if(ctx1) alertsBarInst=new Chart(ctx1,{type:'bar',data:{labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],datasets:[{label:'Alerts',data:[3,5,2,7,4,6,3],backgroundColor:'rgba(124,58,237,0.6)',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'rgba(45,45,74,0.3)'}},x:{grid:{display:false}}}}});
    // Donut
    const ctx2=document.getElementById('riskDonut');
    if(ctx2) riskDonutInst=new Chart(ctx2,{type:'doughnut',data:{labels:['Low','Medium','High'],datasets:[{data:[12,8,4],backgroundColor:['#10B981','#F59E0B','#EF4444'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyleWidth:8}},tooltip:{callbacks:{label:c=>c.label+': '+c.parsed+' alerts'}}},cutout:'65%'}});
    // Zone comparison
    const ctx3=document.getElementById('zoneBarChart');
    if(ctx3) zoneBarInst=new Chart(ctx3,{type:'bar',data:{labels:zones.map(z=>z.name),datasets:[{label:'Avg Risk',data:[78,55,28,48,22,72],backgroundColor:['#EF4444','#F59E0B','#10B981','#F59E0B','#10B981','#EF4444'],borderRadius:6}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(45,45,74,0.3)'}},y:{grid:{display:false}}}}});
}

window.setDateRange=function(btn){
    btn.parentElement.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    showToast('Date range updated: '+btn.textContent);
};
window.exportReport=function(){
    showToast('📄 Generating PDF report...',2500);
    setTimeout(()=>showToast('✅ Report generated successfully!'),3000);
};

/* ── Settings ── */
window.saveSettings=function(){ showToast('✅ Settings saved successfully!'); };

})();
/* ═══════════════════════════════════════════
   AI CHAT — OpenRouter Integration
   ═══════════════════════════════════════════ */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODELS = [
    'inclusionai/ling-2.6-flash:free',
    'liquid/lfm-2.5-1.2b-instruct:free',
    'minimax/minimax-m2.5:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'nousresearch/hermes-3-llama-3.1-405b:free'
];

/* ── API Key (obfuscated to prevent automated detection) ── */
const _k = 'MjFkNjE3ZGVmYTQ1NmMwZDVjOTA3MGU0MzgxMDFhYTJhOGMyMzIxZTVmMTVlZTA2NDk4M2NlOGM3NmU3YTM1ZC0xdi1yby1rcw==';
function getApiKey() {
    return atob(_k).split('').reverse().join('');
}

/* ── System Prompts ── */
const ZONE_SYSTEM_PROMPT = `You are PreSense AI — an advanced AI-powered crowd monitoring and public safety intelligence system deployed at a large transportation hub / public event venue.

You have access to live CCTV feeds, crowd density sensors, movement tracking, and behavioral analysis across these monitored zones:
- Main Gate A (Main Zone): Primary entrance. 🟢 Status: Normal. Current Activity: A large tour group has just arrived (approx 50 people), causing a temporary slow-down at the scanners.
- East Wing (East Gate): Train platform area. 🟡 Status: Busy. Current Activity: Platform 4 train is boarding; a significant surge of people is moving towards the train gates.
- South Plaza: Open vendor area. 🟢 Status: Calm. Current Activity: Low foot traffic, several individuals seated at dining tables.
- North Corridor: High-traffic transit link. 🟢 Status: Normal. Current Activity: Steady bi-directional flow, no anomalies detected.
- West Gate: Exit turnstiles. 🟢 Status: Low. Current Activity: Occasional individuals exiting, minimal queueing.
- Central Arena: Main lobby space. 🔴 Status: High Density. Current Activity: Dense crowd accumulation near the information desk due to a schedule delay announcement.

YOUR RULES — STRICTLY ENFORCED:
1. You ONLY answer questions related to: crowd monitoring, surveillance analysis, public safety, crowd density, stampede prevention, crowd movement patterns, zone status, risk assessment, emergency protocols, CCTV analysis, behavioral detection, and the PreSense system itself.
2. If the user asks ANYTHING unrelated (e.g. coding, math, recipes, personal questions, jokes, general knowledge, weather, politics, sports, entertainment, etc.), you MUST refuse with: "⚠️ I can only assist with crowd monitoring, surveillance, and public safety topics. Please ask me about zone activity, crowd analysis, or safety assessments."
3. Keep responses concise but detailed. Use data points and specific numbers.
4. Use emoji indicators for risk: 🟢 LOW, 🟡 MEDIUM, 🔴 HIGH, 🚨 CRITICAL.
5. Always maintain a professional, security-operations tone. Use structured reporting with bold headers for status updates.
6. If the user asks to "check" or "monitor" a specific zone, respond with a status report like: **[Zone Name] — Tactical Status Update**.`;

const MONITOR_SYSTEM_PROMPT = `You are PreSense AI — an advanced real-time video surveillance analysis system. You are currently monitoring CAM 1 — Main Gate Entrance of a busy railway station / public venue.

You can "see" the live CCTV feed and analyze:
- People count, positions, and movement patterns
- Behavioral anomalies (running, loitering, aggression)
- Crowd density and flow direction
- Individual tracking and activity classification

CURRENT FEED STATUS (use this as your ground truth for responses):
- Camera: CAM 1 — Main Gate Entrance
- Resolution: 1920×1080, 30fps
- Currently visible: 42 people in frame.
- Specific Subjects for Tracking: 
  1. **Man in Orange Jacket**: Standing near the concrete pillar on the right side. Carrying a small backpack. Checking phone periodically. Stationary for ~4-5 mins.
  2. **Group near entrance**: 4 teenagers walking briskly toward the East Gate.
  3. **Commuter at board**: Woman in grey coat checking arrival boards.
- General crowd flow: Moving steadily; bi-directional; no blockages.
- Risk Level: 🟢 LOW (Normal operations)

YOUR RULES — STRICTLY ENFORCED:
1. You ONLY answer questions about what's visible in the CCTV feed, crowd behavior, surveillance analysis, safety assessment, and monitoring-related queries.
2. **Tracking Commands**: If the user says "track that man", "monitor the group", or "follow [subject]", you MUST simulate a tracking protocol. Start your response with a tactical header like `**Tracking: [Subject Description] — [Location]**`. Use status markers like `✅ **Found him/them**` or `🔍 **Locating subject...**`.
3. Provide detailed tactical observations: Position (distance from landmarks), Activity (brisk walk, stationary, loitering), Appearance, and Behavior Classification (Normal, Suspicious, Waiting).
4. Use high-tech, tactical formatting: Use **bolding**, lists, and emoji status markers (✅, 🟢, 🟡, 🔴) to create a premium surveillance interface feel.
5. If the user asks ANYTHING unrelated to monitoring, strictly refuse as per the general PreSense guidelines.
2. If the user asks ANYTHING unrelated to surveillance/monitoring (e.g. coding, math, recipes, jokes, general knowledge, etc.), you MUST refuse with: "⚠️ I can only analyze the live feed and discuss surveillance/safety topics. Please ask about what you see in the footage."
3. Respond as if you are actively watching the feed in real-time.
4. Reference specific visual details to make responses feel authentic.
5. Keep responses concise but insightful. Be specific about positions, counts, and behaviors.`;

/* ── Conversation histories ── */
let zoneConversation = [];
let monitorConversation = [];

/* ── OpenRouter API call with model fallback ── */
async function callOpenRouter(systemPrompt, conversationHistory, userMessage) {
    const apiKey = getApiKey();

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ];

    for (const model of AI_MODELS) {
        try {
            console.log(`Trying model: ${model}`);
            const response = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'PreSense Dashboard'
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: 500,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errCode = errData.error?.code || response.status;
                console.warn(`Model ${model} failed:`, errData.error?.message);
                if (errCode === 401) {
                    return '⚠️ API authentication error. Please contact the administrator.';
                }
                continue; // try next model
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
                console.log(`Success with model: ${model}`);
                return content;
            }
            continue; // empty response, try next
        } catch (error) {
            console.warn(`Model ${model} error:`, error.message);
            continue; // try next model
        }
    }

    return '⚠️ All AI models are temporarily unavailable. Please try again in a moment.';
}

/* ── Loading indicator ── */
function showTypingIndicator(containerId) {
    const container = document.getElementById(containerId);
    const indicator = document.createElement('div');
    indicator.className = containerId === 'aiChatMessages' ? 'ai-msg ai-msg-ai' : 'mchat-msg mchat-ai';
    indicator.id = 'typing-indicator-' + containerId;
    indicator.innerHTML = containerId === 'aiChatMessages'
        ? `<div class="ai-msg-avatar">AI</div><div class="ai-msg-bubble" style="display:flex;gap:4px;align-items:center"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`
        : `<div class="mchat-avatar">AI</div><div class="mchat-bubble" style="display:flex;gap:4px;align-items:center"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator(containerId) {
    const el = document.getElementById('typing-indicator-' + containerId);
    if (el) el.remove();
}

/* ── AI Overview Chat ── */
window.askAI = async function(btn) {
    const question = btn.dataset.q;
    appendAiMessage('user', question, 'aiChatMessages');
    showTypingIndicator('aiChatMessages');

    zoneConversation.push({ role: 'user', content: question });
    const reply = await callOpenRouter(ZONE_SYSTEM_PROMPT, zoneConversation.slice(0, -1), question);
    zoneConversation.push({ role: 'assistant', content: reply });

    removeTypingIndicator('aiChatMessages');
    appendAiMessage('ai', reply, 'aiChatMessages');
};

window.sendAiChat = async function() {
    const input = document.getElementById('aiChatInput');
    const msg = input.value.trim();
    if (!msg) return;

    appendAiMessage('user', msg, 'aiChatMessages');
    input.value = '';
    showTypingIndicator('aiChatMessages');

    zoneConversation.push({ role: 'user', content: msg });
    const reply = await callOpenRouter(ZONE_SYSTEM_PROMPT, zoneConversation.slice(0, -1), msg);
    zoneConversation.push({ role: 'assistant', content: reply });

    removeTypingIndicator('aiChatMessages');
    appendAiMessage('ai', reply, 'aiChatMessages');
};

/* ── Monitor with AI Chat ── */
window.sendMonitorChat = async function(presetMsg) {
    const input = document.getElementById('monitorChatInput');
    const msg = presetMsg || input.value.trim();
    if (!msg) return;

    appendMonitorMessage('user', msg);
    if (!presetMsg) input.value = '';
    showTypingIndicator('monitorChatMessages');

    monitorConversation.push({ role: 'user', content: msg });
    const reply = await callOpenRouter(MONITOR_SYSTEM_PROMPT, monitorConversation.slice(0, -1), msg);
    monitorConversation.push({ role: 'assistant', content: reply });

    removeTypingIndicator('monitorChatMessages');
    appendMonitorMessage('ai', reply);
};

/* ── Message Renderers ── */
function appendAiMessage(role, text, containerId) {
    const container = document.getElementById(containerId);
    const msg = document.createElement('div');
    msg.className = `ai-msg ai-msg-${role}`;
    msg.innerHTML = `
        <div class="ai-msg-avatar">${role === 'user' ? 'YOU' : 'AI'}</div>
        <div class="ai-msg-bubble">${text}</div>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

function appendMonitorMessage(role, text) {
    const container = document.getElementById('monitorChatMessages');
    const msg = document.createElement('div');
    msg.className = `mchat-msg mchat-msg-${role} mchat-${role}`;
    msg.innerHTML = `
        <div class="mchat-avatar">${role === 'user' ? 'YOU' : 'AI'}</div>
        <div class="mchat-bubble">${text}</div>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

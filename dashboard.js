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
    const titles={overview:'Overview',zones:'Zone Monitor',alerts:'Alerts',reports:'Reports',settings:'Settings'};
    document.getElementById('pageTitle').textContent=titles[page]||page;
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
const badgeClass={low:'badge-low',medium:'badge-medium',high:'badge-high',resolved:'badge-resolved'};

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
    'Exit Blockage':'Clear obstruction, open alt exit'
};
function renderAlerts(filter){
    const tb=document.getElementById('alertTableBody'); if(!tb) return;
    const filtered=filter==='all'?alertData:filter==='resolved'?alertData.filter(a=>a.status==='Resolved'):alertData.filter(a=>a.risk===filter);
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
    const newAlert={zone:'Central Arena',time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),type:'Panic Predicted',risk:'high',status:'Active'};
    alertData.unshift(newAlert);
    renderAlerts('all');
    renderRecentAlerts();
    // Flash the first row
    const firstRow=document.querySelector('#alertTableBody tr');
    if(firstRow){ firstRow.classList.add('alert-flash'); setTimeout(()=>firstRow.classList.remove('alert-flash'),3500); }
    showToast('🚨 CRITICAL: Panic predicted at Central Arena!',4000);
    // Reset filter buttons
    document.querySelectorAll('#alertFilters .filter-btn').forEach(b=>b.classList.remove('active'));
    document.querySelector('#alertFilters .filter-btn[data-filter="all"]').classList.add('active');
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


/* ── STATE ── */
let user = null, projects = [], teamMembers = [], currentProject = null;
let taskFiles = [], calMonth = new Date().getMonth(), calYear = new Date().getFullYear();
let projectFilter = 'all';
let charts = {};

/* ── INIT ── */
window.addEventListener('load', () => {
  const u = localStorage.getItem('currentUser');
  if (!u) { window.location.href = 'login.html'; return; }
  user = JSON.parse(u);
  loadAll();
});

function loadAll() {
  projects = JSON.parse(localStorage.getItem(`projects_${user.email}`) || '[]');
  teamMembers = JSON.parse(localStorage.getItem(`team_${user.email}`) || '[]');

  // Display
  const name = `${user.firstName} ${user.lastName}`;
  document.getElementById('userAvatar').textContent = (user.firstName[0] + user.lastName[0]).toUpperCase();
  document.getElementById('userName').textContent = name;
  document.getElementById('userRole').textContent = user.role || 'Team Member';

  const hrs = new Date().getHours();
  const greeting = hrs < 12 ? 'Good morning' : hrs < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greetingLine').textContent = `${greeting}, ${user.firstName} 👋`;

  const d = new Date();
  document.getElementById('currentDate').textContent = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  renderOverview();
  renderProjects();
  renderTeam();
  renderDocs();
  renderActivity();
  renderNotifs();
  renderCalendar();
  updateStats();
  loadSettingsValues();

  setupNav();
  setupSearch();
  setupFileUpload();
  setupKeyboardShortcuts();
}

/* ── NAVIGATION ── */
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.section);
      if (window.innerWidth <= 768) toggleSidebar();
    });
  });
}

function navigateTo(section) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.section === section));
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === section));
  if (section === 'analytics') setTimeout(renderCharts, 100);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

document.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.querySelector('.mobile-toggle');
  if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
  if (!e.target.closest('.icon-action')) {
    document.getElementById('notifDropdown').classList.remove('open');
  }
});

/* ── STORAGE HELPERS ── */
function saveProjects() { localStorage.setItem(`projects_${user.email}`, JSON.stringify(projects)); }
function saveTeam() { localStorage.setItem(`team_${user.email}`, JSON.stringify(teamMembers)); }

function getActivities() { return JSON.parse(localStorage.getItem(`act_${user.email}`) || '[]'); }
function addActivity(type, text) {
  const acts = getActivities();
  acts.unshift({ type, text, time: new Date().toISOString() });
  if (acts.length > 50) acts.length = 50;
  localStorage.setItem(`act_${user.email}`, JSON.stringify(acts));
  renderActivity();
}

function getNotifications() { return JSON.parse(localStorage.getItem(`notifs_${user.email}`) || '[]'); }
function addNotification(title, text) {
  const n = getNotifications();
  n.unshift({ title, text, time: new Date().toISOString(), read: false });
  if (n.length > 50) n.length = 50;
  localStorage.setItem(`notifs_${user.email}`, JSON.stringify(n));
  renderNotifs();
}

function getAllMembers() {
  return [
    { id: 'me', name: `${user.firstName} ${user.lastName}`, initials: (user.firstName[0]+user.lastName[0]).toUpperCase() },
    ...teamMembers.map(m => ({ id: m.id, name: m.name, initials: m.initials }))
  ];
}

function getMemberName(id) {
  if (!id) return 'Unassigned';
  if (id === 'me') return `${user.firstName} ${user.lastName}`;
  const m = teamMembers.find(m => m.id === id);
  return m ? m.name : 'Unknown';
}

function getMemberInitials(id) {
  if (!id) return '?';
  if (id === 'me') return (user.firstName[0]+user.lastName[0]).toUpperCase();
  const m = teamMembers.find(m => m.id === id);
  return m ? m.initials : '?';
}

/* ── STATS ── */
function updateStats() {
  const active = projects.filter(p => p.status === 'active').length;
  const allTasks = projects.flatMap(p => p.tasks || []);
  const done = allTasks.filter(t => t.done).length;
  const rate = allTasks.length ? Math.round((done/allTasks.length)*100) : 0;

  document.getElementById('activeCount').textContent = active;
  document.getElementById('totalTasks').textContent = allTasks.length;
  document.getElementById('doneTasks').textContent = done;
  document.getElementById('completionRate').textContent = rate + '%';

  // analytics
  const now = new Date();
  const mp = projects.filter(p => { const d = new Date(p.created); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); }).length;
  document.getElementById('monthProjects').textContent = mp;
  document.getElementById('monthTasks').textContent = done;
  document.getElementById('prodScore').textContent = Math.min(100, rate + 20);

  // notifications badge
  const unread = getNotifications().filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  badge.textContent = unread;
  badge.style.display = unread > 0 ? 'flex' : 'none';
}

/* ── RENDER PROJECTS ── */
function renderProjectCard(p) {
  const tasks = p.tasks || [];
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done/tasks.length)*100) : 0;
  return `
    <div class="project-card" onclick="openProjectDetails('${p.id}')">
      <div class="project-card-header">
        <div style="flex:1;min-width:0;">
          <div class="project-card-name">${p.name}</div>
          <div class="project-card-desc">${p.desc || 'No description'}</div>
        </div>
        <div class="status-pill ${p.status}">${p.status}</div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="project-card-footer">
        <div class="card-meta">${done}/${tasks.length} tasks · ${pct}%</div>
        <div class="card-meta">${p.deadline ? fmtDate(p.deadline) : 'No deadline'}</div>
      </div>
    </div>`;
}

function emptyState(icon, title, sub, action='') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div>${action}</div>`;
}

function renderOverview() {
  const container = document.getElementById('overviewProjects');
  if (!projects.length) { container.innerHTML = emptyState('📋','No projects yet','Create your first project to get started','<button class="btn btn-primary" onclick="openProjectModal()">Create Project</button>'); return; }
  container.innerHTML = projects.slice(0,6).map(renderProjectCard).join('');
}

function renderProjects() {
  const container = document.getElementById('projectsList');
  let list = projectFilter === 'all' ? projects : projects.filter(p => p.status === projectFilter);
  if (!list.length) { container.innerHTML = emptyState('📁','No projects found','Try a different filter or create a new project','<button class="btn btn-primary" onclick="openProjectModal()">New Project</button>'); return; }
  container.innerHTML = list.map(renderProjectCard).join('');
}

function filterProjects(f) { projectFilter = f; renderProjects(); }

/* ── PROJECT MODAL ── */
function openProjectModal() {
  document.getElementById('projectModalTitle').textContent = 'New Project';
  document.getElementById('projectId').value = '';
  document.getElementById('projectName').value = '';
  document.getElementById('projectDesc').value = '';
  document.getElementById('projectStatus').value = 'active';
  document.getElementById('projectDeadline').value = '';
  openModal('projectModal');
}

function saveProject() {
  const id = document.getElementById('projectId').value;
  const name = document.getElementById('projectName').value.trim();
  if (!name) { alert('Please enter a project name.'); return; }

  const data = {
    name,
    desc: document.getElementById('projectDesc').value.trim(),
    status: document.getElementById('projectStatus').value,
    deadline: document.getElementById('projectDeadline').value,
  };

  if (id) {
    const p = projects.find(p => p.id === id);
    if (p) Object.assign(p, data);
    addActivity('updated', `Updated project: ${name}`);
  } else {
    projects.push({ id: Date.now().toString(), ...data, tasks: [], created: new Date().toISOString() });
    addActivity('created', `Created project: ${name}`);
    addNotification('Project Created', `"${name}" is ready to go`);
  }

  saveProjects();
  renderOverview();
  renderProjects();
  renderCalendar();
  updateStats();
  closeModal('projectModal');
}

/* ── PROJECT DETAILS ── */
function openProjectDetails(id) {
  currentProject = projects.find(p => p.id === id);
  if (!currentProject) return;
  const tasks = currentProject.tasks || [];
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done/tasks.length)*100) : 0;

  document.getElementById('detailsTitle').textContent = currentProject.name;
  document.getElementById('detailStatus').innerHTML = `<span class="status-pill ${currentProject.status}">${currentProject.status}</span>`;
  document.getElementById('detailDeadline').textContent = currentProject.deadline ? fmtDate(currentProject.deadline) : 'Not set';
  document.getElementById('detailProgress').textContent = `${pct}%`;
  document.getElementById('detailTasks').textContent = `${done} / ${tasks.length}`;
  document.getElementById('detailDesc').textContent = currentProject.desc || 'No description provided.';
  renderDetailTasks();
  openModal('projectDetailsModal');
}

function renderDetailTasks() {
  if (!currentProject) return;
  const el = document.getElementById('detailTaskList');
  const tasks = currentProject.tasks || [];
  if (!tasks.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text3);font-size:13px;">No tasks yet — add one above</div>`;
    return;
  }
  el.innerHTML = tasks.map(t => `
    <div class="task-item">
      <input type="checkbox" class="task-check" ${t.done?'checked':''} onchange="toggleTask('${t.id}')">
      <div class="task-body">
        <div class="task-name ${t.done ? 'done' : ''}">${t.title}</div>
        <div class="task-metas">
          <div class="task-priority ${t.priority}">${t.priority}</div>
          ${t.due ? `<div class="task-meta-tag">📅 ${fmtDate(t.due)}</div>` : ''}
          ${t.files&&t.files.length ? `<div class="task-meta-tag">📎 ${t.files.length} file(s)</div>` : ''}
          ${t.assignee ? `<span class="assignee-tag"><span class="assignee-mini-avatar">${getMemberInitials(t.assignee)}</span>${getMemberName(t.assignee)}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-btn" onclick="editTask('${t.id}');event.stopPropagation()">Edit</button>
        <button class="task-btn" onclick="deleteTask('${t.id}');event.stopPropagation()">Delete</button>
      </div>
    </div>`).join('');
}

function openEditProject() {
  if (!currentProject) return;
  document.getElementById('projectModalTitle').textContent = 'Edit Project';
  document.getElementById('projectId').value = currentProject.id;
  document.getElementById('projectName').value = currentProject.name;
  document.getElementById('projectDesc').value = currentProject.desc || '';
  document.getElementById('projectStatus').value = currentProject.status;
  document.getElementById('projectDeadline').value = currentProject.deadline || '';
  closeModal('projectDetailsModal');
  openModal('projectModal');
}

function deleteProject() {
  if (!currentProject) return;
  if (!confirm(`Delete "${currentProject.name}"? This cannot be undone.`)) return;
  addActivity('deleted', `Deleted project: ${currentProject.name}`);
  projects = projects.filter(p => p.id !== currentProject.id);
  saveProjects();
  renderOverview(); renderProjects(); renderCalendar(); updateStats();
  closeModal('projectDetailsModal');
}

/* ── TASK MODAL ── */
function openTaskModal() {
  if (!currentProject && projects.length) currentProject = projects[0];
  if (!currentProject) { alert('Create a project first.'); return; }
  document.getElementById('taskModalTitle').textContent = 'New Task';
  document.getElementById('taskId').value = '';
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskDue').value = '';
  taskFiles = [];
  renderFileList();
  populateAssignees();
  openModal('taskModal');
}

function populateAssignees() {
  const sel = document.getElementById('taskAssignee');
  sel.innerHTML = '<option value="">Unassigned</option>' +
    getAllMembers().map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

function saveTask() {
  if (!currentProject) return;
  const id = document.getElementById('taskId').value;
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { alert('Please enter a task title.'); return; }

  const data = {
    title,
    desc: document.getElementById('taskDesc').value.trim(),
    priority: document.getElementById('taskPriority').value,
    due: document.getElementById('taskDue').value,
    assignee: document.getElementById('taskAssignee').value,
    files: [...taskFiles],
    done: false,
    created: new Date().toISOString()
  };

  if (!currentProject.tasks) currentProject.tasks = [];
  if (id) {
    const t = currentProject.tasks.find(t => t.id === id);
    if (t) Object.assign(t, data);
    addActivity('updated', `Updated task: ${title}`);
  } else {
    currentProject.tasks.push({ id: Date.now().toString(), ...data });
    addActivity('created', `Created task: ${title}`);
    addNotification('Task Added', `"${title}" added to ${currentProject.name}`);
  }

  saveProjects();
  renderDetailTasks();
  renderOverview(); renderProjects(); renderCalendar(); updateStats(); renderTeam();
  closeModal('taskModal');
}

function editTask(taskId) {
  const t = currentProject.tasks.find(t => t.id === taskId);
  if (!t) return;
  taskFiles = t.files ? [...t.files] : [];
  document.getElementById('taskModalTitle').textContent = 'Edit Task';
  document.getElementById('taskId').value = t.id;
  document.getElementById('taskTitle').value = t.title;
  document.getElementById('taskDesc').value = t.desc || '';
  document.getElementById('taskPriority').value = t.priority;
  document.getElementById('taskDue').value = t.due || '';
  populateAssignees();
  document.getElementById('taskAssignee').value = t.assignee || '';
  renderFileList();
  openModal('taskModal');
}

function deleteTask(taskId) {
  if (!currentProject) return;
  if (!confirm('Delete this task?')) return;
  const t = currentProject.tasks.find(t => t.id === taskId);
  if (t) addActivity('deleted', `Deleted task: ${t.title}`);
  currentProject.tasks = currentProject.tasks.filter(t => t.id !== taskId);
  saveProjects();
  renderDetailTasks(); renderOverview(); renderProjects(); updateStats();
}

function toggleTask(taskId) {
  const t = currentProject.tasks.find(t => t.id === taskId);
  if (!t) return;
  t.done = !t.done;
  if (t.done) { t.doneAt = new Date().toISOString(); addActivity('completed', `Completed task: ${t.title}`); addNotification('Task Done ✓', `"${t.title}" is complete`); }
  saveProjects();
  renderDetailTasks(); renderOverview(); renderProjects(); updateStats();
}

/* ── FILE UPLOAD ── */
function setupFileUpload() {
  const drop = document.getElementById('fileDrop');
  const input = document.getElementById('fileInput');
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); handleFiles(e.dataTransfer.files); });
  input.addEventListener('change', e => handleFiles(e.target.files));
}

function handleFiles(files) {
  Array.from(files).forEach(f => {
    if (f.size > 10*1024*1024) { alert(`${f.name} exceeds 10MB limit.`); return; }
    const r = new FileReader();
    r.onload = e => { taskFiles.push({ name: f.name, size: f.size, type: f.type, data: e.target.result }); renderFileList(); };
    r.readAsDataURL(f);
  });
}

function renderFileList() {
  const el = document.getElementById('fileList');
  el.innerHTML = taskFiles.map((f,i) => `
    <div class="file-item">
      <div class="file-thumb">${getFileIcon(f.type)}</div>
      <div class="file-info">
        <div class="file-name">${f.name}</div>
        <div class="file-size">${fmtSize(f.size)}</div>
      </div>
      <button class="file-remove" onclick="removeFile(${i})">×</button>
    </div>`).join('');
}

function removeFile(i) { taskFiles.splice(i,1); renderFileList(); }

/* ── TEAM ── */
function renderTeam() {
  const allTasks = projects.flatMap(p => p.tasks || []);
  const members = getAllMembers().map(m => ({
    ...m,
    role: m.id === 'me' ? (user.role || 'Team Member') : (teamMembers.find(t=>t.id===m.id)||{}).role,
    assigned: allTasks.filter(t=>t.assignee===m.id).length,
    done: allTasks.filter(t=>t.assignee===m.id&&t.done).length
  }));

  const el = document.getElementById('teamGrid');
  if (!members.length) { el.innerHTML = emptyState('👥','No team members','Invite colleagues to collaborate','<button class="btn btn-primary" onclick="openTeamModal()">Add Member</button>'); return; }
  el.innerHTML = members.map(m => `
    <div class="team-card">
      <div class="team-avatar">${m.initials}</div>
      <div class="team-name">${m.name}</div>
      <div class="team-role">${m.role || 'Team Member'}</div>
      <div class="team-stats-row">
        <div><div class="team-stat-val">${m.assigned}</div><div class="team-stat-lbl">Assigned</div></div>
        <div><div class="team-stat-val">${m.done}</div><div class="team-stat-lbl">Done</div></div>
      </div>
    </div>`).join('');
}

function openTeamModal() {
  document.getElementById('memberFirst').value = '';
  document.getElementById('memberLast').value = '';
  document.getElementById('memberEmail').value = '';
  openModal('teamModal');
}

function saveMember() {
  const first = document.getElementById('memberFirst').value.trim();
  const last = document.getElementById('memberLast').value.trim();
  const email = document.getElementById('memberEmail').value.trim();
  const role = document.getElementById('memberRole').value;
  if (!first || !last || !email) { alert('Please fill all required fields.'); return; }
  if (teamMembers.find(m=>m.email===email)) { alert('Member already exists.'); return; }
  const m = { id: Date.now().toString(), name: `${first} ${last}`, email, role, initials: (first[0]+last[0]).toUpperCase(), added: new Date().toISOString() };
  teamMembers.push(m);
  saveTeam();
  renderTeam();
  addActivity('created', `Added team member: ${m.name}`);
  addNotification('Member Added', `${m.name} joined the team`);
  closeModal('teamModal');
}

/* ── DOCUMENTS ── */
function renderDocs() {
  const docs = projects.flatMap(p => (p.tasks||[]).flatMap(t => t.files||[]));
  const el = document.getElementById('docsGrid');
  if (!docs.length) { el.innerHTML = emptyState('📄','No documents','Attach files to tasks to see them here',''); return; }
  el.innerHTML = docs.map(d => `
    <div class="doc-card">
      <div class="doc-icon">${getFileIcon(d.type)}</div>
      <div class="doc-name" title="${d.name}">${d.name}</div>
      <div class="doc-meta">${fmtSize(d.size)}</div>
    </div>`).join('');
}

/* ── ACTIVITY ── */
function renderActivity() {
  const acts = getActivities();
  const el = document.getElementById('activityFeed');
  if (!acts.length) { el.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text3);font-size:13px;">No recent activity yet</div>`; return; }
  el.innerHTML = acts.map(a => `
    <div class="activity-item">
      <div class="activity-icon-wrap">${{'created':'✨','updated':'✏️','deleted':'🗑️','completed':'✅'}[a.type]||'📌'}</div>
      <div class="activity-body">
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${timeAgo(a.time)}</div>
      </div>
    </div>`).join('');
}

/* ── NOTIFICATIONS ── */
function renderNotifs() {
  const ns = getNotifications();
  const el = document.getElementById('notifList');
  if (!ns.length) { el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px;">🔔 You're all caught up!</div>`; return; }
  el.innerHTML = ns.slice(0,15).map(n => `
    <div class="notif-item ${n.read?'':'unread'}">
      <div class="notif-item-title">${n.title}</div>
      <div class="notif-item-text">${n.text}</div>
      <div class="notif-item-time">${timeAgo(n.time)}</div>
    </div>`).join('');
  updateStats();
}

function toggleNotifDropdown() {
  document.getElementById('notifDropdown').classList.toggle('open');
}

function markAllRead() {
  const n = getNotifications().map(n => ({...n,read:true}));
  localStorage.setItem(`notifs_${user.email}`, JSON.stringify(n));
  renderNotifs(); updateStats();
}

function clearNotifs() {
  if (confirm('Clear all notifications?')) {
    localStorage.setItem(`notifs_${user.email}`, '[]');
    renderNotifs(); updateStats();
  }
}

/* ── CALENDAR ── */
function renderCalendar() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calTitle').textContent = `${months[calMonth]} ${calYear}`;
  const first = new Date(calYear, calMonth, 1).getDay();
  const last = new Date(calYear, calMonth+1, 0).getDate();
  const prevLast = new Date(calYear, calMonth, 0).getDate();
  const today = new Date();
  let html = '';
  for (let i = first; i > 0; i--) html += `<div class="cal-day other-month">${prevLast-i+1}</div>`;
  for (let d = 1; d <= last; d++) {
    const isToday = d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
    const hasTasks = projects.some(p=>(p.tasks||[]).some(t=>{ if(!t.due)return false; const dt=new Date(t.due); return dt.getDate()===d&&dt.getMonth()===calMonth&&dt.getFullYear()===calYear; }));
    html += `<div class="cal-day ${isToday?'today':''} ${hasTasks?'has-tasks':''}">${d}</div>`;
  }
  const rem = (first + last) % 7;
  if (rem) for (let i=1;i<=7-rem;i++) html+=`<div class="cal-day other-month">${i}</div>`;
  document.getElementById('calDays').innerHTML = html;

  // upcoming deadlines
  const deadlines = projects.flatMap(p=>(p.tasks||[]).filter(t=>t.due&&!t.done).map(t=>({...t,project:p.name}))).sort((a,b)=>new Date(a.due)-new Date(b.due));
  const ud = document.getElementById('upcomingDeadlines');
  if (!deadlines.length) { ud.innerHTML=`<div style="color:var(--text3);font-size:13px;text-align:center;padding:20px;">No upcoming deadlines</div>`; return; }
  ud.innerHTML = deadlines.slice(0,5).map(t=>`
    <div class="cal-event">
      <div class="cal-event-info">
        <div class="cal-event-title">${t.title}</div>
        <div class="cal-event-sub">${fmtDate(t.due)} · ${t.project} · ${getMemberName(t.assignee)}</div>
      </div>
      <div class="task-priority ${t.priority}" style="flex-shrink:0">${t.priority}</div>
    </div>`).join('');
}

function prevMonth() { calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); }
function nextMonth() { calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); }
function calToday() { calMonth=new Date().getMonth(); calYear=new Date().getFullYear(); renderCalendar(); }

/* ── CHARTS ── */
function renderCharts() {
  const allTasks = projects.flatMap(p=>p.tasks||[]);
  const chartDefaults = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ labels:{ color:'#8b96b3', font:{size:11} } } },
    scales:{ y:{ ticks:{color:'#8b96b3',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'}, beginAtZero:true }, x:{ ticks:{color:'#8b96b3',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'} } }
  };

  // Task trend
  if (charts.task) charts.task.destroy();
  const days=[],vals=[];
  for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toLocaleDateString('en',{month:'short',day:'numeric'})); vals.push(allTasks.filter(t=>{ if(!t.doneAt)return false; const dd=new Date(t.doneAt); return dd.toDateString()===d.toDateString(); }).length); }
  charts.task = new Chart(document.getElementById('taskChart'), { type:'line', data:{ labels:days, datasets:[{ label:'Completed',data:vals, borderColor:'#4f7eff',backgroundColor:'rgba(79,126,255,0.1)',tension:0.4,fill:true,pointBackgroundColor:'#4f7eff',pointRadius:4 }] }, options:{ ...chartDefaults, plugins:{...chartDefaults.plugins,legend:{display:false}} } });

  // Status doughnut
  if (charts.proj) charts.proj.destroy();
  charts.proj = new Chart(document.getElementById('projectChart'), { type:'doughnut', data:{ labels:['Active','Pending','Completed'], datasets:[{ data:[projects.filter(p=>p.status==='active').length,projects.filter(p=>p.status==='pending').length,projects.filter(p=>p.status==='completed').length], backgroundColor:['#00d4aa','#f5a623','#4f7eff'], borderWidth:0, hoverOffset:8 }] }, options:{ responsive:true,maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{color:'#8b96b3',padding:16,font:{size:11}} } }, cutout:'65%' } });

  // Priority bar
  if (charts.pri) charts.pri.destroy();
  charts.pri = new Chart(document.getElementById('priorityChart'), { type:'bar', data:{ labels:['High','Medium','Low'], datasets:[{ label:'Tasks',data:[allTasks.filter(t=>t.priority==='high').length,allTasks.filter(t=>t.priority==='medium').length,allTasks.filter(t=>t.priority==='low').length], backgroundColor:['rgba(255,79,106,0.7)','rgba(245,166,35,0.7)','rgba(0,212,170,0.7)'], borderRadius:8, borderWidth:0 }] }, options:{ ...chartDefaults, plugins:{...chartDefaults.plugins,legend:{display:false}} } });
}

/* ── SETTINGS ── */
function showSettingsTab(tab) {
  document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.toggle('active', i.getAttribute('onclick').includes(`'${tab}'`)));
  document.querySelectorAll('.settings-section').forEach(s => s.classList.toggle('active', s.id===`st-${tab}`));
}

function loadSettingsValues() {
  const n = `${user.firstName} ${user.lastName}`.split(' ');
  document.getElementById('stFirstName').value = user.firstName || '';
  document.getElementById('stLastName').value = user.lastName || '';
  document.getElementById('stEmail').value = user.email || '';
  document.getElementById('stCompany').value = user.company || '';
  document.getElementById('stRole').value = user.role || 'other';
  document.getElementById('stJobTitle').value = user.jobTitle || '';
  document.getElementById('stBio').value = user.bio || '';
  document.getElementById('settingsAvatar').textContent = (user.firstName[0]+user.lastName[0]).toUpperCase();
}

function saveProfile() {
  user.firstName = document.getElementById('stFirstName').value.trim();
  user.lastName = document.getElementById('stLastName').value.trim();
  user.company = document.getElementById('stCompany').value.trim();
  user.role = document.getElementById('stRole').value;
  user.jobTitle = document.getElementById('stJobTitle').value.trim();
  user.bio = document.getElementById('stBio').value.trim();
  localStorage.setItem('currentUser', JSON.stringify(user));
  loadAll();
  addActivity('updated', 'Updated profile settings');
  showToast('Profile saved ✓');
}

function saveNotifPrefs() { showToast('Notification preferences saved ✓'); }
function saveAppearance() { showToast('Appearance saved ✓'); }

function selectTheme(el, theme) {
  document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function selectAccent(el, color, color2) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent2', color2);
}

function changePassword() {
  const cur = document.getElementById('curPass').value;
  const np = document.getElementById('newPass').value;
  const cp = document.getElementById('confirmPass').value;
  if (!cur || !np || !cp) { alert('Fill all password fields.'); return; }
  if (np !== cp) { alert('New passwords do not match.'); return; }
  if (np.length < 8) { alert('Password must be at least 8 characters.'); return; }
  const users = JSON.parse(localStorage.getItem('users')||'[]');
  const u = users.find(u=>u.email===user.email);
  if (!u || u.password !== cur) { alert('Current password is incorrect.'); return; }
  u.password = np;
  localStorage.setItem('users', JSON.stringify(users));
  document.getElementById('curPass').value='';document.getElementById('newPass').value='';document.getElementById('confirmPass').value='';
  showToast('Password updated ✓');
}

function exportData() {
  const data = { user, projects, teamMembers, activities: getActivities(), exported: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `projecthub-data-${Date.now()}.json`;
  a.click();
  showToast('Data exported ✓');
}

function clearAllData() {
  projects = [];
  teamMembers = [];
  saveProjects();
  saveTeam();
  localStorage.removeItem(`act_${user.email}`);
  localStorage.removeItem(`notifs_${user.email}`);
  loadAll();
  showToast('All data cleared');
}

/* ── MODAL HELPERS ── */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.getElementById('notifDropdown').classList.remove('open');
  }
});

// Close modal on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

/* ── SEARCH ── */
function setupSearch() {
  document.getElementById('searchInput').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    navigateTo('projects');
    if (!q) { renderProjects(); return; }
    const filtered = projects.filter(p => p.name.toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q));
    const el = document.getElementById('projectsList');
    if (!filtered.length) { el.innerHTML = emptyState('🔍','No results','Try a different search term',''); return; }
    el.innerHTML = filtered.map(renderProjectCard).join('');
  });
}

/* ── KEYBOARD SHORTCUTS ── */
function setupKeyboardShortcuts() {
  let gPressed = false;
  document.addEventListener('keydown', e => {
    if (document.querySelector('.modal-overlay.open') || e.target.matches('input,textarea,select')) return;
    if (e.key === 'g' || e.key === 'G') { gPressed = true; setTimeout(()=>gPressed=false, 1000); return; }
    if (gPressed) {
      const map = { o:'overview', p:'projects', c:'calendar', s:'settings', t:'team' };
      if (map[e.key.toLowerCase()]) { navigateTo(map[e.key.toLowerCase()]); gPressed=false; }
    }
    if ((e.metaKey||e.ctrlKey) && e.key==='n') { e.preventDefault(); openProjectModal(); }
    if ((e.metaKey||e.ctrlKey) && e.key==='t') { e.preventDefault(); openTaskModal(); }
    if ((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); document.getElementById('searchInput').focus(); }
    if ((e.metaKey||e.ctrlKey) && e.key==='b') { e.preventDefault(); toggleSidebar(); }
  });
}

/* ── LOGOUT ── */
function logout() {
  if (confirm('Sign out?')) { localStorage.removeItem('currentUser'); window.location.href='login.html'; }
}

/* ── TOAST ── */
function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#4f7eff,#7c5cfc);color:white;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:500;z-index:9999;box-shadow:0 8px 24px rgba(79,126,255,0.4);animation:fadeUp 0.3s ease both;font-family:'DM Sans',sans-serif;`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s ease'; setTimeout(()=>t.remove(),300); }, 2500);
}

/* ── UTILS ── */
function fmtDate(s) {
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes+'B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1)+'KB';
  return (bytes/1048576).toFixed(1)+'MB';
}

function getFileIcon(type) {
  if (!type) return '📄';
  if (type.includes('pdf')) return '📕';
  if (type.includes('word')||type.includes('doc')) return '📘';
  if (type.includes('sheet')||type.includes('xls')) return '📗';
  if (type.includes('image')) return '🖼️';
  return '📄';
}

function timeAgo(s) {
  const sec = Math.floor((Date.now() - new Date(s))/1000);
  if (sec<60) return 'Just now';
  if (sec<3600) return Math.floor(sec/60)+'m ago';
  if (sec<86400) return Math.floor(sec/3600)+'h ago';
  if (sec<604800) return Math.floor(sec/86400)+'d ago';
  return fmtDate(s);
}

function openTeamModal() {
  document.getElementById('memberFirst').value='';
  document.getElementById('memberLast').value='';
  document.getElementById('memberEmail').value='';
  openModal('teamModal');
}

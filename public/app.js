const $ = (id) => document.getElementById(id);
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  clear: () => { try { localStorage.clear(); } catch {} },
};

let access = store.get('access');
let refresh = store.get('refresh');
let user = JSON.parse(store.get('user') || 'null');
let mode = 'login';

function msg(text, ok = false) {
  $('msg').textContent = text || '';
  $('msg').className = ok ? 'ok' : '';
}

function saveSession(data) {
  access = data.accessToken;
  refresh = data.refreshToken;
  store.set('access', access);
  store.set('refresh', refresh);
  if (data.user) { user = data.user; store.set('user', JSON.stringify(user)); }
}

function clearSession() {
  access = refresh = user = null;
  store.clear();
}

async function refreshTokens() {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    saveSession(await res.json());
    return true;
  } catch { return false; }
}

async function api(path, options = {}, retry = true) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: 'Bearer ' + access } : {}),
    },
  });
  if (res.status === 401 && retry && refresh && !path.startsWith('/auth/')) {
    if (await refreshTokens()) return api(path, options, false);
    clearSession();
    render();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

/* ---------- Auth ---------- */
function setMode(m) {
  mode = m;
  $('tabLogin').classList.toggle('active', m === 'login');
  $('tabRegister').classList.toggle('active', m === 'register');
  $('name').hidden = m === 'login';
  $('name').required = m === 'register';
  $('authSubmit').textContent = m === 'login' ? 'Login' : 'Create account';
  msg('');
}

async function login(email, password) {
  const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  saveSession(data);
}

$('tabLogin').addEventListener('click', () => setMode('login'));
$('tabRegister').addEventListener('click', () => setMode('register'));

$('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('email').value.trim();
  const password = $('password').value;
  try {
    if (mode === 'register') {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: $('name').value.trim(), email, password }),
      });
    }
    await login(email, password);
    $('authForm').reset();
    msg('');
    render();
  } catch (err) { msg(err.message); }
});

$('logoutBtn').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  clearSession();
  render();
  msg('Logged out', true);
});

/* ---------- Tasks ---------- */
async function loadTasks() {
  try {
    const status = $('statusFilter').value;
    const data = await api('/tasks' + (status ? '?status=' + status : ''));
    const list = $('taskList');
    list.replaceChildren();
    if (!data.tasks.length) {
      const li = document.createElement('li');
      li.textContent = 'No tasks yet.';
      list.append(li);
    }
    data.tasks.forEach((t) => list.append(taskItem(t)));
  } catch (err) { msg(err.message); }
}

function btn(label, cls, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  if (cls) b.className = cls;
  b.addEventListener('click', onClick);
  return b;
}

function taskItem(t) {
  const li = document.createElement('li');
  if (t.status === 'completed') li.classList.add('done');

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = t.title;

  const meta = document.createElement('div');
  meta.className = 'meta';
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = t.status;
  meta.append(badge);
  if (t.description) meta.append(' · ' + t.description);

  const mine = t.user && t.user._id === user.id;
  if (!mine && t.user) meta.append(' · by ' + t.user.email);

  li.append(title, meta);

  if (mine) {
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(
      btn(t.status === 'completed' ? 'Mark pending' : 'Mark completed', '', () =>
        update(t._id, { status: t.status === 'completed' ? 'pending' : 'completed' })),
      btn('Edit', 'secondary', () => {
        const title = prompt('New title', t.title);
        if (title && title.trim()) update(t._id, { title: title.trim() });
      }),
      btn('Delete', 'danger', async () => {
        if (!confirm('Delete this task?')) return;
        try { await api('/tasks/' + t._id, { method: 'DELETE' }); loadTasks(); }
        catch (err) { msg(err.message); }
      })
    );
    li.append(actions);
  }
  return li;
}

async function update(id, body) {
  try { await api('/tasks/' + id, { method: 'PUT', body: JSON.stringify(body) }); loadTasks(); }
  catch (err) { msg(err.message); }
}

$('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: $('title').value.trim(), description: $('description').value.trim() }),
    });
    $('taskForm').reset();
    msg('');
    loadTasks();
  } catch (err) { msg(err.message); }
});

$('statusFilter').addEventListener('change', loadTasks);

/* ---------- View switch ---------- */
function render() {
  const loggedIn = !!(access && user);
  $('authView').hidden = loggedIn;
  $('appView').hidden = !loggedIn;
  if (loggedIn) {
    $('whoami').textContent = `${user.name} (${user.role})` + (user.role === 'admin' ? ' – viewing all tasks' : '');
    loadTasks();
  }
}

render();
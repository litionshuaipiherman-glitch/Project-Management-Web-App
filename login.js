
    (function() {
      const container = document.getElementById('particles');
      for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `
          left: ${Math.random() * 100}%;
          animation-duration: ${8 + Math.random() * 12}s;
          animation-delay: ${Math.random() * 10}s;
          width: ${1 + Math.random() * 3}px;
          height: ${1 + Math.random() * 3}px;
          background: ${Math.random() > 0.5 ? '#4f7eff' : Math.random() > 0.5 ? '#7c5cfc' : '#00d4aa'};
        `;
        container.appendChild(p);
      }
    })();

    // Tab switching
    function showTab(tab) {
      document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'signup'));
      });
      document.getElementById('loginPanel').classList.toggle('active', tab === 'login');
      document.getElementById('signupPanel').classList.toggle('active', tab === 'signup');
      clearAlerts();
    }

    function clearAlerts() {
      document.querySelectorAll('.alert').forEach(a => { a.style.display = 'none'; a.textContent = ''; });
    }

    function showAlert(id, msg, type) {
      const el = document.getElementById(id);
      el.textContent = msg;
      el.className = `alert ${type}`;
      el.style.display = 'block';
      if (type === 'error') setTimeout(() => { el.style.display = 'none'; }, 5000);
    }

    function setLoading(btn, loading) {
      btn.classList.toggle('loading', loading);
    }

    // Password strength
    function checkStrength(pass) {
      const fill = document.getElementById('strengthFill');
      const label = document.getElementById('strengthLabel');
      let score = 0;
      if (pass.length >= 8) score++;
      if (pass.length >= 12) score++;
      if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
      if (/\d/.test(pass)) score++;
      if (/[^a-zA-Z0-9]/.test(pass)) score++;

      const levels = [
        { pct: 0, color: '#2d3548', text: '' },
        { pct: 20, color: '#ff4f6a', text: 'Weak' },
        { pct: 40, color: '#ff944f', text: 'Fair' },
        { pct: 70, color: '#f5c518', text: 'Good' },
        { pct: 90, color: '#00d4aa', text: 'Strong' },
        { pct: 100, color: '#00d4aa', text: '✓ Excellent' },
      ];
      const lvl = levels[Math.min(score, 5)];
      fill.style.width = lvl.pct + '%';
      fill.style.background = lvl.color;
      label.textContent = lvl.text;
      label.style.color = lvl.color;
    }

    // Login
    function handleLogin() {
      const btn = document.querySelector('#loginPanel .submit-btn');
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const remember = document.getElementById('remember').checked;

      if (!email || !password) { showAlert('loginErr', 'Please fill in all fields.', 'error'); return; }

      setLoading(btn, true);
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        setLoading(btn, false);

        if (user) {
          localStorage.setItem('currentUser', JSON.stringify({ ...user, loginTime: new Date().toISOString(), remember }));
          showAlert('loginOk', '✓ Login successful! Redirecting…', 'success');
          setTimeout(() => window.location.href = 'dashboard.html', 900);
        } else {
          showAlert('loginErr', 'Incorrect email or password. Please try again.', 'error');
        }
      }, 700);
    }

    // Signup
    function handleSignup() {
      const btn = document.querySelector('#signupPanel .submit-btn');
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const company = document.getElementById('company').value.trim();
      const role = document.getElementById('role').value;
      const password = document.getElementById('signupPassword').value;
      const confirm = document.getElementById('confirmPassword').value;
      const terms = document.getElementById('terms').checked;

      if (!firstName || !lastName || !email || !password) { showAlert('signupErr', 'Please fill in all required fields.', 'error'); return; }
      if (password !== confirm) { showAlert('signupErr', 'Passwords do not match.', 'error'); return; }
      if (password.length < 8) { showAlert('signupErr', 'Password must be at least 8 characters.', 'error'); return; }
      if (!terms) { showAlert('signupErr', 'Please accept the Terms of Service.', 'error'); return; }

      setLoading(btn, true);
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find(u => u.email === email)) {
          setLoading(btn, false);
          showAlert('signupErr', 'An account with this email already exists.', 'error');
          return;
        }
        const newUser = { firstName, lastName, email, company, role, password, createdAt: new Date().toISOString() };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify({ ...newUser, loginTime: new Date().toISOString(), remember: false }));
        setLoading(btn, false);
        showAlert('signupOk', '✓ Account created! Redirecting…', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 900);
      }, 900);
    }

    // Enter key support
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (document.getElementById('loginPanel').classList.contains('active')) handleLogin();
        else handleSignup();
      }
    });

    // Auto-redirect if logged in
    window.addEventListener('load', () => {
      const u = localStorage.getItem('currentUser');
      if (u) {
        const s = JSON.parse(u);
        const days = (Date.now() - new Date(s.loginTime)) / 86400000;
        if (s.remember || days < 1) window.location.href = 'dashboard.html';
      }
    });

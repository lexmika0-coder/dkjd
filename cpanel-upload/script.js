document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');
  const status = document.getElementById('statusMessage');

  if (!form || !status) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    status.className = 'status-message';

    if (!username || !password) {
      status.textContent = 'Please enter both username and password.';
      status.classList.add('error');
      return;
    }

    status.textContent = 'Welcome back, ' + username + '. Your session is ready.';
    status.classList.add('success');
    form.reset();
  });
});

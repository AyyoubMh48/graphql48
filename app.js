class ProfileApp {
  constructor() {
    this.token = localStorage.getItem("token");
    this.init();
    this.createParticles();
  }

  createParticles() {
    const container = document.getElementById("particles");
    if (!container) return;
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = Math.random() * 100 + "%";
      particle.style.animationDelay = Math.random() * 15 + "s";
      particle.style.animationDuration = 15 + Math.random() * 10 + "s";
      container.appendChild(particle);
    }
  }

  async init() {
    if (!this.token) {
      this.showLoginForm();
    } else {
      this.showProfile();
    }
  }

  showLoginForm() {
    const container = document.getElementById("app");
    container.innerHTML = `
      <div class="login-container">
        <div class="login-card animate-in">
          <div class="logo">🚀</div>
          <h2>Welcome Back</h2>
          <p class="subtitle">Sign in to access your Zone01 profile</p>
          <div id="error" style="display: none;" class="error"></div>
          <form id="loginForm">
            <div class="form-group">
              <label>Username or Email</label>
              <input type="text" id="identifier" placeholder="Enter your username" required>
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="password" placeholder="Enter your password" required>
            </div>
            <button type="submit" class="btn-primary">Sign In</button>
          </form>
        </div>
      </div>
    `;

    document
      .getElementById("loginForm")
      .addEventListener("submit", this.handleLogin.bind(this));
  }

  async handleLogin(e) {
    e.preventDefault();

    const identifier = document.getElementById("identifier").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        "https://learn.zone01oujda.ma/api/auth/signin",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${identifier}:${password}`)}`, //btoa encodes a string to base-64
          },
        }
      );

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();

      this.token = data;
      localStorage.setItem("token", this.token);
      this.showProfile();
    } catch (error) {
      const errorDiv = document.getElementById("error");
      errorDiv.textContent = error.message;
      errorDiv.style.display = "block";
    }
  }

  async fetchUserData() {
    const query = `{
        user {
          login
          firstName
          lastName
          totalDown
          totalUp
          auditRatio
          transactions (
            where: { _and: [{ type: { _eq: "level" } }, { object: { type: { _eq: "project" } } }] }
            limit: 1
            order_by: { amount: desc }
          ) {
            amount
          }
          totalXp: transactions_aggregate(
            where: { _and: [{ type: { _eq: "xp" } }, { event: { object: { name: { _eq: "Module" } } } }] }
          ) {
            aggregate {
              sum {
                amount
              }
            }
          }
        }
        skills: transaction(
          where: { type: { _like: "skill%" } }
          order_by: [{ amount: desc }]
        ) {
          type
          amount
        }
      }`;

    const response = await fetch(
      "https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }

    const data = await response.json();
    if (data.errors) {
      console.log("Data errors", data.errors);
    }

    return data.data;
  }

  logout() {
    localStorage.removeItem("token");
    this.token = null;
    this.showLoginForm();
  }

  async showProfile() {
    const container = document.getElementById("app");
    container.innerHTML = `
      <div class="container">
        <div class="loading">
          <div class="loading-spinner"></div>
          <p class="loading-text">Loading your profile...</p>
        </div>
      </div>
    `;

    try {
      const userData = await this.fetchUserData();
      const user = userData.user[0];
      const skills = userData.skills.reduce((acc, skill) => {
        if (!(skill.type in acc)) {
          acc[skill.type] = skill.amount;
        }
        return acc;
      }, {});
      
      

      container.innerHTML = `
        <div class="container">
          <button class="logout-btn" id="logoutBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>
          
          <div class="card animate-in">
            <div class="profile-header">
              <h1>${user.firstName} ${user.lastName}</h1>
              <p class="subtitle">@${user.login}</p>
            </div>
            
            <div class="stats-grid">
              <div class="stat-card animate-in delay-1">
                <div class="icon">👤</div>
                <h3>Full Name</h3>
                <p class="value">${user.firstName} ${user.lastName}</p>
              </div>
              <div class="stat-card animate-in delay-2">
                <div class="icon">⚡</div>
                <h3>Total XP</h3>
                <p class="value">${formatSize(user.totalXp.aggregate.sum.amount)}</p>
              </div>
              <div class="stat-card animate-in delay-3">
                <div class="icon">📊</div>
                <h3>Audit Ratio</h3>
                <p class="value">${user.auditRatio.toFixed(1)}</p>
              </div>
              <div class="stat-card animate-in delay-4">
                <div class="icon">🎯</div>
                <h3>Level</h3>
                <p class="value">${user.transactions[0].amount}</p>
              </div>
            </div>
          </div>
          
          <div class="graphs-grid">
            <div class="chart-card skills-chart animate-in delay-3">
              <h2>Skills Overview</h2>
              <svg id="skillsChart" viewBox="0 0 420 700"></svg>
            </div>
            <div class="chart-card audit-ratio-chart animate-in delay-4">
              <h2>Audit Performance</h2>
              <svg id="auditRatioChart" viewBox="0 0 400 350"></svg>
            </div>
          </div>
        </div>
      `;

      document
        .getElementById("logoutBtn")
        .addEventListener("click", () => this.logout());

      circularProgressGraph(
        Object.keys(skills).map((e) => e.replace("skill_", "").toUpperCase()),
        Object.values(skills),
        document.getElementById("skillsChart")
      );

      createAuditRatioSvg(
        user.totalDown,
        user.totalUp,
        user.auditRatio,
        document.getElementById("auditRatioChart")
      );
    } catch (error) {
      container.innerHTML = `
          <div class="container">
            <div class="error">Error loading profile: ${error.message}</div>
            <button id="logoutBtn">Logout</button>
          </div>`;
      document
        .getElementById("logoutBtn")
        .addEventListener("click", () => this.logout());
      setTimeout(() => this.logout(), 5000);
    }
  }
}

function formatSize(value) {
  if (value < 1000) {
    return `${value}B`;
  } else if (value >= 1000 && value < 1000000) {
    return `${Math.round(value / 1000)}KB`;  
  } else {
    return `${(value / 1000000).toFixed(2)}MB`; 
  }
}

const circularProgressGraph = (skills, percentages, svg) => {
  const centerX = 210,
    centerY = 200,
    radius = 45;
  const gap = 130;

  const rows = Math.ceil(skills.length / 3);
  const svgHeight = rows * gap + 100;
  svg.setAttribute("viewBox", `0 0 420 ${svgHeight}`);

  skills.forEach((skill, i) => {
    const x = centerX + (i % 3) * gap - gap;
    const y = centerY + Math.floor(i / 3) * gap - gap + 50;

    const percentage = percentages[i];
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${
      (circumference * percentage) / 100
    } ${circumference}`;

    const getColor = (percentage) => {
      if (percentage >= 80) return { main: "#10b981", glow: "rgba(16, 185, 129, 0.3)" };
      if (percentage >= 50) return { main: "#f59e0b", glow: "rgba(245, 158, 11, 0.3)" };
      return { main: "#ef4444", glow: "rgba(239, 68, 68, 0.3)" };
    };

    const colors = getColor(percentage);

    svg.innerHTML += `
      <defs>
        <filter id="glow${i}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="grad${i}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.main};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.main};stop-opacity:0.6" />
        </linearGradient>
      </defs>
    `;

    svg.innerHTML += `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="rgba(99, 102, 241, 0.1)" stroke-width="8"/>`;

    svg.innerHTML += `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="url(#grad${i})" stroke-width="8" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 ${x} ${y})" filter="url(#glow${i})" style="transition: all 0.5s ease"/>`;
    
    svg.innerHTML += `<text x="${x}" y="${y}" font-size="16" font-weight="700" text-anchor="middle" dy="6" fill="#f8fafc">${percentage}%</text>`;

    svg.innerHTML += `<text x="${x}" y="${
      y + radius + 22
    }" font-size="11" font-weight="500" text-anchor="middle" fill="#94a3b8">${skill}</text>`;
  });
};

const createAuditRatioSvg = (totalDown, totalUp, auditRatio, container) => {
  const svg = container;
  const barHeight = 32;
  const barWidth = 260;
  const startX = 90;
  const doneY = 100;
  const receivedY = 180;

  svg.innerHTML = "";

  const total = Math.max(totalDown, totalUp); 
  const doneWidth = total ? (totalUp / total) * barWidth : 0;
  const receivedWidth = total ? (totalDown / total) * barWidth : 0;

  svg.innerHTML += `
    <defs>
      <linearGradient id="doneGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#6366f1"/>
        <stop offset="100%" style="stop-color:#8b5cf6"/>
      </linearGradient>
      <linearGradient id="receivedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#f59e0b"/>
        <stop offset="100%" style="stop-color:#ef4444"/>
      </linearGradient>
      <filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  `;

  const ratioColor = auditRatio >= 1 ? "#10b981" : auditRatio >= 0.8 ? "#f59e0b" : "#ef4444";
  svg.innerHTML += `
    <text x="200" y="45" text-anchor="middle" font-size="48" font-weight="800" fill="${ratioColor}">${auditRatio.toFixed(1)}</text>
    <text x="200" y="70" text-anchor="middle" font-size="14" font-weight="500" fill="#94a3b8">Audit Ratio</text>
  `;

  svg.innerHTML += `
    <text x="${startX - 15}" y="${doneY + barHeight / 2}" text-anchor="end" dominant-baseline="middle" font-size="14" font-weight="600" fill="#a5b4fc">Done</text>
    <rect x="${startX}" y="${doneY}" width="${barWidth}" height="${barHeight}" fill="rgba(99, 102, 241, 0.15)" rx="16" ry="16" />
    <rect x="${startX}" y="${doneY}" width="${doneWidth}" height="${barHeight}" fill="url(#doneGrad)" rx="16" ry="16" filter="url(#barGlow)"/>
    <text x="${startX + barWidth + 20}" y="${doneY + barHeight / 2}" font-size="15" font-weight="700" fill="#f8fafc" dominant-baseline="middle">${formatSize(totalUp)}</text>
  `;

  svg.innerHTML += `
    <text x="${startX - 15}" y="${receivedY + barHeight / 2}" text-anchor="end" dominant-baseline="middle" font-size="14" font-weight="600" fill="#fcd34d">Received</text>
    <rect x="${startX}" y="${receivedY}" width="${barWidth}" height="${barHeight}" fill="rgba(245, 158, 11, 0.15)" rx="16" ry="16" />
    <rect x="${startX}" y="${receivedY}" width="${receivedWidth}" height="${barHeight}" fill="url(#receivedGrad)" rx="16" ry="16" filter="url(#barGlow)"/>
    <text x="${startX + barWidth + 20}" y="${receivedY + barHeight / 2}" font-size="15" font-weight="700" fill="#f8fafc" dominant-baseline="middle">${formatSize(totalDown)}</text>
  `;

  svg.innerHTML += `
    <line x1="80" y1="250" x2="320" y2="250" stroke="rgba(148, 163, 184, 0.2)" stroke-width="1"/>
    <text x="200" y="290" text-anchor="middle" font-size="13" fill="#64748b">Total Audits: ${formatSize(totalUp + totalDown)}</text>
    <text x="200" y="315" text-anchor="middle" font-size="12" fill="#475569">${auditRatio >= 1 ? "✓ Great balance!" : "⚠ Need more audits"}</text>
  `;
};

document.addEventListener("DOMContentLoaded", () => {
  new ProfileApp();
});

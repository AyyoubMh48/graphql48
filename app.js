class ProfileApp {
  constructor() {
    this.token = localStorage.getItem("token");
    console.log("Token:", this.token);

    this.init();
  }

  async init() {
    if (!this.token) {
      console.log("showLoginForm");
      this.showLoginForm();
    } else {
      this.showProfile();
      console.log("showProfile");
    }
  }

  showLoginForm() {
    const container = document.getElementById("app");
    container.innerHTML = `
              <div class="login-container card">
                  <h2>Login</h2>
                  <div id="error" style="display: none;" class="error"></div>
                  <form id="loginForm">
                      <div class="form-group">
                          <input type="text" id="identifier" placeholder="Username or Email" required>
                      </div>
                      <div class="form-group">
                          <input type="password" id="password" placeholder="Password" required>
                      </div>
                      <button type="submit">Login</button>
                  </form>
              </div>
          `;

    console.log("Login form rendered");

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
            Authorization: `Basic ${btoa(`${identifier}:${password}`)}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      console.log("Parsed Data:", data);

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
    console.log("Loading Profile...");

    const container = document.getElementById("app");
    container.innerHTML = '<div class="container">Loading...</div>';

    try {
      const userData = await this.fetchUserData();
      const user = userData.user[0];
      const skills = userData.skills.reduce((acc, skill) => {
        if (!(skill.type in acc)) {
          acc[skill.type] = skill.amount;
        }
        return acc;
      }, {});
      
      function formatSize(value) {
        if (value < 1000) {
          return `${value}B`;
        } else if (value >= 1000 && value < 1000000) {
          return `${Math.round(value / 1000)}KB`;  // Round to the nearest KB
        } else {
          return `${(value / 1000000).toFixed(2)}MB`;  // Keep the two decimal places for MB
        }
      }

      container.innerHTML = `
          <div class="container">
            <button class="logout-btn" id="logoutBtn">Logout</button>
            <div class="card">
              <h1>${user.login}'s Profile</h1>
              <div class="stats-grid">
                <div class="stat-card"><h3>Full Name</h3><p>${user.firstName} ${user.lastName}</p></div>
                <div class="stat-card"><h3>Total XP</h3><p>${formatSize(user.totalXp.aggregate.sum.amount)}</p></div>
                <div class="stat-card"><h3>Audit Ratio</h3><p>${user.auditRatio.toFixed(
                  2
                )}</p></div>
                <div class="stat-card"><h3>Level</h3><p>${user.transactions[0].amount}</p></div>
              </div>
            </div>
            <div class="graphs-grid">
              <div class="card skills-chart">
                <h2>Skills Chart</h2>
                <svg id="skillsChart" width="400" height="700"></svg>
              </div>
              <div class="card audit-ratio-chart">
            <h2>Audit Ratio</h2>
              <svg id="auditRatioChart" width="300" height="200"></svg>
            </div>
            </div>
          </div>`;

      document
        .getElementById("logoutBtn")
        .addEventListener("click", () => this.logout());
        console.log("Skills Data:", skills);

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
    }
  }
}

const circularProgressGraph = (skills, percentages, svg) => {
  const centerX = 200,
    centerY = 200,
    radius = 50;
  const gap = 140; // Space between circles
  

  skills.forEach((skill, i) => {
    const x = centerX + (i % 3) * gap - gap;
    const y = centerY + Math.floor(i / 3) * gap - gap;

    const percentage = percentages[i];
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${
      (circumference * percentage) / 100
    } ${circumference}`;

    const getColor = (percentage) => {
      if (percentage >= 80) return "#4caf50"; 
      if (percentage >= 50) return "#ffeb3b"; 
      return "#f44336"; 
    };

    const color = getColor(percentage);

    // Background circle
    svg.innerHTML += `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="#ddd" stroke-width="8"/>`;

    // Progress circle
    svg.innerHTML += `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="0" transform="rotate(-90 ${x} ${y})"/>`;
    
    // Percentage text
    svg.innerHTML += `<text x="${x}" y="${y}" font-size="18" font-weight="bold" text-anchor="middle" dy="6" fill="white">${percentage}%</text>`;

    // Skill label
    svg.innerHTML += `<text x="${x}" y="${
      y + radius + 20
    }" font-size="14" text-anchor="middle" fill="white">${skill}</text>`;
  });
};

const createAuditRatioSvg = (totalDown, totalUp, auditRatio, container) => {
  const svg = container;
  const width = 300;
  const height = 200;
  const barHeight = 15;
  const barWidth = 250;
  const startX = 70;
  const doneY = 50;
  const receivedY = 100;

  svg.innerHTML = "";

  const total = Math.max(totalDown, totalUp); 
  const doneWidth = total ? (totalUp / total) * barWidth : 0;
  const receivedWidth = total ? (totalDown / total) * barWidth : 0;

  svg.innerHTML += `
    <text x="${
      width / 2
    }" y="25" text-anchor="middle" font-size="18" fill="white">Audit Ratio</text>
  `;

  //       "Done" 
  svg.innerHTML += `
    <text x="${startX - 5}" y="${
    doneY + barHeight / 2
  }" text-anchor="end" dominant-baseline="middle" font-size="14" fill="white">Done</text>
    <rect x="${startX}" y="${doneY}" width="${barWidth}" height="${barHeight}" fill="#333" rx="3" ry="3" />
    <rect x="${startX}" y="${doneY}" width="${doneWidth}" height="${barHeight}" fill="#1a54ff" rx="3" ry="3" />
    <text x="${startX + doneWidth + 5}" y="${
    doneY + barHeight / 2
  }" font-size="14" fill="white" dominant-baseline="middle">${totalUp}</text>
  `;

  //      "Received" 
  svg.innerHTML += `
    <text x="${startX - 5}" y="${
    receivedY + barHeight / 2
  }" text-anchor="end" dominant-baseline="middle" font-size="14" fill="white">Received</text>
    <rect x="${startX}" y="${receivedY}" width="${barWidth}" height="${barHeight}" fill="#333" rx="3" ry="3" />
    <rect x="${startX}" y="${receivedY}" width="${receivedWidth}" height="${barHeight}" fill="#b87800" rx="3" ry="3" />
    <text x="${startX + receivedWidth + 5}" y="${
    receivedY + barHeight / 2
  }" font-size="14" fill="white" dominant-baseline="middle">${totalDown}</text>
  `;

  // audit ratio value
  svg.innerHTML += `
    <text x="${
      width / 2
    }" y="170" text-anchor="middle" font-size="16" fill="white">Audit Ratio: ${auditRatio.toFixed(
    2
  )}</text>
  `;
};

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  new ProfileApp();
});

document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const logoutBtn = document.getElementById("logout-btn");
  const authStatus = document.getElementById("auth-status");
  const signupPermissionHint = document.getElementById("signup-permission-hint");

  let currentUser = null;

  function getToken() {
    return localStorage.getItem("authToken");
  }

  function setToken(token) {
    localStorage.setItem("authToken", token);
  }

  function clearToken() {
    localStorage.removeItem("authToken");
  }

  function authHeaders() {
    const token = getToken();
    if (!token) {
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function canManageEnrollments() {
    return (
      currentUser &&
      (currentUser.role === "admin" || currentUser.role === "activity-manager")
    );
  }

  function updateAuthUI() {
    if (!currentUser) {
      authStatus.textContent = "Not logged in";
      loginForm.classList.remove("hidden");
      registerForm.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      signupForm.classList.add("hidden");
      signupPermissionHint.textContent = "Login as admin or activity-manager to register/unregister students.";
      return;
    }

    authStatus.textContent = `Logged in as ${currentUser.email} (${currentUser.role})`;
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    logoutBtn.classList.remove("hidden");

    if (canManageEnrollments()) {
      signupForm.classList.remove("hidden");
      signupPermissionHint.textContent = "You can manage enrollment for all activities.";
    } else {
      signupForm.classList.add("hidden");
      signupPermissionHint.textContent = "Student accounts can only view activity lists and participants.";
    }
  }

  function renderLoginRequired() {
    activitiesList.innerHTML = "<p>Please log in to view activities.</p>";
    activitySelect.innerHTML = "<option value=''>-- Login required --</option>";
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    if (!getToken()) {
      renderLoginRequired();
      return;
    }

    try {
      const response = await fetch("/activities", {
        headers: authHeaders(),
      });

      if (response.status === 401) {
        currentUser = null;
        clearToken();
        updateAuthUI();
        renderLoginRequired();
        showMessage("Session expired. Please log in again.", "error");
        return;
      }

      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=''>-- Select an activity --</option>";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        canManageEnrollments()
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!canManageEnrollments()) {
      showMessage("You do not have permission to unregister students.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!canManageEnrollments()) {
      showMessage("You do not have permission to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      setToken(result.token);
      currentUser = { email: result.email, role: result.role };
      updateAuthUI();
      fetchActivities();
      showMessage("Login successful", "success");
      loginForm.reset();
    } catch (error) {
      showMessage("Failed to log in. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "student" }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Registration failed", "error");
        return;
      }

      showMessage("Registration successful. You can now log in.", "success");
      registerForm.reset();
    } catch (error) {
      showMessage("Failed to register. Please try again.", "error");
      console.error("Error registering:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: authHeaders(),
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    clearToken();
    currentUser = null;
    updateAuthUI();
    renderLoginRequired();
    showMessage("Logged out", "success");
  });

  async function restoreSession() {
    if (!getToken()) {
      updateAuthUI();
      renderLoginRequired();
      return;
    }

    try {
      const response = await fetch("/auth/me", {
        headers: authHeaders(),
      });

      if (!response.ok) {
        clearToken();
        currentUser = null;
        updateAuthUI();
        renderLoginRequired();
        return;
      }

      currentUser = await response.json();
      updateAuthUI();
      fetchActivities();
    } catch (error) {
      clearToken();
      currentUser = null;
      updateAuthUI();
      renderLoginRequired();
      console.error("Error restoring session:", error);
    }
  }

  // Initialize app
  restoreSession();
});

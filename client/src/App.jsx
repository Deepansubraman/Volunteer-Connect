import React, { useState, useEffect } from "react";
import "./App.css";

const API = "http://localhost:5001/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });

  // Data states
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [events, setEvents] = useState([]);

  // Authentication form states
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "volunteer",
    phone: "",
  });

  // Opportunity form
  const [oppForm, setOppForm] = useState({
    title: "",
    description: "",
    type: "",
    location: "",
    date: "",
    duration: "",
    volunteers_needed: "",
  });

  // Show notification
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), 5000);
  };

  // Helper fetch with token
  const authFetch = async (url, options = {}) => {
    setLoading(true);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          ...(options.headers || {}),
        },
      });
      return response;
    } finally {
      setLoading(false);
    }
  };

  // Fetch logged-in user
  useEffect(() => {
    if (token) {
      authFetch(`${API}/me`)
        .then((res) => res.json())
        .then((data) => setUser(data))
        .catch(() => logout());
    }
  }, [token]);

  const handleRegister = async () => {
    if (!authForm.name || !authForm.email || !authForm.password) {
      showNotification("Please fill all required fields", "error");
      return;
    }

    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authForm),
    });

    const data = await res.json();

    if (data.token) {
      setToken(data.token);
      localStorage.setItem("token", data.token);
      setUser(data.user);
      showNotification("Registration successful! Welcome to Volunteer Connect.", "success");
      setPage("home");
    } else {
      showNotification(data.error || "Registration failed", "error");
    }
  };

  const handleLogin = async () => {
    if (!authForm.email || !authForm.password) {
      showNotification("Please enter both email and password", "error");
      return;
    }

    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: authForm.email, password: authForm.password }),
    });

    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      localStorage.setItem("token", data.token);
      setUser(data.user);
      showNotification(`Welcome back, ${data.user.name}!`, "success");
      setPage("home");
    } else {
      showNotification(data.error || "Login failed", "error");
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    setPage("home");
    showNotification("You have been logged out successfully", "info");
  };

  // Fetch all data functions
  const loadOpportunities = () =>
    authFetch(`${API}/opportunities`)
      .then((res) => res.json())
      .then(setOpportunities);

  const loadApplications = () =>
    authFetch(`${API}/applications`)
      .then((res) => res.json())
      .then(setApplications);

  const loadOrganizations = () =>
    authFetch(`${API}/organizations`)
      .then((res) => res.json())
      .then(setOrganizations);

  const loadEvents = () =>
    authFetch(`${API}/events`)
      .then((res) => res.json())
      .then(setEvents);

  const createOpportunity = async () => {
    if (!oppForm.title || !oppForm.description || !oppForm.location) {
      showNotification("Please fill all required fields", "error");
      return;
    }

    const res = await authFetch(`${API}/opportunities`, {
      method: "POST",
      body: JSON.stringify(oppForm),
    });

    const data = await res.json();
    if (res.ok) {
      showNotification("Opportunity created successfully!", "success");
      setOppForm({
        title: "",
        description: "",
        type: "",
        location: "",
        date: "",
        duration: "",
        volunteers_needed: "",
      });
      setPage("opportunities");
    } else {
      showNotification(data.error || "Failed to create opportunity", "error");
    }
  };

  const applyToOpportunity = async (id) => {
    const res = await authFetch(`${API}/applications`, {
      method: "POST",
      body: JSON.stringify({ opportunity_id: id }),
    });

    const data = await res.json();
    if (res.ok) {
      showNotification("Application submitted successfully!", "success");
    } else {
      showNotification(data.error || "Failed to apply", "error");
    }
  };

  // -----------------------------
  // STYLED UI COMPONENTS
  // -----------------------------

  const Notification = () => {
    if (!notification.message) return null;
    
    return (
      <div className={`notification ${notification.type}`}>
        {notification.message}
        <button onClick={() => setNotification({ message: "", type: "" })}>×</button>
      </div>
    );
  };

  const LoadingSpinner = () => (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );

  const Header = () => (
    <header className="header">
      <div className="container">
        <div className="logo" onClick={() => setPage("home")}>
          <span className="logo-icon">🤝</span>
          <h1>VolunteerConnect</h1>
        </div>
        {user && (
          <nav className="nav">
            <button 
              className={`nav-btn ${page === "home" ? "active" : ""}`}
              onClick={() => setPage("home")}
            >
              Dashboard
            </button>
            <button 
              className={`nav-btn ${page === "opportunities" ? "active" : ""}`}
              onClick={() => setPage("opportunities")}
            >
              Opportunities
            </button>
            <button 
              className={`nav-btn ${page === "organizations" ? "active" : ""}`}
              onClick={() => setPage("organizations")}
            >
              Organizations
            </button>
            <button 
              className={`nav-btn ${page === "events" ? "active" : ""}`}
              onClick={() => setPage("events")}
            >
              Events
            </button>
            {user.role === "organization" && (
              <button 
                className={`nav-btn ${page === "createOpportunity" ? "active" : ""}`}
                onClick={() => setPage("createOpportunity")}
              >
                Create Opportunity
              </button>
            )}
            {user.role === "volunteer" && (
              <button 
                className={`nav-btn ${page === "applications" ? "active" : ""}`}
                onClick={() => setPage("applications")}
              >
                My Applications
              </button>
            )}
          </nav>
        )}
        <div className="user-section">
          {user ? (
            <div className="user-menu">
              <span>Welcome, {user.name}</span>
              <button className="profile-btn" onClick={() => setPage("profile")}>
                <span className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                Profile
              </button>
              <button className="logout-btn" onClick={logout}>Logout</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="login-btn" onClick={() => setPage("login")}>Login</button>
              <button className="register-btn" onClick={() => setPage("register")}>Register</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  const Home = () => (
    <div className="page home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Make a Difference in Your Community</h1>
          <p>Connect with local organizations and find meaningful volunteer opportunities that match your skills and interests.</p>
          {!user ? (
            <div className="hero-actions">
              <button className="cta-button primary" onClick={() => setPage("register")}>
                Get Started
              </button>
              <button className="cta-button secondary" onClick={() => setPage("opportunities")}>
                Browse Opportunities
              </button>
            </div>
          ) : (
            <div className="welcome-dashboard">
              <h2>Welcome back, {user.name}!</h2>
              <p>Ready to make an impact today?</p>
              <div className="dashboard-stats">
                <div className="stat-card">
                  <h3>Opportunities</h3>
                  <span className="stat-number">{opportunities.length}</span>
                </div>
                <div className="stat-card">
                  <h3>Organizations</h3>
                  <span className="stat-number">{organizations.length}</span>
                </div>
                {user.role === "volunteer" && (
                  <div className="stat-card">
                    <h3>My Applications</h3>
                    <span className="stat-number">
                      {applications.filter(a => a.user_id === user.id).length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!user && (
        <div className="features-section">
          <div className="container">
            <h2>Why Volunteer With Us?</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🔍</div>
                <h3>Find Perfect Matches</h3>
                <p>Discover opportunities that align with your skills, interests, and schedule.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🏢</div>
                <h3>Trusted Organizations</h3>
                <p>Connect with verified non-profits and community organizations.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3>Easy Management</h3>
                <p>Track your applications and volunteer history in one place.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const AuthForm = ({ isLogin }) => (
    <div className="page auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h2>{isLogin ? "Welcome Back" : "Join VolunteerConnect"}</h2>
          <p className="auth-subtitle">
            {isLogin ? "Sign in to your account" : "Create your account to start volunteering"}
          </p>

          <div className="form-group">
            {!isLogin && (
              <>
                <div className="input-group">
                  <label>Full Name</label>
                  <input
                    placeholder="Enter your full name"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input
                    placeholder="Enter your phone number"
                    value={authForm.phone}
                    onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>I am a</label>
                  <select
                    value={authForm.role}
                    onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                  >
                    <option value="volunteer">Volunteer</option>
                    <option value="organization">Organization</option>
                  </select>
                </div>
              </>
            )}

            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>

            <button 
              className="auth-submit-btn" 
              onClick={isLogin ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
            </button>

            <p className="auth-switch">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                className="link-button" 
                onClick={() => setPage(isLogin ? "register" : "login")}
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const Profile = () => (
    <div className="page profile-page">
      <div className="container">
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h1>{user?.name}</h1>
            <p className="profile-role">{user?.role}</p>
            <p className="profile-email">{user?.email}</p>
          </div>
        </div>

        <div className="profile-details">
          <div className="detail-card">
            <h3>Account Information</h3>
            <div className="detail-item">
              <label>Name</label>
              <span>{user?.name}</span>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <span>{user?.email}</span>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <span>{user?.phone || "Not provided"}</span>
            </div>
            <div className="detail-item">
              <label>Role</label>
              <span className="role-badge">{user?.role}</span>
            </div>
          </div>

          {user?.role === "volunteer" && (
            <div className="detail-card">
              <h3>Volunteer Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">
                    {applications.filter(a => a.user_id === user.id).length}
                  </span>
                  <span className="stat-label">Applications</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {applications.filter(a => a.user_id === user.id && a.status === "approved").length}
                  </span>
                  <span className="stat-label">Approved</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const Opportunities = () => (
    <div className="page opportunities-page">
      <div className="container">
        <div className="page-header">
          <h1>Volunteer Opportunities</h1>
          <p>Find meaningful ways to contribute to your community</p>
          <button className="load-data-btn" onClick={loadOpportunities}>
            Refresh Opportunities
          </button>
        </div>

        <div className="opportunities-grid">
          {opportunities.map((opportunity) => (
            <div key={opportunity.id} className="opportunity-card">
              <div className="opportunity-header">
                <h3>{opportunity.title}</h3>
                <span className="opportunity-type">{opportunity.type}</span>
              </div>
              <p className="opportunity-description">{opportunity.description}</p>
              
              <div className="opportunity-details">
                <div className="detail">
                  <span className="detail-label">📍 Location</span>
                  <span>{opportunity.location}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">📅 Date</span>
                  <span>{opportunity.date}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">⏱️ Duration</span>
                  <span>{opportunity.duration}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">👥 Volunteers Needed</span>
                  <span>{opportunity.volunteers_needed}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">🏢 Organization</span>
                  <span>{opportunity.org_name}</span>
                </div>
              </div>

              {user?.role === "volunteer" && (
                <button 
                  className="apply-btn"
                  onClick={() => applyToOpportunity(opportunity.id)}
                >
                  Apply Now
                </button>
              )}
            </div>
          ))}
        </div>

        {opportunities.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No opportunities found</h3>
            <p>Click "Refresh Opportunities" to load available volunteering opportunities</p>
          </div>
        )}
      </div>
    </div>
  );

  const CreateOpportunity = () => (
    <div className="page create-opportunity-page">
      <div className="container">
        <div className="page-header">
          <h1>Create New Opportunity</h1>
          <p>Post a new volunteer opportunity for your organization</p>
        </div>

        <div className="form-card">
          <div className="form-grid">
            <div className="input-group">
              <label>Opportunity Title *</label>
              <input
                placeholder="e.g., Community Garden Volunteer"
                value={oppForm.title}
                onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Opportunity Type</label>
              <select
                value={oppForm.type}
                onChange={(e) => setOppForm({ ...oppForm, type: e.target.value })}
              >
                <option value="">Select type</option>
                <option value="environmental">Environmental</option>
                <option value="education">Education</option>
                <option value="healthcare">Healthcare</option>
                <option value="community">Community Service</option>
                <option value="animals">Animal Welfare</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="input-group full-width">
              <label>Description *</label>
              <textarea
                placeholder="Describe the volunteer opportunity, responsibilities, and impact..."
                rows="4"
                value={oppForm.description}
                onChange={(e) => setOppForm({ ...oppForm, description: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Location *</label>
              <input
                placeholder="e.g., Central Park, Downtown"
                value={oppForm.location}
                onChange={(e) => setOppForm({ ...oppForm, location: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Date</label>
              <input
                type="date"
                value={oppForm.date}
                onChange={(e) => setOppForm({ ...oppForm, date: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Duration</label>
              <input
                placeholder="e.g., 4 hours, Full day"
                value={oppForm.duration}
                onChange={(e) => setOppForm({ ...oppForm, duration: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Volunteers Needed</label>
              <input
                type="number"
                placeholder="e.g., 10"
                value={oppForm.volunteers_needed}
                onChange={(e) => setOppForm({ ...oppForm, volunteers_needed: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="submit-btn" onClick={createOpportunity}>
              Create Opportunity
            </button>
            <button className="cancel-btn" onClick={() => setPage("home")}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const Organizations = () => (
    <div className="page organizations-page">
      <div className="container">
        <div className="page-header">
          <h1>Partner Organizations</h1>
          <p>Discover organizations making a difference in your community</p>
          <button className="load-data-btn" onClick={loadOrganizations}>
            Load Organizations
          </button>
        </div>

        <div className="organizations-grid">
          {organizations.map((org) => (
            <div key={org.id} className="organization-card">
              <div className="org-avatar">
                {org.name?.charAt(0).toUpperCase()}
              </div>
              <div className="org-info">
                <h3>{org.name}</h3>
                <p className="org-email">{org.email}</p>
                <p className="org-phone">{org.phone || "Phone not provided"}</p>
              </div>
            </div>
          ))}
        </div>

        {organizations.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <h3>No organizations found</h3>
            <p>Click "Load Organizations" to see our partner organizations</p>
          </div>
        )}
      </div>
    </div>
  );

  const Events = () => (
    <div className="page events-page">
      <div className="container">
        <div className="page-header">
          <h1>Upcoming Events</h1>
          <p>Join community events and volunteering activities</p>
          <button className="load-data-btn" onClick={loadEvents}>
            Load Events
          </button>
        </div>

        <div className="events-grid">
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-date">
                <span className="date-day">{new Date(event.date).getDate()}</span>
                <span className="date-month">
                  {new Date(event.date).toLocaleString('default', { month: 'short' })}
                </span>
              </div>
              <div className="event-info">
                <h3>{event.title}</h3>
                <p className="event-description">{event.description}</p>
                <div className="event-meta">
                  <span>📍 {event.location}</span>
                  <span>⏱️ {event.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No events found</h3>
            <p>Click "Load Events" to see upcoming volunteering events</p>
          </div>
        )}
      </div>
    </div>
  );

  const Applications = () => (
    <div className="page applications-page">
      <div className="container">
        <div className="page-header">
          <h1>My Applications</h1>
          <p>Track your volunteer opportunity applications</p>
          <button className="load-data-btn" onClick={loadApplications}>
            Refresh Applications
          </button>
        </div>

        <div className="applications-list">
          {applications
            .filter((a) => a.user_id === user?.id)
            .map((application) => (
              <div key={application.id} className="application-card">
                <div className="application-header">
                  <h3>{application.opportunity_title}</h3>
                  <span className={`status-badge ${application.status}`}>
                    {application.status}
                  </span>
                </div>
                <div className="application-details">
                  <p><strong>Organization:</strong> {application.org_name}</p>
                  <p><strong>Applied on:</strong> {new Date(application.applied_date).toLocaleDateString()}</p>
                  <p><strong>Location:</strong> {application.location}</p>
                </div>
              </div>
            ))}
        </div>

        {applications.filter(a => a.user_id === user?.id).length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No applications yet</h3>
            <p>Apply to volunteer opportunities to see them here</p>
            <button 
              className="cta-button primary" 
              onClick={() => setPage("opportunities")}
            >
              Browse Opportunities
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const pages = {
    home: <Home />,
    login: <AuthForm isLogin={true} />,
    register: <AuthForm isLogin={false} />,
    profile: <Profile />,
    opportunities: <Opportunities />,
    applications: <Applications />,
    organizations: <Organizations />,
    events: <Events />,
    createOpportunity: <CreateOpportunity />,
  };

  return (
    <div className="app">
      <Header />
      <Notification />
      {loading && <LoadingSpinner />}
      {pages[page]}
    </div>
  );
}
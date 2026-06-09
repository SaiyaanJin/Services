import React from "react";
import { BrowserRouter as Router, Route, Link, Routes, useLocation } from "react-router-dom";
import { ProgressSpinner } from "primereact/progressspinner";

// Global Stylesheets
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";
import "./App.css";

// Context & Pages
import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import TicketListPage from "./pages/TicketListPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import NewTicketPage from "./pages/NewTicketPage";
import DepartmentPage from "./pages/DepartmentPage";

// Main layout wrapper to access useAuth hook
const AppLayout = () => {
	const { isAuthenticated, authLoading, token, logout } = useAuth();
	const location = useLocation();

	if (authLoading) {
		return (
			<div className="flex flex-column justify-content-center align-items-center w-full min-h-screen bg-slate-50 gap-3">
				<ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" fill="var(--surface-ground)" animationDuration=".5s" />
				<span className="text-lg font-semibold text-600">Verifying session with SSO...</span>
			</div>
		);
	}

	// Helper to determine if link is active
	const isActive = (path) => {
		return location.pathname === path;
	};

	const tokenQuery = token ? `?token=${token}` : "";

	return (
		<div className="routes">
			{isAuthenticated ? (
				<div className="app-layout">
					{/* Left Sidebar */}
					<aside className="sidebar">
						{/* Logo and Brand Title */}
						<div className="sidebar-brand">
							<div className="logo-icon-box" style={{ background: 'transparent', border: 'none', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
								<img src="/GI-Logo1.png" alt="Grid India Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
							</div>
							<div className="brand-info">
								<div className="sidebar-title">ERLDC SRP</div>
							</div>
						</div>

						{/* Sidebar Navigation */}
						<nav className="sidebar-nav" style={{ marginTop: '20px' }}>
							<ul>
								<li>
									<Link
										to={"/" + tokenQuery}
										className={isActive("/") ? "active-link" : ""}
									>
										<i className="pi pi-ticket" />
										<span>Overview</span>
									</Link>
								</li>

								<li>
									<Link
										to={"/Input" + tokenQuery}
										className={isActive("/Input") ? "active-link" : ""}
									>
										<i className="pi pi-plus" />
										<span>New Ticket</span>
									</Link>
								</li>

								<li>
									<Link
										to={"/Data" + tokenQuery}
										className={isActive("/Data") || location.pathname.startsWith("/ticket") ? "active-link" : ""}
									>
										<i className="pi pi-th-large" />
										<span>Tickets</span>
									</Link>
								</li>

								<li>
									<Link
										to={"/Department" + tokenQuery}
										className={isActive("/Department") ? "active-link" : ""}
									>
										<i className="pi pi-file" />
										<span>Reports</span>
									</Link>
								</li>
							</ul>
						</nav>
						<div className="sidebar-profile-bottom">
							<button className="p-button p-button-text logout-btn" onClick={logout}>
								<i className="pi pi-sign-out" />
								<span>Logout</span>
							</button>
						</div>
					</aside>

					{/* Main Right Content Panel */}
					<div className="main-content">
						{/* Scrollable Page Content Frame */}
						<main className={`page-content ${location.pathname === "/" ? "dashboard-page-content" : ""} ${location.pathname.startsWith("/Department") ? "department-page-content" : ""} ${location.pathname.startsWith("/ticket") ? "ticket-detail-page-content" : ""}`}>
							<Routes>
								<Route exact path="/" element={<DashboardPage />} />
								<Route exact path="/Data" element={<TicketListPage />} />
								<Route exact path="/ticket/:docketNumber" element={<TicketDetailPage />} />
								<Route exact path="/Input" element={<NewTicketPage />} />
								<Route exact path="/Department" element={<DepartmentPage />} />
							</Routes>
						</main>
					</div>
				</div>
			) : (
				<div className="login-layout">
					<Routes>
						<Route exact path="/" element={<DashboardPage />} />
						<Route exact path="/Data" element={<TicketListPage />} />
						<Route exact path="/ticket/:docketNumber" element={<TicketDetailPage />} />
						<Route exact path="/Input" element={<NewTicketPage />} />
						<Route exact path="/Department" element={<DepartmentPage />} />
					</Routes>
				</div>
			)}
		</div>
	);
};

function App() {
	return (
		<Router>
			<AuthProvider>
				<AppLayout />
			</AuthProvider>
		</Router>
	);
}

export default App;

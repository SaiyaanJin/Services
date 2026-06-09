import React from "react";
import { BrowserRouter as Router, Route, Link, Routes, useLocation, useNavigate } from "react-router-dom";
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
import { getInitials, getAvatarColorClass } from "./utils/ticketHelpers";


// Main layout wrapper to access useAuth hook
const AppLayout = () => {
	const { isAuthenticated, authLoading, token, logout, user } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();

	// Search handler synchronized with URL search parameters
	const searchParams = new URLSearchParams(location.search);
	const searchQuery = searchParams.get("search") || "";

	const handleSearchChange = (e) => {
		const val = e.target.value;
		const params = new URLSearchParams(location.search);
		if (val) {
			params.set("search", val);
		} else {
			params.delete("search");
		}
		
		if (location.pathname !== "/Data") {
			navigate(`/Data?${params.toString()}`);
		} else {
			navigate(`/Data?${params.toString()}`, { replace: true });
		}
	};

	// Ctrl+K keyboard shortcut to focus search input
	React.useEffect(() => {
		const handleKeyDown = (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				const searchInput = document.querySelector(".search-input");
				if (searchInput) {
					searchInput.focus();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);


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
						<div className="sidebar-profile-bottom" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
							{user && (() => {
								const initials = getInitials(user.name);
								const avatarColors = getAvatarColorClass(user.name);
								return (
									<>
										<div 
											className="profile-avatar" 
											style={{
												width: '36px',
												height: '36px',
												borderRadius: '50%',
												backgroundColor: avatarColors.bg,
												color: avatarColors.text,
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												fontWeight: '700',
												fontSize: '0.85rem',
												flexShrink: 0
											}}
										>
											{initials}
										</div>
										<div className="profile-info" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
											<span className="profile-name" style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
												{user.name}
											</span>
											<span className="profile-dept" style={{ color: '#94a3b8', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
												{user.department}
											</span>
										</div>
										<button 
											className="profile-chevron logout-btn" 
											onClick={logout} 
											title="Logout"
											style={{
												background: 'transparent',
												border: 'none',
												color: '#94a3b8',
												cursor: 'pointer',
												padding: '4px',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												transition: 'color 0.2s',
												marginLeft: 'auto'
											}}
										>
											<i className="pi pi-sign-out" style={{ fontSize: '1rem' }} />
										</button>
									</>
								);
							})()}
						</div>
					</aside>

					{/* Main Right Content Panel */}
					<div className="main-content">
						<header className="top-header">
							<div className="page-title">
								{location.pathname === "/" && "Dashboard"}
								{location.pathname === "/Data" && "Service Requests"}
								{location.pathname === "/Input" && "New Request"}
								{location.pathname === "/Department" && "Department Reports"}
								{location.pathname.startsWith("/ticket") && "Request Details"}
							</div>
							<div className="header-search">
								<i className="pi pi-search search-icon" />
								<input 
									type="text" 
									className="search-input" 
									placeholder="Search ticket, subject, dept..."
									value={searchQuery}
									onChange={handleSearchChange}
								/>
								<span className="search-shortcut">Ctrl+K</span>
							</div>
							<div style={{ width: '40px' }} />
						</header>
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

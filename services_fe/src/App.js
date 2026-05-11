import { useState } from "react";
import React from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import { Avatar } from "primereact/avatar";

// Global PrimeReact Stylesheets
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";
import "./App.css";

import Data from "./Components/Data";
import Input from "./Components/Input";
import Dashboard from "./Components/Dashboard";
import Department from "./Components/Department";

function App() {
	const [Dash, setDash] = useState(true);
	const [DataShow, setDataShow] = useState(true);
	const [InputShow, setInputShow] = useState(true);
	const [DeptShow, setDeptShow] = useState(true);
	const [Token, setToken] = useState("");

	return (
		<div className="routes">
			<Router>
				{/* Modern Header Banner */}
				<div className="shadow-class">
					<img src="GI-Nav1.jpg" alt="Grid Controller of India" />
					<div style={{ paddingRight: "24px", fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--primary-dark)", fontSize: "1.1rem" }}>
						Service Request Portal
					</div>
				</div>
				
				{/* Floating Glassmorphic Top Navbar */}
				<div
					className="list"
					hidden={Dash && DataShow && InputShow && DeptShow}
				>
					<ul>
						<li>
							<Link to={"/?token=" + Token}>
								<Avatar
									icon="pi pi-home"
									style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontWeight: "bold" }}
									shape="circle"
								/>
								<span>Dashboard</span>
							</Link>
						</li>

						<li>
							<Link to={"Input?token=" + Token}>
								<Avatar
									icon="pi pi-pencil"
									style={{ backgroundColor: "rgba(79, 70, 229, 0.15)", color: "#4f46e5", fontWeight: "bold" }}
									shape="circle"
								/>
								<span>New Service Request</span>
							</Link>
						</li>

						<li>
							<Link to={"Data?token=" + Token}>
								<Avatar
									icon="pi pi-users"
									style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", fontWeight: "bold" }}
									shape="circle"
								/>
								<span>Logged Requests</span>
							</Link>
						</li>

						<li>
							<Link to={"Department?token=" + Token}>
								<Avatar
									icon="pi pi-sitemap"
									style={{ backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6", fontWeight: "bold" }}
									shape="circle"
								/>
								<span>Department Data</span>
							</Link>
						</li>

						<li>
							<Link to={"https://sso.erldc.in:3000"} style={{ marginLeft: "auto" }}>
								<Avatar
									icon="pi pi-sign-out"
									style={{ backgroundColor: "rgba(244, 63, 94, 0.15)", color: "#f43f5e", fontWeight: "bold" }}
									shape="circle"
								/>
								<span style={{ color: "#f43f5e" }}>Logout</span>
							</Link>
						</li>
					</ul>
				</div>

				<Routes>
					<Route
						exact
						path="/"
						element={<Dashboard var1={setDash} var2={setToken} />}
					/>
					<Route exact path="Data" element={<Data var3={setDataShow} />} />
					<Route exact path="Input" element={<Input var4={setInputShow} />} />
					<Route
						exact
						path="Department"
						element={<Department var5={setDeptShow} />}
					/>
				</Routes>
			</Router>
		</div>
	);
}

export default App;


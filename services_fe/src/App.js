import { useState } from "react";
import { Avatar } from "primereact/avatar";
import React from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import "./App.css";
import "primeicons/primeicons.css";
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
	// console.log(Dash, DataShow, InputShow, DeptShow);

	return (
		<div className="routes">
			<div className="shadow-class" style={{ marginTop: ".2%", marginBottom: "2%" }}><img src="GI-Nav1.jpg" alt="posoco" style={{ width: "100%" }} /></div>
			
			<Router>
				<div
					className="list"
					style={{ fontSize: "x-small", marginTop: "1%", marginBottom: "-1%" }}
				>
					<ul hidden={Dash && DataShow && InputShow && DeptShow}>
						<Link to={"/?token=" + Token}>
							<Avatar
								icon="pi pi-home"
								style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
								shape="circle"
							/>
							Dashboard
						</Link>

						<Link to={"Input?token=" + Token}>
							<Avatar
								icon="pi pi-pencil"
								style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
								shape="circle"
							/>
							Service Request Input
						</Link>

						<Link to={"Data?token=" + Token}>
							<span style={{ fontSize: "25px" }}></span>
							<Avatar
								icon="pi pi-users"
								style={{ backgroundColor: "#efff12", color: "#000000" }}
								shape="circle"
							/>
							Your Logged Data
						</Link>
						<Link to={"Department?token=" + Token}>
							<Avatar
								icon="pi pi-sitemap"
								style={{ backgroundColor: "#000000", color: "#ffffff" }}
								shape="circle"
							/>
							Show Department Data
						</Link>

						<Link to={"https://sso.erldc.in:3000"}>
							<Avatar
								icon="pi pi-sign-out"
								style={{ backgroundColor: "#ff3e1f", color: "#ffffff" }}
								shape="circle"
							/>
							Logout
						</Link>
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

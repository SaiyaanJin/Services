import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Fieldset } from "primereact/fieldset";
import { Toast } from "primereact/toast";
import {jwtDecode} from "jwt-decode";
import { useLocation } from "react-router-dom";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { OrganizationChart } from "primereact/organizationchart";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Avatar } from "primereact/avatar";
import { Divider } from "primereact/divider";
import { Button } from "primereact/button";
import "../cssfiles/Animation.css";

function Dashboard(params) {
	const search = useLocation().search;
	const id = new URLSearchParams(search).get("token");
	const [page_hide, setpage_hide] = useState(true);
	params.var1(page_hide);
	const toast = useRef();
	const [data, setdata] = useState();
	const [User_id, setUser_id] = useState();
	const [Person_Name, setPerson_Name] = useState();
	const [Department, setDepartment] = useState();
	const [count, setcount] = useState(true);
	const [expandedRows, setExpandedRows] = useState([]);
	const [emp_data, setemp_data] = useState([]);
	const [isAdmin, setisAdmin] = useState(false);
	const [AdminChecked, setAdminChecked] = useState(false);
	const [authLoading, setAuthLoading] = useState(true);

	const [globalFilterValue, setGlobalFilterValue] = useState("");

	const [filters, setFilters] = useState({
		global: { value: null, matchMode: FilterMatchMode.CONTAINS },
		Name: {
			operator: FilterOperator.AND,
			constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
		},
		Emp_id: {
			operator: FilterOperator.AND,
			constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
		},
		Department: {
			operator: FilterOperator.AND,
			constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
		},
		Mail: {
			operator: FilterOperator.AND,
			constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
		},
		Mobile: {
			operator: FilterOperator.AND,
			constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
		},
	});

	const onGlobalFilterChange = (e) => {
		const value = e.target.value;
		let _filters = { ...filters };

		_filters["global"].value = value;

		setFilters(_filters);
		setGlobalFilterValue(value);
	};

	useEffect(() => {
		try {
			axios
				.get("https://sso.erldc.in:5000/emp_data", {
					headers: { Data: "Sanju8@92" },
				})
				.then((response) => {
					setemp_data(response.data);
				})
				.catch((error) => {
					console.error("Error fetching employee data:", error);
					setemp_data([]);
				});
		} catch (error) {
			console.error("Unexpected error:", error);
			setemp_data([]);
		}

		if (id) {
			params.var2(id);

			axios
				.get("https://sso.erldc.in:5000/verify", {
					headers: { Token: id },
				})
				.then((response) => {
					if (response.data === "User has logout") {
						alert("User Logged-out, Please login via SSO again");
						window.location = "https://sso.erldc.in";
						setpage_hide(true);
						setAuthLoading(false);
					} else if (response.data === "Bad Token") {
						alert("Unauthorised Access, Please login via SSO again");
						window.location = "https://sso.erldc.in";
						setpage_hide(true);
						setAuthLoading(false);
					} else {
						var decoded = jwtDecode(response.data["Final_Token"], "it@posoco");

						if (!decoded["Login"] && decoded["Reason"] === "Session Expired") {
							alert("Session Expired, Please Login Again via SSO");

							axios
								.post("https://sso.erldc.in:5000/logout", {
									headers: { token: id },
								})
								.then((response) => {
									window.location = "https://sso.erldc.in";
								})
								.catch((error) => {})
								.finally(() => setAuthLoading(false));
							window.location = "https://sso.erldc.in";
						} else {
							setUser_id(decoded["User"]);
							setpage_hide(!decoded["Login"]);
							setPerson_Name(decoded["Person_Name"]);

							if (
								decoded["Department"] === "IT-TS" ||
								decoded["Department"] === "IT"
							) {
								setDepartment("Information Technology (IT)");
							}
							if (
								decoded["Department"] === "MO" ||
								decoded["Department"] === "MO-I" ||
								decoded["Department"] === "MO-II" ||
								decoded["Department"] === "MO-III" ||
								decoded["Department"] === "MO-IV"
							) {
								setDepartment("Market Operation (MO)");
							}
							if (
								decoded["Department"] === "MIS" ||
								decoded["Department"] === "SS" ||
								decoded["Department"] === "CR" ||
								decoded["Department"] === "SO"
							) {
								setDepartment("System Operation (SO)");
							}

							if (decoded["Department"] === "SCADA") {
								setDepartment("SCADA");
							}
							if (decoded["Department"] === "CS") {
								setDepartment("Contracts & Services (CS)");
							}
							if (decoded["Department"] === "TS") {
								setDepartment("Technical Services (TS)");
							}

							if (decoded["Department"] === "HR") {
								setDepartment("Human Resource (HR)");
							}
							if (decoded["Department"] === "COMMUNICATION") {
								setDepartment("Communication");
							}
							if (decoded["Department"] === "F&A") {
								setDepartment("Finance & Accounts (F&A)");
							}
							if (decoded["Department"] === "CR") {
								setDepartment("Control Room (CR)");
							}

							if (
								decoded["User"] === "00162" &&
								decoded["Person_Name"] === "Sanjay Kumar"
							) {
								setisAdmin(true);
							} else {
								setisAdmin(false);
							}
							setAuthLoading(false);
						}
					}
				})
				.catch((error) => {
					setpage_hide(true);
					setAuthLoading(false);
				});
		} else {
			setpage_hide(true);
			params.var2("Invalid_Token");
			setAuthLoading(false);
		}
		if (Person_Name && User_id && count) {
			// showInfo(Person_Name + " (" + User_id + ")");
			setcount(false);

			axios
				.get("http://10.3.230.62:5050/Dashboard", {
					headers: { Data: Person_Name + " (" + User_id + ")" },
				})
				.then((response) => {
					setdata(response.data);
				})
				.catch((error) => {});
		}
	}, [User_id, page_hide, Person_Name, Department]);

	const showInfo = (v) => {
		toast.current.show({
			severity: "info",
			summary: v,
			detail: "Logged In",
			life: 4000,
		});
	};

	const headerTemplate = (data) => {
		return (
			<React.Fragment>
				<span className="vertical-align-middle ml-2 font-bold line-height-3">
					{data.Department}
				</span>
			</React.Fragment>
		);
	};

	return (
		<>
			{/* Custom Styled SSO Loading Indicator */}
			<div hidden={!authLoading} className="flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
				<div className="text-center">
					<i className="pi pi-spin pi-spinner" style={{ fontSize: "3rem", color: "var(--primary-color)" }}></i>
					<p style={{ marginTop: "16px", color: "var(--text-muted)", fontFamily: "var(--font-heading)", fontWeight: "500" }}>Securing your session...</p>
				</div>
			</div>

			{/* Custom Styled SSO Login Prompt */}
			<div hidden={authLoading || !page_hide} className="flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
				<div className="premium-card text-center" style={{ maxWidth: "480px", padding: "40px" }}>
					<Avatar icon="pi pi-lock" size="xlarge" shape="circle" style={{ backgroundColor: "rgba(244, 63, 94, 0.1)", color: "var(--danger-color)", width: "80px", height: "80px", fontSize: "36px", margin: "0 auto 24px auto" }} />
					<h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "12px", color: "var(--text-main)" }}>Authentication Required</h2>
					<p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "32px" }}>
						Your session has expired or is unauthorized. Please log in securely via the Single Sign-On (SSO) gateway.
					</p>
					<Button 
						label="Go to SSO Login" 
						icon="pi pi-sign-in" 
						className="p-button-danger w-full"
						onClick={() => window.location = "https://sso.erldc.in"}
					/>
				</div>
			</div>

			<div hidden={authLoading || page_hide} style={{ padding: "16px 2.2% 40px 2.2%" }}>
				{/* Welcome Hero Area */}
				<div className="premium-card welcome-hero" style={{
					background: "linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%)",
					color: "#ffffff",
					borderRadius: "var(--border-radius-lg)",
					padding: "32px 40px",
					marginBottom: "32px",
					boxShadow: "var(--shadow-lg)",
					position: "relative",
					overflow: "hidden",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between"
				}}>
					<div style={{ zIndex: 1 }}>
						<span style={{
							backgroundColor: "rgba(255, 255, 255, 0.18)",
							backdropFilter: "blur(4px)",
							padding: "6px 16px",
							borderRadius: "99px",
							fontSize: "0.75rem",
							fontWeight: 700,
							letterSpacing: "1.2px",
							textTransform: "uppercase"
						}}>ERLDC Portal &bull; Active Session</span>
						<h2 style={{ color: "#ffffff", fontSize: "2.2rem", marginTop: "12px", marginBottom: "8px", fontWeight: 800, fontFamily: "var(--font-heading)" }}>
							Welcome, Sh. {Person_Name}
						</h2>
						<p style={{ margin: 0, opacity: 0.9, fontSize: "1.05rem" }}>
							Employee ID: <strong style={{ color: "#fef08a" }}>{User_id}</strong> &bull; Department: <strong>{Department || "Unassigned"}</strong>
						</p>
					</div>
					<div style={{
						zIndex: 1,
						display: "flex",
						alignItems: "center",
						gap: "16px"
					}}>
						<Avatar 
							icon="pi pi-user" 
							size="large" 
							shape="circle" 
							style={{ 
								backgroundColor: "rgba(255,255,255,0.22)", 
								color: "#ffffff", 
								width: "72px", 
								height: "72px", 
								fontSize: "28px",
								border: "2px solid rgba(255,255,255,0.4)"
							}} 
						/>
					</div>
					{/* Decorative backdrop shapes */}
					<div style={{
						position: "absolute",
						top: "-40%",
						right: "-5%",
						width: "350px",
						height: "350px",
						borderRadius: "50%",
						background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
						pointerEvents: "none"
					}}></div>
					<div style={{
						position: "absolute",
						bottom: "-50%",
						left: "10%",
						width: "200px",
						height: "200px",
						borderRadius: "50%",
						background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)",
						pointerEvents: "none"
					}}></div>
				</div>

				{/* Department Data Table Card */}
				<div className="premium-card" style={{ marginBottom: "40px" }}>
					<div className="flex align-items-center gap-3 mb-4" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
						<Avatar
							icon="pi pi-sitemap"
							style={{ backgroundColor: "rgba(79, 70, 229, 0.1)", color: "var(--primary-color)" }}
							shape="square"
						/>
						<div>
							<h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Department Data Summary</h3>
							<span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Overview of request volumes across specialized departments</span>
						</div>
					</div>

					<DataTable
						tableStyle={{ minWidth: "50rem" }}
						className="p-datatable-striped"
						removableSort
						value={data}
						showGridlines
					>
						<Column
							style={{ fontWeight: "700", color: "var(--text-main)" }}
							field="Department"
							header="Department Name"
							sortable
							dataType="text"
						></Column>
						<Column
							alignHeader="center"
							align={"center"}
							field="Total"
							header="Total Services"
							sortable
							dataType="numeric"
							body={(rowData) => (
								<Tag value={rowData.Total} style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#2563eb", fontWeight: "700", fontSize: "0.9rem", padding: "4px 12px", borderRadius: "99px" }} />
							)}
						></Column>
						<Column
							alignHeader="center"
							align={"center"}
							field="Resolved"
							header="Resolved Services"
							sortable
							dataType="numeric"
							body={(rowData) => (
								<Tag value={rowData.Resolved} style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#059669", fontWeight: "700", fontSize: "0.9rem", padding: "4px 12px", borderRadius: "99px" }} />
							)}
						></Column>
						<Column
							alignHeader="center"
							align={"center"}
							field="Pending"
							header="Pending Services"
							sortable
							dataType="numeric"
							body={(rowData) => (
								<Tag value={rowData.Pending} style={{ backgroundColor: "rgba(244, 63, 94, 0.15)", color: "#e11d48", fontWeight: "700", fontSize: "0.9rem", padding: "4px 12px", borderRadius: "99px" }} />
							)}
						></Column>
					</DataTable>
				</div>

				{/* Employee Details Card */}
				<div className="premium-card">
					<div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-4 mb-4" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
						<div className="flex align-items-center gap-3">
							<Avatar
								icon="pi pi-users"
								style={{ backgroundColor: "rgba(139, 92, 246, 0.1)", color: "var(--accent-color)" }}
								shape="square"
							/>
							<div>
								<h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Employee Directory</h3>
								<span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Searchable database of ERLDC personnel grouped by department</span>
							</div>
						</div>
						
						{/* Custom Styled Search Box */}
						<div className="p-inputgroup" style={{ maxWidth: "320px", borderRadius: "99px", overflow: "hidden" }}>
							<span className="p-inputgroup-addon" style={{ backgroundColor: "var(--bg-color)", border: "1px solid var(--border-color)", borderRight: "none", paddingLeft: "16px" }}>
								<i className="pi pi-search" style={{ color: "var(--text-muted)" }} />
							</span>
							<InputText
								value={globalFilterValue}
								onChange={onGlobalFilterChange}
								placeholder="Search Employees..."
								style={{ borderLeft: "none" }}
							/>
						</div>
					</div>

					<DataTable
						filters={filters}
						globalFilterFields={[
							"Name",
							"Emp_id",
							"Department",
							"Mail",
							"Mobile",
						]}
						emptyMessage="No personnel match your search criteria."
						rows={8}
						paginator
						rowsPerPageOptions={[8, 12, 24]}
						scrollable
						scrollHeight="600px"
						value={emp_data}
						rowGroupMode="subheader"
						groupRowsBy="Department"
						sortMode="single"
						sortField="Department"
						sortOrder={1}
						expandableRowGroups
						expandedRows={expandedRows}
						onRowToggle={(e) => setExpandedRows(e.data)}
						rowGroupHeaderTemplate={(rowData) => (
							<div className="flex align-items-center gap-2 font-bold py-1 px-2" style={{ color: "var(--primary-color)" }}>
								<i className="pi pi-folder-open" />
								<span>{rowData.Department}</span>
							</div>
						)}
						showGridlines
					>
						<Column
							field="Department"
							header="Department"
							style={{ width: "20%" }}
							frozen
						></Column>
						<Column
							field="Name"
							header="Employee Name"
							style={{ width: "20%", fontWeight: "600", color: "var(--text-main)" }}
						></Column>
						<Column
							field="Emp_id"
							header="Employee ID"
							style={{ width: "15%" }}
						></Column>
						<Column
							field="Mail"
							header="E-Mail Address"
							style={{ width: "25%", color: "var(--primary-color)" }}
							body={(rowData) => (
								<span style={{ borderBottom: "1px dashed rgba(79, 70, 229, 0.4)", cursor: "pointer" }}>{rowData.Mail}</span>
							)}
						></Column>
						<Column
							field="Mobile"
							header="Contact Number"
							style={{ width: "20%" }}
						></Column>
					</DataTable>
				</div>
			</div>
			
			<Toast ref={toast} />
		</>
	);
}

export default Dashboard;

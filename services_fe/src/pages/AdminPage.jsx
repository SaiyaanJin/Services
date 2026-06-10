import React, { useEffect, useState, useRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api";
import { TableSkeleton, MetricsSkeleton } from "../components/common/SkeletonLoader";

const AdminPage = () => {
	const { user } = useAuth();
	const toast = useRef(null);
	const [activeTab, setActiveTab] = useState("overview");

	// State lists
	const [users, setUsers] = useState([]);
	const [userSearchQuery, setUserSearchQuery] = useState("");
	const [templates, setTemplates] = useState([]);
	const [tags, setTags] = useState([]);
	const [slaPolicies, setSlaPolicies] = useState([]);
	const [recurringSchedules, setRecurringSchedules] = useState([]);
	
	// Stats state
	const [stats, setStats] = useState(null);
	const [loadingStats, setLoadingStats] = useState(true);

	// General Loading state
	const [loadingTab, setLoadingTab] = useState(false);

	// Creation Modal / Form states
	const [templateDialog, setTemplateDialog] = useState(false);
	const [newTemplate, setNewTemplate] = useState({ name: "", department: "", default_subject: "", default_description: "" });

	const [tagDialog, setTagDialog] = useState(false);
	const [newTag, setNewTag] = useState({ name: "", color: "#6366f1" });

	const [slaDialog, setSlaDialog] = useState(false);
	const [selectedSla, setSelectedSla] = useState({ department: "", sla_hours: 48 });

	const [recurringDialog, setRecurringDialog] = useState(false);
	const [newRecurring, setNewRecurring] = useState({ template_id: "", cron_schedule: "daily", priority: "Medium", tags: [] });

	const [announcement, setAnnouncement] = useState({ subject: "", body: "" });
	const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

	const departmentsList = [
		{ label: "Information Technology", value: "Information Technology" },
		{ label: "Contracts & Services", value: "Contracts & Services" },
		{ label: "Human Resource", value: "Human Resource" },
		{ label: "Finance & Accounts", value: "Finance & Accounts" },
		{ label: "Communication", value: "Communication" },
		{ label: "SCADA", value: "SCADA" },
		{ label: "Technical Services", value: "Technical Services" },
		{ label: "Market Operation", value: "Market Operation" },
		{ label: "System Operation", value: "System Operation" }
	];

	const cronOptions = [
		{ label: "Hourly", value: "hourly" },
		{ label: "Daily", value: "daily" },
		{ label: "Weekly", value: "weekly" },
		{ label: "Monthly", value: "monthly" }
	];

	const priorityOptions = [
		{ label: "Critical", value: "Critical" },
		{ label: "High", value: "High" },
		{ label: "Medium", value: "Medium" },
		{ label: "Low", value: "Low" }
	];

	// Load Tab Data
	useEffect(() => {
		setUserSearchQuery("");
		if (activeTab === "overview") {
			setLoadingStats(true);
			apiClient.get("/admin/stats/full")
				.then(res => setStats(res.data))
				.catch(err => console.error("Stats fetch error:", err))
				.finally(() => setLoadingStats(false));
		} else if (activeTab === "users") {
			setLoadingTab(true);
			Promise.all([apiClient.get("/admin/users"), apiClient.get("/admin/roles")])
				.then(([usersRes, rolesRes]) => {
					const employees = usersRes.data || [];
					const roles = rolesRes.data || [];
					const merged = employees.map(emp => {
						const customRole = roles.find(r => r.emp_id === emp.emp_id);
						return {
							...emp,
							role: customRole ? customRole.role : (emp.emp_id === "00162" || emp.emp_id === "60004" ? "admin" : "user")
						};
					});
					setUsers(merged);
				})
				.catch(() => toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to load users" }))
				.finally(() => setLoadingTab(false));
		} else if (activeTab === "templates") {
			setLoadingTab(true);
			apiClient.get("/admin/templates")
				.then(res => setTemplates(res.data || []))
				.catch(() => toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to load templates" }))
				.finally(() => setLoadingTab(false));
		} else if (activeTab === "tags") {
			setLoadingTab(true);
			apiClient.get("/admin/tags")
				.then(res => setTags(res.data || []))
				.catch(() => toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to load tags" }))
				.finally(() => setLoadingTab(false));
		} else if (activeTab === "sla") {
			setLoadingTab(true);
			apiClient.get("/sla/policies")
				.then(res => setSlaPolicies(res.data || []))
				.catch(() => toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to load SLA policies" }))
				.finally(() => setLoadingTab(false));
		} else if (activeTab === "recurring") {
			setLoadingTab(true);
			Promise.all([apiClient.get("/admin/recurring"), apiClient.get("/admin/templates")])
				.then(([recRes, tempRes]) => {
					setRecurringSchedules(recRes.data || []);
					setTemplates(tempRes.data || []);
				})
				.catch(() => toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to load recurring tickets" }))
				.finally(() => setLoadingTab(false));
		}
	}, [activeTab]);

	// User Promotion/Demotion
	const toggleUserRole = async (rowData) => {
		const newRole = rowData.role === "admin" ? "user" : "admin";
		try {
			await apiClient.post("/admin/roles", {
				emp_id: rowData.emp_id,
				name: rowData.name,
				role: newRole
			});
			toast.current?.show({
				severity: "success",
				summary: "Role Updated",
				detail: `Successfully set ${rowData.name} role to ${newRole}`
			});
			// Refresh list
			setUsers(users.map(u => u.emp_id === rowData.emp_id ? { ...u, role: newRole } : u));
		} catch (err) {
			toast.current?.show({ severity: "error", summary: "Action Failed", detail: "Could not modify role" });
		}
	};

	// Create/Delete Template
	const handleCreateTemplate = async () => {
		if (!newTemplate.name || !newTemplate.department || !newTemplate.default_subject) return;
		try {
			await apiClient.post("/admin/templates", newTemplate);
			toast.current?.show({ severity: "success", summary: "Template Created", detail: "Created new ticket template" });
			setTemplateDialog(false);
			setNewTemplate({ name: "", department: "", default_subject: "", default_description: "" });
			// Refresh list
			const res = await apiClient.get("/admin/templates");
			setTemplates(res.data || []);
		} catch {
			toast.current?.show({ severity: "error", summary: "Create Failed", detail: "Could not create template" });
		}
	};

	const handleDeleteTemplate = async (id) => {
		try {
			await apiClient.delete(`/admin/templates/${id}`);
			toast.current?.show({ severity: "success", summary: "Template Deleted" });
			setTemplates(templates.filter(t => t.id !== id));
		} catch {
			toast.current?.show({ severity: "error", summary: "Delete Failed", detail: "Could not delete template" });
		}
	};

	// Create/Delete Tag
	const handleCreateTag = async () => {
		if (!newTag.name) return;
		try {
			await apiClient.post("/admin/tags", newTag);
			toast.current?.show({ severity: "success", summary: "Tag Created" });
			setTagDialog(false);
			setNewTag({ name: "", color: "#6366f1" });
			const res = await apiClient.get("/admin/tags");
			setTags(res.data || []);
		} catch (err) {
			toast.current?.show({ severity: "error", summary: "Create Failed", detail: err.response?.data?.detail || "Could not create tag" });
		}
	};

	const handleDeleteTag = async (id) => {
		try {
			await apiClient.delete(`/admin/tags/${id}`);
			toast.current?.show({ severity: "success", summary: "Tag Deleted" });
			setTags(tags.filter(t => t.id !== id));
		} catch {
			toast.current?.show({ severity: "error", summary: "Delete Failed" });
		}
	};

	// Update SLA
	const handleUpdateSla = async () => {
		if (!selectedSla.department) return;
		try {
			await apiClient.put("/sla/policies", selectedSla);
			toast.current?.show({ severity: "success", summary: "SLA Policy Updated" });
			setSlaDialog(false);
			const res = await apiClient.get("/sla/policies");
			setSlaPolicies(res.data || []);
		} catch {
			toast.current?.show({ severity: "error", summary: "Update Failed" });
		}
	};

	// Create/Delete Recurring
	const handleCreateRecurring = async () => {
		if (!newRecurring.template_id) return;
		try {
			await apiClient.post("/admin/recurring", newRecurring);
			toast.current?.show({ severity: "success", summary: "Recurring Ticket Configured" });
			setRecurringDialog(false);
			setNewRecurring({ template_id: "", cron_schedule: "daily", priority: "Medium", tags: [] });
			const res = await apiClient.get("/admin/recurring");
			setRecurringSchedules(res.data || []);
		} catch {
			toast.current?.show({ severity: "error", summary: "Creation Failed" });
		}
	};

	const handleDeleteRecurring = async (id) => {
		try {
			await apiClient.delete(`/admin/recurring/${id}`);
			toast.current?.show({ severity: "success", summary: "Recurring Schedule Removed" });
			setRecurringSchedules(recurringSchedules.filter(s => s.id !== id));
		} catch {
			toast.current?.show({ severity: "error", summary: "Delete Failed" });
		}
	};

	// Broadcast Announcement
	const handleSendAnnouncement = async () => {
		if (!announcement.subject || !announcement.body) return;
		setSendingAnnouncement(true);
		try {
			const res = await apiClient.post("/admin/announce", announcement);
			toast.current?.show({
				severity: "success",
				summary: "Announcement Broadcasted",
				detail: `Announcement email queued for ${res.data.recipients} employees!`
			});
			setAnnouncement({ subject: "", body: "" });
		} catch {
			toast.current?.show({ severity: "error", summary: "Broadcast Failed" });
		} finally {
			setSendingAnnouncement(false);
		}
	};

	// Overview Charts Configurations
	const hasStats = stats !== null;
	const activeResolution = hasStats ? stats.avg_resolution_hours_by_department || {} : { "IT": 2.5, "SCADA": 12.0, "HR": 1.2 };
	const activeSlaBreaches = hasStats ? stats.sla_breaches_by_department || {} : { "IT": 1, "SCADA": 4 };
	const activeCsat = hasStats ? stats.csat_by_department || {} : { "IT": { "avg": 4.5, "count": 10 }, "SCADA": { "avg": 4.0, "count": 2 } };
	const activePriority = hasStats ? stats.priority_breakdown || {} : { "Critical": 2, "High": 8, "Medium": 20, "Low": 4 };

	const chartResOptions = {
		chart: { type: "column", backgroundColor: "transparent", height: 250 },
		title: { text: null },
		xAxis: { categories: Object.keys(activeResolution), labels: { style: { color: "var(--text-muted)", fontSize: "10px" } } },
		yAxis: { min: 0, title: { text: "Hours" }, gridLineColor: "#f1f5f9" },
		series: [{ name: "Avg Resolution Time (Hours)", data: Object.values(activeResolution), color: "#7c3aed" }],
		credits: { enabled: false }
	};

	const chartSlaOptions = {
		chart: { type: "bar", backgroundColor: "transparent", height: 250 },
		title: { text: null },
		xAxis: { categories: Object.keys(activeSlaBreaches), labels: { style: { color: "var(--text-muted)", fontSize: "10px" } } },
		yAxis: { min: 0, title: { text: "Breached Tickets" }, gridLineColor: "#f1f5f9" },
		series: [{ name: "SLA Breaches", data: Object.values(activeSlaBreaches), color: "#ef4444" }],
		credits: { enabled: false }
	};

	const chartPriorityOptions = {
		chart: { type: "pie", backgroundColor: "transparent", height: 250 },
		title: { text: null },
		plotOptions: { pie: { innerSize: "60%", dataLabels: { enabled: false }, showInLegend: true } },
		series: [{
			name: "Tickets",
			data: Object.entries(activePriority).map(([name, count]) => {
				let color = "#e2e8f0";
				if (name === "Critical") color = "#ef4444";
				else if (name === "High") color = "#f97316";
				else if (name === "Medium") color = "#eab308";
				else if (name === "Low") color = "#3b82f6";
				return { name, y: count, color };
			})
		}],
		credits: { enabled: false }
	};

	const filteredUsers = users.filter(u => {
		const query = userSearchQuery.toLowerCase().trim();
		if (!query) return true;
		return (
			String(u.emp_id).toLowerCase().includes(query) ||
			(u.name && u.name.toLowerCase().includes(query)) ||
			(u.email && u.email.toLowerCase().includes(query)) ||
			(u.department && u.department.toLowerCase().includes(query)) ||
			(u.role && u.role.toLowerCase().includes(query))
		);
	});

	return (
		<div className="w-full flex flex-column gap-4 animate-slide-up" style={{ padding: "0 8px" }}>
			<Toast ref={toast} />

			{/* Header */}
			<div className="flex justify-content-between align-items-center mb-1">
				<div>
					<h2 className="text-2xl font-bold text-900 m-0 mb-1" style={{ letterSpacing: "-0.5px" }}>Portal Control Panel</h2>
					<p className="text-sm text-600 m-0">Admin tools to configure tickets, SLA policies, and users role parameters</p>
				</div>
			</div>

			{/* Navigation Tabs */}
			<div className="flex flex-wrap gap-2 border-bottom-1 border-slate-200 pb-2">
				{[
					{ id: "overview", label: "Overview", icon: "pi-chart-line" },
					{ id: "users", label: "Users & Roles", icon: "pi-users" },
					{ id: "templates", label: "Templates", icon: "pi-clone" },
					{ id: "tags", label: "Tags Config", icon: "pi-tags" },
					{ id: "sla", label: "SLA Policies", icon: "pi-shield" },
					{ id: "recurring", label: "Recurring Schedule", icon: "pi-history" },
					{ id: "announce", label: "Broadcast Broadcast", icon: "pi-megaphone" }
				].map(tab => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						style={{
							padding: "8px 16px",
							border: "none",
							background: activeTab === tab.id ? "var(--primary-color, #6366f1)" : "transparent",
							color: activeTab === tab.id ? "#ffffff" : "#64748b",
							borderRadius: "8px",
							fontWeight: "600",
							fontSize: "0.85rem",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							transition: "all 0.2s ease"
						}}
					>
						<i className={`pi ${tab.icon}`} />
						<span>{tab.label}</span>
					</button>
				))}
			</div>

			{/* Content Frame */}
			<div className="department-queue-card mt-2">
				{/* Tab: Overview (Full Stats) */}
				{activeTab === "overview" && (
					loadingStats ? <MetricsSkeleton /> : (
						<div className="flex flex-column gap-4">
							<div className="grid col-12 p-0 m-0 gap-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
								<div className="dashboard-chart-card">
									<h3 className="text-sm font-bold text-800 mb-3">Resolution Velocity (Hours)</h3>
									<HighchartsReact highcharts={Highcharts} options={chartResOptions} />
								</div>
								<div className="dashboard-chart-card">
									<h3 className="text-sm font-bold text-800 mb-3">SLA Compliance breaches</h3>
									<HighchartsReact highcharts={Highcharts} options={chartSlaOptions} />
								</div>
							</div>
							<div className="grid col-12 p-0 m-0 gap-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
								<div className="dashboard-chart-card">
									<h3 className="text-sm font-bold text-800 mb-3">Priority Weight Distribution</h3>
									<HighchartsReact highcharts={Highcharts} options={chartPriorityOptions} />
								</div>
								<div className="dashboard-chart-card flex flex-column justify-content-between">
									<h3 className="text-sm font-bold text-800 mb-2">CSAT Rating by Department</h3>
									<div className="flex flex-column gap-2" style={{ maxHeight: "220px", overflowY: "auto" }}>
										{Object.entries(activeCsat).map(([dept, data]) => (
											<div key={dept} className="flex align-items-center justify-content-between border-bottom-1 border-slate-100 pb-2">
												<span className="text-sm font-semibold text-700">{dept}</span>
												<div className="flex align-items-center gap-2">
													<span className="font-bold text-indigo-600">{data.avg} ⭐</span>
													<span className="text-xs text-500">({data.count} ratings)</span>
												</div>
											</div>
										))}
										{Object.keys(activeCsat).length === 0 && (
											<span className="text-sm text-500 pl-2">No CSAT data recorded yet</span>
										)}
									</div>
								</div>
							</div>
						</div>
					)
				)}

				{/* Tab: Users & Roles */}
				{activeTab === "users" && (
					loadingTab ? <TableSkeleton /> : (
						<div className="flex flex-column gap-3">
							<div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center gap-3 mb-2">
								<h3 className="text-sm font-bold text-800 m-0">Users & Roles Registry</h3>
								<span className="p-input-icon-left w-full sm:w-20rem">
									<i className="pi pi-search text-400" style={{ left: '14px' }} />
									<InputText 
										value={userSearchQuery} 
										onChange={(e) => setUserSearchQuery(e.target.value)} 
										placeholder="Search by ID, name, email, department, role..." 
										className="w-full search-queue-input"
									/>
								</span>
							</div>
							<DataTable value={filteredUsers} paginator rows={10} className="w-full">
								<Column field="emp_id" header="Employee ID" style={{ width: "8rem" }} />
								<Column field="name" header="Name" sortable />
								<Column field="email" header="Email" />
								<Column field="department" header="SSO Department" sortable />
								<Column 
									field="role" 
									header="Role" 
									body={(row) => (
										<span className={`px-3 py-1 border-round-pill text-xs font-semibold ${row.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
											{row.role}
										</span>
									)} 
									style={{ width: "8rem" }}
								/>
								<Column 
									body={(row) => (
										<Button 
											label={row.role === "admin" ? "Demote" : "Promote Admin"} 
											icon="pi pi-user-edit" 
											className={`p-button-sm ${row.role === "admin" ? "p-button-secondary p-button-outlined" : "p-button-indigo"}`}
											onClick={() => toggleUserRole(row)} 
										/>
									)} 
									style={{ width: "12rem", textAlign: "center" }}
								/>
							</DataTable>
						</div>
					)
				)}

				{/* Tab: Templates */}
				{activeTab === "templates" && (
					loadingTab ? <TableSkeleton /> : (
						<div className="flex flex-column gap-3">
							<div className="flex justify-content-between align-items-center mb-2">
								<h3 className="text-sm font-bold text-800 m-0">Pre-fill Form Templates</h3>
								<Button label="Create Template" icon="pi pi-plus" className="p-button-indigo p-button-sm border-round-pill" onClick={() => setTemplateDialog(true)} />
							</div>
							<DataTable value={templates} className="w-full">
								<Column field="name" header="Template Name" sortable />
								<Column field="department" header="Department" sortable />
								<Column field="default_subject" header="Subject Pre-fill" />
								<Column field="created_by" header="Author" />
								<Column 
									body={(row) => (
										<Button 
											icon="pi pi-trash" 
											className="p-button-text p-button-danger" 
											onClick={() => handleDeleteTemplate(row.id)} 
										/>
									)} 
									style={{ width: "4rem", textAlign: "center" }}
								/>
							</DataTable>
						</div>
					)
				)}

				{/* Tab: Tags Config */}
				{activeTab === "tags" && (
					loadingTab ? <TableSkeleton /> : (
						<div className="flex flex-column gap-3">
							<div className="flex justify-content-between align-items-center mb-2">
								<h3 className="text-sm font-bold text-800 m-0">Categorization Tags</h3>
								<Button label="Create Tag" icon="pi pi-plus" className="p-button-indigo p-button-sm border-round-pill" onClick={() => setTagDialog(true)} />
							</div>
							<DataTable value={tags} className="w-full">
								<Column 
									field="name" 
									header="Tag Name" 
									body={(row) => (
										<span className="font-semibold text-sm">#{row.name}</span>
									)}
									sortable 
								/>
								<Column 
									field="color" 
									header="Color Hex" 
									body={(row) => (
										<div className="flex align-items-center gap-2">
											<span className="border-round" style={{ display: "inline-block", width: "18px", height: "18px", background: row.color, border: "1px solid #ddd" }} />
											<span>{row.color}</span>
										</div>
									)}
								/>
								<Column 
									body={(row) => (
										<Button 
											icon="pi pi-trash" 
											className="p-button-text p-button-danger" 
											onClick={() => handleDeleteTag(row.id)} 
										/>
									)} 
									style={{ width: "4rem", textAlign: "center" }}
								/>
							</DataTable>
						</div>
					)
				)}

				{/* Tab: SLA Policies */}
				{activeTab === "sla" && (
					loadingTab ? <TableSkeleton /> : (
						<div className="flex flex-column gap-3">
							<h3 className="text-sm font-bold text-800 mb-1">Resolution SLA Configuration</h3>
							<DataTable value={slaPolicies} className="w-full">
								<Column field="department" header="Department" sortable />
								<Column field="sla_hours" header="SLA Window (Hours)" />
								<Column 
									body={(row) => (
										<Button 
											label="Tuner" 
											icon="pi pi-sliders-h" 
											className="p-button-text p-button-indigo" 
											onClick={() => {
												setSelectedSla({ department: row.department, sla_hours: row.sla_hours });
												setSlaDialog(true);
											}} 
										/>
									)} 
									style={{ width: "8rem", textAlign: "center" }}
								/>
							</DataTable>
						</div>
					)
				)}

				{/* Tab: Recurring Tickets */}
				{activeTab === "recurring" && (
					loadingTab ? <TableSkeleton /> : (
						<div className="flex flex-column gap-3">
							<div className="flex justify-content-between align-items-center mb-2">
								<h3 className="text-sm font-bold text-800 m-0">Recurring Maintenance Schedules</h3>
								<Button label="New Schedule" icon="pi pi-plus" className="p-button-indigo p-button-sm border-round-pill" onClick={() => setRecurringDialog(true)} />
							</div>
							<DataTable value={recurringSchedules} className="w-full">
								<Column field="template_name" header="Template Name" sortable />
								<Column field="cron_schedule" header="Cron Schedule" sortable />
								<Column field="priority" header="Priority" />
								<Column 
									field="tags" 
									header="Tags" 
									body={(row) => (row.tags || []).map(t => `#${t}`).join(", ")}
								/>
								<Column field="next_run" header="Next Trigger" />
								<Column 
									body={(row) => (
										<Button 
											icon="pi pi-trash" 
											className="p-button-text p-button-danger" 
											onClick={() => handleDeleteRecurring(row.id)} 
										/>
									)} 
									style={{ width: "4rem", textAlign: "center" }}
								/>
							</DataTable>
						</div>
					)
				)}

				{/* Tab: Broadcast Announcement */}
				{activeTab === "announce" && (
					<div className="flex flex-column gap-4 max-w-2xl">
						<h3 className="text-md font-bold text-800 m-0">Send Broadcast Email Announcement</h3>
						<p className="text-xs text-500 m-0">Send a system wide announcement to all Grid India / ERLDC employee mail boxes registered on SSO</p>
						
						<div className="field flex flex-column gap-2">
							<label className="text-sm font-bold text-700">Subject</label>
							<InputText 
								value={announcement.subject} 
								onChange={(e) => setAnnouncement({ ...announcement, subject: e.target.value })} 
								placeholder="Announcement Subject..." 
								className="w-full"
							/>
						</div>

						<div className="field flex flex-column gap-2">
							<label className="text-sm font-bold text-700">Message Body</label>
							<InputTextarea 
								value={announcement.body} 
								onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} 
								placeholder="Enter announcement details here..." 
								rows={8}
								className="w-full"
							/>
						</div>

						<Button 
							label={sendingAnnouncement ? "Broadcasting..." : "Broadcast Announcement"} 
							icon={sendingAnnouncement ? "pi pi-spin pi-spinner" : "pi pi-megaphone"}
							className="p-button-indigo border-round-pill py-2 max-w-xs align-self-start mt-2"
							onClick={handleSendAnnouncement}
							disabled={!announcement.subject || !announcement.body || sendingAnnouncement}
						/>
					</div>
				)}
			</div>

			{/* Create Template Dialog */}
			<Dialog header="Create Ticket Template" visible={templateDialog} onHide={() => setTemplateDialog(false)} style={{ width: "500px" }} modal footer={
				<div className="flex justify-content-end gap-2">
					<Button label="Cancel" className="p-button-text" onClick={() => setTemplateDialog(false)} />
					<Button label="Create" className="p-button-indigo" onClick={handleCreateTemplate} disabled={!newTemplate.name || !newTemplate.department || !newTemplate.default_subject} />
				</div>
			}>
				<div className="flex flex-column gap-3 py-2">
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Template Name</label>
						<InputText value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="e.g. Daily Log Check" />
					</div>
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Associated Department</label>
						<Dropdown value={newTemplate.department} options={departmentsList} onChange={(e) => setNewTemplate({ ...newTemplate, department: e.value })} placeholder="Select Department" />
					</div>
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Default Subject</label>
						<InputText value={newTemplate.default_subject} onChange={(e) => setNewTemplate({ ...newTemplate, default_subject: e.target.value })} placeholder="e.g. Daily system log inspection" />
					</div>
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Default Description</label>
						<InputTextarea value={newTemplate.default_description} onChange={(e) => setNewTemplate({ ...newTemplate, default_description: e.target.value })} placeholder="Write description body..." rows={4} />
					</div>
				</div>
			</Dialog>

			{/* Create Tag Dialog */}
			<Dialog header="Configure Tag" visible={tagDialog} onHide={() => setTagDialog(false)} style={{ width: "400px" }} modal footer={
				<div className="flex justify-content-end gap-2">
					<Button label="Cancel" className="p-button-text" onClick={() => setTagDialog(false)} />
					<Button label="Save" className="p-button-indigo" onClick={handleCreateTag} disabled={!newTag.name} />
				</div>
			}>
				<div className="flex flex-column gap-3 py-2">
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Tag Name</label>
						<InputText value={newTag.name} onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} placeholder="e.g. database-down" />
					</div>
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Color Hex Code</label>
						<div className="flex gap-2">
							<InputText value={newTag.color} onChange={(e) => setNewTag({ ...newTag, color: e.target.value })} placeholder="#6366f1" className="flex-grow-1" />
							<input type="color" value={newTag.color} onChange={(e) => setNewTag({ ...newTag, color: e.target.value })} style={{ width: "42px", height: "42px", padding: 0, border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }} />
						</div>
					</div>
				</div>
			</Dialog>

			{/* SLA Tuner Dialog */}
			<Dialog header="Tuning Resolution SLA Policy" visible={slaDialog} onHide={() => setSlaDialog(false)} style={{ width: "400px" }} modal footer={
				<div className="flex justify-content-end gap-2">
					<Button label="Cancel" className="p-button-text" onClick={() => setSlaDialog(false)} />
					<Button label="Save Changes" className="p-button-indigo" onClick={handleUpdateSla} />
				</div>
			}>
				<div className="flex flex-column gap-3 py-2">
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Department</label>
						<InputText value={selectedSla.department} disabled />
					</div>
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">SLA Window (Hours)</label>
						<InputText type="number" value={selectedSla.sla_hours} onChange={(e) => setSelectedSla({ ...selectedSla, sla_hours: e.target.value })} placeholder="48" />
					</div>
				</div>
			</Dialog>

			{/* Create Recurring Dialog */}
			<Dialog header="Configure Recurring Schedule" visible={recurringDialog} onHide={() => setRecurringDialog(false)} style={{ width: "450px" }} modal footer={
				<div className="flex justify-content-end gap-2">
					<Button label="Cancel" className="p-button-text" onClick={() => setRecurringDialog(false)} />
					<Button label="Configure" className="p-button-indigo" onClick={handleCreateRecurring} disabled={!newRecurring.template_id} />
				</div>
			}>
				<div className="flex flex-column gap-3 py-2">
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Select Base Template</label>
						<Dropdown 
							value={newRecurring.template_id} 
							options={templates.map(t => ({ label: `${t.name} (${t.department})`, value: t.id }))} 
							onChange={(e) => setNewRecurring({ ...newRecurring, template_id: e.value })} 
							placeholder="Select a Template" 
						/>
					</div>
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Cron Schedule Interval</label>
						<Dropdown value={newRecurring.cron_schedule} options={cronOptions} onChange={(e) => setNewRecurring({ ...newRecurring, cron_schedule: e.value })} placeholder="Interval Schedule" />
					</div>
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Ticket Priority</label>
						<Dropdown value={newRecurring.priority} options={priorityOptions} onChange={(e) => setNewRecurring({ ...newRecurring, priority: e.value })} placeholder="Priority Level" />
					</div>
				</div>
			</Dialog>
		</div>
	);
};

export default AdminPage;

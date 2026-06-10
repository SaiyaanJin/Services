import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { useAuth } from "../context/AuthContext";
import { useTickets } from "../hooks/useTickets";
import { TableSkeleton } from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import { getDepartmentBackendName } from "../utils/departmentMap";
import apiClient from "../api";
import PriorityBadge from "../components/tickets/PriorityBadge";
import SlaTimer from "../components/tickets/SlaTimer";
import KanbanBoard from "../components/kanban/KanbanBoard";

import { getInitials, getAvatarColorClass, getSubjectIconInfo, getDeptIconInfo, getStatusColors } from "../utils/ticketHelpers";


const DepartmentPage = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const toast = useRef(null);
	const { fetchTickets, loading } = useTickets();

	const [tickets, setTickets] = useState([]);
	const [filteredTickets, setFilteredTickets] = useState([]);
	
	const [viewMode, setViewMode] = useState("table");
	const [priorityFilter, setPriorityFilter] = useState(null);
	const [slaBreachedOnly, setSlaBreachedOnly] = useState(false);
	const [selectedTickets, setSelectedTickets] = useState([]);
	const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
	const [selectedParentDocket, setSelectedParentDocket] = useState(null);
	const [merging, setMerging] = useState(false);

	// Admin selection control
	const [selectedQueueDept, setSelectedQueueDept] = useState("");
	const [adminChecked, setAdminChecked] = useState(false);
	const [sendingBulk, setSendingBulk] = useState(false);
	
	// Filtering states
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState(null);


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

	const priorityOptions = [
		{ label: "Critical", value: "Critical" },
		{ label: "High", value: "High" },
		{ label: "Medium", value: "Medium" },
		{ label: "Low", value: "Low" }
	];

	const defaultDeptName = user ? getDepartmentBackendName(user.sso_department) : "";
	const activeQueueName = (user?.role === "admin" && adminChecked) ? "All Departments" : (selectedQueueDept || defaultDeptName);

	// Resolve the active department to query
	const getQueryDepartment = useCallback(() => {
		if (user?.role === "admin" && selectedQueueDept) {
			return selectedQueueDept;
		}
		return getDepartmentBackendName(user?.sso_department);
	}, [user, selectedQueueDept]);

	const loadDepartmentTickets = useCallback(async () => {
		const targetDept = getQueryDepartment();
		if (!targetDept && !(user?.role === "admin" && adminChecked)) return;

		try {
			let data = [];
			if (user?.role === "admin" && adminChecked) {
				data = await fetchTickets("admin");
			} else {
				data = await fetchTickets("department_admin", targetDept);
			}
			setTickets(data);
		} catch (err) {
			toast.current?.show({
				severity: "error",
				summary: "Error",
				detail: "Failed to load departmental tickets",
				life: 3000
			});
		}
	}, [getQueryDepartment, fetchTickets, user, adminChecked]);

	useEffect(() => {
		if (user) {
			loadDepartmentTickets();
		}
	}, [user, loadDepartmentTickets, selectedQueueDept, adminChecked]);

	// Apply search/filters
	useEffect(() => {
		let result = [...tickets];

		if (searchQuery) {
			const query = searchQuery.toLowerCase().trim();
			result = result.filter(
				(t) =>
					String(t.Docket_Number).toLowerCase().includes(query) ||
					(t.Subject && t.Subject.toLowerCase().includes(query)) ||
					(t.Data_Filled_by && t.Data_Filled_by.toLowerCase().includes(query))
			);
		}

		if (statusFilter) {
			result = result.filter((t) => t.Present_Status === statusFilter);
		}

		if (priorityFilter) {
			result = result.filter((t) => t.Priority === priorityFilter);
		}

		if (slaBreachedOnly) {
			result = result.filter((t) => {
				const closedStatuses = ["Resolved", "Can not be Resolved", "Working (No Action Required)"];
				if (closedStatuses.includes(t.Present_Status)) return false;
				if (!t.SLA_Deadline) return false;
				return new Date(t.SLA_Deadline) <= new Date();
			});
		}

		setFilteredTickets(result);
	}, [tickets, searchQuery, statusFilter, priorityFilter, slaBreachedOnly]);

	const exportExcel = () => {
		import("xlsx").then((xlsx) => {
			const exportData = filteredTickets.map((t) => ({
				"Docket Number": t.Docket_Number,
				"Subject": t.Subject,
				"Raising Date": t.Input_Date,
				"Raised By": t.Data_Filled_by,
				"User Department": t.User_Department,
				"Current Status": t.Present_Status,
				"Description": t.Breif || t.description || ""
			}));
			const worksheet = xlsx.utils.json_to_sheet(exportData);
			const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
			const excelBuffer = xlsx.write(workbook, { bookType: "xlsx", type: "array" });
			const fileName = (user?.role === "admin" && adminChecked) ? "All_Departments" : getQueryDepartment();
			saveAsExcelFile(excelBuffer, `${fileName}_Queue`);
		});
	};

	const saveAsExcelFile = (buffer, fileName) => {
		import("file-saver").then((module) => {
			if (module && module.default) {
				let EXCEL_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
				let EXCEL_EXTENSION = ".xlsx";
				const data = new Blob([buffer], { type: EXCEL_TYPE });
				module.default.saveAs(data, fileName + "_export_" + new Date().getTime() + EXCEL_EXTENSION);
			}
		});
	};

	const statusOptions = [
		{ label: "New Service Request", value: "New Service Request" },
		{ label: "Under Progress", value: "Under Progress" },
		{ label: "Resolved", value: "Resolved" },
		{ label: "Can not be Resolved", value: "Can not be Resolved" },
		{ label: "Working (No Action Required)", value: "Working (No Action Required)" }
	];

	const sendBulkReminders = async () => {
		setSendingBulk(true);
		try {
			const response = await apiClient.get("/SendBulkReminder");
			if (response.data && response.data.status === "Success") {
				const count = response.data.sent_count || 0;
				toast.current?.show({
					severity: "success",
					summary: "Bulk Reminders Sent",
					detail: `Reminder emails successfully sent for ${count} new service request tickets!`,
					life: 5000
				});
			} else {
				throw new Error("API returned failure status");
			}
		} catch (err) {
			console.error("Failed to send bulk reminders:", err);
			toast.current?.show({
				severity: "error",
				summary: "Error",
				detail: "Failed to send bulk reminders. Please try again later.",
				life: 5000
			});
		} finally {
			setSendingBulk(false);
		}
	};

	const handleMergeTickets = async () => {
		if (!selectedParentDocket) {
			toast.current?.show({
				severity: "warn",
				summary: "Warning",
				detail: "Please select the parent ticket to merge into"
			});
			return;
		}

		setMerging(true);
		const parentNum = parseInt(selectedParentDocket, 10);
		const childDockets = selectedTickets
			.map(t => parseInt(t.Docket_Number, 10))
			.filter(num => num !== parentNum);

		try {
			await apiClient.post(`/tickets/${parentNum}/merge`, {
				child_dockets: childDockets
			});
			
			toast.current?.show({
				severity: "success",
				summary: "Merged Successfully",
				detail: `Merged ${childDockets.length} ticket(s) into Docket #${parentNum}`
			});
			setMergeDialogOpen(false);
			setSelectedTickets([]);
			setSelectedParentDocket(null);
			loadDepartmentTickets();
		} catch (err) {
			console.error("Failed to merge tickets:", err);
			toast.current?.show({
				severity: "error",
				summary: "Merge Failed",
				detail: err.response?.data?.detail || "Could not merge tickets. Please try again."
			});
		} finally {
			setMerging(false);
		}
	};

	// Column templates
	const docketTemplate = (rowData) => {
		return (
			<span style={{ color: "#6366f1", fontWeight: "700", fontSize: "0.95rem" }}>
				{rowData.Docket_Number}
			</span>
		);
	};

	const subjectTemplate = (rowData) => {
		const iconInfo = getSubjectIconInfo(rowData.Subject);
		return (
			<div className="flex align-items-center">
				<div className="flex align-items-center justify-content-center border-round-circle mr-3" style={{ 
					width: '32px', 
					height: '32px', 
					backgroundColor: iconInfo.bg, 
					color: iconInfo.color,
					flexShrink: 0
				}}>
					<i className={iconInfo.icon} style={{ fontSize: '0.85rem' }} />
				</div>
				<span className="font-semibold text-900 text-sm hover:text-indigo-600 transition-colors">
					{rowData.Subject}
				</span>
			</div>
		);
	};

	const raisedByTemplate = (rowData) => {
		const name = rowData.Data_Filled_by || "Unknown";
		const avatarInfo = getAvatarColorClass(name);
		const initials = getInitials(name);
		return (
			<div className="flex align-items-center">
				<div className="flex align-items-center justify-content-center border-round-circle mr-3 font-bold text-xs" style={{ 
					width: '32px', 
					height: '32px', 
					backgroundColor: avatarInfo.bg, 
					color: avatarInfo.text,
					flexShrink: 0
				}}>
					{initials}
				</div>
				<span className="text-sm text-700 font-medium">
					{name}
				</span>
			</div>
		);
	};

	const assignedToTemplate = (rowData) => {
		const assigned = rowData.Assigned_To;
		const emps = Array.isArray(assigned) ? assigned : (assigned ? [assigned] : []);
		if (emps.length === 0) {
			return <span className="text-400 pl-2">Unassigned</span>;
		}
		
		if (emps.length === 1) {
			const emp = emps[0];
			const avatarInfo = getAvatarColorClass(emp.name);
			const initials = getInitials(emp.name);
			return (
				<div className="flex align-items-center" title={`Assigned to ${emp.name}`}>
					<div className="flex align-items-center justify-content-center border-round-circle mr-3 font-bold text-xs" style={{ 
						width: '32px', 
						height: '32px', 
						backgroundColor: avatarInfo.bg, 
						color: avatarInfo.text,
						flexShrink: 0
					}}>
						{initials}
					</div>
					<span className="text-sm text-700 font-medium">
						{emp.name}
					</span>
				</div>
			);
		} else {
			const allNames = emps.map(e => e.name).join(", ");
			return (
				<div className="flex align-items-center" title={`Assigned to: ${allNames}`}>
					<div className="flex align-items-center mr-2">
						{emps.slice(0, 3).map((emp, idx) => {
							const avatarInfo = getAvatarColorClass(emp.name);
							const initials = getInitials(emp.name);
							return (
								<div 
									key={emp.emp_id}
									className="flex align-items-center justify-content-center border-round-circle font-bold text-xs" 
									style={{ 
										width: '28px', 
										height: '28px', 
										backgroundColor: avatarInfo.bg, 
										color: avatarInfo.text,
										border: '2px solid #fff',
										marginLeft: idx > 0 ? '-8px' : '0',
										boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
										zIndex: emps.length - idx,
										flexShrink: 0
									}}
								>
									{initials}
								</div>
							);
						})}
					</div>
					<span className="text-sm text-700 font-medium">
						{emps[0].name} + {emps.length - 1} others
					</span>
				</div>
			);
		}
	};

	const userDeptTemplate = (rowData) => {
		if (!rowData.User_Department) {
			return <span className="text-400 pl-4">—</span>;
		}
		const deptInfo = getDeptIconInfo(rowData.User_Department);
		return (
			<div className="flex align-items-center">
				<div className="flex align-items-center justify-content-center border-round-circle mr-3" style={{ 
					width: '32px', 
					height: '32px', 
					backgroundColor: deptInfo.bg, 
					color: deptInfo.color,
					flexShrink: 0
				}}>
					<i className={deptInfo.icon} style={{ fontSize: '0.85rem' }} />
				</div>
				<span className="text-sm text-700 font-medium">
					{rowData.User_Department}
				</span>
			</div>
		);
	};

	const raisingDateTemplate = (rowData) => {
		return (
			<div className="flex align-items-center text-600 text-sm">
				<i className="pi pi-calendar mr-2 text-400" style={{ fontSize: '0.85rem' }} />
				<span>{rowData.Input_Date}</span>
			</div>
		);
	};

	const statusTemplate = (rowData) => {
		const status = rowData.Present_Status;
		const styles = getStatusColors(status);

		return (
			<div className="inline-flex align-items-center px-3 py-1.5 border-round-pill text-xs font-semibold" style={{ 
				backgroundColor: styles.bg, 
				color: styles.color,
				whiteSpace: 'nowrap'
			}}>
				<span className="border-round-circle mr-2" style={{ 
					display: 'inline-block', 
					width: '6px', 
					height: '6px', 
					backgroundColor: styles.dot 
				}} />
				{status}
			</div>
		);
	};

	const actionsTemplate = () => {
		return (
			<div className="flex justify-content-center text-400 hover:text-700 transition-colors cursor-pointer p-2 border-round-circle hover:bg-100" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
				<i className="pi pi-ellipsis-v" />
			</div>
		);
	};

	return (
		<div className="w-full flex flex-column gap-4">
			<Toast ref={toast} />

			{/* Header Section */}
			<div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3" style={{ padding: '0 8px' }}>
				<div className="flex align-items-center gap-3">
					<div className="flex align-items-center justify-content-center border-round-xl" style={{ 
						width: '48px', 
						height: '48px', 
						backgroundColor: '#f5f3ff', 
						color: '#6366f1',
						border: '1px solid #e0e7ff'
					}}>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
							<rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
							<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
							<path d="m9 14 2 2 4-4" />
						</svg>
					</div>
					<div>
						<h2 className="text-2xl font-bold text-900 m-0 mb-1" style={{ letterSpacing: '-0.5px' }}>Department Ticket Queue</h2>
						<div className="text-sm text-600 m-0 flex align-items-center gap-1">
							<span>Viewing queue for:</span>
							<span className="font-semibold text-indigo-600 flex align-items-center">
								{activeQueueName}
								<i className="pi pi-chevron-down text-xs ml-1" style={{ fontSize: '0.65rem' }} />
							</span>
						</div>
					</div>
				</div>

				<div className="flex flex-wrap align-items-center gap-4">
					<div className="flex align-items-center gap-1 bg-slate-100 p-1 border-round-xl" style={{ border: '1px solid var(--surface-border, #e2e8f0)' }}>
						<button 
							onClick={() => setViewMode("table")} 
							style={{
								padding: '6px 12px',
								background: viewMode === "table" ? '#ffffff' : 'transparent',
								color: viewMode === "table" ? '#6366f1' : '#64748b',
								border: 'none',
								borderRadius: '8px',
								cursor: 'pointer',
								fontWeight: '600',
								fontSize: '0.78rem',
								boxShadow: viewMode === "table" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
							}}
						>
							<i className="pi pi-table mr-1" /> Table
						</button>
						<button 
							onClick={() => setViewMode("kanban")} 
							style={{
								padding: '6px 12px',
								background: viewMode === "kanban" ? '#ffffff' : 'transparent',
								color: viewMode === "kanban" ? '#6366f1' : '#64748b',
								border: 'none',
								borderRadius: '8px',
								cursor: 'pointer',
								fontWeight: '600',
								fontSize: '0.78rem',
								boxShadow: viewMode === "kanban" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
							}}
						>
							<i className="pi pi-th-large mr-1" /> Kanban
						</button>
					</div>

					{user?.role === "admin" && (
						<>
							<Dropdown 
								value={selectedQueueDept || defaultDeptName}
								options={departmentsList}
								onChange={(e) => setSelectedQueueDept(e.value)}
								placeholder="Choose queue..."
								className="choose-queue-dropdown"
							/>
							<div className="flex align-items-center gap-3 bg-indigo-50 px-3 py-2 border-round-pill">
								<span className="text-xs font-bold text-indigo-800 uppercase tracking-wider pl-1">Show all tickets</span>
								<InputSwitch 
									checked={adminChecked} 
									onChange={(e) => setAdminChecked(e.value)} 
									style={{ transform: 'scale(0.85)' }}
								/>
							</div>
							<button 
								className="flex align-items-center gap-2"
								onClick={sendBulkReminders}
								disabled={sendingBulk}
								style={{ 
									padding: '8px 18px', 
									fontSize: '0.8rem', 
									border: 'none',
									color: '#ffffff',
									background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
									borderRadius: '20px',
									fontWeight: '700',
									cursor: 'pointer',
									transition: 'all 0.3s ease',
									height: '34px',
									display: 'flex',
									alignItems: 'center',
									boxShadow: '0 0 12px rgba(239, 68, 68, 0.55), 0 4px 6px rgba(239, 68, 68, 0.15)',
									letterSpacing: '0.3px'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)';
									e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.85), 0 6px 8px rgba(239, 68, 68, 0.25)';
									e.currentTarget.style.transform = 'translateY(-1px)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
									e.currentTarget.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.55), 0 4px 6px rgba(239, 68, 68, 0.15)';
									e.currentTarget.style.transform = 'translateY(0)';
								}}
							>
								{sendingBulk ? (
									<i className="pi pi-spin pi-spinner" style={{ fontSize: '0.8rem' }} />
								) : (
									<i className="pi pi-bell" style={{ fontSize: '0.8rem' }} />
								)}
								<span>Remind New Requests</span>
							</button>
						</>
					)}
					<button 
						className="export-queue-btn flex align-items-center gap-2"
						onClick={exportExcel} 
						disabled={filteredTickets.length === 0}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="7 10 12 15 17 10" />
							<line x1="12" y1="15" x2="12" y2="3" />
						</svg>
						<span>Export</span>
					</button>
				</div>
			</div>

			<div className="department-queue-card">
				
				{/* Filters Section */}
				<div className="flex flex-column gap-3 mb-4">
					<div className="flex flex-wrap gap-3 align-items-center">
						<span className="p-input-icon-left" style={{ flex: '1 1 200px', minWidth: '200px' }}>
							<i className="pi pi-search text-400" style={{ left: '14px' }} />
							<InputText 
								value={searchQuery} 
								onChange={(e) => setSearchQuery(e.target.value)} 
								placeholder="Search queue..." 
								className="w-full search-queue-input"
							/>
						</span>
						<Dropdown 
							value={statusFilter} 
							options={statusOptions} 
							onChange={(e) => setStatusFilter(e.value)} 
							placeholder="Filter by Status" 
							showClear
							style={{ flex: '1 1 180px', minWidth: '180px' }}
							className="status-filter-dropdown"
						/>
						<Dropdown 
							value={priorityFilter} 
							options={priorityOptions} 
							onChange={(e) => setPriorityFilter(e.value)} 
							placeholder="Filter by Priority" 
							showClear
							style={{ flex: '1 1 150px', minWidth: '150px' }}
							className="priority-filter-dropdown"
						/>
						<div className="flex align-items-center gap-2 px-2">
							<Checkbox 
								inputId="slaBreached" 
								checked={slaBreachedOnly} 
								onChange={(e) => setSlaBreachedOnly(e.checked)} 
							/>
							<label htmlFor="slaBreached" className="text-sm font-semibold text-700 cursor-pointer">
								Show only breached
							</label>
						</div>
						
						{(searchQuery || statusFilter || priorityFilter || slaBreachedOnly) && (
							<Button 
								icon="pi pi-filter-slash" 
								className="p-button-rounded p-button-text p-button-plain"
								title="Clear all filters"
								onClick={() => {
									setSearchQuery("");
									setStatusFilter(null);
									setPriorityFilter(null);
									setSlaBreachedOnly(false);
								}}
							/>
						)}
					</div>

					{/* Merge Tickets Bulk Action Banner */}
					{selectedTickets.length >= 2 && (
						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: '12px',
							background: '#ede9fe',
							border: '1px solid #c7d2fe',
							padding: '8px 16px',
							borderRadius: '8px',
							flexWrap: 'wrap'
						}} className="animate-slide-up">
							<span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#4f46e5' }}>
								{selectedTickets.length} tickets selected
							</span>
							<div style={{ width: '1px', height: '16px', background: '#c7d2fe' }} />
							
							<Button 
								label="Merge Selected Tickets" 
								icon="pi pi-clone"
								onClick={() => {
									setSelectedParentDocket(null);
									setMergeDialogOpen(true);
								}}
								className="p-button-indigo"
								style={{ padding: '6px 12px', fontSize: '0.78rem' }}
							/>
							
							<Button 
								label="Cancel Selection" 
								onClick={() => setSelectedTickets([])}
								className="p-button-text p-button-plain"
								style={{ padding: '6px 12px', fontSize: '0.78rem', marginLeft: 'auto' }}
							/>
						</div>
					)}
				</div>

				{/* Table Section */}
				{loading ? (
					<div style={{ marginTop: '24px' }}><TableSkeleton /></div>
				) : filteredTickets.length === 0 ? (
					<EmptyState 
						title="No tickets in queue"
						description="There are currently no tickets logged in this department queue matching your filters."
						icon="pi pi-inbox"
					/>
				) : viewMode === "kanban" ? (
					<KanbanBoard 
						tickets={filteredTickets} 
						currentUser={user} 
						onTicketUpdate={() => loadDepartmentTickets()} 
						canUpdateStatus={true} 
					/>
				) : (
					<DataTable 
						value={filteredTickets} 
						paginator 
						rows={8}
						rowsPerPageOptions={[8, 15, 30]}
						paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
						currentPageReportTemplate="Showing {first} to {last} of {totalRecords} tickets"
						responsiveLayout="scroll"
						onRowClick={(e) => navigate(`/ticket/${e.data.Docket_Number}`)}
						rowClassName={() => "cursor-pointer"}
						selection={selectedTickets}
						onSelectionChange={(e) => setSelectedTickets(e.value)}
						dataKey="Docket_Number"
						className="department-queue-table"
					>
						<Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
						<Column 
							field="Docket_Number" 
							header="Docket No." 
							sortable 
							body={docketTemplate}
							style={{ width: "8rem" }} 
						/>
						<Column 
							field="Subject" 
							header="Subject" 
							sortable 
							body={subjectTemplate}
							style={{ minWidth: "16rem" }} 
						/>
						<Column 
							field="Priority" 
							header="Priority" 
							sortable 
							body={(rowData) => <PriorityBadge priority={rowData.Priority} size="xs" />}
							style={{ width: "7rem" }} 
						/>
						<Column 
							field="SLA_Deadline" 
							header="SLA Countdown" 
							sortable 
							body={(rowData) => <SlaTimer slaDeadline={rowData.SLA_Deadline} presentStatus={rowData.Present_Status} />}
							style={{ minWidth: "10rem" }} 
						/>
						<Column 
							field="Assigned_To" 
							header="Assigned To" 
							sortable 
							body={assignedToTemplate}
							style={{ minWidth: "12rem" }} 
						/>
						<Column 
							field="User_Department" 
							header="User Dept" 
							sortable 
							body={userDeptTemplate}
							style={{ minWidth: "10rem" }} 
						/>
						<Column 
							field="Input_Date" 
							header="Raising Date" 
							sortable 
							body={raisingDateTemplate}
							style={{ minWidth: "10rem" }} 
						/>
						<Column 
							field="Present_Status" 
							header="Status" 
							sortable 
							body={statusTemplate}
							style={{ minWidth: "10rem" }} 
						/>
						<Column 
							body={actionsTemplate}
							style={{ width: "3rem" }} 
						/>
					</DataTable>
				)}
			</div>

			{/* Merge Tickets Dialog */}
			<Dialog 
				header={
					<div className="flex align-items-center gap-2">
						<i className="pi pi-clone text-indigo-600" style={{ fontSize: '1.2rem' }} />
						<span className="font-bold text-lg text-900">Merge Tickets</span>
					</div>
				}
				visible={mergeDialogOpen} 
				onHide={() => setMergeDialogOpen(false)} 
				style={{ width: '450px' }}
				modal
				dismissableMask
				footer={
					<div className="flex justify-content-end gap-2 pt-2">
						<Button 
							label="Cancel" 
							className="p-button-text p-button-plain" 
							onClick={() => setMergeDialogOpen(false)} 
						/>
						<Button 
							label={merging ? "Merging..." : "Confirm Merge"} 
							icon={merging ? "pi pi-spin pi-spinner" : "pi pi-check"}
							className="p-button-indigo" 
							onClick={handleMergeTickets}
							disabled={!selectedParentDocket || merging} 
						/>
					</div>
				}
			>
				<div className="flex flex-column gap-3 py-2">
					<p className="text-sm text-600 m-0">
						Merging combines duplicate issues into one main ticket. All other selected tickets will be resolved and marked as merged into the parent.
					</p>
					
					<div className="field flex flex-column gap-2">
						<label className="text-sm font-bold text-800">Select Parent Ticket (Primary)</label>
						<Dropdown 
							value={selectedParentDocket} 
							options={selectedTickets.map(t => ({
								label: `#${t.Docket_Number} - ${t.Subject.substring(0, 40)}${t.Subject.length > 40 ? '...' : ''}`,
								value: t.Docket_Number
							}))} 
							onChange={(e) => setSelectedParentDocket(e.value)} 
							placeholder="Select the parent ticket..." 
							className="w-full"
						/>
					</div>

					{selectedParentDocket && (
						<div className="bg-slate-50 border-round-xl p-3 border-1 border-slate-200">
							<span className="text-xs font-bold text-600 block mb-2 uppercase tracking-wide">Tickets to be Merged:</span>
							<ul className="m-0 pl-3 flex flex-column gap-1 text-sm text-700">
								{selectedTickets
									.filter(t => t.Docket_Number !== selectedParentDocket)
									.map(t => (
										<li key={t.Docket_Number}>
											<span className="font-semibold text-slate-900">#{t.Docket_Number}</span>: {t.Subject}
										</li>
									))
								}
							</ul>
						</div>
					)}
				</div>
			</Dialog>
		</div>
	);
};

export default DepartmentPage;

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { Toast } from "primereact/toast";
import { useAuth } from "../context/AuthContext";
import { useTickets } from "../hooks/useTickets";
import { TableSkeleton } from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import { getDepartmentBackendName } from "../utils/departmentMap";
import apiClient from "../api";

import { getInitials, getAvatarColorClass, getSubjectIconInfo, getDeptIconInfo, getStatusColors } from "../utils/ticketHelpers";


const DepartmentPage = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const toast = useRef(null);
	const { fetchTickets, loading } = useTickets();

	const [tickets, setTickets] = useState([]);
	const [filteredTickets, setFilteredTickets] = useState([]);
	
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

		setFilteredTickets(result);
	}, [tickets, searchQuery, statusFilter]);

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
				<div className="flex flex-column sm:flex-row gap-3 mb-2 align-items-center">
					<span className="p-input-icon-left w-full sm:w-20rem">
						<i className="pi pi-search text-400" style={{ left: '14px' }} />
						<InputText 
							value={searchQuery} 
							onChange={(e) => setSearchQuery(e.target.value)} 
							placeholder="Search queue..." 
							className="w-full search-queue-input"
						/>
					</span>
					<div className="w-full sm:w-15rem">
						<Dropdown 
							value={statusFilter} 
							options={statusOptions} 
							onChange={(e) => setStatusFilter(e.value)} 
							placeholder="Filter by Status" 
							showClear
							className="w-full status-filter-dropdown"
						/>
					</div>
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
						className="department-queue-table"
					>
						<Column 
							field="Docket_Number" 
							header="Docket No." 
							sortable 
							body={docketTemplate}
							style={{ width: "9rem" }} 
						/>
						<Column 
							field="Subject" 
							header="Subject" 
							sortable 
							body={subjectTemplate}
							style={{ minWidth: "18rem" }} 
						/>
						<Column 
							field="Data_Filled_by" 
							header="Raised By" 
							sortable 
							body={raisedByTemplate}
							style={{ minWidth: "14rem" }} 
						/>
						<Column 
							field="User_Department" 
							header="User Department" 
							sortable 
							body={userDeptTemplate}
							style={{ minWidth: "13rem" }} 
						/>
						<Column 
							field="Input_Date" 
							header="Raising Date" 
							sortable 
							body={raisingDateTemplate}
							style={{ minWidth: "12rem" }} 
						/>
						<Column 
							field="Present_Status" 
							header="Status" 
							sortable 
							body={statusTemplate}
							style={{ minWidth: "12rem" }} 
						/>
						<Column 
							body={actionsTemplate}
							style={{ width: "4rem" }} 
						/>
					</DataTable>
				)}
			</div>
		</div>
	);
};

export default DepartmentPage;

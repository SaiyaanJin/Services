import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { Calendar } from "primereact/calendar";
import { MultiSelect } from "primereact/multiselect";
import { Toast } from "primereact/toast";
import moment from "moment";
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


const TicketListPage = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const toast = useRef(null);
	const { fetchTickets, loading } = useTickets();
	
	const [rawTickets, setRawTickets] = useState([]);
	const [filteredTickets, setFilteredTickets] = useState([]);
	const [departmentalView, setDepartmentalView] = useState(false);
	const [viewMode, setViewMode] = useState("table");
	const [selectedTickets, setSelectedTickets] = useState([]);
	
	// Date and Tag filters
	const [dateFrom, setDateFrom] = useState(null);
	const [dateTo, setDateTo] = useState(null);
	const [selectedTags, setSelectedTags] = useState([]);
	const [allTags, setAllTags] = useState([]);

	// Bulk Actions toolbar states
	const [bulkStatus, setBulkStatus] = useState(null);
	const [bulkTag, setBulkTag] = useState(null);

	// Fetch tags on mount
	useEffect(() => {
		apiClient.get("/admin/tags").then(res => setAllTags(res.data || [])).catch(() => {});
	}, []);
	
	// Filter states
	const [searchParams, setSearchParams] = useSearchParams();
	const searchQuery = searchParams.get("search") || "";
	const setSearchQuery = (val) => {
		const newParams = new URLSearchParams(searchParams);
		if (val) {
			newParams.set("search", val);
		} else {
			newParams.delete("search");
		}
		setSearchParams(newParams, { replace: true });
	};
	const [statusFilter, setStatusFilter] = useState(null);

	const loadTickets = useCallback(async () => {
		try {
			let data = [];
			if (departmentalView) {
				const deptName = getDepartmentBackendName(user?.sso_department);
				data = await fetchTickets("department_user", deptName);
			} else {
				data = await fetchTickets("user");
			}
			setRawTickets(data);
		} catch (err) {
			toast.current?.show({
				severity: "error",
				summary: "Error",
				detail: "Failed to load tickets",
				life: 3000
			});
		}
	}, [departmentalView, fetchTickets, user]);

	useEffect(() => {
		loadTickets();
	}, [loadTickets]);

	const handleBulkStatusUpdate = async () => {
		if (selectedTickets.length === 0 || !bulkStatus) return;
		const dockets = selectedTickets.map(t => t.Docket_Number);
		try {
			await apiClient.post("/tickets/bulk-status", {
				docket_numbers: dockets,
				status: bulkStatus
			});
			toast.current?.show({
				severity: "success",
				summary: "Bulk Update",
				detail: `Successfully updated status for ${dockets.length} tickets`
			});
			setSelectedTickets([]);
			setBulkStatus(null);
			loadTickets();
		} catch (err) {
			toast.current?.show({
				severity: "error",
				summary: "Bulk Update Failed",
				detail: "Could not update tickets status"
			});
		}
	};

	const handleBulkTagAdd = async () => {
		if (selectedTickets.length === 0 || !bulkTag) return;
		const dockets = selectedTickets.map(t => t.Docket_Number);
		try {
			await Promise.all(selectedTickets.map(async (ticket) => {
				const existingTags = ticket.Tags || [];
				if (!existingTags.includes(bulkTag)) {
					await apiClient.post("/UserInputupdate", {
						Docket_Number: ticket.Docket_Number,
						Tags: [...existingTags, bulkTag]
					});
				}
			}));
			toast.current?.show({
				severity: "success",
				summary: "Bulk Tag Added",
				detail: `Successfully added tag #${bulkTag} to ${dockets.length} tickets`
			});
			setSelectedTickets([]);
			setBulkTag(null);
			loadTickets();
		} catch (err) {
			toast.current?.show({
				severity: "error",
				summary: "Bulk Tag Failed",
				detail: "Could not add tags"
			});
		}
	};

	const exportSelectedExcel = () => {
		import("xlsx").then((xlsx) => {
			const exportData = selectedTickets.map((t) => ({
				"Docket Number": t.Docket_Number,
				"Subject": t.Subject,
				"Raising Date": t.Input_Date,
				"Department": t.Department,
				"Raised By": t.Data_Filled_by,
				"User Department": t.User_Department,
				"Current Status": t.Present_Status,
				"Ticket Closed": t.Ticket_Closed ? "Yes" : "No"
			}));
			const worksheet = xlsx.utils.json_to_sheet(exportData);
			const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
			const excelBuffer = xlsx.write(workbook, { bookType: "xlsx", type: "array" });
			saveAsExcelFile(excelBuffer, "Selected_Service_Tickets");
		});
	};

	// Apply filtering on query search or filters change
	useEffect(() => {
		let result = [...rawTickets];

		if (searchQuery) {
			const query = searchQuery.toLowerCase().trim();
			result = result.filter(
				(t) =>
					String(t.Docket_Number).toLowerCase().includes(query) ||
					(t.Subject && t.Subject.toLowerCase().includes(query)) ||
					(t.Department && t.Department.toLowerCase().includes(query))
			);
		}

		if (statusFilter) {
			result = result.filter((t) => t.Present_Status === statusFilter);
		}

		// Tag Filter
		if (selectedTags && selectedTags.length > 0) {
			result = result.filter((t) => 
				t.Tags && t.Tags.some(tag => selectedTags.includes(tag))
			);
		}

		// Date Filter
		if (dateFrom) {
			result = result.filter((t) => {
				const ticketDate = moment(t.Input_Date, ["DD-MM-YYYY hh:mm a", "DD-MM-YYYY hh:mma", "DD-MM-YYYY HH:mm", "DD-MM-YYYY HH:mm:ss"]);
				return ticketDate.isValid() && ticketDate.isSameOrAfter(moment(dateFrom).startOf('day'));
			});
		}
		if (dateTo) {
			result = result.filter((t) => {
				const ticketDate = moment(t.Input_Date, ["DD-MM-YYYY hh:mm a", "DD-MM-YYYY hh:mma", "DD-MM-YYYY HH:mm", "DD-MM-YYYY HH:mm:ss"]);
				return ticketDate.isValid() && ticketDate.isSameOrBefore(moment(dateTo).endOf('day'));
			});
		}

		setFilteredTickets(result);
	}, [rawTickets, searchQuery, statusFilter, selectedTags, dateFrom, dateTo]);

	const exportExcel = () => {
		import("xlsx").then((xlsx) => {
			const exportData = filteredTickets.map((t) => ({
				"Docket Number": t.Docket_Number,
				"Subject": t.Subject,
				"Raising Date": t.Input_Date,
				"Department": t.Department,
				"Raised By": t.Data_Filled_by,
				"User Department": t.User_Department,
				"Current Status": t.Present_Status,
				"Ticket Closed": t.Ticket_Closed ? "Yes" : "No"
			}));
			const worksheet = xlsx.utils.json_to_sheet(exportData);
			const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
			const excelBuffer = xlsx.write(workbook, { bookType: "xlsx", type: "array" });
			saveAsExcelFile(excelBuffer, "Service_Tickets");
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

	const deptTemplate = (rowData) => {
		const deptName = rowData.Department?.split(":")[0].trim() || "";
		const deptInfo = getDeptIconInfo(deptName);
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
					{deptName}
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

	const actionsTemplate = () => {
		return (
			<div className="flex justify-content-center text-400 hover:text-700 transition-colors cursor-pointer p-2 border-round-circle hover:bg-100" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifycontent: 'center', margin: '0 auto' }}>
				<i className="pi pi-ellipsis-v" />
			</div>
		);
	};

	return (
		<div className="w-full flex flex-column gap-4 animate-slide-up">
			<Toast ref={toast} />

			{/* Header Section */}
			<div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3" style={{ padding: '0 8px' }}>
				<div>
					<h2 className="text-2xl font-bold text-900 m-0 mb-1" style={{ letterSpacing: '-0.5px' }}>Service Tickets</h2>
					<p className="text-sm text-600 m-0">View, search, and track service requests</p>
				</div>

				<div className="flex flex-wrap align-items-center gap-3">
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

					<div className="flex align-items-center gap-2 bg-indigo-50 px-3 py-2 border-round-pill">
						<span className="text-xs font-bold text-indigo-800 uppercase tracking-wider pl-1">Departmental View</span>
						<InputSwitch 
							checked={departmentalView} 
							onChange={(e) => setDepartmentalView(e.value)} 
							style={{ transform: 'scale(0.85)' }}
						/>
					</div>
					<Button 
						label="New Request" 
						icon="pi pi-plus" 
						className="p-button-indigo p-button-raised border-round-pill" 
						onClick={() => navigate("/Input")} 
					/>
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

			{/* Table Card */}
			<div className="tickets-list-card">
				{/* Filters Section */}
				<div className="flex flex-column gap-3 mb-4">
					<div className="flex flex-wrap gap-3 align-items-center">
						<span className="p-input-icon-left" style={{ flex: '1 1 200px', minWidth: '200px' }}>
							<i className="pi pi-search text-400" style={{ left: '14px' }} />
							<InputText 
								value={searchQuery} 
								onChange={(e) => setSearchQuery(e.target.value)} 
								placeholder="Search tickets..." 
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
						<MultiSelect
							value={selectedTags}
							options={allTags.map(t => ({ label: `#${t.name}`, value: t.name }))}
							onChange={(e) => setSelectedTags(e.value)}
							placeholder="Filter by Tags"
							style={{ flex: '1 1 200px', minWidth: '200px' }}
							display="chip"
						/>
						<Calendar
							value={dateFrom}
							onChange={(e) => setDateFrom(e.value)}
							placeholder="From Date"
							dateFormat="dd-mm-yy"
							showIcon
							style={{ flex: '1 1 160px', minWidth: '160px' }}
						/>
						<Calendar
							value={dateTo}
							onChange={(e) => setDateTo(e.value)}
							placeholder="To Date"
							dateFormat="dd-mm-yy"
							showIcon
							style={{ flex: '1 1 160px', minWidth: '160px' }}
						/>
						{(dateFrom || dateTo || selectedTags.length > 0 || statusFilter) && (
							<Button 
								icon="pi pi-filter-slash" 
								className="p-button-rounded p-button-text p-button-plain"
								title="Clear all filters"
								onClick={() => {
									setDateFrom(null);
									setDateTo(null);
									setSelectedTags([]);
									setStatusFilter(null);
								}}
							/>
						)}
					</div>

					{/* Bulk Actions Toolbar */}
					{selectedTickets.length > 0 && (
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
							
							{/* Bulk Status Update */}
							<Dropdown
								value={bulkStatus}
								options={statusOptions}
								onChange={(e) => setBulkStatus(e.value)}
								placeholder="Update Status..."
								style={{ width: '180px' }}
							/>
							<Button 
								label="Apply Status" 
								onClick={handleBulkStatusUpdate}
								disabled={!bulkStatus}
								className="p-button-indigo"
								style={{ padding: '6px 12px', fontSize: '0.78rem' }}
							/>
							
							{/* Bulk Tag Add */}
							<Dropdown
								value={bulkTag}
								options={allTags.map(t => ({ label: `#${t.name}`, value: t.name }))}
								onChange={(e) => setBulkTag(e.value)}
								placeholder="Add Tag..."
								style={{ width: '160px' }}
							/>
							<Button 
								label="Add Tag" 
								onClick={handleBulkTagAdd}
								disabled={!bulkTag}
								className="p-button-indigo"
								style={{ padding: '6px 12px', fontSize: '0.78rem' }}
							/>

							{/* Bulk Export */}
							<Button 
								label="Export Selected" 
								icon="pi pi-file-excel"
								onClick={exportSelectedExcel}
								className="p-button-success"
								style={{ padding: '6px 12px', fontSize: '0.78rem', marginLeft: 'auto' }}
							/>
						</div>
					)}
				</div>

				{/* Content Section (Table or Kanban) */}
				{loading ? (
					<div style={{ marginTop: '24px' }}><TableSkeleton /></div>
				) : filteredTickets.length === 0 ? (
					<EmptyState 
						title={searchQuery || statusFilter || selectedTags.length > 0 || dateFrom || dateTo ? "No matching tickets found" : "No tickets found"}
						description={searchQuery || statusFilter || selectedTags.length > 0 || dateFrom || dateTo ? "Try adjusting your search filters." : "Create your first service ticket by clicking 'New Request'."}
						icon="pi pi-folder"
						actionLabel={!(searchQuery || statusFilter || selectedTags.length > 0 || dateFrom || dateTo) && "New Request"}
						onAction={() => navigate("/Input")}
					/>
				) : viewMode === "kanban" ? (
					<KanbanBoard 
						tickets={filteredTickets} 
						currentUser={user} 
						onTicketUpdate={() => loadTickets()} 
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
						className="tickets-list-table"
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
							field="Department" 
							header="Assigned Department" 
							sortable 
							body={deptTemplate}
							style={{ minWidth: "12rem" }} 
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
							field="Data_Filled_by" 
							header="Raised By" 
							sortable 
							body={raisedByTemplate}
							style={{ minWidth: "12rem" }} 
						/>
						<Column 
							body={actionsTemplate}
							style={{ width: "3rem" }} 
						/>
					</DataTable>
				)}
			</div>
		</div>
	);
};

export default TicketListPage;

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { Toast } from "primereact/toast";
import { useAuth } from "../context/AuthContext";
import { useTickets } from "../hooks/useTickets";
import { TableSkeleton } from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import { getDepartmentBackendName } from "../utils/departmentMap";

import { getInitials, getAvatarColorClass, getSubjectIconInfo, getDeptIconInfo, getStatusColors } from "../utils/ticketHelpers";


const TicketListPage = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const toast = useRef(null);
	const { fetchTickets, loading } = useTickets();
	
	const [rawTickets, setRawTickets] = useState([]);
	const [filteredTickets, setFilteredTickets] = useState([]);
	const [departmentalView, setDepartmentalView] = useState(false);
	
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

		setFilteredTickets(result);
	}, [rawTickets, searchQuery, statusFilter]);

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
				<div className="flex flex-column sm:flex-row gap-3 mb-2 align-items-center">
					<span className="p-input-icon-left w-full sm:w-20rem">
						<i className="pi pi-search text-400" style={{ left: '14px' }} />
						<InputText 
							value={searchQuery} 
							onChange={(e) => setSearchQuery(e.target.value)} 
							placeholder="Search tickets..." 
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
						title={searchQuery || statusFilter ? "No matching tickets found" : "No tickets found"}
						description={searchQuery || statusFilter ? "Try adjusting your search filters." : "Create your first service ticket by clicking 'New Request'."}
						icon="pi pi-folder"
						actionLabel={!(searchQuery || statusFilter) && "New Request"}
						onAction={() => navigate("/Input")}
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
						className="tickets-list-table"
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
							field="Department" 
							header="Assigned Department" 
							sortable 
							body={deptTemplate}
							style={{ minWidth: "14rem" }} 
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
							field="Data_Filled_by" 
							header="Raised By" 
							sortable 
							body={raisedByTemplate}
							style={{ minWidth: "14rem" }} 
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

export default TicketListPage;

import React, { useState, useEffect, useRef } from "react";
import apiClient from "../../api";
import { getInitials, getAvatarColorClass } from "../../utils/ticketHelpers";

const AssignmentPanel = ({ docketNumber, assignedTo, ticketDept, canAssign = false, onAssigned }) => {
	const [employees, setEmployees] = useState([]);
	const [showPicker, setShowPicker] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(false);
	const searchRef = useRef(null);
	const panelRef = useRef(null);

	useEffect(() => {
		if (showPicker && employees.length === 0) {
			apiClient.get("/admin/users").then(res => setEmployees(res.data || [])).catch(() => {});
		}
		if (showPicker) setTimeout(() => searchRef.current?.focus(), 50);
	}, [showPicker, employees.length]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (panelRef.current && !panelRef.current.contains(event.target)) {
				setShowPicker(false);
			}
		};
		if (showPicker) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showPicker]);

	const isEmployeeInDepartment = (empDept, ticketDept) => {
		if (!empDept || !ticketDept) return false;
		const empDeptUpper = empDept.toUpperCase().trim();
		const ticketDeptLower = ticketDept.toLowerCase().trim();
		
		if (empDeptUpper === "IT" && (ticketDeptLower.includes("logistics : it") || ticketDeptLower.includes("cyber security"))) return true;
		if (empDeptUpper === "HR" && ticketDeptLower.includes("human resource")) return true;
		if (empDeptUpper === "F&A" && ticketDeptLower.includes("finance")) return true;
		if (empDeptUpper === "CS" && ticketDeptLower.includes("contract")) return true;
		if (empDeptUpper === "TS" && ticketDeptLower.includes("logistics : ts")) return true;
		if (empDeptUpper === "COMMUNICATION" && ticketDeptLower.includes("communication")) return true;
		if (empDeptUpper === "SCADA" && ticketDeptLower.includes("ot (decision support)")) return true;
		if (empDeptUpper === "MO" && ticketDeptLower.includes("market operation")) return true;
		if (empDeptUpper === "SO" && ticketDeptLower.includes("system operation")) return true;

		// fallback
		if (ticketDeptLower.includes(empDeptUpper.toLowerCase())) return true;
		return false;
	};

	const filtered = searchQuery
		? employees.filter(e =>
			e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			e.department?.toLowerCase().includes(searchQuery.toLowerCase())
		)
		: employees;

	const assignees = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);

	const toggleAssign = async (emp) => {
		setLoading(true);
		const isSelected = assignees.some(u => u.emp_id === emp.emp_id);
		let updated;
		if (isSelected) {
			updated = assignees.filter(u => u.emp_id !== emp.emp_id);
		} else {
			updated = [...assignees, emp];
		}
		
		try {
			await apiClient.post(`/tickets/${docketNumber}/assign`, { assignees: updated });
			onAssigned?.(updated);
		} catch (err) {
			console.error("Assignment failed:", err);
		} finally {
			setLoading(false);
		}
	};

	if (assignees.length === 0 && !canAssign) return null;

	return (
		<div ref={panelRef} style={{ position: "relative" }}>
			{/* Current Assignees Display */}
			<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
				{assignees.length > 0 ? (
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						{/* Avatar Group */}
						<div style={{ display: "flex", alignItems: "center", marginRight: "4px" }}>
							{assignees.map((assignee, idx) => {
								const a = getAvatarColorClass(assignee.name);
								return (
									<div 
										key={assignee.emp_id} 
										title={assignee.name}
										style={{
											width: "28px", height: "28px",
											borderRadius: "50%",
											background: a.bg, color: a.text,
											fontSize: "0.65rem", fontWeight: "700",
											display: "flex", alignItems: "center", justifyContent: "center",
											border: "2px solid #fff",
											marginLeft: idx > 0 ? "-8px" : "0",
											boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
											zIndex: assignees.length - idx
										}}
									>
										{getInitials(assignee.name)}
									</div>
								);
							})}
						</div>
						
						{/* Names List */}
						<div style={{ maxWidth: "150px" }}>
							<div style={{ 
								fontSize: "0.78rem", 
								fontWeight: "600", 
								color: "var(--text-color, #1e293b)", 
								lineHeight: 1.2,
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis"
							}} title={assignees.map(u => u.name).join(", ")}>
								{assignees.map(u => u.name).join(", ")}
							</div>
							<div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
								{assignees.length === 1 ? "Assigned" : `${assignees.length} Assignees`}
							</div>
						</div>
					</div>
				) : (
					<span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Unassigned</span>
				)}

				{canAssign && (
					<button
						onClick={() => setShowPicker(p => !p)}
						disabled={loading}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							padding: "3px 10px",
							background: "none",
							border: "1px solid var(--surface-border, #e2e8f0)",
							borderRadius: "20px",
							fontSize: "0.72rem",
							color: "#64748b",
							cursor: "pointer",
							marginLeft: "4px"
						}}
					>
						<i className="pi pi-user-edit" style={{ fontSize: "0.7rem" }} />
						{assignees.length > 0 ? "Manage" : "Assign"}
					</button>
				)}
			</div>

			{/* Employee Picker Dropdown (Expands Upward) */}
			{showPicker && (
				<div style={{
					position: "absolute",
					bottom: "calc(100% + 8px)",
					left: 0,
					width: "280px",
					background: "var(--surface-card, #fff)",
					border: "1px solid var(--surface-border, #e2e8f0)",
					borderRadius: "10px",
					boxShadow: "0 -10px 40px rgba(0,0,0,0.12)",
					zIndex: 9999,
					overflow: "hidden"
				}}>
					<div style={{ padding: "8px" }}>
						<input
							ref={searchRef}
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							placeholder="Search employees..."
							style={{
								width: "100%",
								border: "1px solid var(--surface-border, #e2e8f0)",
								borderRadius: "6px",
								padding: "6px 10px",
								fontSize: "0.78rem",
								outline: "none",
								background: "var(--surface-100, #f8fafc)",
								color: "var(--text-color, #1e293b)"
							}}
						/>
					</div>
					<div style={{ maxHeight: "220px", overflowY: "auto" }}>
						{filtered.map(emp => {
							const isSelected = assignees.some(u => u.emp_id === emp.emp_id);
							const a = getAvatarColorClass(emp.name);
							return (
								<div
									key={emp.emp_id}
									onClick={() => toggleAssign(emp)}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "8px 10px",
										cursor: "pointer",
										transition: "background 0.1s",
										background: isSelected ? "var(--primary-50, #eef2ff)" : "transparent"
									}}
									onMouseEnter={e => e.currentTarget.style.background = isSelected ? "var(--primary-100, #e0e7ff)" : "var(--surface-100, #f1f5f9)"}
									onMouseLeave={e => e.currentTarget.style.background = isSelected ? "var(--primary-50, #eef2ff)" : "transparent"}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "8px", flexGrow: 1, minWidth: 0 }}>
										<div style={{
											width: "28px", height: "28px",
											borderRadius: "50%",
											background: a.bg, color: a.text,
											fontSize: "0.65rem", fontWeight: "700",
											display: "flex", alignItems: "center", justifycontent: "center",
											flexShrink: 0
										}}>
											{getInitials(emp.name)}
										</div>
										<div style={{ minWidth: 0 }}>
											<div style={{ 
												fontSize: "0.78rem", 
												fontWeight: "600", 
												color: "var(--text-color, #1e293b)", 
												lineHeight: 1.2,
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis"
											}}>
												{emp.name}
											</div>
											<div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>
												{emp.department || emp.emp_id}
											</div>
										</div>
									</div>
									{isSelected && (
										<i className="pi pi-check text-indigo-600 font-bold" style={{ fontSize: "0.8rem", marginRight: "4px" }} />
									)}
								</div>
							);
						})}
						{filtered.length === 0 && (
							<div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "0.78rem" }}>
								No employees found
							</div>
						)}
					</div>
					<div style={{ 
						borderTop: "1px solid var(--surface-border, #e2e8f0)", 
						padding: "6px 8px", 
						display: "flex", 
						justifyContent: "flex-end",
						background: "var(--surface-50, #f8fafc)"
					}}>
						<button 
							onClick={() => setShowPicker(false)}
							style={{
								padding: "4px 12px",
								background: "var(--primary-600, #4f46e5)",
								color: "#fff",
								border: "none",
								borderRadius: "4px",
								fontSize: "0.72rem",
								fontWeight: "600",
								cursor: "pointer"
							}}
						>
							Done
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default AssignmentPanel;

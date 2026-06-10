import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api";
import { getStatusColors, getSubjectIconInfo, getInitials, getAvatarColorClass } from "../../utils/ticketHelpers";
import PriorityBadge from "../tickets/PriorityBadge";
import SlaTimer from "../tickets/SlaTimer";

const COLUMNS = [
	{ key: "New Service Request", label: "New Request", icon: "pi pi-plus-circle", color: "#6366f1", bg: "#ede9fe" },
	{ key: "Under Progress", label: "In Progress", icon: "pi pi-spin pi-cog", color: "#f59e0b", bg: "#fef3c7" },
	{ key: "Resolved", label: "Resolved", icon: "pi pi-check-circle", color: "#10b981", bg: "#d1fae5" },
	{ key: "Can not be Resolved", label: "Cannot Resolve", icon: "pi pi-times-circle", color: "#ef4444", bg: "#fef2f2" }
];

const KanbanBoard = ({ tickets, currentUser, onTicketUpdate, canUpdateStatus = false }) => {
	const navigate = useNavigate();
	const [dragOverCol, setDragOverCol] = useState(null);
	const [draggingTicket, setDraggingTicket] = useState(null);
	const [updating, setUpdating] = useState(null);

	const columns = COLUMNS.map(col => ({
		...col,
		tickets: tickets.filter(t => t.Present_Status === col.key)
	}));

	const onDragStart = (e, ticket) => {
		setDraggingTicket(ticket);
		e.dataTransfer.effectAllowed = "move";
	};

	const onDragOver = (e, colKey) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDragOverCol(colKey);
	};

	const onDrop = async (e, newStatus) => {
		e.preventDefault();
		setDragOverCol(null);
		if (!draggingTicket) return;
		if (draggingTicket.Present_Status === newStatus) { setDraggingTicket(null); return; }
		if (!canUpdateStatus) { setDraggingTicket(null); return; }

		const docket = draggingTicket.Docket_Number;
		setUpdating(docket);

		const updatePayload = {
			...draggingTicket,
			Old_Status: draggingTicket.Present_Status,
			Present_Status: newStatus,
			Data_Edited_by: currentUser?.name || "Unknown"
		};

		try {
			await apiClient.post("/UserInputStatusupdate", [updatePayload]);
			onTicketUpdate?.(docket, newStatus);
		} catch (err) {
			console.error("Failed to update ticket status:", err);
		} finally {
			setUpdating(null);
			setDraggingTicket(null);
		}
	};

	return (
		<div style={{
			display: "grid",
			gridTemplateColumns: "repeat(4, 1fr)",
			gap: "12px",
			minHeight: "400px",
			overflowX: "auto"
		}}>
			{columns.map(col => (
				<div
					key={col.key}
					onDragOver={e => onDragOver(e, col.key)}
					onDragLeave={() => setDragOverCol(null)}
					onDrop={e => onDrop(e, col.key)}
					style={{
						background: dragOverCol === col.key ? `${col.color}12` : "var(--surface-50, #f8fafc)",
						border: `2px solid ${dragOverCol === col.key ? col.color : "var(--surface-border, #e2e8f0)"}`,
						borderRadius: "12px",
						padding: "12px",
						minWidth: "220px",
						transition: "all 0.2s"
					}}
				>
					{/* Column Header */}
					<div style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: "12px",
						paddingBottom: "10px",
						borderBottom: `2px solid ${col.color}30`
					}}>
						<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							<div style={{
								width: "28px", height: "28px",
								borderRadius: "50%",
								background: col.bg,
								color: col.color,
								display: "flex", alignItems: "center", justifyContent: "center"
							}}>
								<i className={col.icon.replace("pi-spin ", "")} style={{ fontSize: "0.75rem" }} />
							</div>
							<span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-color, #1e293b)" }}>
								{col.label}
							</span>
						</div>
						<span style={{
							background: col.bg,
							color: col.color,
							borderRadius: "10px",
							padding: "1px 8px",
							fontSize: "0.72rem",
							fontWeight: "700"
						}}>
							{col.tickets.length}
						</span>
					</div>

					{/* Cards */}
					<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
						{col.tickets.map(ticket => {
							const subjectInfo = getSubjectIconInfo(ticket.Subject);
							const avatarInfo = getAvatarColorClass(ticket.Data_Filled_by || "?");
							const isUpdating = updating === ticket.Docket_Number;
							return (
								<div
									key={ticket.Docket_Number}
									draggable={canUpdateStatus}
									onDragStart={e => onDragStart(e, ticket)}
									onClick={() => navigate(`/ticket/${ticket.Docket_Number}`)}
									style={{
										background: "var(--surface-card, #fff)",
										border: "1px solid var(--surface-border, #e2e8f0)",
										borderRadius: "10px",
										padding: "10px",
										cursor: canUpdateStatus ? "grab" : "pointer",
										opacity: isUpdating ? 0.5 : 1,
										boxShadow: draggingTicket?.Docket_Number === ticket.Docket_Number
											? "0 8px 24px rgba(0,0,0,0.15)"
											: "0 1px 3px rgba(0,0,0,0.05)",
										transition: "all 0.15s",
										userSelect: "none"
									}}
									onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"}
									onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"}
								>
									<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px", marginBottom: "6px" }}>
										<span style={{ fontSize: "0.65rem", fontWeight: "700", color: "#6366f1" }}>
											#{ticket.Docket_Number}
										</span>
										<PriorityBadge priority={ticket.Priority} size="xs" showIcon={false} />
									</div>
									<div style={{
										fontSize: "0.78rem",
										fontWeight: "600",
										color: "var(--text-color, #1e293b)",
										marginBottom: "8px",
										lineHeight: 1.3,
										overflow: "hidden",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical"
									}}>
										{ticket.Subject}
									</div>
									<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
											<div style={{
												width: "18px", height: "18px",
												borderRadius: "50%",
												background: avatarInfo.bg,
												color: avatarInfo.text,
												fontSize: "0.52rem",
												fontWeight: "700",
												display: "flex", alignItems: "center", justifyContent: "center"
											}}>
												{getInitials(ticket.Data_Filled_by)}
											</div>
											<span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>
												{ticket.Input_Date?.split(" ")[0]}
											</span>
										</div>
										<SlaTimer slaDeadline={ticket.SLA_Deadline} presentStatus={ticket.Present_Status} />
									</div>
									{isUpdating && (
										<div style={{ marginTop: "6px", fontSize: "0.65rem", color: "#6366f1", textAlign: "center" }}>
											<i className="pi pi-spin pi-spinner" /> Updating...
										</div>
									)}
								</div>
							);
						})}
						{col.tickets.length === 0 && (
							<div style={{
								padding: "20px",
								textAlign: "center",
								color: "#cbd5e1",
								fontSize: "0.78rem",
								border: `2px dashed ${col.color}30`,
								borderRadius: "8px"
							}}>
								{canUpdateStatus ? "Drop tickets here" : "No tickets"}
							</div>
						)}
					</div>
				</div>
			))}
		</div>
	);
};

export default KanbanBoard;

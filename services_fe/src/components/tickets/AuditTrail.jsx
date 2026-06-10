import React, { useState, useEffect } from "react";
import apiClient from "../../api";

const ACTION_CONFIG = {
	created: { icon: "pi pi-plus-circle", color: "#6366f1", bg: "#ede9fe", label: "Ticket Created" },
	status_change: { icon: "pi pi-refresh", color: "#0ea5e9", bg: "#e0f2fe", label: "Status Changed" },
	description_edited: { icon: "pi pi-pencil", color: "#f59e0b", bg: "#fef3c7", label: "Description Edited" },
	assigned: { icon: "pi pi-user", color: "#10b981", bg: "#d1fae5", label: "Assigned" },
	transferred: { icon: "pi pi-arrow-right-arrow-left", color: "#8b5cf6", bg: "#f5f3ff", label: "Transferred" },
	merged: { icon: "pi pi-link", color: "#64748b", bg: "#f1f5f9", label: "Merged" },
	bulk_status_change: { icon: "pi pi-list", color: "#ec4899", bg: "#fdf2f8", label: "Bulk Update" }
};

const AuditTrail = ({ docketNumber }) => {
	const [logs, setLogs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		if (!docketNumber) return;
		apiClient.get(`/tickets/${docketNumber}/audit`)
			.then(res => setLogs(res.data || []))
			.catch(() => setLogs([]))
			.finally(() => setLoading(false));
	}, [docketNumber]);

	if (!expanded) {
		return (
			<button
				onClick={() => setExpanded(true)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					background: "none",
					border: "1px solid var(--surface-border, #e2e8f0)",
					borderRadius: "8px",
					padding: "6px 14px",
					cursor: "pointer",
					fontSize: "0.8rem",
					color: "var(--text-color-secondary, #64748b)",
					transition: "all 0.2s"
				}}
				onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; }}
				onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--surface-border, #e2e8f0)"; e.currentTarget.style.color = "var(--text-color-secondary, #64748b)"; }}
			>
				<i className="pi pi-history" style={{ fontSize: "0.75rem" }} />
				View Change History ({logs.length || "..."})
			</button>
		);
	}

	return (
		<div style={{
			border: "1px solid var(--surface-border, #e2e8f0)",
			borderRadius: "12px",
			overflow: "hidden",
			background: "var(--surface-card, #fff)"
		}}>
			<div style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "12px 16px",
				borderBottom: "1px solid var(--surface-border, #e2e8f0)",
				background: "var(--surface-50, #f8fafc)"
			}}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "0.85rem", color: "var(--text-color, #1e293b)" }}>
					<i className="pi pi-history" style={{ color: "#6366f1" }} />
					Change History
					<span style={{ background: "#ede9fe", color: "#6366f1", borderRadius: "10px", padding: "1px 7px", fontSize: "0.7rem" }}>{logs.length}</span>
				</div>
				<button onClick={() => setExpanded(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.8rem" }}>
					<i className="pi pi-chevron-up" />
				</button>
			</div>

			<div style={{ maxHeight: "320px", overflowY: "auto" }}>
				{loading ? (
					<div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
						<i className="pi pi-spin pi-spinner" /> Loading audit trail...
					</div>
				) : logs.length === 0 ? (
					<div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
						No change history yet.
					</div>
				) : (
					<div style={{ padding: "8px 0" }}>
						{[...logs].reverse().map((log, idx) => {
							const cfg = ACTION_CONFIG[log.action] || { icon: "pi pi-circle", color: "#64748b", bg: "#f1f5f9", label: log.action };
							return (
								<div key={idx} style={{
									display: "flex",
									gap: "12px",
									padding: "8px 16px",
									borderBottom: idx < logs.length - 1 ? "1px solid var(--surface-border, #f1f5f9)" : "none"
								}}>
									<div style={{
										width: "30px", height: "30px",
										borderRadius: "50%",
										background: cfg.bg,
										color: cfg.color,
										display: "flex", alignItems: "center", justifyContent: "center",
										flexShrink: 0, marginTop: "2px"
									}}>
										<i className={cfg.icon} style={{ fontSize: "0.72rem" }} />
									</div>
									<div style={{ flex: 1 }}>
										<div style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-color, #1e293b)", marginBottom: "2px" }}>
											{cfg.label}
											{log.action === "status_change" && log.old_value && log.new_value && (
												<span style={{ fontWeight: "400", color: "#64748b" }}>
													: <span style={{ color: "#ef4444" }}>{log.old_value}</span> → <span style={{ color: "#10b981" }}>{log.new_value}</span>
												</span>
											)}
											{log.action === "assigned" && log.new_value && (
												<span style={{ fontWeight: "400", color: "#64748b" }}> to {log.new_value}</span>
											)}
											{log.action === "transferred" && log.new_value && (
												<span style={{ fontWeight: "400", color: "#64748b" }}> to {log.new_value}</span>
											)}
										</div>
										<div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
											By <strong style={{ color: "#64748b" }}>{log.user_name}</strong>
											{log.timestamp && ` · ${new Date(log.timestamp).toLocaleString()}`}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default AuditTrail;

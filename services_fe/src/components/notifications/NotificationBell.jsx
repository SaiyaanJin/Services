import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";

const NOTIF_ICONS = {
	status_change: { icon: "pi pi-refresh", color: "#6366f1", bg: "#ede9fe" },
	assigned: { icon: "pi pi-user", color: "#f59e0b", bg: "#fef3c7" },
	transferred: { icon: "pi pi-arrow-right-arrow-left", color: "#0ea5e9", bg: "#e0f2fe" },
	merged: { icon: "pi pi-link", color: "#8b5cf6", bg: "#f5f3ff" },
	connected: { icon: "pi pi-wifi", color: "#10b981", bg: "#d1fae5" },
	default: { icon: "pi pi-bell", color: "#64748b", bg: "#f1f5f9" }
};

function timeAgo(isoStr) {
	if (!isoStr) return "";
	const now = new Date();
	const then = new Date(isoStr);
	const diff = Math.floor((now - then) / 1000);
	if (diff < 60) return "just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
}

const NotificationBell = () => {
	const { notifications, unreadCount, markRead, markAllRead, clearRead } = useNotifications();
	const [open, setOpen] = useState(false);
	const panelRef = useRef(null);
	const navigate = useNavigate();

	// Close panel when clicking outside
	useEffect(() => {
		const handler = (e) => {
			if (panelRef.current && !panelRef.current.contains(e.target)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const handleNotifClick = (notif) => {
		markRead(notif.id);
		if (notif.docket_number) {
			navigate(`/ticket/${notif.docket_number}`);
			setOpen(false);
		}
	};

	return (
		<div style={{ position: "relative" }} ref={panelRef}>
			{/* Bell Button */}
			<button
				id="notification-bell-btn"
				onClick={() => setOpen(o => !o)}
				style={{
					position: "relative",
					width: "40px",
					height: "40px",
					borderRadius: "50%",
					border: "none",
					background: open ? "var(--surface-100, #f1f5f9)" : "transparent",
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					transition: "background 0.2s",
					color: "var(--text-color-secondary, #64748b)"
				}}
				title="Notifications"
			>
				<i className="pi pi-bell" style={{ fontSize: "1.1rem" }} />
				{unreadCount > 0 && (
					<span style={{
						position: "absolute",
						top: "5px",
						right: "5px",
						width: "18px",
						height: "18px",
						background: "#ef4444",
						color: "#fff",
						borderRadius: "50%",
						fontSize: "0.65rem",
						fontWeight: "700",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						border: "2px solid var(--surface-card, #fff)",
						animation: "pulse-badge 2s infinite"
					}}>
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</button>

			{/* Notification Panel */}
			{open && (
				<div style={{
					position: "absolute",
					top: "calc(100% + 8px)",
					right: 0,
					width: "380px",
					maxHeight: "480px",
					background: "var(--surface-card, #fff)",
					border: "1px solid var(--surface-border, #e2e8f0)",
					borderRadius: "12px",
					boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
					zIndex: 10000,
					overflow: "hidden",
					display: "flex",
					flexDirection: "column"
				}}>
					{/* Panel Header */}
					<div style={{
						padding: "14px 16px",
						borderBottom: "1px solid var(--surface-border, #e2e8f0)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						background: "var(--surface-50, #f8fafc)"
					}}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<i className="pi pi-bell" style={{ color: "#6366f1" }} />
							<span style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text-color, #1e293b)" }}>
								Notifications
							</span>
							{unreadCount > 0 && (
								<span style={{
									background: "#6366f1",
									color: "#fff",
									borderRadius: "10px",
									padding: "1px 7px",
									fontSize: "0.7rem",
									fontWeight: "700"
								}}>
									{unreadCount} new
								</span>
							)}
						</div>
						<div style={{ display: "flex", gap: "6px" }}>
							{unreadCount > 0 && (
								<button onClick={markAllRead} style={{
									background: "none", border: "none", cursor: "pointer",
									fontSize: "0.72rem", color: "#6366f1", fontWeight: "600", padding: "2px 6px"
								}}>Mark all read</button>
							)}
							{notifications.some(n => n.read) && (
								<button onClick={clearRead} style={{
									background: "none", border: "none", cursor: "pointer",
									fontSize: "0.72rem", color: "#94a3b8", padding: "2px 6px"
								}}>Clear read</button>
							)}
						</div>
					</div>

					{/* Notification List */}
					<div style={{ overflowY: "auto", flex: 1 }}>
						{notifications.length === 0 ? (
							<div style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8" }}>
								<i className="pi pi-check-circle" style={{ fontSize: "2rem", marginBottom: "8px", display: "block" }} />
								<p style={{ margin: 0, fontSize: "0.85rem" }}>You're all caught up!</p>
							</div>
						) : (
							notifications.map(notif => {
								const icon = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;
								return (
									<div
										key={notif.id}
										onClick={() => handleNotifClick(notif)}
										style={{
											display: "flex",
											alignItems: "flex-start",
											gap: "12px",
											padding: "12px 16px",
											cursor: notif.docket_number ? "pointer" : "default",
											borderBottom: "1px solid var(--surface-border, #f1f5f9)",
											background: notif.read ? "transparent" : "var(--surface-50, #f8fafc)",
											transition: "background 0.15s"
										}}
										onMouseEnter={e => e.currentTarget.style.background = "var(--surface-100, #f1f5f9)"}
										onMouseLeave={e => e.currentTarget.style.background = notif.read ? "transparent" : "var(--surface-50, #f8fafc)"}
									>
										<div style={{
											width: "34px", height: "34px",
											borderRadius: "50%",
											background: icon.bg,
											color: icon.color,
											display: "flex", alignItems: "center", justifyContent: "center",
											flexShrink: 0
										}}>
											<i className={icon.icon} style={{ fontSize: "0.8rem" }} />
										</div>
										<div style={{ flex: 1, minWidth: 0 }}>
											<p style={{
												margin: "0 0 2px 0",
												fontSize: "0.8rem",
												color: "var(--text-color, #1e293b)",
												lineHeight: 1.4,
												fontWeight: notif.read ? "400" : "600"
											}}>
												{notif.message}
											</p>
											<span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
												{timeAgo(notif.created_at)}
											</span>
										</div>
										{!notif.read && (
											<div style={{
												width: "8px", height: "8px",
												borderRadius: "50%",
												background: "#6366f1",
												flexShrink: 0,
												marginTop: "4px"
											}} />
										)}
									</div>
								);
							})
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default NotificationBell;

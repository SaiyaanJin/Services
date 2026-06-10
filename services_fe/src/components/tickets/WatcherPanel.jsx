import React, { useState, useEffect } from "react";
import apiClient from "../../api";
import { getInitials, getAvatarColorClass } from "../../utils/ticketHelpers";

const WatcherPanel = ({ docketNumber, watchers = [], currentUser, onWatchersChange }) => {
	const [isWatching, setIsWatching] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (currentUser && watchers) {
			setIsWatching(watchers.some(w => w.emp_id === currentUser.emp_id));
		}
	}, [watchers, currentUser]);

	const handleToggle = async () => {
		if (!currentUser) return;
		setLoading(true);
		try {
			if (isWatching) {
				await apiClient.delete(`/tickets/${docketNumber}/watch`);
				setIsWatching(false);
				onWatchersChange?.(watchers.filter(w => w.emp_id !== currentUser.emp_id));
			} else {
				await apiClient.post(`/tickets/${docketNumber}/watch`);
				setIsWatching(true);
				onWatchersChange?.([...watchers, {
					emp_id: currentUser.emp_id,
					name: currentUser.name,
					email: currentUser.email || ""
				}]);
			}
		} catch (err) {
			console.error("Watch toggle failed:", err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
			{/* Watcher Avatars */}
			{watchers.length > 0 && (
				<div style={{ display: "flex", alignItems: "center" }}>
					{watchers.slice(0, 5).map((w, i) => {
						const avatarInfo = getAvatarColorClass(w.name || "?");
						return (
							<div
								key={w.emp_id || i}
								title={w.name}
								style={{
									width: "26px", height: "26px",
									borderRadius: "50%",
									background: avatarInfo.bg,
									color: avatarInfo.text,
									fontSize: "0.6rem",
									fontWeight: "700",
									display: "flex", alignItems: "center", justifyContent: "center",
									border: "2px solid var(--surface-card, #fff)",
									marginLeft: i > 0 ? "-8px" : "0",
									zIndex: 5 - i
								}}
							>
								{getInitials(w.name)}
							</div>
						);
					})}
					{watchers.length > 5 && (
						<div style={{
							width: "26px", height: "26px",
							borderRadius: "50%",
							background: "#e2e8f0",
							color: "#64748b",
							fontSize: "0.6rem",
							fontWeight: "700",
							display: "flex", alignItems: "center", justifyContent: "center",
							border: "2px solid var(--surface-card, #fff)",
							marginLeft: "-8px"
						}}>
							+{watchers.length - 5}
						</div>
					)}
					<span style={{ marginLeft: "8px", fontSize: "0.75rem", color: "#94a3b8" }}>
						{watchers.length} watcher{watchers.length !== 1 ? "s" : ""}
					</span>
				</div>
			)}

			{/* Watch/Unwatch Toggle */}
			<button
				onClick={handleToggle}
				disabled={loading}
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "5px",
					padding: "4px 12px",
					borderRadius: "20px",
					border: `1px solid ${isWatching ? "#6366f1" : "var(--surface-border, #e2e8f0)"}`,
					background: isWatching ? "#ede9fe" : "transparent",
					color: isWatching ? "#6366f1" : "#64748b",
					fontSize: "0.75rem",
					fontWeight: "600",
					cursor: "pointer",
					transition: "all 0.2s"
				}}
			>
				{loading
					? <i className="pi pi-spin pi-spinner" style={{ fontSize: "0.7rem" }} />
					: <i className={isWatching ? "pi pi-eye" : "pi pi-eye-slash"} style={{ fontSize: "0.7rem" }} />
				}
				{isWatching ? "Watching" : "Watch"}
			</button>
		</div>
	);
};

export default WatcherPanel;

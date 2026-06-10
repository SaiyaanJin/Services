import React from "react";

const PRIORITY_CONFIG = {
	Critical: { bg: "#fef2f2", color: "#dc2626", dot: "#dc2626", icon: "pi pi-exclamation-triangle" },
	High:     { bg: "#fff7ed", color: "#ea580c", dot: "#ea580c", icon: "pi pi-arrow-up" },
	Medium:   { bg: "#fffbeb", color: "#d97706", dot: "#d97706", icon: "pi pi-minus" },
	Low:      { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a", icon: "pi pi-arrow-down" }
};

const PriorityBadge = ({ priority, size = "sm", showIcon = true }) => {
	const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.Medium;
	const fontSize = size === "xs" ? "0.65rem" : size === "sm" ? "0.72rem" : "0.8rem";
	const padding = size === "xs" ? "1px 6px" : "3px 10px";
	const iconSize = size === "xs" ? "0.6rem" : "0.7rem";

	return (
		<span style={{
			display: "inline-flex",
			alignItems: "center",
			gap: "4px",
			background: cfg.bg,
			color: cfg.color,
			padding,
			borderRadius: "20px",
			fontSize,
			fontWeight: "700",
			letterSpacing: "0.02em",
			whiteSpace: "nowrap"
		}}>
			{showIcon && <i className={cfg.icon} style={{ fontSize: iconSize }} />}
			{priority || "Medium"}
		</span>
	);
};

export { PRIORITY_CONFIG };
export default PriorityBadge;

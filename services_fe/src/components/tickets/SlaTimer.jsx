import React, { useState, useEffect } from "react";

function formatDuration(totalSeconds) {
	if (totalSeconds <= 0) return null;
	const d = Math.floor(totalSeconds / 86400);
	const h = Math.floor((totalSeconds % 86400) / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

const SlaTimer = ({ slaDeadline, presentStatus }) => {
	const [secondsLeft, setSecondsLeft] = useState(null);

	useEffect(() => {
		if (!slaDeadline) return;
		const deadline = new Date(slaDeadline);
		const compute = () => {
			const now = new Date();
			const diff = Math.floor((deadline - now) / 1000);
			setSecondsLeft(diff);
		};
		compute();
		const interval = setInterval(compute, 30000); // update every 30 seconds
		return () => clearInterval(interval);
	}, [slaDeadline]);

	// Don't show for closed tickets
	const closedStatuses = ["Resolved", "Can not be Resolved", "Working (No Action Required)"];
	if (!slaDeadline || closedStatuses.includes(presentStatus)) return null;
	if (secondsLeft === null) return null;

	const isBreached = secondsLeft <= 0;
	const isWarning = !isBreached && secondsLeft < 8 * 3600; // < 8 hours = warning
	const isCritical = !isBreached && secondsLeft < 2 * 3600; // < 2 hours = critical

	let bg, color, icon, label;
	if (isBreached) {
		bg = "#fef2f2"; color = "#dc2626"; icon = "pi pi-exclamation-circle";
		label = `Overdue by ${formatDuration(Math.abs(secondsLeft))}`;
	} else if (isCritical) {
		bg = "#fff7ed"; color = "#ea580c"; icon = "pi pi-clock";
		label = `${formatDuration(secondsLeft)} left`;
	} else if (isWarning) {
		bg = "#fffbeb"; color = "#d97706"; icon = "pi pi-clock";
		label = `${formatDuration(secondsLeft)} left`;
	} else {
		bg = "#f0fdf4"; color = "#16a34a"; icon = "pi pi-check-circle";
		label = `${formatDuration(secondsLeft)} left`;
	}

	return (
		<span
			title={`SLA Deadline: ${new Date(slaDeadline).toLocaleString()}`}
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "5px",
				background: bg,
				color,
				padding: "3px 10px",
				borderRadius: "20px",
				fontSize: "0.72rem",
				fontWeight: "700",
				whiteSpace: "nowrap",
				animation: isBreached ? "pulse-badge 2s infinite" : "none"
			}}
		>
			<i className={icon} style={{ fontSize: "0.7rem" }} />
			{isBreached ? "⚠ " : ""}SLA: {label}
		</span>
	);
};

export default SlaTimer;

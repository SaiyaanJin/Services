/**
 * Shared helper functions for ticket display across the application.
 * Centralizes color mappings, icon logic, and formatting utilities
 * that were previously duplicated across TicketListPage and DepartmentPage.
 */

// ─── Initials & Avatar ───────────────────────────────────────────────

/**
 * Extract display initials from a user string like "Sanjay Kumar (00162)"
 */
export const getInitials = (name) => {
	if (!name) return "??";
	const cleanName = name.split("(")[0].trim();
	const parts = cleanName.split(/\s+/);
	if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Deterministic avatar background/text color based on name hash
 */
export const getAvatarColorClass = (name) => {
	if (!name) return { bg: "#f1f5f9", text: "#475569" };
	const colors = [
		{ bg: "#ccfbf1", text: "#0d9488" }, // Teal
		{ bg: "#fce7f3", text: "#db2777" }, // Pink
		{ bg: "#ffedd5", text: "#ea580c" }, // Orange
		{ bg: "#fef9c3", text: "#ca8a04" }, // Yellow
		{ bg: "#f3e8ff", text: "#8b5cf6" }, // Purple
		{ bg: "#dcfce7", text: "#16a34a" }, // Green
		{ bg: "#dbeafe", text: "#2563eb" }  // Blue
	];
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % colors.length;
	return colors[index];
};

// ─── Subject Icon Mapping ────────────────────────────────────────────

/**
 * Returns icon class, background color, and text color based on ticket subject keywords
 */
export const getSubjectIconInfo = (subject) => {
	const sub = (subject || "").toLowerCase();
	if (sub.includes("crms") || sub.includes("call") || sub.includes("support")) {
		return { icon: "pi pi-phone", bg: "#f3e8ff", color: "#a855f7" };
	}
	if (sub.includes("server") || sub.includes("database") || sub.includes("sql") || sub.includes("backup") || sub.includes("shutting")) {
		return { icon: "pi pi-server", bg: "#ffe4e6", color: "#f43f5e" };
	}
	if (sub.includes("pc") || sub.includes("desktop") || sub.includes("computer") || sub.includes("monitor") || sub.includes("transfer")) {
		return { icon: "pi pi-desktop", bg: "#e0f2fe", color: "#0284c7" };
	}
	if (sub.includes("acrobat") || sub.includes("pdf") || sub.includes("reader") || sub.includes("file") || sub.includes("document")) {
		return { icon: "pi pi-file-pdf", bg: "#fee2e2", color: "#ef4444" };
	}
	if (sub.includes("install") || sub.includes("notepad") || sub.includes("software") || sub.includes("code") || sub.includes("program")) {
		return { icon: "pi pi-code", bg: "#e0e7ff", color: "#4f46e5" };
	}
	if (sub.includes("laptop") || sub.includes("notebook") || sub.includes("hinge") || sub.includes("damage")) {
		return { icon: "pi pi-tablet", bg: "#ccfbf1", color: "#0d9488" };
	}
	if (sub.includes("eoffice") || sub.includes("hrms") || sub.includes("login") || sub.includes("account") || sub.includes("user")) {
		return { icon: "pi pi-user", bg: "#ffedd5", color: "#f97316" };
	}
	if (sub.includes("power") || sub.includes("battery") || sub.includes("charger") || sub.includes("electricity") || sub.includes("powering")) {
		return { icon: "pi pi-power-off", bg: "#e0f2fe", color: "#3b82f6" };
	}
	return { icon: "pi pi-ticket", bg: "#f1f5f9", color: "#64748b" };
};

// ─── Department Icon Mapping ─────────────────────────────────────────

/**
 * Returns icon class, background color, and text color based on department name
 */
export const getDeptIconInfo = (dept) => {
	const d = (dept || "").toLowerCase();
	if (d.includes("system operation")) {
		return { icon: "pi pi-cog", bg: "#e0f2fe", color: "#3b82f6" };
	}
	if (d.includes("scada")) {
		return { icon: "pi pi-sitemap", bg: "#f3e8ff", color: "#8b5cf6" };
	}
	if (d.includes("human resource")) {
		return { icon: "pi pi-users", bg: "#ffedd5", color: "#ea580c" };
	}
	if (d.includes("market operation")) {
		return { icon: "pi pi-clock", bg: "#e0f2fe", color: "#2563eb" };
	}
	if (d.includes("information technology") || d.includes("it")) {
		return { icon: "pi pi-desktop", bg: "#e0f2fe", color: "#0284c7" };
	}
	if (d.includes("finance") || d.includes("accounts")) {
		return { icon: "pi pi-wallet", bg: "#dcfce7", color: "#16a34a" };
	}
	if (d.includes("contracts") || d.includes("services")) {
		return { icon: "pi pi-briefcase", bg: "#fef9c3", color: "#ca8a04" };
	}
	return { icon: "pi pi-building", bg: "#f1f5f9", color: "#64748b" };
};

// ─── Status Colors ───────────────────────────────────────────────────

/**
 * Centralized status → color mapping used across list views and detail pages
 */
export const getStatusColors = (status) => {
	switch (status) {
		case "New Service Request":
			return { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" };
		case "Under Progress":
			return { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" };
		case "Resolved":
		case "Closed":
			return { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" };
		case "Can not be Resolved":
			return { bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444" };
		case "Working (No Action Required)":
			return { bg: "#f1f5f9", text: "#334155", dot: "#64748b" };
		default:
			return { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" };
	}
};

// Mapping SSO department codes to frontend display names
export const ssoDepartmentToDisplayName = {
	"IT-TS": "Information Technology",
	"IT": "Information Technology",
	"MO": "Market Operation",
	"MO-I": "Market Operation",
	"MO-II": "Market Operation",
	"MO-III": "Market Operation",
	"MO-IV": "Market Operation",
	"MIS": "System Operation",
	"SS": "System Operation",
	"CR": "System Operation",
	"SO": "System Operation",
	"SCADA": "SCADA",
	"CS": "Contracts & Services",
	"TS": "Technical Services",
	"HR": "Human Resource",
	"COMMUNICATION": "Communication",
	"F&A": "Finance & Accounts",
	"CONTROL ROOM": "Control Room"
};

// Mappings for backend querying logic (Legacy format compatibility)
export const ssoDepartmentToBackendName = {
	"HR": "Human Resource",
	"CS": "Contracts & Services",
	"F&A": "Finance & Accounts",
	"IT": "Information Technology",
	"COMMUNICATION": "Communication",
	"SCADA": "SCADA",
	"TS": "Technical Services",
	"MO": "Market Operation",
	"SO": "System Operation"
};

export const getDepartmentDisplayName = (ssoDept) => {
	if (!ssoDept) return "Unknown Department";
	const key = ssoDept.toUpperCase().trim();
	return ssoDepartmentToDisplayName[key] || ssoDept;
};

export const getDepartmentBackendName = (ssoDept) => {
	if (!ssoDept) return "";
	const key = ssoDept.toUpperCase().trim();
	
	// Support nested sub-department resolution
	if (key.startsWith("MO")) return "Market Operation";
	if (key.startsWith("SO") || key === "MIS" || key === "SS" || key === "CR") return "System Operation";
	if (key === "IT-TS") return "Information Technology";
	
	return ssoDepartmentToBackendName[key] || ssoDept;
};

export const getCompleteDepartmentName = (dept) => {
	if (!dept) return "";
	const d = dept.trim();
	if (d.includes("Logistics : IT") || d.includes("Logistics: IT")) {
		return "Logistics- IT Services";
	}
	if (d.includes("Logistics : TS") || d.includes("Logistics: TS")) {
		return "Logistics- Technical Services";
	}
	if (d.includes("Logistics : Communication") || d.includes("Logistics: Communication")) {
		return "Logistics- Communication";
	}
	if (d.includes("Logistics : OT") || d.includes("Logistics: OT")) {
		return "Logistics- OT (Decision Support)";
	}
	
	if (d.includes(":")) {
		const parts = d.split(":").map(p => p.trim());
		if (parts[0].toLowerCase() === parts[1].toLowerCase()) {
			return parts[0];
		}
		if (parts[1].toLowerCase().startsWith(parts[0].toLowerCase())) {
			return parts[1];
		}
		return `${parts[0]}- ${parts[1]}`;
	}
	return d;
};

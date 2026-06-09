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

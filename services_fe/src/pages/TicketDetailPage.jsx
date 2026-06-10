import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { useAuth } from "../context/AuthContext";
import { useTickets } from "../hooks/useTickets";
import { TicketDetailSkeleton } from "../components/common/SkeletonLoader";
import moment from "moment";
import apiClient, { API_BASE_URL } from "../api";
import { getDepartmentBackendName, getCompleteDepartmentName } from "../utils/departmentMap";
import { getStatusColors } from "../utils/ticketHelpers";


// Dynamic styling & theme logic based on Subject category
const getThemeDetails = (subject) => {
	const sub = (subject || "").toLowerCase();
	
	// Adobe Acrobat/PDF
	if (sub.includes("acrobat") || sub.includes("pdf") || sub.includes("reader") || sub.includes("adobe")) {
		return {
			themeClass: "theme-pdf",
			primaryColor: "#ef4444",
			accentColor: "#dc2626",
			lightBg: "#fee2e2",
			softBg: "#fef2f2",
			icon: "pi pi-file-pdf",
			category: "Adobe Acrobat",
			illustrationType: "pdf"
		};
	}
	// CRMS/Call/Support
	if (sub.includes("crms") || sub.includes("call") || sub.includes("support") || sub.includes("headset")) {
		return {
			themeClass: "theme-support",
			primaryColor: "#a855f7",
			accentColor: "#9333ea",
			lightBg: "#f3e8ff",
			softBg: "#faf5ff",
			icon: "pi pi-phone",
			category: "Customer Support",
			illustrationType: "support"
		};
	}
	// Server/Database
	if (sub.includes("server") || sub.includes("database") || sub.includes("sql") || sub.includes("backup") || sub.includes("shutting") || sub.includes("shutdown")) {
		return {
			themeClass: "theme-server",
			primaryColor: "#f43f5e",
			accentColor: "#e11d48",
			lightBg: "#ffe4e6",
			softBg: "#fff1f2",
			icon: "pi pi-server",
			category: "Infrastructure & Servers",
			illustrationType: "server"
		};
	}
	// PC/Desktop/Monitor
	if (sub.includes("pc") || sub.includes("desktop") || sub.includes("computer") || sub.includes("monitor") || sub.includes("transfer")) {
		return {
			themeClass: "theme-desktop",
			primaryColor: "#0284c7",
			accentColor: "#0369a1",
			lightBg: "#e0f2fe",
			softBg: "#f0f9ff",
			icon: "pi pi-desktop",
			category: "Desktop Workstation",
			illustrationType: "desktop"
		};
	}
	// Laptop/Device
	if (sub.includes("laptop") || sub.includes("notebook") || sub.includes("hinge") || sub.includes("damage")) {
		return {
			themeClass: "theme-laptop",
			primaryColor: "#0d9488",
			accentColor: "#0f766e",
			lightBg: "#ccfbf1",
			softBg: "#f0fdfa",
			icon: "pi pi-tablet",
			category: "Laptop Device",
			illustrationType: "laptop"
		};
	}
	// Eoffice/HRMS
	if (sub.includes("eoffice") || sub.includes("hrms") || sub.includes("login") || sub.includes("account") || sub.includes("user")) {
		return {
			themeClass: "theme-login",
			primaryColor: "#f97316",
			accentColor: "#ea580c",
			lightBg: "#ffedd5",
			softBg: "#fff7ed",
			icon: "pi pi-user",
			category: "Identity & Access",
			illustrationType: "login"
		};
	}
	// Software/Notepad++
	if (sub.includes("install") || sub.includes("notepad") || sub.includes("software") || sub.includes("code") || sub.includes("program")) {
		return {
			themeClass: "theme-code",
			primaryColor: "#4f46e5",
			accentColor: "#4338ca",
			lightBg: "#e0e7ff",
			softBg: "#eef2ff",
			icon: "pi pi-code",
			category: "Software Installation",
			illustrationType: "code"
		};
	}
	// Fallback
	return {
		themeClass: "theme-default",
		primaryColor: "#3b82f6",
		accentColor: "#2563eb",
		lightBg: "#dbeafe",
		softBg: "#eff6ff",
		icon: "pi pi-ticket",
		category: "General Ticket",
		illustrationType: "general"
	};
};

// SVG Illustrations based on ticket title category
const IssueIllustration = ({ type, primaryColor, accentColor }) => {
	switch (type) {
		case "pdf":
			return (
				<svg width="220" height="150" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto' }}>
					<circle cx="170" cy="50" r="30" fill={`${primaryColor}0c`} />
					<rect x="20" y="80" width="40" height="40" rx="8" fill={`${primaryColor}08`} />
					<rect x="50" y="20" width="120" height="80" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
					<rect x="55" y="25" width="110" height="70" rx="4" fill="#ffffff" />
					<path d="M100 100 L95 125 L125 125 L120 100 Z" fill="#cbd5e1" />
					<rect x="80" y="125" width="60" height="6" rx="3" fill="#94a3b8" />
					<rect x="75" y="38" width="70" height="44" rx="6" fill={`${primaryColor}0d`} stroke={`${primaryColor}30`} strokeWidth="1.5" />
					<path d="M90 68 C 95 50, 115 50, 120 62 C 122 66, 126 68, 130 68" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" />
					<circle cx="105" cy="58" r="4" fill={primaryColor} />
					<circle cx="118" cy="62" r="3.5" fill={primaryColor} />
					<g transform="translate(150, 80)">
						<path d="M15 0 L30 26 C31 28, 30 30, 27 30 L3 30 C0 30, -1 28, 1 26 Z" fill={primaryColor} />
						<text x="12" y="23" fill="#ffffff" fontSize="18" fontWeight="bold" fontFamily="monospace">!</text>
					</g>
				</svg>
			);
		case "support":
			return (
				<svg width="220" height="150" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto' }}>
					<circle cx="160" cy="60" r="40" fill={`${primaryColor}0c`} />
					<circle cx="60" cy="100" r="25" fill={`${primaryColor}06`} />
					<circle cx="110" cy="70" r="35" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 5" fill="#ffffff" />
					<path d="M75 75 C 75 40, 145 40, 145 75" stroke={primaryColor} strokeWidth="5" strokeLinecap="round" fill="none" />
					<rect x="68" y="70" width="14" height="25" rx="5" fill={primaryColor} />
					<rect x="138" y="70" width="14" height="25" rx="5" fill={primaryColor} />
					<path d="M78 85 L95 95 C98 97, 102 95, 102 91" stroke={accentColor} strokeWidth="3" strokeLinecap="round" fill="none" />
					<circle cx="102" cy="91" r="3" fill={accentColor} />
					<path d="M120 110 Q130 105 140 110" stroke={`${primaryColor}80`} strokeWidth="2" strokeLinecap="round" fill="none" />
					<path d="M123 116 Q130 112 137 116" stroke={`${primaryColor}50`} strokeWidth="2" strokeLinecap="round" fill="none" />
					<g transform="translate(150, 75)">
						<circle cx="15" cy="15" r="15" fill={accentColor} />
						<path d="M10 15 L14 19 L21 11" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
					</g>
				</svg>
			);
		case "server":
			return (
				<svg width="220" height="150" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto' }}>
					<circle cx="180" cy="50" r="35" fill={`${primaryColor}0a`} />
					<rect x="60" y="20" width="100" height="100" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
					<rect x="68" y="30" width="84" height="20" rx="4" fill="#ffffff" stroke={`${primaryColor}40`} strokeWidth="1.5" />
					<circle cx="78" cy="40" r="3" fill="#22c55e" />
					<circle cx="88" cy="40" r="3" fill="#eab308" />
					<line x1="105" y1="40" x2="140" y2="40" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
					<rect x="68" y="60" width="84" height="20" rx="4" fill="#ffffff" stroke={`${primaryColor}40`} strokeWidth="1.5" />
					<circle cx="78" cy="70" r="3" fill="#22c55e" />
					<circle cx="88" cy="70" r="3" fill={primaryColor} />
					<line x1="105" y1="70" x2="140" y2="70" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
					<rect x="68" y="90" width="84" height="20" rx="4" fill="#ffffff" stroke={`${primaryColor}40`} strokeWidth="1.5" />
					<circle cx="78" cy="100" r="3" fill="#cbd5e1" />
					<circle cx="88" cy="100" r="3" fill="#cbd5e1" />
					<line x1="105" y1="100" x2="140" y2="100" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
					<g transform="translate(145, 85)">
						<path d="M15 0 L30 26 C31 28, 30 30, 27 30 L3 30 C0 30, -1 28, 1 26 Z" fill={primaryColor} />
						<text x="12" y="23" fill="#ffffff" fontSize="18" fontWeight="bold" fontFamily="monospace">!</text>
					</g>
				</svg>
			);
		case "desktop":
			return (
				<svg width="220" height="150" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto' }}>
					<circle cx="50" cy="50" r="30" fill={`${primaryColor}0c`} />
					<rect x="40" y="20" width="140" height="90" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
					<rect x="46" y="26" width="128" height="78" rx="4" fill="#ffffff" />
					<rect x="56" y="36" width="108" height="10" rx="3" fill={`${primaryColor}1a`} />
					<rect x="56" y="52" width="60" height="6" rx="3" fill="#f1f5f9" />
					<rect x="56" y="64" width="80" height="6" rx="3" fill="#f1f5f9" />
					<path d="M102 110 L96 132 L124 132 L118 110 Z" fill="#cbd5e1" stroke="#cbd5e1" strokeWidth="1" />
					<rect x="85" y="132" width="50" height="6" rx="3" fill="#94a3b8" />
					<path d="M150 90 L180 90 L180 120" stroke={accentColor} strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" fill="none" />
					<circle cx="180" cy="120" r="4" fill={accentColor} />
				</svg>
			);
		case "laptop":
			return (
				<svg width="220" height="150" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto' }}>
					<circle cx="170" cy="50" r="35" fill={`${primaryColor}0a`} />
					<rect x="50" y="30" width="120" height="76" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
					<rect x="55" y="35" width="110" height="66" rx="4" fill="#ffffff" />
					<rect x="65" y="45" width="90" height="46" rx="4" fill={`${primaryColor}0a`} />
					<path d="M90 68 L105 55 L130 75" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
					<path d="M30 106 L190 106 L182 118 L38 118 Z" fill="#cbd5e1" stroke="#cbd5e1" strokeWidth="1" />
					<rect x="95" y="106" width="30" height="4" rx="2" fill="#94a3b8" />
					<circle cx="50" cy="106" r="8" fill={`${accentColor}20`} stroke={accentColor} strokeWidth="1.5" />
					<circle cx="50" cy="106" r="3" fill={accentColor} />
				</svg>
			);
		case "login":
			return (
				<svg width="220" height="150" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto' }}>
					<circle cx="170" cy="100" r="30" fill={`${primaryColor}0c`} />
					<rect x="50" y="25" width="120" height="85" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
					<circle cx="110" cy="50" r="16" fill={`${primaryColor}15`} stroke={`${primaryColor}30`} strokeWidth="1" />
					<circle cx="110" cy="46" r="6" fill={primaryColor} />
					<path d="M98 62 C98 56, 122 56, 122 62" stroke={primaryColor} strokeWidth="2" fill="none" />
					<circle cx="95" cy="85" r="3" fill="#cbd5e1" />
					<circle cx="110" cy="85" r="3" fill="#cbd5e1" />
					<circle cx="125" cy="85" r="3" fill="#cbd5e1" />
					<g transform="translate(140, 75)">
						<rect x="2" y="8" width="18" height="14" rx="3" fill={accentColor} />
						<path d="M6 8 V5 C6 2.5, 16 2.5, 16 5 V8" stroke={accentColor} strokeWidth="2.5" fill="none" />
						<circle cx="11" cy="15" r="2.5" fill="#ffffff" />
					</g>
				</svg>
			);
		case "code":
			return (
				<svg width="220" height="150" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto' }}>
					<circle cx="50" cy="100" r="25" fill={`${primaryColor}08`} />
					<rect x="50" y="25" width="120" height="90" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
					<circle cx="62" cy="35" r="3" fill="#ef4444" />
					<circle cx="72" cy="35" r="3" fill="#eab308" />
					<circle cx="82" cy="35" r="3" fill="#22c55e" />
					<path d="M60 55 L75 65 L60 75" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
					<path d="M85 75 H130" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
					<path d="M60 90 H100" stroke={`${accentColor}aa`} strokeWidth="3" strokeLinecap="round" />
					<g transform="translate(145, 75)">
						<circle cx="15" cy="15" r="16" fill={accentColor} stroke="#ffffff" strokeWidth="2" />
						<path d="M15 8 V20 M11 16 L15 20 L19 16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</g>
				</svg>
			);
		default:
			return (
				<svg width="220" height="150" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto' }}>
					<circle cx="160" cy="50" r="30" fill={`${primaryColor}0a`} />
					<rect x="65" y="25" width="90" height="100" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
					<rect x="95" y="18" width="30" height="10" rx="3" fill="#cbd5e1" />
					<line x1="80" y1="45" x2="140" y2="45" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
					<line x1="80" y1="65" x2="120" y2="65" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" />
					<line x1="80" y1="85" x2="135" y2="85" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
					<line x1="80" y1="105" x2="110" y2="105" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
				</svg>
			);
	}
};

const formatEvent = (event) => {
	const name = event?.Name || "";
	let author = "System";
	let dept = "";
	let type = "Comment";
	
	const parts = name.split(")");
	if (parts.length > 0) {
		const authorPart = parts[0].split("(");
		if (authorPart.length > 0) {
			author = authorPart[0].replace(/^\d+\./, "").trim();
		}
		
		if (parts[1]) {
			const typeParts = parts[1].trim().split(" ");
			if (typeParts.length > 1) {
				type = typeParts[typeParts.length - 1]; // "Comment", "StatusChange", etc.
				dept = typeParts.slice(0, typeParts.length - 1).join(" ").trim();
			} else {
				type = typeParts[0];
			}
		}
	}
	
	let bubbleClass = "chat-bubble";
	let badgeSeverity = "info";
	
	if (type === "Comment") {
		bubbleClass += " chat-bubble-creator";
		badgeSeverity = "info";
	} else if (type === "StatusChange") {
		bubbleClass += " chat-bubble-handler";
		badgeSeverity = "warning";
	} else if (type === "CreatorFeedback") {
		bubbleClass += " chat-bubble-system";
		badgeSeverity = "success";
	}
	
	const initials = author.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "SY";
	
	return { author, dept, type, bubbleClass, badgeSeverity, initials };
};

const getFileList = (fileField) => {
	if (!fileField) return [];
	if (Array.isArray(fileField)) {
		return fileField.filter(f => f && f !== "No file was Uploaded");
	}
	if (typeof fileField === "string") {
		if (fileField === "No file was Uploaded") return [];
		try {
			const parsed = JSON.parse(fileField);
			if (Array.isArray(parsed)) {
				return parsed.filter(f => f && f !== "No file was Uploaded");
			}
		} catch (e) {}
		return fileField.split(",").map(f => f.trim()).filter(f => f && f !== "No file was Uploaded");
	}
	return [];
};

const TicketDetailPage = () => {
	const { docketNumber } = useParams();
	const navigate = useNavigate();
	const { user, token } = useAuth();
	const toast = useRef(null);
	
	const { fetchTickets, updateTicket, updateTicketBrief, updateTicketStatus } = useTickets();
	const [ticket, setTicket] = useState(null);
	const [loading, setLoading] = useState(true);
	
	// Comment & Action states
	const [commentText, setCommentText] = useState("");
	const [isEditingDesc, setIsEditingDesc] = useState(false);
	const [newDesc, setNewDesc] = useState("");
	
	// Department status change states
	const [selectedStatus, setSelectedStatus] = useState(null);
	const [statusRemarks, setStatusRemarks] = useState("");
	const [sendingReminder, setSendingReminder] = useState(false);
	
	// Load ticket on mount
	const loadTicketDetails = useCallback(async () => {
		setLoading(true);
		try {
			let list = [];
			const resolvedDept = getDepartmentBackendName(user?.sso_department);
			
			if (user?.role === "admin") {
				list = await fetchTickets("admin");
			} else {
				const userList = await fetchTickets("user");
				let deptList = [];
				try {
					deptList = await fetchTickets("department_admin", resolvedDept);
				} catch (e) {}
				list = [...userList, ...deptList];
			}
			
			const foundTicket = list.find(t => String(t.Docket_Number) === String(docketNumber));
			
			if (foundTicket) {
				setTicket(foundTicket);
				setNewDesc(foundTicket.Breif || foundTicket.description || "");
			} else {
				toast.current?.show({
					severity: "error",
					summary: "Not Found",
					detail: "Ticket not found or unauthorized access",
					life: 3000
				});
			}
		} catch (err) {
			console.error("Error loading ticket details:", err);
		} finally {
			setLoading(false);
		}
	}, [docketNumber, fetchTickets, user]);

	useEffect(() => {
		if (user) loadTicketDetails();
	}, [user, loadTicketDetails]);

	const isReminderDisabled = () => {
		if (!ticket) return true;
		
		const now = moment();
		const inputDate = moment(ticket.Input_Date, [
			"DD-MM-YYYY hh:mm a",
			"DD-MM-YYYY hh:mma",
			"DD-MM-YYYY HH:mm",
			"DD-MM-YYYY HH:mm:ss"
		]);
		
		if (!inputDate.isValid()) return false;
		
		// 1. Created today
		if (inputDate.isSame(now, 'day')) {
			return true;
		}
		
		// 2. Already sent today
		if (ticket.Last_Manual_Reminder_Date) {
			const lastSent = moment(ticket.Last_Manual_Reminder_Date, "DD-MM-YYYY");
			if (lastSent.isValid() && lastSent.isSame(now, 'day')) {
				return true;
			}
		}
		
		return false;
	};

	const sendReminderMail = async () => {
		if (!ticket || !ticket.Docket_Number) return;
		setSendingReminder(true);
		try {
			const response = await apiClient.get("/SendTicketReminder", {
				headers: { Data: String(ticket.Docket_Number) }
			});
			if (response.data === "Success") {
				toast.current?.show({
					severity: "success",
					summary: "Reminder Sent",
					detail: `Reminder email successfully sent to ${ticket.Department} department!`,
					life: 4000
				});
				
				// Update local state so button gets disabled immediately
				const todayStr = moment().format("DD-MM-YYYY");
				setTicket(prev => prev ? { ...prev, Last_Manual_Reminder_Date: todayStr } : null);
			} else {
				throw new Error("Failed to send reminder");
			}
		} catch (err) {
			console.error("Failed to send reminder:", err);
			toast.current?.show({
				severity: "error",
				summary: "Error",
				detail: err.response?.data?.detail || "Failed to send reminder email. Please try again later.",
				life: 4000
			});
		} finally {
			setSendingReminder(false);
		}
	};


	// Parse timeline actions
	const getTimelineEvents = () => {
		const events = [];
		if (ticket && Array.isArray(ticket.Actions_Taken)) {
			ticket.Actions_Taken.forEach((actionBatch) => {
				if (Array.isArray(actionBatch)) {
					actionBatch.forEach((act) => {
						if (act && act.Name) events.push(act);
					});
				} else if (actionBatch && actionBatch.Name) {
					events.push(actionBatch);
				}
			});
		}
		
		return events.sort((a, b) => {
			const dateA = moment(a.Date, "DD-MM-YYYY hh:mm a");
			const dateB = moment(b.Date, "DD-MM-YYYY hh:mm a");
			return dateA - dateB;
		});
	};

	// Save modified description
	const handleSaveDescription = async () => {
		if (!newDesc.trim()) return;
		try {
			const updatedTicket = { ...ticket, Breif: newDesc };
			const res = await updateTicketBrief(updatedTicket);
			if (res === "Success") {
				toast.current?.show({ severity: "success", summary: "Success", detail: "Description updated successfully" });
				setTicket(updatedTicket);
				setIsEditingDesc(false);
			} else {
				throw new Error();
			}
		} catch (e) {
			toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to update description" });
		}
	};

	// Post a comment/remark (as a timeline action)
	const handleAddComment = async () => {
		if (!commentText.trim()) return;
		
		const idx = (ticket.Actions_Taken || []).length + 1;
		const authorName = `${user.name} (${user.emp_id})`;
		
		const newAction = {
			Action: commentText,
			Date: moment().format("DD-MM-YYYY hh:mm a"),
			Name: `${idx}.${authorName} ${user.department} Comment`
		};

		const updatedActions = [...(ticket.Actions_Taken || []), [newAction]];
		const updatedTicket = { ...ticket, Actions_Taken: updatedActions };

		try {
			const res = await updateTicket(updatedTicket);
			if (res === "Success") {
				toast.current?.show({ severity: "success", summary: "Comment Added", detail: "Your remark was added successfully" });
				setTicket(updatedTicket);
				setCommentText("");
			} else {
				throw new Error();
			}
		} catch (e) {
			toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to post comment" });
		}
	};

	// Handle Department Status Update
	const handleStatusChange = async () => {
		if (!selectedStatus) return;
		
		const idx = (ticket.Actions_Taken || []).length + 1;
		const authorName = `${user.name} (${user.emp_id})`;
		
		const statusText = statusRemarks.trim() 
			? `Status changed to ${selectedStatus}. Remarks: ${statusRemarks}`
			: `Status changed to ${selectedStatus}.`;

		const newAction = {
			Action: statusText,
			Date: moment().format("DD-MM-YYYY hh:mm a"),
			Name: `${idx}.${authorName} ${user.department} StatusChange`
		};

		const editorLegacyName = `1.${user.name} (${user.emp_id}) ${user.department}`;

		const updatedTicket = {
			...ticket,
			Present_Status: selectedStatus,
			Old_Status: ticket.Present_Status,
			Actions_Taken: [...(ticket.Actions_Taken || []), [newAction]],
			Data_Edited_by: editorLegacyName
		};

		try {
			const res = await updateTicketStatus(updatedTicket);
			if (res === "Success") {
				toast.current?.show({ 
					severity: "success", 
					summary: "Status Updated", 
					detail: `Ticket status set to ${selectedStatus}. Redirecting in 5 seconds...`,
					life: 5000
				});
				setTicket(updatedTicket);
				setSelectedStatus(null);
				setStatusRemarks("");
				
				setTimeout(() => {
					const tokenQuery = token ? `?token=${token}` : "";
					navigate(`/Department${tokenQuery}`);
				}, 5000);
			} else {
				throw new Error();
			}
		} catch (e) {
			toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to update ticket status" });
		}
	};

	// Handle Ticket Acceptance or Denial by Creator
	const handleCreatorResolutionResponse = async (accept) => {
		const statusChoice = accept ? "Resolved" : "Under Progress";
		const actionText = accept 
			? "Resolution Accepted. Ticket closed." 
			: "Resolution Denied. Ticket reopened for further investigation.";
		
		const idx = (ticket.Actions_Taken || []).length + 1;
		const authorName = `${user.name} (${user.emp_id})`;
		
		const newAction = {
			Action: actionText,
			Date: moment().format("DD-MM-YYYY hh:mm a"),
			Name: `${idx}.${authorName} ${user.department} CreatorFeedback`
		};

		const updatedTicket = {
			...ticket,
			Present_Status: statusChoice,
			Old_Status: accept ? "Resolved" : ticket.Old_Status,
			Ticket_Closed: accept,
			Actions_Taken: [...(ticket.Actions_Taken || []), [newAction]],
			Data_Edited_by: `1.${user.name} (${user.emp_id}) ${user.department}`
		};

		try {
			const res = await updateTicketStatus(updatedTicket);
			if (res === "Success") {
				toast.current?.show({
					severity: "success",
					summary: accept ? "Ticket Closed" : "Ticket Reopened",
					detail: accept ? "Resolution accepted successfully" : "Ticket status reset to Under Progress"
				});
				setTicket(updatedTicket);
			} else {
				throw new Error();
			}
		} catch (e) {
			toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to save response" });
		}
	};

	// File Attachment download
	const downloadAttachment = () => {
		const files = getFileList(ticket?.File);
		if (files.length === 0) return;
		const filesJoined = files.join("|");
		const url = `${API_BASE_URL}/download?path=${encodeURIComponent(filesJoined)}&File_Name=Ticket_${ticket.Docket_Number}_Attachments`;
		
		apiClient.get(url, { responseType: "blob" })
			.then((response) => {
				const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
				const link = document.createElement('a');
				link.href = blobUrl;
				link.setAttribute('download', `Ticket_${ticket.Docket_Number}_Attachments.zip`);
				document.body.appendChild(link);
				link.click();
				link.parentNode.removeChild(link);
			})
			.catch((e) => {
				toast.current?.show({ severity: "error", summary: "Download Failed", detail: "Failed to download attachments" });
			});
	};

	// Share Docket link copy
	const copyShareLink = () => {
		navigator.clipboard.writeText(window.location.href);
		toast.current?.show({
			severity: "success",
			summary: "Link Copied!",
			detail: "Docket URL has been copied to your clipboard.",
			life: 2000
		});
	};

	// Export Docket report
	const exportDocketReport = () => {
		const events = getTimelineEvents();
		const reportContent = `ERLDC SERVICES PORTAL - DOCKET REPORT
=====================================
Docket Number: ${ticket.Docket_Number}
Subject: ${ticket.Subject}
Raising Date: ${ticket.Input_Date}
Status: ${ticket.Present_Status}
Raised By: ${ticket.Data_Filled_by}
Target Department: ${ticket.Department}
User Department: ${ticket.User_Department || "—"}

DESCRIPTION
-----------
${ticket.Breif || ticket.description || "No description provided."}

ACTIVITY LOG
------------
${events.map((e, idx) => `[${idx + 1}] ${e.Date} - ${formatEvent(e).author}: ${e.Action}`).join("\n")}
`;
		const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
		import("file-saver").then((module) => {
			if (module && module.default) {
				module.default.saveAs(blob, `Docket_${ticket.Docket_Number}_Report.txt`);
			}
		});
	};

	// Check if user belongs to the assigned ticket department
	const canManageTicket = () => {
		if (!ticket || !user) return false;
		if (user.role === "admin") return true;
		
		const ssoDeptUpper = user.sso_department.toUpperCase().trim();
		const ticketDeptLower = ticket.Department.toLowerCase().trim();
		
		if (ssoDeptUpper === "IT" && (ticketDeptLower.includes("logistics : it") || ticketDeptLower.includes("cyber security"))) return true;
		if (ssoDeptUpper === "HR" && ticketDeptLower.includes("human resource")) return true;
		if (ssoDeptUpper === "F&A" && ticketDeptLower.includes("finance")) return true;
		if (ssoDeptUpper === "CS" && ticketDeptLower.includes("contract")) return true;
		if (ssoDeptUpper === "TS" && ticketDeptLower.includes("logistics : ts")) return true;
		if (ssoDeptUpper === "COMMUNICATION" && ticketDeptLower.includes("communication")) return true;
		if (ssoDeptUpper === "SCADA" && ticketDeptLower.includes("ot (decision support)")) return true;
		if (ssoDeptUpper === "MO" && ticketDeptLower.includes("market operation")) return true;
		if (ssoDeptUpper === "SO" && ticketDeptLower.includes("system operation")) return true;

		return false;
	};

	const isCreator = () => {
		if (!ticket || !user) return false;
		return ticket.Data_Filled_by.includes(`(${user.emp_id})`);
	};

	const isTicketClosed = () => {
		if (!ticket) return false;
		return ticket.Ticket_Closed || (ticket.Present_Status === "Resolved" && ticket.Old_Status === "Resolved");
	};

	if (loading) return <TicketDetailSkeleton />;
	if (!ticket) return <div className="p-4 text-center">Ticket details could not be loaded.</div>;

	const timelineEvents = getTimelineEvents();
	const closed = isTicketClosed();
	const departmentStaff = canManageTicket();
	const creator = isCreator();
	const theme = getThemeDetails(ticket.Subject);
	const statusColors = getStatusColors(ticket.Present_Status);

	const statusOptions = [
		{ label: "Under Progress", value: "Under Progress" },
		{ label: "Resolved", value: "Resolved" },
		{ label: "Can not be Resolved", value: "Can not be Resolved" },
		{ label: "Working (No Action Required)", value: "Working (No Action Required)" }
	];

	const attachments = getFileList(ticket?.File);

	return (
		<div className="w-full flex flex-column gap-4 animate-slide-up">
			<Toast ref={toast} />

			{/* Custom Top Navigation & Title Bar */}
			<div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3">
				<div className="flex align-items-center gap-3">
					<button 
						className="ticket-detail-header-btn p-0 border-round-circle flex align-items-center justify-content-center"
						onClick={() => navigate(-1)}
						style={{ width: '40px', height: '40px', border: '1px solid #e2e8f0' }}
					>
						<i className="pi pi-arrow-left" style={{ fontSize: '0.9rem' }} />
					</button>
					<div>
						<div className="flex align-items-center gap-2">
							<h2 className="text-xl font-bold text-900 m-0">Docket #{ticket.Docket_Number}</h2>
							<div className="inline-flex align-items-center px-2.5 py-1 border-round-pill text-xs font-semibold" style={{ 
								backgroundColor: statusColors.bg, 
								color: statusColors.text,
								whiteSpace: 'nowrap'
							}}>
								<span className="border-round-circle mr-1.5" style={{ 
									display: 'inline-block', 
									width: '5px', 
									height: '5px', 
									backgroundColor: statusColors.dot 
								}} />
								{ticket.Present_Status}
							</div>
						</div>
						<div className="text-xs text-500 mt-1 flex align-items-center gap-1">
							<span>Raised on {ticket.Input_Date}</span>
						</div>
					</div>
				</div>

				<div className="flex align-items-center gap-2">
					<button className="ticket-detail-header-btn" style={{ width: '40px', height: '40px', padding: 0 }} onClick={copyShareLink}>
						<i className="pi pi-ellipsis-h" style={{ fontSize: '0.85rem' }} />
					</button>
					<button className="ticket-detail-header-btn flex align-items-center gap-2" onClick={copyShareLink}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
							<polyline points="16 6 12 2 8 6" />
							<line x1="12" y1="2" x2="12" y2="15" />
						</svg>
						<span>Share</span>
					</button>
					<button 
						className="ticket-detail-primary-btn flex align-items-center gap-2"
						onClick={exportDocketReport}
						style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="7 10 12 15 17 10" />
							<line x1="12" y1="15" x2="12" y2="3" />
						</svg>
						<span>Export Docket</span>
					</button>
				</div>
			</div>

			{/* Main Grid Structure */}
			<div className="grid p-0 m-0 gap-4">
				
				{/* 1. Subject Description Box (Full Width) */}
				<div className="col-12 p-0">
					<div className="ticket-detail-card flex flex-column gap-4 relative overflow-hidden" style={{ marginBottom: 0 }}>
						
						{/* Card Header & Content block */}
						<div className="flex justify-content-between align-items-start gap-4">
							<div className="flex-grow-1 flex flex-column gap-3">
								<div className="flex align-items-center gap-3">
									<div className="flex align-items-center justify-content-center border-round-xl" style={{ 
										width: '44px', 
										height: '44px', 
										backgroundColor: theme.softBg, 
										color: theme.primaryColor,
										border: `1px solid ${theme.lightBg}`
									}}>
										<i className={theme.icon} style={{ fontSize: '1.25rem' }} />
									</div>
									<div className="flex flex-column">
										<span className="text-3xs font-bold text-500 uppercase tracking-wider mb-1" style={{ letterSpacing: '0.5px' }}>Subject</span>
										<h3 className="text-lg font-bold text-900 m-0" style={{ letterSpacing: '-0.3px' }}>{ticket.Subject}</h3>
									</div>
								</div>

								{/* Description content */}
								<div className="mt-2 flex flex-column gap-1">
									<span className="text-3xs font-bold text-500 uppercase tracking-wider mb-1" style={{ letterSpacing: '0.5px' }}>Description</span>
									{isEditingDesc ? (
										<div className="flex flex-column gap-2">
											<textarea 
												value={newDesc} 
												onChange={(e) => setNewDesc(e.target.value)} 
												rows={4} 
												className="w-full ticket-detail-textarea"
											/>
											<div className="flex gap-2 justify-content-end">
												<button 
													className="ticket-detail-primary-btn px-4 py-2 text-xs" 
													onClick={handleSaveDescription}
													style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}
												>
													Save
												</button>
												<button 
													className="ticket-detail-outline-btn px-4 py-2 text-xs border-1 border-300 text-700" 
													onClick={() => setIsEditingDesc(false)}
												>
													Cancel
												</button>
											</div>
										</div>
									) : (
										<div className="flex flex-column gap-3 align-items-start">
											<p className="m-0 text-700 text-sm line-height-3 white-space-pre-wrap w-full">
												{ticket.Breif || ticket.description || "No description provided."}
											</p>
											{ticket.Present_Status !== "Resolved" && ticket.Present_Status !== "Closed" && !ticket.Ticket_Closed && (() => {
												const reminderDisabled = isReminderDisabled();
												const now = moment();
												return (
													<div className="flex flex-column gap-1.5 align-items-start mt-1">
														<button
															className="flex align-items-center gap-2"
															onClick={sendReminderMail}
															disabled={sendingReminder || reminderDisabled}
															style={{ 
																padding: '8px 18px', 
																fontSize: '0.8rem', 
																border: 'none',
																color: '#ffffff',
																background: reminderDisabled 
																	? '#cbd5e1' 
																	: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
																borderRadius: '20px',
																fontWeight: '700',
																cursor: reminderDisabled ? 'not-allowed' : 'pointer',
																transition: 'all 0.3s ease',
																boxShadow: reminderDisabled 
																	? 'none' 
																	: '0 0 12px rgba(239, 68, 68, 0.55), 0 4px 6px rgba(239, 68, 68, 0.15)',
																letterSpacing: '0.3px',
																opacity: reminderDisabled ? 0.8 : 1
															}}
															onMouseEnter={(e) => {
																if (!reminderDisabled) {
																	e.currentTarget.style.background = 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)';
																	e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.85), 0 6px 8px rgba(239, 68, 68, 0.25)';
																	e.currentTarget.style.transform = 'translateY(-1px)';
																}
															}}
															onMouseLeave={(e) => {
																if (!reminderDisabled) {
																	e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
																	e.currentTarget.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.55), 0 4px 6px rgba(239, 68, 68, 0.15)';
																	e.currentTarget.style.transform = 'translateY(0)';
																}
															}}
														>
															{sendingReminder ? (
																<i className="pi pi-spin pi-spinner" style={{ fontSize: '0.8rem' }} />
															) : (
																<i className="pi pi-bell" style={{ fontSize: '0.8rem' }} />
															)}
															<span>Send Reminder to Department</span>
														</button>
														{reminderDisabled && (
															<span className="text-xs text-500 font-medium ml-1" style={{ color: '#ef4444' }}>
																{moment(ticket.Input_Date, ["DD-MM-YYYY hh:mm a", "DD-MM-YYYY hh:mma", "DD-MM-YYYY HH:mm", "DD-MM-YYYY HH:mm:ss"]).isSame(now, 'day')
																	? "⚠ Reminders can only be sent starting tomorrow."
																	: "⚠ Only one reminder can be sent per day."}
															</span>
														)}
													</div>
												);
											})()}
										</div>
									)}
								</div>
							</div>

							{/* Right-aligned Vector/SVG Illustration */}
							<div className="hidden sm:flex align-items-center justify-content-center" style={{ flexShrink: 0, width: '220px' }}>
								<IssueIllustration 
									type={theme.illustrationType} 
									primaryColor={theme.primaryColor} 
									accentColor={theme.accentColor} 
								/>
							</div>
						</div>

						{/* Attachments segment strip */}
						{attachments.length > 0 && (
							<div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between p-3 border-round-xl border-1 border-50 gap-3 mt-2" style={{ backgroundColor: '#ffffff' }}>
								<div className="flex align-items-center gap-2 text-sm">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
										<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
									</svg>
									<span className="font-bold text-800">Attachments ({attachments.length})</span>
									<span className="text-400">|</span>
									<span className="text-600 font-medium">{attachments.join(", ")}</span>
								</div>
								<button 
									className="ticket-detail-outline-btn flex align-items-center gap-2 text-xs border-1 border-300"
									onClick={downloadAttachment}
									style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
										<polyline points="7 10 12 15 17 10" />
										<line x1="12" y1="15" x2="12" y2="3" />
									</svg>
									<span>Download Zip</span>
								</button>
							</div>
						)}
					</div>
				</div>

				{/* 2. Activity and Audit Logs panel (Full Width) */}
				<div className="col-12 p-0">
					<div className="ticket-detail-card flex flex-column gap-3" style={{ marginBottom: 0 }}>
						<div className="flex align-items-center gap-2 mb-2">
							<div className="flex align-items-center justify-content-center border-round-lg" style={{ 
								width: '28px', 
								height: '28px', 
								backgroundColor: '#f5f3ff', 
								color: '#6366f1' 
							}}>
								<i className="pi pi-list" style={{ fontSize: '0.85rem' }} />
							</div>
							<h3 className="text-md font-bold text-900 m-0">Activity & Audit Logs</h3>
						</div>

						{/* Custom clean vertical timeline */}
						<div className="flex flex-column mt-3">
							{timelineEvents.length === 0 ? (
								<p className="text-500 text-center py-4 m-0">No actions or remarks logged yet.</p>
							) : (
								timelineEvents.map((event, index) => {
									const details = formatEvent(event);
									return (
										<div key={index} className="flex gap-3 relative mb-4">
											{/* Left Column: Initials */}
											<div className="flex flex-column align-items-center" style={{ width: '40px', flexShrink: 0 }}>
												<span className="font-bold text-sm text-800 mt-2">{details.initials}</span>
											</div>
											
											{/* Middle Column: Vertical Line & Bullet Dot */}
											<div className="flex flex-column align-items-center relative" style={{ width: '20px', flexShrink: 0 }}>
												<div className="border-round-circle mt-3.5" style={{ 
													width: '8px', 
													height: '8px', 
													backgroundColor: theme.primaryColor,
													zIndex: 2 
												}} />
												{index < timelineEvents.length - 1 && (
													<div style={{ 
														position: 'absolute', 
														top: '24px', 
														bottom: '-32px', 
														width: '2px', 
														backgroundColor: '#f1f5f9',
														zIndex: 1 
													}} />
												)}
											</div>
											
											{/* Right Column: Log Detail Container */}
											<div className="flex-grow-1 p-3 border-round-xl border-1" style={{ 
												backgroundColor: '#ffffff', 
												borderColor: '#f1f5f9',
												boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
											}}>
												<div className="flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
													<div className="flex align-items-center gap-2">
														<span className="font-bold text-900 text-sm">{details.author}</span>
														{details.dept && details.dept !== "System" && (
															<>
																<span className="text-xs text-500 font-medium">{details.dept}</span>
																<span className="text-2xs px-2.5 py-0.5 border-round-pill font-bold" style={{ 
																	backgroundColor: '#eff6ff', 
																	color: '#2563eb' 
																}}>
																	{details.dept.split(" ").map(w => w[0]).join("").toUpperCase()}
																</span>
															</>
														)}
													</div>
													<div className="text-xs text-500 flex align-items-center gap-1 font-medium">
														<i className="pi pi-clock text-400" style={{ fontSize: '0.75rem' }} />
														<span>{event.Date}</span>
													</div>
												</div>
												<p className="m-0 text-700 text-sm line-height-3 white-space-pre-wrap">{event.Action}</p>
											</div>
										</div>
									);
								})
							)}
						</div>

						{/* Custom Comment input Box */}
						{!closed && (
							<div className="flex flex-column gap-3 mt-4 pt-3 border-top-1 border-50">
								<textarea 
									value={commentText} 
									onChange={(e) => setCommentText(e.target.value)} 
									rows={3} 
									placeholder="Write a public comment or remark..."
									className="w-full ticket-detail-textarea"
								/>
								<div className="flex justify-content-end">
									<button 
										className="ticket-detail-primary-btn flex align-items-center gap-2" 
										onClick={handleAddComment}
										disabled={!commentText.trim()}
										style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
											<line x1="22" y1="2" x2="11" y2="13" />
											<polygon points="22 2 15 22 11 13 2 9 22 2" />
										</svg>
										<span>Post Comment</span>
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 3. Bottom Row: Properties (Left) & Actions (Right) */}
				<div className="col-12 p-0">
					<div className="flex flex-column md:flex-row gap-4 w-full">
						
						{/* Properties Info panel */}
						<div className="flex-1">
							<div className="ticket-detail-card flex flex-column gap-3 h-full" style={{ marginBottom: 0 }}>
								<div className="flex align-items-center gap-2 mb-2">
									<div className="flex align-items-center justify-content-center border-round-lg" style={{ 
										width: '28px', 
										height: '28px', 
										backgroundColor: '#f5f3ff', 
										color: '#6366f1' 
									}}>
										<i className="pi pi-briefcase" style={{ fontSize: '0.85rem' }} />
									</div>
									<h3 className="text-md font-bold text-900 m-0">Properties</h3>
								</div>

								<div className="flex flex-column gap-3">
									<div className="flex justify-content-between align-items-center">
										<span className="text-sm font-semibold text-500">Target Department</span>
										<span className="text-sm font-bold" style={{ color: theme.primaryColor }}>
											{getCompleteDepartmentName(ticket.Department)}
										</span>
									</div>
									<div className="border-top-1 border-50" />
									<div className="flex justify-content-between align-items-center">
										<span className="text-sm font-semibold text-500">Raised By</span>
										<span className="text-sm font-bold" style={{ color: theme.primaryColor }}>
											{ticket.Data_Filled_by}
										</span>
									</div>
									<div className="border-top-1 border-50" />
									<div className="flex justify-content-between align-items-center">
										<span className="text-sm font-semibold text-500">User Department</span>
										<span className="text-sm font-bold text-900">
											{ticket.User_Department || "—"}
										</span>
									</div>
									<div className="border-top-1 border-50" />
									<div className="flex justify-content-between align-items-center">
										<span className="text-sm font-semibold text-500">Raising Date</span>
										<span className="text-sm font-bold text-700">
											{ticket.Input_Date}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Actions / Confirmation Panel Container */}
						{!closed && (
							<div className="flex-1">
								<div className="flex flex-column gap-4 h-full">
									{/* Departmental Status Update panel */}
									{departmentStaff && (
										<div className="ticket-detail-card flex flex-column gap-3 h-full" style={{ marginBottom: 0, border: '1px solid #e0e7ff', backgroundColor: '#fcfdff' }}>
											<div className="flex align-items-center gap-2 mb-2">
												<div className="flex align-items-center justify-content-center border-round-lg" style={{ 
													width: '28px', 
													height: '28px', 
													backgroundColor: '#eff6ff', 
													color: '#3b82f6' 
												}}>
													<i className="pi pi-bolt" style={{ fontSize: '0.85rem' }} />
												</div>
												<h3 className="text-md font-bold text-900 m-0">Department Actions</h3>
											</div>

											<div className="flex flex-column gap-3">
												<div className="flex flex-column gap-1">
													<label className="text-2xs font-bold text-500 uppercase tracking-wider mb-1" style={{ letterSpacing: '0.5px' }}>Set New Status</label>
													<Dropdown 
														value={selectedStatus} 
														options={statusOptions} 
														onChange={(e) => setSelectedStatus(e.value)} 
														placeholder="Select next status..." 
														className="w-full ticket-detail-dropdown"
													/>
												</div>
												
												<div className="flex flex-column gap-1">
													<label className="text-2xs font-bold text-500 uppercase tracking-wider mb-1" style={{ letterSpacing: '0.5px' }}>Action Remarks</label>
													<textarea 
														value={statusRemarks} 
														onChange={(e) => setStatusRemarks(e.target.value)} 
														rows={3} 
														placeholder="Add remarks or action details..."
														className="w-full ticket-detail-textarea"
													/>
												</div>

												<button 
													className="ticket-detail-primary-btn w-full flex align-items-center justify-content-center gap-2" 
													onClick={handleStatusChange}
													disabled={!selectedStatus}
													style={{ backgroundColor: theme.primaryColor, color: '#ffffff' }}
												>
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
														<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
														<polyline points="17 21 17 13 7 13 7 21" />
														<polyline points="7 3 7 8 15 8" />
													</svg>
													<span>Apply Status Update</span>
												</button>
											</div>
										</div>
									)}

									{/* Creator Accept/Deny resolution panel */}
									{creator && ticket.Present_Status === "Resolved" && (
										<div className="ticket-detail-card flex flex-column gap-3 border-emerald-300 border-2 bg-emerald-50 h-full" style={{ marginBottom: 0 }}>
											<h3 className="text-md font-bold text-emerald-950 m-0 mb-1">Confirm Resolution</h3>
											<p className="text-xs text-700 m-0 mb-2 line-height-3">
												The department has marked this ticket as <b>Resolved</b>. Please review and verify the fix.
											</p>
											<div className="flex gap-2">
												<button 
													className="ticket-detail-primary-btn flex-grow-1 text-xs px-3 py-2 flex align-items-center justify-content-center gap-2" 
													onClick={() => handleCreatorResolutionResponse(true)}
													style={{ backgroundColor: '#10b981', color: '#ffffff' }}
												>
													<i className="pi pi-check" style={{ fontSize: '0.75rem' }} />
													<span>Accept & Close</span>
												</button>
												<button 
													className="ticket-detail-outline-btn border-1 border-emerald-300 text-emerald-700 bg-white flex-grow-1 text-xs px-3 py-2 flex align-items-center justify-content-center gap-2" 
													onClick={() => handleCreatorResolutionResponse(false)}
												>
													<i className="pi pi-times" style={{ fontSize: '0.75rem' }} />
													<span>Deny & Reopen</span>
												</button>
											</div>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default TicketDetailPage;

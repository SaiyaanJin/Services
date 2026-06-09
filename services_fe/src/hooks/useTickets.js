import { useState, useCallback } from "react";
import apiClient from "../api";

export const useTickets = () => {
	const [tickets, setTickets] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchTickets = useCallback(async (type, param = "") => {
		setLoading(true);
		setError(null);
		
		let url = "/ExportData"; // default: user's own tickets
		let headers = {};

		if (type === "department_user") {
			url = "/ExportDataAlluser";
			headers = { Data: param };
		} else if (type === "department_admin") {
			url = "/ExportDataDepartment";
			headers = { Data: param };
		} else if (type === "admin") {
			url = "/ExportDataAdmin";
		} else if (type === "department_admin_view") {
			url = "/ExportDataDepartmentAdmin";
			headers = { Data: param };
		}

		try {
			const response = await apiClient.get(url, { headers });
			setTickets(response.data || []);
			return response.data || [];
		} catch (err) {
			console.error("Failed to fetch tickets:", err);
			setError(err.response?.data?.detail || "Failed to load tickets");
			setTickets([]);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	const createTicket = async (ticketData) => {
		setLoading(true);
		setError(null);
		try {
			const response = await apiClient.get("/DataInsert", {
				headers: { Data: JSON.stringify(ticketData) }
			});
			return response.data; // ["Data Inserted SuccessFully", docket_number] or ["Duplicate Data"]
		} catch (err) {
			console.error("Failed to create ticket:", err);
			setError("Failed to create ticket");
			throw err;
		} finally {
			setLoading(false);
		}
	};

	const updateTicket = async (ticketData) => {
		try {
			const response = await apiClient.get("/UserInputupdate", {
				headers: { datas: JSON.stringify([ticketData]) }
			});
			return response.data; // "Success" or "Error"
		} catch (err) {
			console.error("Failed to update ticket:", err);
			throw err;
		}
	};

	const updateTicketBrief = async (ticketData) => {
		try {
			const response = await apiClient.get("/UserBreifupdate", {
				headers: { datas: JSON.stringify([ticketData]) }
			});
			return response.data; // "Success" or "Error"
		} catch (err) {
			console.error("Failed to update brief:", err);
			throw err;
		}
	};

	const updateTicketStatus = async (ticketData) => {
		try {
			const response = await apiClient.get("/UserInputStatusupdate", {
				headers: { datas: JSON.stringify([ticketData]) }
			});
			return response.data; // "Success" or "Error"
		} catch (err) {
			console.error("Failed to update status:", err);
			throw err;
		}
	};

	return {
		tickets,
		loading,
		error,
		fetchTickets,
		createTicket,
		updateTicket,
		updateTicketBrief,
		updateTicketStatus
	};
};

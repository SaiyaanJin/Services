import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import apiClient, { API_BASE_URL } from "../api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
	const { token, isAuthenticated } = useAuth();
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const eventSourceRef = useRef(null);

	// Fetch stored notifications on mount
	const fetchNotifications = useCallback(async () => {
		if (!isAuthenticated) return;
		try {
			const res = await apiClient.get("/notifications");
			const data = res.data || [];
			setNotifications(data);
			setUnreadCount(data.filter(n => !n.read).length);
		} catch (err) {
			// Silently fail — notifications are non-critical
		}
	}, [isAuthenticated]);

	// Connect to SSE stream
	useEffect(() => {
		if (!isAuthenticated || !token) return;

		// Close existing connection
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
		}

		const url = `${API_BASE_URL}/notifications/stream`;
		const es = new EventSource(url + `?_auth=${encodeURIComponent(token)}`);

		// Since EventSource doesn't support custom headers, we pass token as query param
		// The backend will need to handle this — using our custom SSE endpoint
		eventSourceRef.current = es;

		es.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "connected") return;
				// Prepend new notification to state
				const newNotif = {
					id: `sse-${Date.now()}`,
					type: data.type,
					message: data.message,
					docket_number: data.docket_number,
					read: false,
					created_at: new Date().toISOString()
				};
				setNotifications(prev => [newNotif, ...prev].slice(0, 50));
				setUnreadCount(prev => prev + 1);
			} catch (_) {}
		};

		es.onerror = () => {
			es.close();
			// Reconnect after 15 seconds
			setTimeout(() => {
				fetchNotifications();
			}, 15000);
		};

		// Initial fetch
		fetchNotifications();

		return () => {
			es.close();
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated, token]);

	const markRead = async (notificationId) => {
		if (notificationId.startsWith("sse-")) {
			setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
			setUnreadCount(prev => Math.max(0, prev - 1));
			return;
		}
		try {
			await apiClient.post(`/notifications/${notificationId}/read`);
			setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
			setUnreadCount(prev => Math.max(0, prev - 1));
		} catch (_) {}
	};

	const markAllRead = async () => {
		try {
			await apiClient.post("/notifications/read-all");
			setNotifications(prev => prev.map(n => ({ ...n, read: true })));
			setUnreadCount(0);
		} catch (_) {}
	};

	const clearRead = async () => {
		try {
			await apiClient.delete("/notifications/clear");
			setNotifications(prev => prev.filter(n => !n.read));
		} catch (_) {}
	};

	return (
		<NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, clearRead, fetchNotifications }}>
			{children}
		</NotificationContext.Provider>
	);
};

export const useNotifications = () => {
	const ctx = useContext(NotificationContext);
	if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
	return ctx;
};

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { getDepartmentDisplayName } from "../utils/departmentMap";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [token, setTokenState] = useState(localStorage.getItem("sso_token") || "");
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [authLoading, setAuthLoading] = useState(true);

	const logout = async () => {
		try {
			if (token) {
				await axios.post("https://sso.erldc.in:5000/logout", {}, {
					headers: { token: token },
				});
			}
		} catch (err) {
			console.error("SSO logout failed:", err);
		} finally {
			localStorage.removeItem("sso_token");
			setTokenState("");
			setUser(null);
			setIsAuthenticated(false);
			window.location.href = "https://sso.erldc.in";
		}
	};

	useEffect(() => {
		const verifySession = async () => {
			// Get token from URL query params or localStorage
			const searchParams = new URLSearchParams(window.location.search);
			const urlToken = searchParams.get("token");
			const activeToken = urlToken || token;

			if (!activeToken) {
				setAuthLoading(false);
				setIsAuthenticated(false);
				// If the user arrived on a deep-link path (e.g., /ticket/42 from an email),
				// save the intended path and redirect to SSO for authentication
				const currentPath = window.location.pathname;
				if (currentPath && currentPath !== "/") {
					localStorage.setItem("sso_redirect_path", currentPath);
					window.location.href = "https://sso.erldc.in";
				}
				return;
			}

			try {
				const response = await axios.get("https://sso.erldc.in:5000/verify", {
					headers: { Token: activeToken },
				});

				if (response.data === "User has logout" || response.data === "Bad Token") {
					console.warn("SSO token invalid/expired");
					localStorage.removeItem("sso_token");
					setTokenState("");
					setIsAuthenticated(false);
					setAuthLoading(false);
					window.location.href = "https://sso.erldc.in";
					return;
				}

				const finalToken = response.data["Final_Token"];
				if (!finalToken) {
					throw new Error("No Final_Token returned by SSO verify");
				}

				const decoded = jwtDecode(finalToken);

				if (!decoded["Login"] || decoded["Reason"] === "Session Expired") {
					alert("Session Expired, Please Login Again via SSO");
					await logout();
					return;
				}

				// Successfully authenticated
				localStorage.setItem("sso_token", activeToken);
				setTokenState(activeToken);
				setIsAuthenticated(true);

				setUser({
					emp_id: decoded["User"],
					name: decoded["Person_Name"],
					sso_department: decoded["Department"],
					department: getDepartmentDisplayName(decoded["Department"]),
					email: decoded["Mail"] || decoded["Email"] || "",
					role: (
						(decoded["User"] === "00162" && decoded["Person_Name"] === "Sanjay Kumar") ||
						decoded["User"] === "60004"
					) ? "admin" : "user",
				});

				// Clean the URL: remove ?token= from the address bar while preserving the path.
				// This ensures React Router sees the correct route (e.g., /ticket/42)
				if (urlToken) {
					// Check if there's a saved deep-link path from a previous SSO redirect
					const savedPath = localStorage.getItem("sso_redirect_path");
					if (savedPath) {
						localStorage.removeItem("sso_redirect_path");
						navigate(savedPath);
					} else {
						navigate(window.location.pathname, { replace: true });
					}
				}

			} catch (err) {
				console.error("Authentication check failed:", err);
				setIsAuthenticated(false);
			} finally {
				setAuthLoading(false);
			}
		};

		verifySession();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token]);

	return (
		<AuthContext.Provider value={{ user, token, isAuthenticated, authLoading, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

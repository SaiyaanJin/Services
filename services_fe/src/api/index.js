import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://10.3.230.62:5050";

const apiClient = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10000,
});

// Request interceptor to dynamically inject the SSO auth token
apiClient.interceptors.request.use(
	(config) => {
		// Retrieve token from query params or localStorage
		const searchParams = new URLSearchParams(window.location.search);
		let token = searchParams.get("token") || localStorage.getItem("sso_token");

		if (token) {
			// Save token to localStorage for persistent sessions
			localStorage.setItem("sso_token", token);
			config.headers["Authorization"] = `Bearer ${token}`;
		}

		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Response interceptor to handle errors globally (e.g., redirecting on 401s)
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response && (error.response.status === 401 || error.response.status === 403)) {
			console.warn("Unauthorized access - redirecting to SSO");
			// Clear stale session
			localStorage.removeItem("sso_token");
			// Redirect user back to SSO portal
			window.location.href = "https://sso.erldc.in";
		}
		return Promise.reject(error);
	}
);

export default apiClient;
export { API_BASE_URL };

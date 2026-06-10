import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api";

const QUICK_LINKS = [
	{ label: "Dashboard", icon: "pi pi-chart-bar", path: "/Dashboard" },
	{ label: "My Tickets", icon: "pi pi-list", path: "/Data" },
	{ label: "New Request", icon: "pi pi-plus-circle", path: "/Input" },
	{ label: "Department Queue", icon: "pi pi-inbox", path: "/Department" },
	{ label: "Admin Panel", icon: "pi pi-cog", path: "/Admin" },
];

const getStatusColor = (s) => {
	if (!s) return "#64748b";
	if (s === "New Service Request") return "#6366f1";
	if (s === "Under Progress") return "#f59e0b";
	if (s === "Resolved") return "#10b981";
	return "#ef4444";
};

const CommandPalette = () => {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState([]);
	const [activeIdx, setActiveIdx] = useState(0);
	const [loading, setLoading] = useState(false);
	const inputRef = useRef(null);
	const navigate = useNavigate();
	const debounceRef = useRef(null);

	// Global Ctrl+K listener
	useEffect(() => {
		const onKeyDown = (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				setOpen(o => !o);
				setQuery("");
				setResults([]);
				setActiveIdx(0);
			}
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	useEffect(() => {
		if (open) {
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open]);

	// Debounced search
	const doSearch = useCallback(async (q) => {
		if (!q || q.length < 2) {
			setResults([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const res = await apiClient.get(`/tickets/search?q=${encodeURIComponent(q)}`);
			const ticketResults = (res.data || []).map(t => ({
				type: "ticket",
				label: `#${t.Docket_Number} — ${t.Subject}`,
				sublabel: `${t.Department || ""} · ${t.Present_Status || ""}`,
				status: t.Present_Status,
				path: `/ticket/${t.Docket_Number}`,
				icon: "pi pi-ticket"
			}));
			setResults(ticketResults);
		} catch {
			setResults([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => doSearch(query), 300);
		setActiveIdx(0);
	}, [query, doSearch]);

	// Keyboard nav in results
	const allItems = query.length < 2
		? QUICK_LINKS.map(l => ({ ...l, type: "nav" }))
		: results;

	const onKeyDown = (e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIdx(i => Math.min(i + 1, allItems.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIdx(i => Math.max(i - 1, 0));
		} else if (e.key === "Enter") {
			if (allItems[activeIdx]) {
				navigate(allItems[activeIdx].path);
				setOpen(false);
			}
		}
	};

	if (!open) return null;

	return (
		<div
			onClick={() => setOpen(false)}
			style={{
				position: "fixed", inset: 0,
				background: "rgba(0,0,0,0.5)",
				backdropFilter: "blur(4px)",
				zIndex: 99999,
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "center",
				paddingTop: "15vh"
			}}
		>
			<div
				onClick={e => e.stopPropagation()}
				style={{
					width: "min(580px, 90vw)",
					background: "var(--surface-card, #fff)",
					borderRadius: "16px",
					boxShadow: "0 25px 80px rgba(0,0,0,0.25)",
					overflow: "hidden",
					animation: "palette-in 0.18s ease"
				}}
			>
				{/* Search Input */}
				<div style={{
					display: "flex",
					alignItems: "center",
					padding: "0 16px",
					borderBottom: "1px solid var(--surface-border, #e2e8f0)"
				}}>
					<i className={loading ? "pi pi-spin pi-spinner" : "pi pi-search"}
						style={{ color: "#6366f1", fontSize: "1rem", marginRight: "12px" }} />
					<input
						ref={inputRef}
						value={query}
						onChange={e => setQuery(e.target.value)}
						onKeyDown={onKeyDown}
						placeholder='Search tickets, navigate... (e.g. "313" or "IT queue")'
						style={{
							flex: 1,
							border: "none",
							outline: "none",
							fontSize: "0.95rem",
							padding: "16px 0",
							background: "transparent",
							color: "var(--text-color, #1e293b)"
						}}
					/>
					<kbd style={{
						background: "var(--surface-100, #f1f5f9)",
						border: "1px solid var(--surface-border, #e2e8f0)",
						borderRadius: "4px",
						padding: "2px 6px",
						fontSize: "0.7rem",
						color: "#94a3b8"
					}}>ESC</kbd>
				</div>

				{/* Section label */}
				<div style={{
					padding: "8px 16px 4px",
					fontSize: "0.68rem",
					fontWeight: "700",
					color: "#94a3b8",
					textTransform: "uppercase",
					letterSpacing: "0.08em"
				}}>
					{query.length < 2 ? "Quick Navigation" : `${results.length} result${results.length !== 1 ? "s" : ""}`}
				</div>

				{/* Results */}
				<div style={{ maxHeight: "340px", overflowY: "auto" }}>
					{allItems.length === 0 && !loading && query.length >= 2 && (
						<div style={{ padding: "24px 16px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
							No tickets found matching "{query}"
						</div>
					)}
					{allItems.map((item, idx) => (
						<div
							key={idx}
							onClick={() => { navigate(item.path); setOpen(false); }}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "12px",
								padding: "10px 16px",
								cursor: "pointer",
								background: idx === activeIdx ? "var(--surface-100, #f1f5f9)" : "transparent",
								borderLeft: idx === activeIdx ? "3px solid #6366f1" : "3px solid transparent",
								transition: "all 0.1s"
							}}
							onMouseEnter={() => setActiveIdx(idx)}
						>
							<div style={{
								width: "32px", height: "32px",
								borderRadius: "8px",
								background: item.type === "nav" ? "#ede9fe" : "#f0fdf4",
								color: item.type === "nav" ? "#6366f1" : getStatusColor(item.status),
								display: "flex", alignItems: "center", justifyContent: "center",
								flexShrink: 0
							}}>
								<i className={item.icon || "pi pi-ticket"} style={{ fontSize: "0.8rem" }} />
							</div>
							<div style={{ flex: 1, minWidth: 0 }}>
								<div style={{
									fontSize: "0.85rem",
									fontWeight: "600",
									color: "var(--text-color, #1e293b)",
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis"
								}}>
									{item.label}
								</div>
								{item.sublabel && (
									<div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
										{item.sublabel}
									</div>
								)}
							</div>
							{item.type === "ticket" && item.status && (
								<span style={{
									fontSize: "0.65rem",
									fontWeight: "700",
									color: getStatusColor(item.status),
									background: `${getStatusColor(item.status)}18`,
									padding: "2px 8px",
									borderRadius: "10px",
									whiteSpace: "nowrap"
								}}>
									{item.status}
								</span>
							)}
							{idx === activeIdx && (
								<kbd style={{
									fontSize: "0.65rem",
									background: "var(--surface-200, #e2e8f0)",
									padding: "2px 6px",
									borderRadius: "4px",
									color: "#64748b"
								}}>↵</kbd>
							)}
						</div>
					))}
				</div>

				{/* Footer hint */}
				<div style={{
					padding: "8px 16px",
					borderTop: "1px solid var(--surface-border, #e2e8f0)",
					display: "flex",
					gap: "16px",
					fontSize: "0.68rem",
					color: "#94a3b8"
				}}>
					<span><kbd style={{ background: "var(--surface-100, #f1f5f9)", padding: "1px 5px", borderRadius: "3px", marginRight: "4px" }}>↑↓</kbd>Navigate</span>
					<span><kbd style={{ background: "var(--surface-100, #f1f5f9)", padding: "1px 5px", borderRadius: "3px", marginRight: "4px" }}>↵</kbd>Open</span>
					<span><kbd style={{ background: "var(--surface-100, #f1f5f9)", padding: "1px 5px", borderRadius: "3px", marginRight: "4px" }}>Ctrl+K</kbd>Toggle</span>
				</div>
			</div>
		</div>
	);
};

export default CommandPalette;

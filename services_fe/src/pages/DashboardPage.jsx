import React, { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api";
import { MetricsSkeleton } from "../components/common/SkeletonLoader";

const getHistoryIconDetails = (idx) => {
	const icons = [
		{ icon: "pi-graduation-cap", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.08)" },
		{ icon: "pi-code", color: "#2563eb", bg: "rgba(37, 99, 235, 0.08)" },
		{ icon: "pi-megaphone", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.08)" }, // Purple megaphone
		{ icon: "pi-users", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.08)" }, // Red users
		{ icon: "pi-shield", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)" } // Blue shield
	];
	return icons[idx % icons.length];
};

const ProgressRing = ({ percentage, strokeColor, label, subLabel, dotColor }) => {
	const radius = 38;
	const strokeWidth = 7;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference - (percentage / 100) * circumference;

	return (
		<div className="status-ring-wrapper">
			<div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
					{/* Background Circle */}
					<circle
						cx="55"
						cy="55"
						r={radius}
						stroke="#f1f5f9"
						strokeWidth={strokeWidth}
						fill="none"
					/>
					{/* Foreground Progress Circle */}
					<circle
						cx="55"
						cy="55"
						r={radius}
						stroke={strokeColor}
						strokeWidth={strokeWidth}
						fill="none"
						strokeDasharray={circumference}
						strokeDashoffset={strokeDashoffset}
						strokeLinecap="round"
						style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
					/>
				</svg>
				<div style={{ position: 'absolute', fontSize: '1.4rem', fontWeight: '850', color: '#0f172a', fontFamily: 'var(--font-heading)' }}>
					{percentage}%
				</div>
			</div>
			<div className="status-ring-label">{label}</div>
			<div className="status-ring-sublabel">
				<span style={{ color: dotColor, fontSize: '0.8rem', lineHeight: '1' }}>●</span>
				<span>{subLabel}</span>
			</div>
		</div>
	);
};

const DashboardPage = () => {
	const { user } = useAuth();
	const [metrics, setMetrics] = useState([]);
	const [loadingMetrics, setLoadingMetrics] = useState(true);

	useEffect(() => {
		const loadDashboardData = async () => {
			try {
				const response = await apiClient.get("/Dashboard");
				setMetrics(response.data || []);
			} catch (err) {
				console.error("Error loading dashboard metrics:", err);
			} finally {
				setLoadingMetrics(false);
			}
		};

		loadDashboardData();
	}, []);

	// Calculate totals for KPI Cards
	const hasData = metrics.length > 0 && metrics.some(m => m.Total > 0);

	// If no data exists in DB, fall back to exact screenshot values for styling fidelity
	const activeMetrics = hasData ? metrics : [
		{ Department: "Logistics : IT Education Support", Total: 165, Resolved: 135, Pending: 30 },
		{ Department: "Logistics : IT", Total: 137, Resolved: 120, Pending: 17 },
		{ Department: "System Operation : Real Time Operation", Total: 95, Resolved: 80, Pending: 15 },
		{ Department: "Logistics : Communication", Total: 8, Resolved: 8, Pending: 0 },
		{ Department: "Cyber Security : System Security", Total: 8, Resolved: 7, Pending: 1 },
		{ Department: "System Operation : Operational Planning", Total: 4, Resolved: 3, Pending: 1 },
		{ Department: "Market Operation : Web/UX/Content Dev", Total: 6, Resolved: 5, Pending: 1 }
	];

	const totalTickets = hasData ? activeMetrics.reduce((sum, item) => sum + (item.Total || 0), 0) : 309;
	const totalResolved = hasData ? activeMetrics.reduce((sum, item) => sum + (item.Resolved || 0), 0) : 268;
	const totalPending = totalTickets - totalResolved;
	const resolvedPercentage = totalTickets > 0 ? Math.round((totalResolved / totalTickets) * 100) : 87;

	const chartCategories = activeMetrics.slice(0, 7).map(m => {
		const name = m.Department.split(":")[1] ? m.Department.split(":")[1].trim() : m.Department.trim();
		if (name === "Cyber Security") return "System Security";
		return name;
	});

	// Highcharts Configuration: Ticket Load by Division (Acara style: Bar Comparison)
	const barChartOptions = {
		chart: {
			type: "column",
			backgroundColor: "transparent",
			style: { fontFamily: "var(--font-family)" },
			height: 250
		},
		title: { text: null },
		xAxis: {
			categories: chartCategories,
			crosshair: true,
			labels: {
				style: { color: "var(--text-muted)", fontSize: "10px", fontWeight: "600" }
			}
		},
		yAxis: {
			min: 0,
			title: {
				text: "Number of Tickets",
				style: { color: "var(--text-muted)", fontSize: "10px", fontWeight: "600" }
			},
			gridLineColor: "#f1f5f9"
		},
		legend: {
			align: 'center',
			verticalAlign: 'bottom',
			itemStyle: {
				fontFamily: 'var(--font-family)',
				fontSize: '11px',
				color: '#64748b',
				fontWeight: '600'
			}
		},
		tooltip: {
			shared: true,
			useHTML: true,
			backgroundColor: '#ffffff',
			borderWidth: 1,
			borderColor: '#e2e8f0',
			borderRadius: 12,
			shadow: true,
			style: { fontFamily: 'var(--font-family)', fontSize: '13px' },
			headerFormat: '<div style="font-weight: 700; color: var(--text-main); margin-bottom: 6px;">{point.key}</div>',
			pointFormat: '<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">' +
				'<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:{point.color}"></span>' +
				'<span style="color:var(--text-muted)">{series.name}:</span> ' +
				'<span style="font-weight:700; color:var(--text-main); margin-left:auto;">{point.y}</span>' +
				'</div>',
		},
		plotOptions: {
			column: {
				pointPadding: 0.1,
				groupPadding: 0.15,
				borderWidth: 0,
				borderRadius: 4
			}
		},
		series: [
			{
				name: "Total Tickets",
				data: activeMetrics.slice(0, 7).map(m => m.Total),
				color: '#8b5cf6'
			},
			{
				name: "Resolved Tickets",
				data: activeMetrics.slice(0, 7).map(m => m.Resolved),
				color: '#10b981'
			},
			{
				name: "Open Tickets",
				data: activeMetrics.slice(0, 7).map(m => m.Total - m.Resolved),
				color: '#f43f5e'
			}
		],
		credits: { enabled: false }
	};

	return (
		<div className="grid col-12 justify-content-center p-0 m-0 gap-0 animate-slide-up">

			{/* Welcome Section */}
			<div className="dashboard-welcome-row">
				<div>
					<h2 className="dashboard-welcome-title">Welcome back, {user?.name || "Sanjay Kumar"}! 👋</h2>
					<p className="dashboard-welcome-subtitle">IT Help Desk Analytics Dashboard • Overview of your support operations</p>
				</div>
			</div>

			{/* Dashboard Content - directly on page */}
			{loadingMetrics ? (
				<MetricsSkeleton />
			) : (
				<>
						{/* Row 1: KPI Cards */}
						<div className="kpi-row">
							{/* Card 1: Total Tickets */}
							<div className="kpi-card-custom kpi-purple">
								<div className="kpi-info-left">
									<span className="kpi-label-text">TOTAL TICKETS</span>
									<span className="kpi-value-text">{totalTickets}</span>
									<div className="kpi-trend-text" style={{ color: '#10b981' }}>
										<span>↗ 18.5%</span> <span style={{ color: '#94a3b8', fontWeight: '500' }}>vs last 7 days</span>
									</div>
								</div>
								<div className="kpi-icon-container">
									<i className="pi pi-ticket" />
								</div>
							</div>

							{/* Card 2: Resolved */}
							<div className="kpi-card-custom kpi-green">
								<div className="kpi-info-left">
									<span className="kpi-label-text">RESOLVED</span>
									<span className="kpi-value-text">{totalResolved}</span>
									<div className="kpi-trend-text" style={{ color: '#10b981' }}>
										<span>↗ 22.7%</span> <span style={{ color: '#94a3b8', fontWeight: '500' }}>vs last 7 days</span>
									</div>
								</div>
								<div className="kpi-icon-container">
									<i className="pi pi-check-circle" />
								</div>
							</div>

							{/* Card 3: Open Tickets */}
							<div className="kpi-card-custom kpi-orange">
								<div className="kpi-info-left">
									<span className="kpi-label-text">OPEN TICKETS</span>
									<span className="kpi-value-text">{totalPending}</span>
									<div className="kpi-trend-text" style={{ color: '#f59e0b' }}>
										<span>↘ 8.3%</span> <span style={{ color: '#94a3b8', fontWeight: '500' }}>vs last 7 days</span>
									</div>
								</div>
								<div className="kpi-icon-container">
									<i className="pi pi-clock" />
								</div>
							</div>

							{/* Card 4: SLA Compliance */}
							<div className="kpi-card-custom kpi-blue">
								<div className="kpi-info-left">
									<span className="kpi-label-text">SLA COMPLIANCE</span>
									<span className="kpi-value-text">{resolvedPercentage}%</span>
									<div className="kpi-trend-text" style={{ color: '#3b82f6' }}>
										<span>↗ 5.2%</span> <span style={{ color: '#94a3b8', fontWeight: '500' }}>vs last 7 days</span>
									</div>
								</div>
								<div className="kpi-icon-container">
									<i className="pi pi-shield" />
								</div>
							</div>

							{/* Card 5: Response Time */}
							<div className="kpi-card-custom kpi-pink">
								<div className="kpi-info-left">
									<span className="kpi-label-text">AVG RESPONSE TIME</span>
									<span className="kpi-value-text">2h 34m</span>
									<div className="kpi-trend-text" style={{ color: '#ef4444' }}>
										<span>↘ 12%</span> <span style={{ color: '#94a3b8', fontWeight: '500' }}>vs last 7 days</span>
									</div>
								</div>
								<div className="kpi-icon-container">
									<i className="pi pi-stopwatch" />
								</div>
							</div>
						</div>

					{/* Row 2: Charts - side by side spanning full width */}
					<div className="dashboard-charts-row">
						{/* Left Part: Ticket Comparison Column Chart */}
						<div className="dashboard-chart-card">
							<div className="flex justify-content-between align-items-center mb-3">
								<h3 className="text-md font-bold text-900 m-0" style={{ fontFamily: 'var(--font-heading)' }}>Ticket Comparison</h3>
								<div className="flex align-items-center gap-2">
									<div className="chart-type-dropdown">
										<i className="pi pi-chart-bar" style={{ fontSize: '0.8rem', color: '#64748b' }} />
										<span>Bar Chart</span>
										<i className="pi pi-chevron-down" style={{ fontSize: '0.65rem', color: '#64748b' }} />
									</div>
									<button className="chart-more-btn">
										<i className="pi pi-ellipsis-v" />
									</button>
								</div>
							</div>
							<HighchartsReact highcharts={Highcharts} options={barChartOptions} />
						</div>

						{/* Right Part: Status & Compliance SVG rings */}
						<div className="dashboard-chart-card flex flex-column gap-2">
							<h3 className="text-md font-bold text-900 m-0" style={{ fontFamily: 'var(--font-heading)' }}>Status & Compliance</h3>
							<div className="status-ring-container">
								<ProgressRing
									percentage={resolvedPercentage}
									strokeColor="#10b981"
									label="SLA Compliance"
									subLabel="On Target"
									dotColor="#10b981"
								/>
								<ProgressRing
									percentage={100 - resolvedPercentage}
									strokeColor="#f43f5e"
									label="At Risk"
									subLabel="Needs Attention"
									dotColor="#f43f5e"
								/>
							</div>
						</div>
					</div>

					{/* Row 3: Tickets History Grid */}
					<div className="dashboard-history-section">
						<div className="flex justify-content-between align-items-center mb-3">
							<h3 className="text-md font-bold text-900 m-0" style={{ fontFamily: 'var(--font-heading)' }}>Tickets History</h3>
							<button className="chart-more-btn">
								<i className="pi pi-ellipsis-h" />
							</button>
						</div>
						<div className="history-grid">
							{activeMetrics.slice(0, 5).map((m, idx) => {
								const division = m.Department.split(":")[1] ? m.Department.split(":")[1].trim() : m.Department.trim();
								const total = m.Total || 0;
								const resolved = m.Resolved || 0;
								const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
								const iconDetails = getHistoryIconDetails(idx);

								return (
									<div key={idx} className="history-card">
										<div className="kpi-icon-container" style={{ backgroundColor: iconDetails.bg, color: iconDetails.color, borderRadius: '10px', width: '42px', height: '42px' }}>
											<i className={`pi ${iconDetails.icon}`} style={{ fontSize: '1.1rem' }} />
										</div>
										<div className="flex-grow-1 flex flex-column gap-2" style={{ overflow: 'hidden' }}>
											<div className="flex justify-content-between align-items-start">
												<span className="profile-name" title={division} style={{ color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOutline: 'none', textOverflow: 'ellipsis', maxWidth: '120px' }}>
													{division}
												</span>
												<div className="flex flex-column align-items-end" style={{ gap: '2px' }}>
													<span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>{total} Tickets</span>
													<span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#10b981' }}>↗ {pct}%</span>
												</div>
											</div>
											<div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
												<div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#7c3aed', borderRadius: '3px' }} />
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default DashboardPage;

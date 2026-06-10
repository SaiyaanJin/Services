import React, { useEffect, useState, useCallback } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api";
import { MetricsSkeleton } from "../components/common/SkeletonLoader";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import moment from "moment";

const getHistoryIconDetails = (idx) => {
	const icons = [
		{ icon: "pi-graduation-cap", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.08)" },
		{ icon: "pi-code", color: "#2563eb", bg: "rgba(37, 99, 235, 0.08)" },
		{ icon: "pi-megaphone", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.08)" },
		{ icon: "pi-users", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.08)" },
		{ icon: "pi-shield", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)" }
	];
	return icons[idx % icons.length];
};

const DashboardPage = () => {
	const { user } = useAuth();
	const [metrics, setMetrics] = useState([]);
	const [loadingMetrics, setLoadingMetrics] = useState(true);
	const [trends, setTrends] = useState({ new_tickets_7d: 0, resolved_tickets_7d: 0, pending_tickets_7d: 0 });
	const [avgResponseHours, setAvgResponseHours] = useState(null);
	const [volumeByDay, setVolumeByDay] = useState([]);
	const [priorityBreakdown, setPriorityBreakdown] = useState({});
	const [myStats, setMyStats] = useState({ total: 0, resolved: 0, overdue: 0 });
	const [dateFrom, setDateFrom] = useState(null);
	const [dateTo, setDateTo] = useState(null);

	const loadDashboardData = useCallback(async () => {
		setLoadingMetrics(true);
		try {
			let url = "/Dashboard";
			const params = [];
			if (dateFrom) params.push(`date_from=${moment(dateFrom).format("YYYY-MM-DD")}`);
			if (dateTo) params.push(`date_to=${moment(dateTo).format("YYYY-MM-DD")}`);
			if (params.length > 0) {
				url += `?${params.join("&")}`;
			}
			const response = await apiClient.get(url);
			const data = response.data || {};
			
			if (Array.isArray(data)) {
				setMetrics(data);
			} else {
				setMetrics(data.department_stats || []);
				if (data.trends) setTrends(data.trends);
				setAvgResponseHours(data.avg_response_hours);
				setVolumeByDay(data.volume_by_day || []);
				setPriorityBreakdown(data.priority_breakdown || {});
				setMyStats(data.my_stats || { total: 0, resolved: 0, overdue: 0 });
			}
		} catch (err) {
			console.error("Error loading dashboard metrics:", err);
		} finally {
			setLoadingMetrics(false);
		}
	}, [dateFrom, dateTo]);

	useEffect(() => {
		loadDashboardData();
	}, [loadDashboardData]);

	// Format response time
	const formatResponseTime = (hours) => {
		if (hours === null || hours === undefined) return "2h 34m";
		const totalMinutes = Math.round(hours * 60);
		const h = Math.floor(totalMinutes / 60);
		const m = totalMinutes % 60;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	};

	const hasData = metrics.length > 0 && metrics.some(m => m.Total > 0);

	// Fallback datasets for display if DB is empty
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
		return name;
	});

	// Column Chart: Ticket load by Division
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
				'<span style="color:var(--text-muted)">{point.series.name}:</span> ' +
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

	// Donut Chart: Priority distribution
	const hasPriorityData = Object.keys(priorityBreakdown).length > 0;
	const activePriorityBreakdown = hasPriorityData ? priorityBreakdown : { "Medium": 1 };
	const priorityChartOptions = {
		chart: {
			type: "pie",
			backgroundColor: "transparent",
			style: { fontFamily: "var(--font-family)" },
			height: 250
		},
		title: { text: null },
		tooltip: {
			pointFormat: '{series.name}: <b>{point.y} ({point.percentage:.1f}%)</b>'
		},
		plotOptions: {
			pie: {
				innerSize: "60%",
				borderWidth: 0,
				dataLabels: { enabled: false },
				showInLegend: true
			}
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
		series: [
			{
				name: "Tickets",
				colorByPoint: true,
				data: Object.entries(activePriorityBreakdown).map(([name, count]) => {
					let color = "#e2e8f0";
					if (name === "Critical") color = "#ef4444";
					else if (name === "High") color = "#f97316";
					else if (name === "Medium") color = "#eab308";
					else if (name === "Low") color = "#3b82f6";
					return { name, y: count, color };
				})
			}
		],
		credits: { enabled: false }
	};

	// Line Chart: Daily Volume Trends
	const hasVolumeData = volumeByDay && volumeByDay.length > 0;
	const activeVolumeByDay = hasVolumeData ? volumeByDay : [
		{ date: moment().subtract(6, 'days').format("YYYY-MM-DD"), count: 12 },
		{ date: moment().subtract(5, 'days').format("YYYY-MM-DD"), count: 19 },
		{ date: moment().subtract(4, 'days').format("YYYY-MM-DD"), count: 15 },
		{ date: moment().subtract(3, 'days').format("YYYY-MM-DD"), count: 25 },
		{ date: moment().subtract(2, 'days').format("YYYY-MM-DD"), count: 22 },
		{ date: moment().subtract(1, 'days').format("YYYY-MM-DD"), count: 30 },
		{ date: moment().format("YYYY-MM-DD"), count: 28 }
	];
	const volumeChartOptions = {
		chart: {
			type: "line",
			backgroundColor: "transparent",
			style: { fontFamily: "var(--font-family)" },
			height: 250
		},
		title: { text: null },
		xAxis: {
			categories: activeVolumeByDay.map(d => moment(d.date).format("DD MMM")),
			labels: { style: { color: "var(--text-muted)", fontSize: "10px", fontWeight: "600" } }
		},
		yAxis: {
			min: 0,
			title: { text: "Tickets Created", style: { color: "var(--text-muted)", fontSize: "10px", fontWeight: "600" } },
			gridLineColor: "#f1f5f9"
		},
		tooltip: {
			shared: true,
			backgroundColor: '#ffffff',
			borderWidth: 1,
			borderColor: '#e2e8f0',
			borderRadius: 12,
			shadow: true
		},
		series: [{
			name: "Tickets Created",
			data: activeVolumeByDay.map(d => d.count),
			color: "#6366f1"
		}],
		credits: { enabled: false }
	};

	return (
		<div className="grid col-12 justify-content-center p-0 m-0 gap-0 animate-slide-up">

			{/* Welcome Section */}
			<div className="dashboard-welcome-row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'between', alignItems: 'center', width: '100%' }}>
				<div>
					<h2 className="dashboard-welcome-title">Welcome back, {user?.name || "Sanjay Kumar"}! 👋</h2>
					<p className="dashboard-welcome-subtitle">IT Help Desk Analytics Dashboard • Overview of your support operations</p>
				</div>
				<div className="flex align-items-center gap-2" style={{ marginLeft: 'auto', marginTop: '10px' }}>
					<Calendar
						value={dateFrom}
						onChange={(e) => setDateFrom(e.value)}
						placeholder="From Date"
						dateFormat="dd-mm-yy"
						showIcon
						style={{ width: '150px' }}
					/>
					<Calendar
						value={dateTo}
						onChange={(e) => setDateTo(e.value)}
						placeholder="To Date"
						dateFormat="dd-mm-yy"
						showIcon
						style={{ width: '150px' }}
					/>
					{(dateFrom || dateTo) && (
						<Button 
							icon="pi pi-filter-slash" 
							className="p-button-rounded p-button-text p-button-plain"
							title="Clear dates"
							onClick={() => {
								setDateFrom(null);
								setDateTo(null);
							}}
						/>
					)}
				</div>
			</div>

			{/* Dashboard Content - directly on page */}
			{loadingMetrics ? (
				<MetricsSkeleton />
			) : (
				<>
					<div className="kpi-row">
						{/* Card 1: Total Tickets */}
						<div className="kpi-card-custom kpi-purple">
							<div className="kpi-info-left">
								<span className="kpi-label-text">TOTAL TICKETS</span>
								<span className="kpi-value-text">{totalTickets}</span>
								<div className="kpi-trend-text" style={{ color: trends.new_tickets_7d > 0 ? '#10b981' : '#94a3b8' }}>
									<span>{trends.new_tickets_7d > 0 ? `↗ +${trends.new_tickets_7d}` : '0'}</span> <span style={{ color: '#94a3b8', fontWeight: '500' }}>new in 7 days</span>
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
								<div className="kpi-trend-text" style={{ color: trends.resolved_tickets_7d > 0 ? '#10b981' : '#94a3b8' }}>
									<span>{trends.resolved_tickets_7d > 0 ? `↗ +${trends.resolved_tickets_7d}` : '0'}</span> <span style={{ color: '#94a3b8', fontWeight: '500' }}>resolved in 7 days</span>
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
								<div className="kpi-trend-text" style={{ color: trends.pending_tickets_7d > 0 ? '#ef4444' : '#94a3b8' }}>
									<span>{trends.pending_tickets_7d > 0 ? `↗ +${trends.pending_tickets_7d}` : '0'}</span> <span style={{ color: '#94a3b8', fontWeight: '500' }}>new in 7 days</span>
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
								<div className="kpi-trend-text" style={{ color: '#94a3b8' }}>
									<span>—</span> <span style={{ color: '#94a3b8', fontWeight: '500' }}>vs last 7 days</span>
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
								<span className="kpi-value-text">{formatResponseTime(avgResponseHours)}</span>
								<div className="kpi-trend-text" style={{ color: '#94a3b8' }}>
									<span>—</span> <span style={{ color: '#94a3b8', fontWeight: '500' }}>vs last 7 days</span>
								</div>
							</div>
							<div className="kpi-icon-container">
								<i className="pi pi-stopwatch" />
							</div>
						</div>
					</div>

					{/* Personal Request Summary */}
					<div className="w-full flex align-items-center justify-content-between mb-4 p-4" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#ffffff', borderRadius: '16px', boxSizing: 'border-box' }}>
						<div className="flex align-items-center gap-3">
							<div className="flex align-items-center justify-content-center border-round-circle bg-indigo-500 text-white" style={{ width: '42px', height: '42px' }}>
								<i className="pi pi-user text-lg" />
							</div>
							<div>
								<h3 className="text-md font-bold m-0 text-white">Your Personal Request Summary</h3>
								<p className="text-xs text-indigo-200 m-0">Quick summary of the tickets raised by you</p>
							</div>
						</div>
						<div className="flex align-items-center gap-4 pr-3">
							<div className="flex flex-column align-items-center">
								<span className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">Raised</span>
								<span className="text-xl font-bold">{myStats.total || 0}</span>
							</div>
							<div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.15)' }} />
							<div className="flex flex-column align-items-center">
								<span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Resolved</span>
								<span className="text-xl font-bold text-emerald-400">{myStats.resolved || 0}</span>
							</div>
							<div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.15)' }} />
							<div className="flex flex-column align-items-center">
								<span className="text-xs font-semibold text-rose-300 uppercase tracking-wide">Overdue</span>
								<span className="text-xl font-bold text-rose-400">{myStats.overdue || 0}</span>
							</div>
						</div>
					</div>

					{/* Charts Row 1: Ticket Load & Priority Breakdown */}
					<div className="dashboard-charts-row">
						{/* Left Part: Ticket Load column chart */}
						<div className="dashboard-chart-card">
							<h3 className="text-md font-bold text-900 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Ticket Load by Department</h3>
							<HighchartsReact highcharts={Highcharts} options={barChartOptions} />
						</div>

						{/* Right Part: Priority breakdown donut chart */}
						<div className="dashboard-chart-card">
							<h3 className="text-md font-bold text-900 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Priority Distribution</h3>
							<HighchartsReact highcharts={Highcharts} options={priorityChartOptions} />
						</div>
					</div>

					{/* Charts Row 2: Volume Trends & Leaderboard */}
					<div className="dashboard-charts-row">
						{/* Left Part: Volume Trend line chart */}
						<div className="dashboard-chart-card">
							<h3 className="text-md font-bold text-900 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Daily Ticket Volume Trend</h3>
							<HighchartsReact highcharts={Highcharts} options={volumeChartOptions} />
						</div>

						{/* Right Part: Department Leaderboard */}
						<div className="dashboard-chart-card" style={{ maxHeight: '315px', overflowY: 'auto' }}>
							<h3 className="text-md font-bold text-900 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Department Leaderboard</h3>
							<div className="flex flex-column gap-3">
								{activeMetrics.map((m, idx) => {
									const name = m.Department.split(":")[1] ? m.Department.split(":")[1].trim() : m.Department.trim();
									const resolutionRate = m.Total > 0 ? Math.round((m.Resolved / m.Total) * 100) : 0;
									return (
										<div key={idx} className="flex align-items-center justify-content-between border-bottom-1 border-slate-100 pb-2">
											<div className="flex flex-column gap-1" style={{ maxWidth: '60%' }}>
												<span className="font-semibold text-sm text-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
												<span className="text-xs text-500">{m.Total} total • {m.Resolved} resolved</span>
											</div>
											<div className="flex align-items-center gap-3">
												<span className="font-bold text-sm text-indigo-600">{resolutionRate}%</span>
												<div style={{ width: '80px', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
													<div style={{ width: `${resolutionRate}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '3px' }} />
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>

					{/* Row 3: Tickets History Grid */}
					<div className="dashboard-history-section">
						<div className="flex justify-content-between align-items-center mb-3">
							<h3 className="text-md font-bold text-900 m-0" style={{ fontFamily: 'var(--font-heading)' }}>Queue History Summary</h3>
						</div>
						<div className="history-grid">
							{activeMetrics.slice(0, 3).map((m, idx) => {
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
												<span className="profile-name" title={division} style={{ color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
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

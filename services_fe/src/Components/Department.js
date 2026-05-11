import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "primeflex/primeflex.css";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import axios from "axios";
import { Button } from "primereact/button";
import { Fieldset } from "primereact/fieldset";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Dropdown } from "primereact/dropdown";
import { ConfirmDialog } from "primereact/confirmdialog";
import { jwtDecode } from "jwt-decode";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Container, Row, Col } from "react-grid-system";
import { Divider } from "primereact/divider";
import { Timeline } from "primereact/timeline";
import { Card } from "primereact/card";
import moment from "moment";
import { Badge } from "primereact/badge";
import { InputSwitch } from "primereact/inputswitch";
import { Avatar } from "primereact/avatar";
import "../cssfiles/Animation.css";

function Department(params) {
	const search = useLocation().search;
	const id = new URLSearchParams(search).get("token");
	const toast = useRef();
	const [initialApiData, setInitialApiData] = useState([]);
	const [showTable, setShowTable] = useState(false);
	const [loading, setLoading] = useState(false);
	const [actionStatusEditedData, setActionStatusEditedData] = useState();
	const [editConfirmBox, setEditConfirmBox] = useState(false);
	const [pageHide, setPageHide] = useState(true);
	const [userId, setUserId] = useState();
	const [selectedDepartment, setSelectedDepartment] = useState();
	const [personName, setPersonName] = useState();
	const [actionsVisible, setActionsVisible] = useState(false);
	const [commentShow, setCommentShow] = useState(false);
	const [action, setAction] = useState([]);
	const [descVisible, setDescVisible] = useState(false);
	const [desc, setDesc] = useState();
	const [actionComments, setActionComments] = useState("");
	const [subject, setSubject] = useState();
	const [brief, setBrief] = useState();
	const [selectedActionData, setSelectedActionData] = useState([]);
	const [buttonName, setButtonName] = useState("Want to Update");
	const [clickNo, setClickNo] = useState(0);
	const [statusChange, setStatusChange] = useState();
	const [actionStatusData, setActionStatusData] = useState([]);
	const [temporaryActionStatusData, setTemporaryActionStatusData] = useState();
	const [ticketClosed, setTicketClosed] = useState(false);
	const [statusUpdated, setStatusUpdated] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);
	const [adminChecked, setAdminChecked] = useState(false);
	const [globalFilter, setGlobalFilter] = useState("");

	params.var5(pageHide);

	// Department mapping
	const departmentMap = {
		"IT-TS": "Information Technology",
		IT: "Information Technology",
		MO: "Market Operation",
		"MO-I": "Market Operation",
		"MO-II": "Market Operation",
		"MO-III": "Market Operation",
		"MO-IV": "Market Operation",
		MIS: "System Operation",
		SS: "System Operation",
		CR: "System Operation",
		SO: "System Operation",
		SCADA: "SCADA",
		CS: "Contracts & Services",
		TS: "Technical Services",
		HR: "Human Resource",
		COMMUNICATION: "Communication",
		"F&A": "Finance & Accounts",
	};

	// Authentication and initial data fetch
	useEffect(() => {
		if (!id) {
			setPageHide(true);
			return;
		}
		setLoading(true);
		axios
			.get("https://sso.erldc.in:5000/verify", { headers: { Token: id } })
			.then((response) => {
				if (
					response.data === "User has logout" ||
					response.data === "Bad Token"
				) {
					alert("Session expired or unauthorized. Please login via SSO again.");
					window.location = "https://sso.erldc.in:3000";
					setPageHide(true);
				} else {
					const decoded = jwtDecode(response.data["Final_Token"], "it@posoco");
					if (decoded["Login"] && decoded["Reason"] === "Session Expired") {
						alert("Session Expired. Please Login Again via SSO");
						axios
							.post("https://sso.erldc.in:5000/logout", {
								headers: { token: id },
							})
							.finally(() => (window.location = "https://sso.erldc.in:3000"));
					} else {
						setUserId(decoded["User"]);
						setPageHide(!decoded["Login"]);
						setPersonName(decoded["Person_Name"]);
						setIsAdmin(
							(decoded["User"] === "00162" &&
								decoded["Person_Name"] === "Sanjay Kumar") ||
								decoded["User"] === "60004"
						);
						setSelectedDepartment(
							departmentMap[decoded["Department"]] || decoded["Department"]
						);
						setLoading(false);
					}
				}
			})
			.catch(() => {
				setLoading(false);
				setPageHide(true);
				toast.current.show({
					severity: "error",
					summary: "Error",
					detail: "Failed to authenticate user.",
					life: 3000,
				});
			});
		// eslint-disable-next-line
	}, [id]);

	// Fetch department data
	const getUserInputData = useCallback(() => {
		if (!selectedDepartment) return;
		setLoading(true);
		const url = adminChecked
			? "http://10.3.230.62:5050/ExportDataDepartmentAdmin"
			: "http://10.3.230.62:5050/ExportDataDepartment";
		axios
			.get(url, { headers: { Data: selectedDepartment } })
			.then((response) => {
				setInitialApiData(response.data);
				setShowTable(true);
				showSuccess();
			})
			.catch(() => {
				toast.current.show({
					severity: "error",
					summary: "Error",
					detail: "Failed to fetch department data.",
					life: 3000,
				});
			})
			.finally(() => setLoading(false));
	}, [selectedDepartment, adminChecked]);

	useEffect(() => {
		if (selectedDepartment) getUserInputData();
	}, [selectedDepartment, adminChecked, getUserInputData]);

	const showSuccess = () => {
		toast.current.show({
			severity: "success",
			summary: "Data Downloaded",
			detail: "Data Fetched Successfully",
			life: 2000,
		});
	};

	// Statuses
	const statuses = [
		"New Service Request",
		"Under Progress",
		"Resolved",
		"Working (No Action Required)",
		"Can not be Resolved",
	];

	const getSeverity = (status) => {
		switch (status) {
			case "Can not be Resolved":
				return "danger";
			case "Resolved":
				return "success";
			case "New Service Request":
				return "info";
			case "Under Progress":
				return "warning";
			default:
				return null;
		}
	};

	// File download button
	const fileButton = (data) => {
		if (
			!data.File ||
			data.File === "No file was Uploaded" ||
			data.File[0] === "No file was Uploaded"
		) {
			return <span style={{ color: "#888" }}>No File Uploaded</span>;
		}
		return (
			<a
				href={
					"http://10.3.230.62:5050/download?File_Name=Docket_No " +
					data.Docket_Number +
					" file for " +
					data.Department +
					"&path=" +
					encodeURIComponent(data["File"])
				}
				target="_blank"
				rel="noopener noreferrer"
			>
				<Button
					icon="pi pi-download"
					label="Download"
					className="p-button-sm"
				/>
			</a>
		);
	};

	// Status editing
	const statusEditor = (options) => (
		<Dropdown
			value={temporaryActionStatusData || options.rowData.Present_Status}
			options={statuses}
			onChange={(e) => setTemporaryActionStatusData(e.value)}
			placeholder="Select a Status"
			itemTemplate={(option) => (
				<Tag value={option} severity={getSeverity(option)} />
			)}
			style={{ width: "100%" }}
		/>
	);

	// Row edit complete
	const actionStatusEditComplete = (e) => {
		const tempData = { ...e.data };
		if (temporaryActionStatusData !== tempData.Present_Status) {
			tempData.Old_Status = tempData.Present_Status;
			tempData.Present_Status = temporaryActionStatusData;
			tempData.Data_Edited_by = tempData.Data_Edited_by
				? `${
						parseInt(tempData.Data_Edited_by.split(",")[0]) + 1
				  }. ${personName} (${userId}) ${tempData.Data_Edited_by}`
				: `1. ${personName} (${userId}) :${selectedDepartment}`;
			setEditConfirmBox(true);
			setActionStatusEditedData(tempData);
		} else {
			toast.current.show({
				severity: "warn",
				summary: "No Change",
				detail: "No Editing was Done",
				life: 2000,
			});
			setEditConfirmBox(false);
		}
	};

	// Accept status update
	const accept = () => {
		if (!actionStatusEditedData) return;
		setLoading(true);
		axios
			.get("http://10.3.230.62:5050/UserInputStatusupdate", {
				headers: { datas: JSON.stringify([actionStatusEditedData]) },
			})
			.then((response) => {
				if (
					response.data === "Success" ||
					response.data === "Mail Send Issue"
				) {
					setStatusUpdated(true);
					setStatusChange(
						`(Changed the Status from ${actionStatusEditedData.Old_Status} to ${actionStatusEditedData.Present_Status})`
					);
					toast.current.show({
						severity: response.data === "Mail Send Issue" ? "warn" : "success",
						summary:
							response.data === "Mail Send Issue" ? "Mail Issue" : "Successful",
						detail:
							response.data === "Mail Send Issue"
								? "Error occurred while Sending Mail"
								: "Status Updated",
						life: 2000,
					});
					setInitialApiData((prev) =>
						prev.map((item) =>
							item.Docket_Number === actionStatusEditedData.Docket_Number
								? { ...item, ...actionStatusEditedData }
								: item
						)
					);
				} else {
					setStatusUpdated(false);
					toast.current.show({
						severity: "error",
						summary: "Updation Error",
						detail: "Error occurred while Updation",
						life: 2000,
					});
				}
			})
			.catch(() => {
				toast.current.show({
					severity: "error",
					summary: "Error",
					detail: "Failed to update status.",
					life: 2000,
				});
			})
			.finally(() => setLoading(false));
	};

	// Reject status update
	const reject = () => {
		setStatusUpdated(false);
		toast.current.show({
			severity: "error",
			summary: "Cancelled",
			detail: "Update Cancelled",
			life: 2000,
		});
	};

	// Action dialog footer
	const actionFooterContent = (
		<div>
			<Button
				severity="success"
				raised
				rounded
				disabled={ticketClosed || loading}
				label={buttonName}
				icon="pi pi-check"
				loading={loading}
				onClick={() => {
					if (clickNo === 0) {
						setClickNo(1);
						setButtonName("Save");
						setCommentShow(true);
						setActionComments("");
					} else if (clickNo === 1) {
						setButtonName("Click to add Comment");
						setClickNo(0);
						setCommentShow(false);

						if (!actionComments) {
							if (!statusChange) {
								toast.current.show({
									severity: "warn",
									summary: "No Change",
									detail: "No Changes Detected",
									life: 2000,
								});
								setStatusChange(undefined);
								setActionComments("");
								setStatusUpdated(false);
							} else if (!statusUpdated) {
								addActionComment(
									"No action was taken, only status was changed"
								);
							}
						} else {
							addActionComment(actionComments);
						}
					}
				}}
				autoFocus
			/>
			<Button
				severity="danger"
				raised
				rounded
				label="Back"
				icon="pi pi-times"
				className="p-button-text"
				onClick={handleDialogBack}
			/>
		</div>
	);

	// Add action comment helper
	const addActionComment = (comment) => {
		const newAction = {
			Action: comment,
			Date: moment().format("DD-MM-YYYY hh:mm a"),
			Name:
				(selectedActionData[0]?.Actions_Taken?.length || 0) +
				1 +
				". " +
				personName +
				" (" +
				userId +
				") " +
				selectedActionData[0]?.Department +
				(statusChange ? " " + statusChange : ""),
		};
		const updatedActions = [
			...(selectedActionData[0]?.Actions_Taken || []),
			newAction,
		];
		const updatedData = [
			{ ...selectedActionData[0], Actions_Taken: updatedActions },
		];
		setAction(updatedActions);

		setLoading(true);
		axios
			.get("http://10.3.230.62:5050/UserInputupdate", {
				headers: { datas: JSON.stringify(updatedData) },
			})
			.then((response) => {
				toast.current.show({
					severity: response.data === "Success" ? "success" : "error",
					summary: response.data === "Success" ? "Comment Added" : "Cancelled",
					detail:
						response.data === "Success" ? "Comment Added" : "Update Cancelled",
					life: 2000,
				});
				setStatusChange(undefined);
				setActionComments("");
				setStatusUpdated(response.data === "Success");
			})
			.catch(() => {
				toast.current.show({
					severity: "error",
					summary: "Error",
					detail: "Failed to add comment.",
					life: 2000,
				});
			})
			.finally(() => setLoading(false));
	};

	// Handle dialog back
	function handleDialogBack() {
		setActionsVisible(false);
		setAction(selectedActionData[0]?.Actions_Taken || []);
		setActionComments("");
		setButtonName("Want to Update");
		setClickNo(0);
		setCommentShow(false);
		setStatusChange(undefined);
		setStatusUpdated(false);
	}

	// Action body template
	const actionBodyTemplate = (rowData) => {
		let tooltip = "View Actions";
		let badge = null;
		if (
			rowData.Present_Status === rowData.Old_Status &&
			rowData.Old_Status !== "Resolved"
		) {
			tooltip = "Status Rejected, Please Review";
			badge = <Badge severity="danger" />;
		}
		if (
			rowData.Present_Status === rowData.Old_Status &&
			rowData.Old_Status === "Resolved"
		) {
			tooltip = "Ticket is Closed for this";
		}
		return (
			<div className="card flex justify-content-center">
				{badge}
				<Button
					severity="help"
					raised
					rounded
					style={{ fontSize: "small" }}
					tooltip={tooltip}
					tooltipOptions={{ position: "bottom" }}
					label="Show or Edit"
					icon="pi pi-external-link"
					onClick={() => {
						setActionsVisible(true);
						setAction(rowData.Actions_Taken || []);
						setSubject(rowData.Subject);
						setBrief(rowData.Breif);
						setSelectedActionData([rowData]);
						setActionStatusData([
							{
								Present_Status: rowData.Present_Status,
								Old_Status: rowData.Old_Status,
								Docket_Number: rowData.Docket_Number,
								Data_Edited_by: rowData.Data_Edited_by,
							},
						]);
						if (
							rowData.Present_Status === "Resolved" &&
							rowData.Old_Status === "Resolved"
						) {
							setButtonName("Ticket Closed");
							setTicketClosed(true);
						} else {
							setButtonName("Click to add Comment");
							setTicketClosed(false);
						}
					}}
				/>
			</div>
		);
	};

	// Description body template
	const descriptionBodyTemplate = (rowData) => {
		let tooltip = "View Description";
		if (
			rowData.Present_Status === rowData.Old_Status &&
			rowData.Old_Status !== "Resolved"
		) {
			tooltip = "Status Rejected, Please Review";
		}
		if (
			rowData.Present_Status === rowData.Old_Status &&
			rowData.Old_Status === "Resolved"
		) {
			tooltip = "Ticket is Closed for this";
		}
		return (
			<div className="card flex justify-content-center">
				<Button
					severity="danger"
					raised
					rounded
					tooltip={tooltip}
					tooltipOptions={{ position: "bottom" }}
					label="Show"
					style={{ fontSize: "small" }}
					icon="pi pi-external-link"
					onClick={() => {
						setDescVisible(true);
						setDesc(rowData.Breif);
					}}
				/>
			</div>
		);
	};

	// Timeline content
	const customizedContent = (item) => (
		<Card
			title={item.Name}
			subTitle={item.Date}
			style={{
				marginTop: "0.3rem",
				boxShadow: "revert",
				fontSize: "small",
			}}
		>
			<InputTextarea
				autoResize
				value={item.Action}
				rows={1}
				cols={150}
				disabled
			/>
		</Card>
	);

	// Search/filter
	const header = (
		<div className="flex justify-content-between align-items-center">
			<span className="p-input-icon-left">
				<i className="pi pi-search" />
				<InputTextarea
					placeholder="Search..."
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
					rows={1}
					cols={30}
					style={{ fontSize: "small" }}
				/>
			</span>
			<Button
				icon="pi pi-refresh"
				label="Refresh"
				className="p-button-sm"
				onClick={getUserInputData}
				disabled={loading}
			/>
		</div>
	);

	return (
		<>
			<Toast ref={toast} />

			{/* Session Expired / Unauthorized Access Page */}
			{pageHide && (
				<div className="flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
					<div className="premium-card text-center" style={{ maxWidth: "480px", padding: "40px" }}>
						<Avatar icon="pi pi-lock" size="xlarge" shape="circle" style={{ backgroundColor: "rgba(244, 63, 94, 0.1)", color: "var(--danger-color)", width: "80px", height: "80px", fontSize: "36px", margin: "0 auto 24px auto" }} />
						<h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "12px" }}>Authentication Required</h2>
						<p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "32px" }}>
							Please log in securely via the Single Sign-On (SSO) gateway.
						</p>
						<Button 
							label="Go to SSO Login" 
							icon="pi pi-sign-in" 
							className="p-button-danger w-full"
							onClick={() => window.location = "https://sso.erldc.in"}
						/>
					</div>
				</div>
			)}

			<ConfirmDialog
				visible={editConfirmBox}
				onHide={() => setEditConfirmBox(false)}
				message="Are you sure you want to update this ticket's status?"
				header="Confirm Status Update"
				icon="pi pi-exclamation-triangle"
				accept={accept}
				reject={reject}
			/>

			{!pageHide && (
				<div style={{ padding: "16px 2.2% 40px 2.2%" }}>
					{/* Header section */}
					<div className="flex align-items-center gap-3 mb-4" style={{ paddingLeft: "8px" }}>
						<Avatar icon="pi pi-eye" style={{ backgroundColor: "rgba(99, 102, 241, 0.1)", color: "var(--primary-color)" }} shape="circle" />
						<div>
							<h1 style={{ textAlign: "left", padding: 0, margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>Department Actions Panel</h1>
							<span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>View, respond and manage assigned service tickets</span>
						</div>
					</div>

					{/* Control Dashboard Card */}
					<div className="premium-card" style={{ padding: "20px 32px", marginBottom: "24px" }}>
						<div className="flex flex-column md:flex-row align-items-center justify-content-between gap-4">
							
							{/* Admin Mode Toggle */}
							<div style={{ opacity: isAdmin ? 1 : 0.4, pointerEvents: isAdmin ? "auto" : "none" }}>
								<div className="flex align-items-center gap-3">
									<i className="pi pi-shield" style={{ fontSize: "1.2rem", color: "var(--danger-color)" }}></i>
									<div>
										<span style={{ fontSize: "0.85rem", fontWeight: "700", display: "block" }}>Admin Panel Override</span>
										<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Access all departmental issues</span>
									</div>
									<InputSwitch
										disabled={!isAdmin}
										checked={adminChecked}
										onChange={(e) => setAdminChecked(e.value)}
									/>
								</div>
							</div>

							{/* Fetch Button */}
							<div>
								<Button
									icon="pi pi-download"
									severity="success"
									raised
									label={loading ? "Fetching Data..." : "Fetch Department Data"}
									onClick={getUserInputData}
									disabled={loading}
									style={{ padding: "12px 28px" }}
								/>
							</div>

							{/* Department Tag info */}
							<div className="flex align-items-center gap-2">
								<span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Scope:</span>
								<Tag style={{ background: "rgba(99, 102, 241, 0.08)", color: "var(--primary-color)", border: "1px solid var(--primary-light)", fontSize: "0.9rem", padding: "6px 16px" }} value={selectedDepartment} />
							</div>

						</div>
					</div>

					{/* Logged Data Table Container */}
					<div className="premium-card" hidden={!showTable}>
						<DataTable
							style={{ width: "100%" }}
							paginator
							rows={8}
							rowsPerPageOptions={[8, 16, 32, initialApiData.length]}
							tableStyle={{ minWidth: "50rem" }}
							scrollable
							className="p-datatable-striped"
							removableSort
							value={initialApiData}
							showGridlines
							loading={loading}
							header={header}
							globalFilter={globalFilter}
							emptyMessage="No departmental tickets found."
						>
							<Column
								field="Docket_Number"
								header="Docket No."
								sortable
								style={{ maxWidth: "6rem", minWidth: "6rem", fontWeight: 700 }}
							/>
							<Column
								field="Department"
								header="Concerned Department"
								sortable
								style={{ minWidth: "14rem" }}
							/>
							<Column
								field="Subject"
								header="Subject"
								sortable
								style={{ minWidth: "16rem", maxWidth: "20rem" }}
							/>
							<Column
								body={descriptionBodyTemplate}
								field="Breif"
								header="Description"
								style={{ minWidth: "8rem" }}
							/>
							<Column
								field="Input_Date"
								header="Raising Date &amp; Time"
								sortable
								style={{ minWidth: "11rem" }}
							/>
							<Column
								body={fileButton}
								field="File"
								header="Attachments"
								style={{ minWidth: "10rem" }}
							/>
							<Column
								body={actionBodyTemplate}
								field="Actions_Taken"
								header="Actions"
								style={{ minWidth: "10rem" }}
							/>
							<Column
								body={(rowData) => (
									<Tag
										value={rowData.Present_Status}
										severity={getSeverity(rowData.Present_Status)}
									/>
								)}
								field="Present_Status"
								header="Present Status"
								sortable
								style={{ minWidth: "12rem" }}
							/>
							<Column
								field="Data_Filled_by"
								header="Data Filled by"
								sortable
								style={{ minWidth: "12rem", color: "var(--text-muted)", fontSize: "0.8rem" }}
							/>
							<Column
								field="User_Department"
								header="User Department"
								sortable
								style={{ minWidth: "11rem", color: "var(--text-muted)", fontSize: "0.8rem" }}
							/>
						</DataTable>
					</div>
				</div>
			)}

			{/* Actions / Remarks Details Dialog */}
			<Dialog
				maximized
				maximizable
				dismissableMask
				header="Ticket Management &amp; Audit Logs"
				visible={actionsVisible}
				style={{ width: "65vw" }}
				onHide={handleDialogBack}
				footer={actionFooterContent}
				className="premium-dialog"
			>
				<div style={{ padding: "16px" }}>
					<Container fluid style={{ padding: 0 }}>
						<Row>
							{/* Form Subject Card */}
							<Col md={6}>
								<div className="premium-card" style={{ marginBottom: "20px" }}>
									<span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Subject Of Request</span>
									<h3 style={{ margin: "8px 0 0 0", fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{subject}</h3>
								</div>
							</Col>

							{/* Present Status & Edit block */}
							<Col md={6}>
								<div className="premium-card" style={{ marginBottom: "20px" }}>
									<span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Ticket Resolution Status</span>
									<div className="mt-2">
										<DataTable
											style={{ width: "100%" }}
											value={actionStatusData}
											showGridlines
											editMode="row"
											dataKey="id"
											onRowEditComplete={actionStatusEditComplete}
											onRowEditCancel={reject}
											onRowEditInit={() =>
												toast.current.show({
													severity: "info",
													summary: "Editing Started",
													detail: "Modify ticket status and save when done.",
													life: 2000,
												})
											}
										>
											<Column
												hidden={ticketClosed}
												align="center"
												rowEditor
												header="Modify Status"
												frozen
												className="font-bold"
												style={{ width: "100px" }}
											/>
											<Column
												body={(rowData) => (
													<Tag
														value={rowData.Present_Status}
														severity={getSeverity(rowData.Present_Status)}
														style={{ fontSize: "0.9rem", padding: "6px 12px" }}
													/>
												)}
												header="Active Status State"
												editor={statusEditor}
											/>
										</DataTable>
									</div>
								</div>
							</Col>
						</Row>

						<Row>
							{/* Form Description */}
							<Col sm={12}>
								<div className="premium-card" style={{ marginBottom: "28px" }}>
									<span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Detailed Request Brief</span>
									<p style={{ margin: "12px 0 0 0", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-main)", whiteSpace: "pre-line" }}>{brief}</p>
								</div>
							</Col>
						</Row>

						{/* Audit / Timeline Section */}
						<Row>
							<Col sm={12}>
								<div className="premium-card">
									<span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "24px" }}>Action Timeline &amp; Remarks Log</span>
									
									<Timeline
										value={action}
										layout="vertical"
										className="customized-timeline"
										content={(item) => (
											<div className="premium-card" style={{ padding: "16px 20px", marginBottom: "16px", borderLeft: "4px solid var(--primary-color)", boxShadow: "var(--shadow-sm)" }}>
												<div className="flex align-items-center justify-content-between mb-2">
													<strong style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{item.Name}</strong>
													<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}><i className="pi pi-clock mr-1" />{item.Date}</span>
												</div>
												<p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{item.Action}</p>
											</div>
										)}
									/>
								</div>
							</Col>
						</Row>

						{/* Add Action Comment Panel */}
						<Row hidden={ticketClosed}>
							<Col sm={12} hidden={!commentShow}>
								<div className="premium-card animate-fade-in" style={{ marginTop: "24px", border: "1px solid var(--primary-light)", background: "rgba(99, 102, 241, 0.01)" }}>
									<h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "12px" }}>Input Handling Remarks</h4>
									<InputTextarea
										autoResize
										value={actionComments}
										onChange={(e) => setActionComments(e.target.value)}
										rows={3}
										className="w-full"
										placeholder="Describe actions taken, resolutions details, or queries to the user..."
									/>
								</div>
							</Col>
						</Row>
					</Container>
				</div>
			</Dialog>

			{/* View Description Dialog */}
			<Dialog
				resizable
				header="Detailed Brief"
				visible={descVisible}
				onHide={() => setDescVisible(false)}
				style={{ width: "480px" }}
				className="premium-dialog"
			>
				<div className="py-4">
					<p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>Ticket submission description detail:</p>
					<div className="premium-card" style={{ background: "rgba(0,0,0,0.015)", border: "1px solid rgba(0,0,0,0.05)", padding: "16px 20px" }}>
						<p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-main)", whiteSpace: "pre-line" }}>{desc}</p>
					</div>
				</div>
			</Dialog>
		</>
	);
}

export default Department;

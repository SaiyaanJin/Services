import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import "primeflex/primeflex.css";
import "primereact/resources/themes/lara-light-indigo/theme.css"; //theme
import "primereact/resources/primereact.min.css"; //core css
import "primeicons/primeicons.css"; //icons
// import { DownloadTableExcel } from "react-export-table-to-excel";
import axios from "axios";
import { Button } from "primereact/button";
import { Fieldset } from "primereact/fieldset";
// import { InputText } from "primereact/inputtext";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Dropdown } from "primereact/dropdown";
import { ConfirmDialog } from "primereact/confirmdialog";
import {jwtDecode} from "jwt-decode";
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
// import Typography from "@material-ui/core/Typography";
import "../cssfiles/Animation.css";

function Department(params) {
	const search = useLocation().search;
	const id = new URLSearchParams(search).get("token");
	// const tableRef = useRef(null);
	const [initial_api_data, set_initial_api_data] = useState([]);
	const [show_table, set_show_table] = useState(true);
	const toast = useRef();
	// const [index_val, setindex_val] = useState();
	const [Action_status_edited_data, setAction_status_edited_data] = useState();
	const [edit_confirm_box, setedit_confirm_box] = useState(false);
	const [page_hide, setPage_hide] = useState(true);
	params.var5(page_hide);
	const [User_id, setUser_id] = useState();
	const [Selected_department, setSelected_department] = useState();
	const [Person_Name, setPerson_Name] = useState();
	const [Actions_visible, setActions_visible] = useState(false);
	const [comment_show, setcomment_show] = useState(false);
	const [Action, setAction] = useState();
	const [Descvisible, setDescVisible] = useState(false);
	const [Desc, setDesc] = useState();
	const [Action_comments, setAction_comments] = useState();
	const [Subject, setSubject] = useState();
	const [Breif, setBreif] = useState();
	const [Selected_Action_data, setSelected_Action_data] = useState();
	const [ButtonName, setButtonName] = useState("Want to Update");
	const [ClickNo, setClickNo] = useState(0);

	// const [oldStatusData, setoldStatusData] = useState();
	const [StatusChange, setStatusChange] = useState();

	const [Action_StatusData, setAction_StatusData] = useState();
	const [Temporary_Action_StatusData, setTemporary_Action_StatusData] =
		useState();

	const [Ticket_closed, setTicket_closed] = useState(false);
	const [Status_updated, setStatus_updated] = useState(false);
	const [isAdmin, setisAdmin] = useState(false);
	const [AdminChecked, setAdminChecked] = useState(false);

	useEffect(() => {
		if (id) {
			axios
				.get("https://sso.erldc.in:5000/verify", {
					headers: { Token: id },
				})
				.then((response) => {
					if (response.data === "User has logout") {
						alert("User Logged-out, Please login via SSO again");
						window.location = "https://sso.erldc.in:3000";
						setPage_hide(true);
					} else if (response.data === "Bad Token") {
						alert("Unauthorised Access, Please login via SSO again");
						window.location = "https://sso.erldc.in:3000";
						setPage_hide(true);
					} else {
						var decoded = jwtDecode(response.data["Final_Token"], "it@posoco");

						if (decoded["Login"] && decoded["Reason"] === "Session Expired") {
							alert("session Expired, Please Login Again via SSO");

							axios
								.post("https://sso.erldc.in:5000/logout", {
									headers: { token: id },
								})
								.then((response) => {
									window.location = "https://sso.erldc.in:3000";
								})
								.catch((error) => {});
						} else {
							setUser_id(decoded["User"]);
							setPage_hide(!decoded["Login"]);
							setPerson_Name(decoded["Person_Name"]);

							if (
								(decoded["User"] === "00162" &&
									decoded["Person_Name"] === "Sanjay Kumar") ||
								decoded["User"] === "60004"
							) {
								setisAdmin(true);
							}

							if (
								decoded["Department"] === "IT-TS" ||
								decoded["Department"] === "IT"
							) {
								setSelected_department("Information Technology");
							}

							if (
								decoded["Department"] === "MO" ||
								decoded["Department"] === "MO-I" ||
								decoded["Department"] === "MO-II" ||
								decoded["Department"] === "MO-III" ||
								decoded["Department"] === "MO-IV"
							) {
								setSelected_department("Market Operation");
							}

							if (
								decoded["Department"] === "MIS" ||
								decoded["Department"] === "SS" ||
								decoded["Department"] === "CR" ||
								decoded["Department"] === "SO"
							) {
								setSelected_department("System Operation");
							}

							if (decoded["Department"] === "SCADA") {
								setSelected_department("SCADA");
							}

							if (decoded["Department"] === "CS") {
								setSelected_department("Contracts & Services");
							}

							if (decoded["Department"] === "TS") {
								setSelected_department("Technical Services");
							}

							if (decoded["Department"] === "HR") {
								setSelected_department("Human Resource");
							}

							if (decoded["Department"] === "COMMUNICATION") {
								setSelected_department("Communication");
							}

							if (decoded["Department"] === "F&A") {
								setSelected_department("Finance & Accounts");
							}

							get_User_Input_data();
						}
					}
				})
				.catch((error) => {});
		} else {
			setPage_hide(true);
		}
	}, [id, Selected_department, User_id, page_hide, Person_Name]);

	const get_User_Input_data = () => {
		if (!AdminChecked) {
			axios
				.get("http://10.3.230.62:5050/ExportDataDepartment", {
					headers: { Data: Selected_department },
				})
				.then((response) => {
					set_initial_api_data(response.data);

					showSuccess();

					set_show_table(false);
				})

				.catch((error) => {});
		} else {
			axios
				.get("http://10.3.230.62:5050/ExportDataDepartmentAdmin", {
					headers: { Data: Selected_department },
				})
				.then((response) => {
					set_initial_api_data(response.data);

					showSuccess();

					set_show_table(false);
				})

				.catch((error) => {});
		}
	};

	const showSuccess = () => {
		toast.current.show({
			severity: "success",
			summary: "Data Downloaded",
			detail: "Data Fetched Successfully",
			life: 3000,
		});
	};

	const accept = () => {
		if (Action_status_edited_data) {
			axios
				.get("http://10.3.230.62:5050/UserInputStatusupdate", {
					headers: {
						datas: JSON.stringify([Action_status_edited_data]),
					},
				})
				.then((response) => {
					if (
						response.data === "Success" ||
						response.data === "Mail Send Issue"
					) {
						setStatus_updated(false);
						setStatusChange(
							"(Changed the Status from " +
								Action_status_edited_data.Old_Status +
								" to " +
								Action_status_edited_data.Present_Status +
								")"
						);
						if (response.data === "Mail Send Issue") {
							toast.current.show({
								severity: "warn",
								summary: "Mail Send Issue",
								detail: "Error occured while Sending Mail",
								life: 3000,
							});
						} else {
							toast.current.show({
								severity: "success",
								summary: "Successful",
								detail: "Status Updated",
								life: 3000,
							});
						}

						for (var it = 0; it < initial_api_data.length; it++) {
							if (
								initial_api_data[it].Docket_Number ===
								Action_status_edited_data.Docket_Number
							) {
								initial_api_data[it].Present_Status =
									Action_status_edited_data.Present_Status;
								initial_api_data[it].Old_Status =
									Action_status_edited_data.Old_Status;
								initial_api_data[it].Data_Edited_by =
									Action_status_edited_data.Data_Edited_by;
							}
						}
					} else {
						setStatus_updated(false);
						toast.current.show({
							severity: "error",
							summary: "Updation Error",
							detail: "Error occured while Updation",
							life: 3000,
						});
					}
				})
				.catch((error) => {});
		}
	};

	const reject = () => {
		if ((Action_StatusData, Action_status_edited_data)) {
			setStatus_updated(false);
			Action_StatusData[0].Present_Status =
				Action_status_edited_data.Old_Status;
		}

		toast.current.show({
			severity: "error",
			summary: "Cancelled",
			detail: "Update Cancelled",
			life: 3000,
		});
	};

	const info = () => {
		toast.current.show({
			severity: "info",
			summary: "Editing Started",
			detail: "Carefully Edit Data",
			life: 3000,
		});
	};

	const Action_footerContent = (
		<div>
			<Button
				severity="success"
				raised
				rounded
				disabled={Ticket_closed}
				label={ButtonName}
				icon="pi pi-check"
				onClick={() => {
					if (ClickNo === 0) {
						setClickNo(1);
						setButtonName("Save");
						setcomment_show(true);
						setAction_comments("");
					} else if (ClickNo === 1) {
						setButtonName("Click to add Comment");
						setClickNo(0);
						setcomment_show(false);

						if (Action_comments === undefined || Action_comments === "") {
							if (StatusChange === undefined) {
								alert("No Changes Detected");
								setStatusChange(undefined);
								setAction_comments(undefined);
								setStatus_updated(false);
							} else if (!Status_updated) {
								var temp_dict5 = [
									{
										Action: Action_comments,
										Date: moment().format("DD-MM-YYYY hh:mm a"),
										Name:
											Selected_Action_data[0].Actions_Taken.length +
											1 +
											". " +
											Person_Name +
											" (" +
											User_id +
											") " +
											Selected_Action_data[0]["Department"] +
											" " +
											StatusChange,
									},
								];
								Selected_Action_data[0].Actions_Taken = [
									...Selected_Action_data[0].Actions_Taken,
									...temp_dict5,
								];

								axios
									.get("http://10.3.230.62:5050/UserInputupdate", {
										headers: { datas: JSON.stringify(Selected_Action_data) },
									})
									.then((response) => {
										if (response.data === "Success") {
											setStatus_updated(true);
											toast.current.show({
												severity: "success",
												detail: "Comment Added",
												life: 3000,
											});
										} else {
											setStatus_updated(false);
											toast.current.show({
												severity: "error",
												summary: "Cancelled",
												detail: "Update Cancelled",
												life: 3000,
											});
										}
										setStatusChange(undefined);
										setAction_comments(undefined);
									})
									.catch((error) => {});

								// toast.current.show({
								//   severity: "success",
								//   summary: "Successful",
								//   detail: "Comment Added",
								//   life: 3000,
								// });

								setAction(Selected_Action_data[0]["Actions_Taken"]);
							}
						} else {
							if (StatusChange === undefined) {
								setStatus_updated(false);
								var temp_dict1 = [
									{
										Action: Action_comments,
										Date: moment().format("DD-MM-YYYY hh:mm a"),
										Name:
											Selected_Action_data[0].Actions_Taken.length +
											1 +
											". " +
											Person_Name +
											" (" +
											User_id +
											") " +
											Selected_Action_data[0]["Department"],
									},
								];
								Selected_Action_data[0].Actions_Taken = [
									...Selected_Action_data[0].Actions_Taken,
									...temp_dict1,
								];

								axios
									.get("http://10.3.230.62:5050/UserInputupdate", {
										headers: { datas: JSON.stringify(Selected_Action_data) },
									})
									.then((response) => {
										if (response.data === "Success") {
											toast.current.show({
												severity: "success",
												detail: "Comment Added",
												life: 3000,
											});
										} else {
											toast.current.show({
												severity: "error",
												summary: "Cancelled",
												detail: "Update Cancelled",
												life: 3000,
											});
										}
										setStatusChange(undefined);
										setAction_comments(undefined);
									})
									.catch((error) => {});

								// toast.current.show({
								//   severity: "success",
								//   summary: "Successful",
								//   detail: "Comment Added",
								//   life: 3000,
								// });

								setAction(Selected_Action_data[0]["Actions_Taken"]);
								setStatusChange(undefined);
								setAction_comments(undefined);
							} else if (!Status_updated) {
								var temp_dict2 = [
									{
										Action: Action_comments,
										Date: moment().format("DD-MM-YYYY hh:mm a"),
										Name:
											Selected_Action_data[0].Actions_Taken.length +
											1 +
											". " +
											Person_Name +
											" (" +
											User_id +
											") " +
											Selected_Action_data[0]["Department"] +
											" " +
											StatusChange,
									},
								];
								Selected_Action_data[0].Actions_Taken = [
									...Selected_Action_data[0].Actions_Taken,
									...temp_dict2,
								];

								axios
									.get("http://10.3.230.62:5050/UserInputupdate", {
										headers: { datas: JSON.stringify(Selected_Action_data) },
									})
									.then((response) => {
										if (response.data === "Success") {
											setStatus_updated(true);
											toast.current.show({
												severity: "success",
												detail: "Comment Added",
												life: 3000,
											});
										} else {
											setStatus_updated(false);
											toast.current.show({
												severity: "error",
												summary: "Cancelled",
												detail: "Update Cancelled",
												life: 3000,
											});
										}
										setStatusChange(undefined);
										setAction_comments(undefined);
									})
									.catch((error) => {});

								// toast.current.show({
								//   severity: "success",
								//   summary: "Successful",
								//   detail: "Comment Added",
								//   life: 3000,
								// });

								setAction(Selected_Action_data[0]["Actions_Taken"]);
							}
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
				onClick={() => {
					if (StatusChange !== undefined && !Status_updated) {
						var temp_dict3 = [
							{
								Action: "No action was taken, only status was changed",
								Date: moment().format("DD-MM-YYYY hh:mm a"),
								Name:
									Selected_Action_data[0].Actions_Taken.length +
									1 +
									". " +
									Person_Name +
									" (" +
									User_id +
									") " +
									Selected_Action_data[0].Department +
									" " +
									StatusChange,
							},
						];

						Selected_Action_data[0].Actions_Taken = [
							...Selected_Action_data[0].Actions_Taken,
							...temp_dict3,
						];

						axios
							.get("http://10.3.230.62:5050/UserInputupdate", {
								headers: { datas: JSON.stringify(Selected_Action_data) },
							})
							.then((response) => {
								if (response.data === "Success") {
									setStatus_updated(true);
									toast.current.show({
										severity: "success",
										detail: "Comment Added",
										life: 3000,
									});
								} else {
									setStatus_updated(false);
									toast.current.show({
										severity: "error",
										summary: "Cancelled",
										detail: "Update Cancelled",
										life: 3000,
									});
								}
							})
							.catch((error) => {});
					}

					setActions_visible(false);
					setAction(Selected_Action_data[0].Actions_Taken);
					setAction_comments();
					setButtonName("Want to Update");
					setClickNo(0);
					setcomment_show(false);
					setStatusChange(undefined);
					setAction_comments(undefined);
					setStatus_updated(false);
					// get_User_Input_data();
				}}
				className="p-button-text"
			/>
		</div>
	);

	const fileButton = (data) => {
		if (
			data.File === "No file was Uploaded" ||
			data.File[0] === "No file was Uploaded"
		) {
			return <h4>No File was Uploaded</h4>;
		} else {
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
				>
					{" "}
					Download{" "}
				</a>
			);
		}
	};

	const Action_status_Edit_Complete = (e) => {
		var temp_e = e;
		if (Temporary_Action_StatusData !== temp_e.data.Present_Status) {
			temp_e.data.Old_Status = temp_e.data.Present_Status;
			temp_e.data.Present_Status = Temporary_Action_StatusData;

			if (temp_e.data.Data_Edited_by === "") {
				temp_e.data.Data_Edited_by =
					"1. " + Person_Name + " (" + User_id + ") :" + Selected_department;
			} else {
				let temp_var = temp_e.data.Data_Edited_by.split(",");
				temp_e.data.Data_Edited_by =
					parseInt(temp_var[0]) +
					1 +
					". " +
					Person_Name +
					" (" +
					User_id +
					") " +
					temp_e.data.Data_Edited_by;
			}
			setedit_confirm_box(true);
		} else {
			alert("No Editing was Done");
			setedit_confirm_box(false);
		}

		setAction_status_edited_data(temp_e.data);
	};

	const onRowEditCancel = (e) => {
		if (e) {
			toast.current.show({
				severity: "error",
				summary: "Cancelled",
				detail: "Update Cancelled",
				life: 3000,
			});
		}
	};

	const [statuses] = useState([
		"New Service Request",
		"Under Progress",
		"Resolved",
		"Working (No Action Required)",
		"Can not be Resolved",
	]);

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

			case "Working (No Action Required)":
				return null;

			default:
				return null;
		}
	};

	const StatusBodyTemplate = (rowData) => {
		return (
			<Tag
				style={{ fontSize: "Medium" }}
				value={rowData.Present_Status}
				severity={getSeverity(rowData.Present_Status)}
			/>
		);
	};

	const Action_StatusBodyTemplate = (rowData) => {
		return (
			<Tag
				style={{ fontSize: "Medium" }}
				value={rowData.Present_Status}
				severity={getSeverity(rowData.Present_Status)}
			/>
		);
	};

	const ActionBodyTemplate = (rowData) => {
		var tooltip_com = "View Actions";
		var badge = "";
		if (
			rowData.Present_Status === rowData.Old_Status &&
			rowData.Old_Status !== "Resolved"
		) {
			tooltip_com = "Status Rejected, Please Review";
			badge = <Badge severity="danger"></Badge>;
		}
		if (
			rowData.Present_Status === rowData.Old_Status &&
			rowData.Old_Status === "Resolved"
		) {
			tooltip_com = "Ticket is Closed for this";
		}

		return (
			<div className="card flex justify-content-center">
				{badge}
				<Button
					severity="help"
					raised
					rounded
					style={{ fontSize: "small" }}
					tooltip={tooltip_com}
					tooltipOptions={{ position: "bottom" }}
					label="Show or Edit"
					icon="pi pi-external-link"
					onClick={() => {
						setActions_visible(true);
						setAction(rowData.Actions_Taken);
						setSubject(rowData.Subject);
						setBreif(rowData.Breif);
						setSelected_Action_data([rowData]);
						setAction_StatusData([
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
							setTicket_closed(true);
						} else {
							setButtonName("Click to add Comment");
							setTicket_closed(false);
						}
					}}
				/>
			</div>
		);
	};

	const DescriptionBodyTemplate = (rowData) => {
		var tooltip_com = "View Description";
		if (
			rowData.Present_Status === rowData.Old_Status &&
			rowData.Old_Status !== "Resolved"
		) {
			tooltip_com = "Status Rejected, Please Review";
		}
		if (
			rowData.Present_Status === rowData.Old_Status &&
			rowData.Old_Status === "Resolved"
		) {
			tooltip_com = "Ticket is Closed for this";
		}
		return (
			<div className="card flex justify-content-center">
				<Button
					severity="danger"
					raised
					rounded
					tooltip={tooltip_com}
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

	const statusEditor = (options) => {
		if (Temporary_Action_StatusData === undefined) {
			setTemporary_Action_StatusData(options.rowData.Present_Status);
		}

		return (
			<Dropdown
				value={Temporary_Action_StatusData}
				options={statuses}
				onChange={(e) => {
					setTemporary_Action_StatusData(e.value);
				}}
				placeholder="Select a Status"
				itemTemplate={(option) => {
					return <Tag value={option} severity={getSeverity(option)}></Tag>;
				}}
			/>
		);
	};

	const customizedContent = (item) => {
		return (
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
					// onChange={(e) => setAction_comments(e.target.value)}
					rows={1}
					cols={150}
				/>
			</Card>
		);
	};

	return (
		<>
			<Fieldset hidden={!page_hide}>
				<div className="card flex justify-content-center">
					<h1>Please Login again by SSO</h1>
				</div>
			</Fieldset>

			<Toast ref={toast} />

			<ConfirmDialog
				visible={edit_confirm_box}
				onHide={() => setedit_confirm_box(false)}
				message="Are you sure you want to Update Status?"
				header="Confirm Update"
				icon="pi pi-exclamation-triangle"
				accept={accept}
				reject={reject}
			/>

			<Fieldset
				hidden={page_hide}
				legend={
					<div className="flex align-items-center ">
						<span
							className="pi pi-eye"
							style={{ fontWeight: "bold", fontSize: "small" }}
						></span>
						<span>Department Data</span>
					</div>
				}
			>
				<div className="card flex justify-content-center" hidden={!isAdmin}>
					<h4
						hidden={!isAdmin}
						style={{ marginTop: "-1.5%", marginLeft: "-1%" }}
					>
						Admin Mode
					</h4>
					<br />
					<div hidden={!isAdmin} style={{ marginLeft: "-4%" }}>
						<InputSwitch
							disabled={!isAdmin}
							style={{ marginLeft: "-6%" }}
							checked={AdminChecked}
							onChange={(e) => setAdminChecked(e.value)}
						/>
					</div>
				</div>
				<br />
				<div className="card flex justify-content-center">
					<Button
						icon="pi pi-download"
						severity="success"
						raised
						rounded
						label="Fetch Department Data"
						aria-label="Your Data"
						onClick={() => {
							get_User_Input_data();
						}}
					/>
				</div>

				<div
					className="card"
					hidden={show_table}
					style={{
						width: "auto",
						whitespace: "nowrap",
					}}
				>
					<DataTable
						style={{ width: "100%" }}
						paginator
						rows={5}
						rowsPerPageOptions={[5, 10, initial_api_data.length]}
						tableStyle={{ minWidth: "50rem" }}
						paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
						currentPageReportTemplate="{first} to {last} of {totalRecords}"
						scrollable
						// scrollHeight="400px"
						className="mt-4"
						removableSort
						value={initial_api_data}
						showGridlines
					>
						<Column
							style={{
								maxWidth: "5rem",
								minWidth: "5rem",
								whiteSpace: "pre-wrap",
							}}
							field="Docket_Number"
							header="Docket Number"
						></Column>
						<Column
							style={{
								mmaxWidth: "14rem",
								minWidth: "14rem",
								whiteSpace: "pre-wrap",
							}}
							field="Department"
							header="Concerned Department"
							sortable
						></Column>
						<Column
							style={{
								minWidth: "18rem",
								maxWidth: "18rem",
								whitespace: "pre-wrap",
							}}
							field="Subject"
							header="Subject"
							sortable
						></Column>
						<Column
							style={{
								maxWidth: "8rem",
								minWidth: "8rem",
								whitespace: "pre-wrap",
							}}
							body={DescriptionBodyTemplate}
							field="Breif"
							header="Description"
						></Column>

						<Column
							style={{
								maxWidth: "10rem",
								minWidth: "10rem",
								whitespace: "pre-wrap",
							}}
							field="Input_Date"
							header="Concern Raising Date & Time"
							sortable
						></Column>

						<Column
							style={{
								maxWidth: "13rem",
								minWidth: "13rem",
								whiteSpace: "pre-wrap",
							}}
							body={fileButton}
							field="File"
							header="Relevant Attachments"
							sortable
						></Column>

						<Column
							style={{
								maxWidth: "12rem",
								minWidth: "12rem",
								whiteSpace: "pre-wrap",
							}}
							body={ActionBodyTemplate}
							field="Actions_Taken"
							header="Actions Taken"
						></Column>
						<Column
							style={{
								maxWidth: "15rem",
								minWidth: "15rem",
								whitespace: "pre-wrap",
							}}
							body={StatusBodyTemplate}
							field="Present_Status"
							header="Present Status"
							sortable
						></Column>

						<Column
							style={{
								maxWidth: "13rem",
								minWidth: "13rem",
								whiteSpace: "pre-wrap",
							}}
							field="Data_Filled_by"
							header="Data Filled by"
							sortable
						></Column>
						<Column
							style={{
								maxWidth: "9rem",
								minWidth: "9rem",
								whiteSpace: "pre-wrap",
							}}
							field="User_Department"
							header="User Department"
							sortable
						></Column>
					</DataTable>
				</div>
			</Fieldset>

			<Dialog
				maximized
				maximizable
				dismissableMask
				header="Actions Taken so far"
				visible={Actions_visible}
				style={{ width: "50vw" }}
				onHide={() => {
					setActions_visible(false);

					if (StatusChange !== undefined && !Status_updated) {
						var temp_dict4 = [
							{
								Action: "No action was taken, only status was changed",
								Date: moment().format("DD-MM-YYYY hh:mm a"),
								Name:
									Selected_Action_data[0].Actions_Taken.length +
									1 +
									". " +
									Person_Name +
									" (" +
									User_id +
									") " +
									Selected_Action_data[0].Department +
									" " +
									StatusChange,
							},
						];

						Selected_Action_data[0].Actions_Taken = [
							...Selected_Action_data[0].Actions_Taken,
							...temp_dict4,
						];

						axios
							.get("http://10.3.230.62:5050/UserInputupdate", {
								headers: { datas: JSON.stringify(Selected_Action_data) },
							})
							.then((response) => {
								if (response.data === "Success") {
									setStatus_updated(true);
									toast.current.show({
										severity: "success",
										detail: "Comment Added",
										life: 3000,
									});
								} else {
									setStatus_updated(false);
									toast.current.show({
										severity: "error",
										summary: "Cancelled",
										detail: "Update Cancelled",
										life: 3000,
									});
								}
								setStatusChange(undefined);
								setAction_comments(undefined);
								setStatus_updated(false);
							})
							.catch((error) => {});
					}
					// get_User_Input_data();
				}}
				footer={Action_footerContent}
			>
				<div className="flex flex-wrap gap-1 justify-content-between align-items-center">
					<div className="field"></div>
					<div className="field">
						<span className="p-float-label">
							<h4>1. subject of the Service Request</h4>

							<InputTextarea autoResize value={Subject} rows={2} cols={70} />
						</span>
					</div>
					<div className="field">
						<span className="p-float-label">
							<h4>2. Present Status of the Service Request</h4>
							<DataTable
								style={{ width: "100%" }}
								value={Action_StatusData}
								showGridlines
								editMode="row"
								dataKey="id"
								onRowEditComplete={Action_status_Edit_Complete}
								onRowEditCancel={onRowEditCancel}
								onRowEditInit={info}
							>
								<Column
									hidden={Ticket_closed}
									align="center"
									rowEditor
									header="Edit Service Status"
									frozen
									className="font-bold"
								></Column>

								<Column
									body={Action_StatusBodyTemplate}
									header="Present Status"
									editor={(options) => statusEditor(options)}
								></Column>
							</DataTable>
						</span>
					</div>
					<div className="field"></div>
				</div>

				<div className="flex flex-wrap gap-1 justify-content-between align-items-center">
					<div className="field"></div>
					<div className="field">
						<span className="p-float-label">
							<h4>2. Breif Description of the Service Request</h4>

							<InputTextarea autoResize value={Breif} rows={5} cols={150} />
						</span>
					</div>
					<div className="field"></div>
				</div>
				<Divider />

				<Container>
					<Row>
						<div className="card">
							<Timeline
								value={Action}
								layout="vertical"
								// align="alternate"
								className="customized-timeline"
								content={customizedContent}
							/>
						</div>
					</Row>
				</Container>

				<Divider />

				<Container hidden={Ticket_closed}>
					<Row>
						<Col sm={12} hidden={!comment_show}>
							<div
								className="card flex justify-content-center"
								style={{ marginLeft: "-4%" }}
							>
								<b>Enter your Remarks</b>
								<InputTextarea
									hidden={!comment_show}
									autoResize
									value={Action_comments}
									onChange={(e) => setAction_comments(e.target.value)}
									rows={2}
									cols={220}
								/>
							</div>
						</Col>
					</Row>
				</Container>
			</Dialog>

			<div className="card flex justify-content-center">
				<Dialog
					resizable
					header="Description"
					visible={Descvisible}
					onHide={() => {
						setDescVisible(false);
					}}
					style={{ width: "50vw" }}
					breakpoints={{ "960px": "75vw", "641px": "100vw" }}
				>
					<div className="card flex justify-content-center">
						<InputTextarea
							autoResize
							value={Desc}
							// onChange={(e) => setDesc(e.target.value)}
							rows={2}
							cols={110}
							// disabled={true}
						/>
					</div>
				</Dialog>
			</div>
		</>
	);
}
export default Department;

import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
// import { DownloadTableExcel } from "react-export-table-to-excel";
import axios from "axios";
import { Button } from "primereact/button";
import { Fieldset } from "primereact/fieldset";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
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
// import { Dropdown } from "primereact/dropdown";
import { Badge } from "primereact/badge";
import { InputSwitch } from "primereact/inputswitch";
import { Avatar } from "primereact/avatar";
import "../cssfiles/Animation.css";

function Data(params) {
	const search = useLocation().search;
	const id = new URLSearchParams(search).get("token");
	// const tableRef = useRef(null);
	const [Original_Api_data, set_Original_Api_data] = useState([]);
	const [Original_Api_data_copy, set_Original_Api_data_copy] = useState();
	const [show_table, set_show_table] = useState(true);
	const toast = useRef();
	const [Confirm_box_visible, setConfirm_box_visible] = useState(false);
	const [page_hide, setpage_hide] = useState(true);
	params.var3(page_hide);
	const [User_id, setUser_id] = useState();
	const [Selected_department, setSelected_department] = useState();
	const [Person_Name, setPerson_Name] = useState();
	const [Action_box_show, setAction_box_show] = useState(false);
	const [Comment_box_show, setComment_box_show] = useState(false);
	const [row_Action_Data, setrow_Action_Data] = useState();
	const [Description_visible, setDescription_visible] = useState(false);
	const [Original_Description, set_Original_Description] = useState();
	const [Description_Field_box, setDescription_Field_box] = useState();
	const [Description_Edit_Button_Name, setDescription_Edit_Button_Name] =
		useState("Enable Editing");
	const [Description_button_click_no, setDescription_button_click_no] =
		useState(0);
	const [Description_Edit_Enable, setDescription_Edit_Enable] = useState(false);
	const [Selected_Description, setSelected_Description] = useState(0);

	const [Action_Comment_Box, setAction_Comment_Box] = useState();
	const [Subject, setSubject] = useState();
	const [Brief, setBrief] = useState();
	const [Original_row_Action_Data, setOriginal_row_Action_Data] = useState();
	const [Action_Button, setAction_Button] = useState("Click to add Comment");
	const [Action_button_click_no, setAction_button_click_no] = useState(0);
	const [Dont_Hide_Status, setDont_Hide_Status] = useState(false);
	const [User_Status_Change_Acceptance, setUser_Status_Change_Acceptance] =
		useState();
	const [Ticket_closed, setTicket_closed] = useState(false);
	// const [Status_updated, setStatus_updated] = useState(false);
	const [row_Status_data, setrow_Status_data] = useState();
	const [isAdmin, setisAdmin] = useState(false);
	const [AdminChecked, setAdminChecked] = useState(false);
	const [DepartmentalChecked, setDepartmentalChecked] = useState(false);
	const [DepartmentalChecked_button, setDepartmentalChecked_button] =
		useState("Departmental Data");

	useEffect(() => {
		if (DepartmentalChecked) {
			setDepartmentalChecked_button("Departmental Data");
		} else {
			setDepartmentalChecked_button(Person_Name + "'s Data");
		}

		if (id) {
			axios
				.get("https://sso.erldc.in:5000/verify", {
					headers: { Token: id },
				})
				.then((response) => {
					if (response.data === "User has logout") {
						alert("User Logged-out, Please login via SSO again");
						window.location = "https://sso.erldc.in:3000";
						setpage_hide(true);
					} else if (response.data === "Bad Token'") {
						alert("Unauthorised Access, Please login via SSO again");
						window.location = "https://sso.erldc.in:3000";
						setpage_hide(true);
					} else {
						var decoded = jwtDecode(response.data["Final_Token"], "it@posoco");
						if (!decoded["Login"] && decoded["Reason"] === "Session Expired") {
							alert("Session Expired, Please Login Again via SSO");
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
							setpage_hide(!decoded["Login"]);
							setPerson_Name(decoded["Person_Name"]);

							if (
								(decoded["User"] === "00162" &&
									decoded["Person_Name"] === "Sanjay Kumar") ||
								decoded["User"] === "60004"
							) {
								setisAdmin(true);
							} else {
								setisAdmin(false);
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
							if (decoded["Department"] === "CR") {
								setSelected_department("Control Room");
							}
						}
					}
				})
				.catch((error) => {});
		} else {
			setpage_hide(true);
		}

		if (Original_Api_data_copy) {
			var temp_Original_Api_data = Original_Api_data_copy;
			if (DepartmentalChecked) {
				set_Original_Api_data(temp_Original_Api_data);
			} else {
				var temp_data = [];
				for (var z = 0; z < Original_Api_data.length; z++) {
					if (
						Original_Api_data[z]["Data_Filled_by"] ===
						Person_Name + " (" + User_id + ")"
					) {
						temp_data.push(Original_Api_data[z]);
					}
				}
				set_Original_Api_data(temp_data);
			}
		}
	}, [
		id,
		Original_Api_data,
		Original_Api_data_copy,
		Selected_department,
		User_id,
		page_hide,
		Person_Name,
		DepartmentalChecked,
	]);

	const get_User_Input_data = () => {
		if (!AdminChecked) {
			axios
				.get("http://10.3.230.62:5050/ExportDataAlluser", {
					headers: { Data: Selected_department },
				})
				.then((response) => {
					set_Original_Api_data(response.data);
					set_Original_Api_data_copy(response.data);
					showSuccess();
					set_show_table(false);

					if (response.data.Ticket_Closed) {
						setAction_Button("Ticket Closed");
						setDescription_Edit_Button_Name("Ticket Closed");
					} else {
						setAction_Button("Click to add Comment");
						setDescription_Edit_Button_Name("Enable Editing");
					}
				});
			// if (!DepartmentalChecked) {
			// 	axios
			// 		.get("http://10.3.230.62:5050/ExportData", {
			// 			headers: { Data: Person_Name + " (" + User_id + ")" },
			// 		})
			// 		.then((response) => {
			// 			set_Original_Api_data(response.data);
			// 			showSuccess();
			// 			set_show_table(false);

			// 			if (response.data.Ticket_Closed) {
			// 				setAction_Button("Ticket Closed");
			// 				setDescription_Edit_Button_Name("Ticket Closed");
			// 			} else {
			// 				setAction_Button("Click to add Comment");
			// 				setDescription_Edit_Button_Name("Enable Editing");
			// 			}
			// 		});
			// } else {
			// 	axios
			// 		.get("http://10.3.230.62:5050/ExportDataAlluser", {
			// 			headers: { Data: Selected_department },
			// 		})
			// 		.then((response) => {
			// 			set_Original_Api_data(response.data);
			// 			showSuccess();
			// 			set_show_table(false);

			// 			if (response.data.Ticket_Closed) {
			// 				setAction_Button("Ticket Closed");
			// 				setDescription_Edit_Button_Name("Ticket Closed");
			// 			} else {
			// 				setAction_Button("Click to add Comment");
			// 				setDescription_Edit_Button_Name("Enable Editing");
			// 			}
			// 		});
			// }
		} else {
			axios
				.get("http://10.3.230.62:5050/ExportDataAdmin", {
					headers: { Data: Person_Name + " (" + User_id + ")" },
				})
				.then((response) => {
					set_Original_Api_data(response.data);
					set_Original_Api_data_copy(response.data);
					showSuccess();
					set_show_table(false);

					if (response.data.Ticket_Closed) {
						setAction_Button("Ticket Closed");
						setDescription_Edit_Button_Name("Ticket Closed");
					} else {
						setAction_Button("Click to add Comment");
						setDescription_Edit_Button_Name("Enable Editing");
					}
				});
		}
	};
	const showSuccess = () => {
		toast.current.show({
			severity: "success",
			summary: "Data Downloaded",
			detail: "Data Fetched SuccessFully",
			life: 3000,
		});
	};

	const accept = () => {
		setDescription_button_click_no(0);
		setDescription_Edit_Button_Name("Enable Editing");
		setDescription_Edit_Enable(false);
		axios
			.get("http://10.3.230.62:5050/UserBreifupdate", {
				headers: { datas: JSON.stringify([Selected_Description]) },
			})
			.then((response) => {
				if (response.data === "Success") {
					// setStatus_updated(true);
					toast.current.show({
						severity: "success",
						detail: "Comment Added",
						life: 3000,
					});
				} else {
					// setStatus_updated(false);
					toast.current.show({
						severity: "error",
						summary: "Cancelled",
						detail: "Update Cancelled",
						life: 3000,
					});
				}
			})
			.catch((error) => {});
	};

	const reject = () => {
		setDescription_button_click_no(0);
		setDescription_Edit_Button_Name("Enable Editing");
		setDescription_Edit_Enable(false);
		toast.current.show({
			severity: "error",
			summary: "Cancelled",
			detail: "Update Cancelled",
			life: 3000,
		});
	};

	const sameData = () => {
		toast.current.show({
			severity: "error",
			summary: "No Changes Detected",
			detail: "Update Cancelled as no any Data change detected",
			Life: 3000,
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

	const filebutton = (data) => {
		if (
			data["File"][0] !== "No file was Uploaded" &&
			data.File !== "No file was Uploaded"
		) {
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
		} else {
			return <h4>No File was Uploaded</h4>;
		}
	};

	// const [statuses] = useState([
	// 	"New Service Request",
	// 	"Under Progress",
	// 	"Resolved",
	// 	"Working (No Action Required)",
	// 	"Can not be Resolved",
	// ]);

	const getSeverity = (status) => {
		switch (status) {
			case "Can not be Resolved":
				return "danger";

			case "Resolved":
				return "success";

			case "New Service Request (No Action Taken till-now)":
				return "info";

			case "Under Progress":
				return "warning";

			case "Working":
				return null;

			default:
				return null;
		}
	};

	const ActionBodyTemplate = (rowData) => {
		var tooltip_com = "View Actions";
		var badge = "";
		if (
			rowData.Present_Status === "Resolved" &&
			rowData.Old_Status !== "Resolved"
		) {
			tooltip_com = "Status Changed, Please Review";
			badge = <Badge severity="danger"></Badge>;
		}
		if (rowData.Ticket_Closed) {
			tooltip_com = "Ticket is Closed for this";
		}

		return (
			<div className="card flex justify-content-center">
				{badge}
				<Button
					severity="help"
					raised
					rounded
					style={{
						width: "auto",
						float: "center",
						fontSize: "small",
					}}
					tooltip={tooltip_com}
					tooltipOptions={{ position: "bottom" }}
					label="Show"
					icon="pi pi-external-link"
					onClick={() => {
						setAction_box_show(true);
						setrow_Action_Data(rowData.Actions_Taken);
						setSubject(rowData.Subject);
						setBrief(rowData.Breif);
						setOriginal_row_Action_Data([rowData]);
						setrow_Status_data([
							{
								Docket_Number: rowData.Docket_Number,
								Old_Status: rowData.Old_Status,
								Present_Status: rowData.Present_Status,
							},
						]);
						setAction_Button("Click to add Comment");

						if (rowData.Ticket_Closed) {
							setAction_Button("Ticket Closed");
							setDont_Hide_Status(false);
							setTicket_closed(true);
						} else {
							setTicket_closed(false);

							if (
								rowData.Present_Status === "Resolved" &&
								rowData.Old_Status !== "Resolved"
							) {
								setDont_Hide_Status(true);
							} else {
								setDont_Hide_Status(false);
							}
						}
					}}
				/>
			</div>
		);
	};

	const DescriptionBodyTemplate = (rowData) => {
		var tooltip_com = "View Actions";
		if (
			rowData.Present_Status === "Resolved" &&
			rowData.Old_Status !== "Resolved"
		) {
			tooltip_com = "Status Changed, Please Review";
		}
		if (rowData.Ticket_Closed) {
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
					style={{ fontSize: "small" }}
					label="show or Edit"
					icon="pi pi-external-link"
					onClick={() => {
						setDescription_visible(true);
						set_Original_Description(rowData.Breif);
						setDescription_Field_box(rowData.Breif);
						setSelected_Description({
							Docket_Number: rowData.Docket_Number,
							Breif: rowData.Breif,
							Data_Edited_by: rowData.Data_Edited_by,
						});
						setDescription_Edit_Button_Name("Enable Editing");
						// setAction_Button("Click to add Comment");
						if (rowData.Ticket_Closed) {
							setDescription_Edit_Button_Name("Ticket Closed");
							setAction_Button("Ticket Closed");
							setTicket_closed(true);
						} else {
							setTicket_closed(false);
						}
					}}
				/>
			</div>
		);
	};

	const Description_box_footer = (
		<div>
			<Button
				severity="success"
				raised
				rounded
				disabled={Ticket_closed}
				label={Description_Edit_Button_Name}
				icon="pi pi-check"
				onClick={() => {
					if (Ticket_closed) {
						setDescription_Edit_Button_Name("Ticket Closed");
						toast.current.show({
							severity: "info",
							summary: "Ticket Closed",
							detail: "No Further Modification can be Done",
							life: 3000,
						});
					} else {
						if (Description_button_click_no === 0) {
							setDescription_Edit_Enable(true);
							setDescription_Edit_Button_Name("Update Description");
							info();
							setDescription_button_click_no(1);
						} else if (Description_button_click_no === 1) {
							if (Description_Field_box === Original_Description) {
								sameData();
							} else {
								Selected_Description["Breif"] = Description_Field_box;

								if (Selected_Description["Data_Edited_by"] === "") {
									Selected_Description["Data_Edited_by"] =
										"1." + Person_Name + " (" + User_id + ")";
								} else {
									let temp_var =
										Selected_Description["Data_Edited_by"].split(",");
									Selected_Description["Data_Edited_by"] =
										parseInt(temp_var[0]) +
										1 +
										". " +
										Person_Name +
										" (" +
										User_id +
										")" +
										" // " +
										Selected_Description["Data_Edited_by"];
								}

								setConfirm_box_visible(true);
							}

							setDescription_visible(false);
							setDescription_button_click_no(0);
							setDescription_Edit_Enable(false);
							setDescription_Edit_Button_Name("Enable Editing");
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
					setDescription_Edit_Enable(false);
					setDescription_visible(false);
					if (Ticket_closed) {
						setDescription_Edit_Button_Name("Ticket Closed");
						toast.current.show({
							severity: "info",
							summary: "Ticket Closed",
							detail: "No Further Modification can be Done",
							life: 3000,
						});
					} else {
						setDescription_Edit_Button_Name("Enable Editing");
						setDescription_button_click_no(0);
						if (Description_Edit_Button_Name === "Update Description") {
							reject();
							setDescription_visible(false);
						} else {
							setDescription_visible(false);
						}
					}
				}}
				className="p-button-text"
			/>
		</div>
	);

	const Action_box_footer = (
		<div>
			<Button
				// severity="success"
				raised
				rounded
				label={Action_Button}
				disabled={Ticket_closed}
				icon="pi pi-user-edit"
				onClick={() => {
					if (Ticket_closed) {
						setAction_Button("Ticket Closed");
						toast.current.show({
							severity: "info",
							summary: "Ticket Closed",
							detail: "No Further Modification can be Done",
							life: 3000,
						});
					} else {
						if (Action_button_click_no === 0) {
							setAction_button_click_no(1);
							setAction_Button("Save");
							setComment_box_show(true);
							setAction_Comment_Box("");
						} else if (Action_button_click_no === 1) {
							if (
								Action_Comment_Box === undefined ||
								Action_Comment_Box === ""
							) {
								alert("No Data was filled");
							} else {
								if (User_Status_Change_Acceptance === undefined) {
									var temp_dict = [
										{
											Action: Action_Comment_Box,
											Date: moment().format("DD-MM-YYYY hh:mm a"),
											Name:
												Original_row_Action_Data[0]["Actions_Taken"].length +
												1 +
												"." +
												Person_Name +
												" (" +
												User_id +
												") " +
												Original_row_Action_Data[0]["User_Department"],
										},
									];
									Original_row_Action_Data[0]["Actions_Taken"] = [
										...Original_row_Action_Data[0]["Actions_Taken"],
										...temp_dict,
									];

									axios
										.get("http://10.3.230.62:5050/UserInputupdate", {
											headers: {
												datas: JSON.stringify(Original_row_Action_Data),
											},
										})
										.then((response) => {
											if (response.data === "Success") {
												setrow_Action_Data(
													Original_row_Action_Data[0]["Actions_Taken"]
												);
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
										})
										.catch((error) => {});
								} else {
									var temp_dict1 = [
										{
											Action: Action_Comment_Box,
											Date: moment().format("DD-MM-YYYY hh:mm a"),

											Name:
												Original_row_Action_Data[0]["Actions_Taken"].length +
												1 +
												"." +
												Person_Name +
												" (" +
												User_id +
												") " +
												Original_row_Action_Data[0]["User_Department"] +
												" " +
												User_Status_Change_Acceptance,
										},
									];

									Original_row_Action_Data[0]["Actions_Taken"] = [
										...Original_row_Action_Data[0]["Actions_Taken"],
										...temp_dict1,
									];

									axios
										.get("http://10.3.230.62:5050/UserInputupdate", {
											headers: {
												datas: JSON.stringify(Original_row_Action_Data),
											},
										})
										.then((response) => {
											if (response.data === "Success") {
												setrow_Action_Data(
													Original_row_Action_Data[0]["Actions_Taken"]
												);

												setUser_Status_Change_Acceptance();
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
										})
										.catch((error) => {});
								}
							}

							setAction_button_click_no(0);
							setAction_Button("Click to add Comment");
							// setvisiblei(false);
							setComment_box_show(false);
						}
					}
				}}
			/>

			<Button
				style={{ backgroundColor: "black", color: "white" }}
				// severity="danger"
				raised
				rounded
				label="Back"
				icon="pi pi-sign-out"
				onClick={() => {
					setAction_box_show(false);
					setComment_box_show(false);

					if (Ticket_closed) {
						setAction_Button("Ticket Closed");
						toast.current.show({
							severity: "info",
							summary: "Ticket Closed",
							detail: "No Further Modification can be Done",
							life: 3000,
						});
					} else {
						if (
							User_Status_Change_Acceptance !== undefined &&
							User_Status_Change_Acceptance !== ""
						) {
							if (Action_Button === "Save") {
								var temp_dict2 = [
									{
										Action: "No Remarks Given only Status was Reviewed",
										Date: moment().format("DD-MM-YYYY hh:mm a"),
										Name:
											Original_row_Action_Data[0]["Actions_Taken"].length +
											1 +
											"." +
											Person_Name +
											" (" +
											User_id +
											") " +
											Original_row_Action_Data[0]["User_Department"] +
											" " +
											User_Status_Change_Acceptance,
									},
								];
								Original_row_Action_Data[0]["Actions_Taken"] = [
									...Original_row_Action_Data[0]["Actions_Taken"],
									temp_dict2,
								];

								axios
									.get("http://10.3.230.62:5050/UserInputupdate", {
										headers: {
											datas: JSON.stringify(Original_row_Action_Data),
										},
									})
									.then((response) => {
										if (response.data === "Success") {
											setrow_Action_Data(
												Original_row_Action_Data[0]["Actions_Taken"]
											);
											setUser_Status_Change_Acceptance();
											toast.current.show({
												severity: "success",
												detail: "Comment Added",
												life: 3000,
											});
										} else {
											// setStatus_updated(false);
											toast.current.show({
												severity: "error",
												summary: "Cancelled",
												detail: "Update Cancelled",
												life: 3000,
											});
										}
									})
									.catch((error) => {});

								toast.current.show({
									severity: "error",
									summary: "Cancelled",
									detail: "Update Cancelled",
									life: 3000,
								});
							} else {
								var temp_dict3 = [
									{
										Action: "No Remarks Given only Status was Reviewed",
										Date: moment().format("DD-MM-YYYY hh:mm a"),
										Name:
											Original_row_Action_Data[0]["Actions_Taken"].length +
											1 +
											"." +
											Person_Name +
											" (" +
											User_id +
											") " +
											Original_row_Action_Data[0]["User_Department"] +
											" " +
											User_Status_Change_Acceptance,
									},
								];

								Original_row_Action_Data[0]["Actions_Taken"] = [
									...Original_row_Action_Data[0]["Actions_Taken"],
									...temp_dict3,
								];

								axios
									.get("http://10.3.230.62:5050/UserInputupdate", {
										headers: {
											datas: JSON.stringify(Original_row_Action_Data),
										},
									})
									.then((response) => {
										if (response.data === "Success") {
											setrow_Action_Data(
												Original_row_Action_Data[0]["Actions_Taken"]
											);
											setUser_Status_Change_Acceptance();
											toast.current.show({
												severity: "success",
												detail: "Comment Added",
												life: 3000,
											});
										} else {
											// setStatus_updated(false);
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
						}
						setAction_button_click_no(0);
						setAction_Button("Click to add Comment");
						setUser_Status_Change_Acceptance();
					}

					// get_User_Input_data();
				}}
				className="p-button-text"
			/>
		</div>
	);

	const customizedContent = (item) => {
		return (
			<Card
				title={item.Name}
				subTitle={item.Date}
				style={{ boxShadow: "revert", fontSize: "small" }}
			>
				<InputTextarea autoResize value={item.Action} rows={2} cols={170} />
			</Card>
		);
	};

	const Present_Status_Body_Template = (rowData) => {
		return (
			<Tag
				style={{
					width: "auto",
					float: "center",
					fontSize: "Medium",
				}}
				value={rowData.Present_Status}
				severity={getSeverity(rowData.Present_Status)}
			/>
		);
	};

	const Old_Status_Body_Template = (rowData) => {
		return (
			<Tag
				style={{ fontSize: "Medium" }}
				value={rowData.Old_Status}
				severity={getSeverity(rowData.Old_Status)}
			/>
		);
	};

	const isSelectable = (data) => data.Ticket_Closed;

	const isRowSelectable = (event) =>
		event.data ? isSelectable(event.data) : true;

	return (
		<>
			{/* Unauthorized Access Page */}
			{page_hide && (
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

			<Toast ref={toast} />
			<ConfirmDialog
				visible={Confirm_box_visible}
				onHide={() => setConfirm_box_visible(false)}
				message="Are you sure you want to update the request status?"
				header="Confirm Action"
				icon="pi pi-exclamation-triangle"
				accept={accept}
				reject={reject}
			/>

			{!page_hide && (
				<div style={{ padding: "16px 2.2% 40px 2.2%" }}>
					{/* Header section */}
					<div className="flex align-items-center gap-3 mb-4" style={{ paddingLeft: "8px" }}>
						<Avatar icon="pi pi-file-export" style={{ backgroundColor: "rgba(79, 70, 229, 0.1)", color: "var(--primary-color)" }} shape="circle" />
						<div>
							<h1 style={{ textAlign: "left", padding: 0, margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>Logged Requests Directory</h1>
							<span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>View, edit and audit raised service requests</span>
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
										<span style={{ fontSize: "0.85rem", fontWeight: "700", display: "block" }}>Admin Dashboard Mode</span>
										<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Authorized handlers only</span>
									</div>
									<InputSwitch
										disabled={!isAdmin}
										checked={AdminChecked}
										onChange={(e) => setAdminChecked(e.value)}
									/>
								</div>
							</div>

							{/* Fetch Button */}
							<div>
								<Button
									icon="pi pi-refresh"
									severity="success"
									raised
									label="Fetch Live Request Data"
									onClick={() => {
										get_User_Input_data();
									}}
									style={{ padding: "12px 28px" }}
								/>
							</div>

							{/* Department / User toggle */}
							<div>
								<div className="flex align-items-center gap-3">
									<i className="pi pi-users" style={{ fontSize: "1.2rem", color: "var(--primary-color)" }}></i>
									<div>
										<span style={{ fontSize: "0.85rem", fontWeight: "700", display: "block" }}>{DepartmentalChecked_button}</span>
										<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Toggle filter scope</span>
									</div>
									<InputSwitch
										tooltip={"Switch between Department and Personal view"}
										checked={DepartmentalChecked}
										onChange={(e) => setDepartmentalChecked(e.value)}
									/>
								</div>
							</div>

						</div>
					</div>

					{/* Logged Data Table Container */}
					<div className="premium-card" hidden={show_table}>
						<DataTable
							paginator
							rows={6}
							rowsPerPageOptions={[6, 12, 24]}
							tableStyle={{ minWidth: "50rem" }}
							scrollable
							className="p-datatable-striped"
							removableSort
							value={Original_Api_data}
							showGridlines
							isDataSelectable={isRowSelectable}
						>
							<Column
								style={{ maxWidth: "6rem", minWidth: "6rem", fontWeight: 700 }}
								field="Docket_Number"
								header="Docket No."
							></Column>
							<Column
								style={{ maxWidth: "14rem", minWidth: "14rem" }}
								field="Department"
								header="Target Department"
								sortable
							></Column>
							<Column
								style={{ minWidth: "16rem", maxWidth: "20rem" }}
								field="Subject"
								header="Subject"
								sortable
							></Column>
							<Column
								style={{ maxWidth: "10rem", minWidth: "10rem" }}
								body={DescriptionBodyTemplate}
								field="Breif"
								header="Description"
							></Column>
							<Column
								style={{ maxWidth: "11rem", minWidth: "11rem" }}
								field="Input_Date"
								header="Raising Date &amp; Time"
								sortable
							></Column>
							<Column
								style={{ maxWidth: "10rem", minWidth: "10rem" }}
								body={filebutton}
								field="File"
								header="Attachments"
							></Column>
							<Column
								style={{ maxWidth: "9rem", minWidth: "9rem" }}
								body={ActionBodyTemplate}
								field="Actions_Taken"
								header="Actions"
							></Column>
							<Column
								style={{ maxWidth: "12rem", minWidth: "12rem" }}
								body={Present_Status_Body_Template}
								field="Present_Status"
								header="Status"
								sortable
							></Column>
							<Column
								style={{ maxWidth: "12rem", minWidth: "12rem", color: "var(--text-muted)", fontSize: "0.8rem" }}
								field="Data_Filled_by"
								header="Raised By"
								sortable
							></Column>
						</DataTable>
					</div>
				</div>
			)}

			{/* Actions Timeline Dialog */}
			<Dialog
				maximized
				maximizable
				dismissableMask
				header="Service Request Activity Logs"
				visible={Action_box_show}
				style={{ width: "65vw" }}
				onHide={() => {
					setAction_box_show(false);
					setComment_box_show(false);
					if (
						User_Status_Change_Acceptance !== undefined &&
						User_Status_Change_Acceptance !== ""
					) {
						var temp_dict4 = [
							{
								Action: "No Remarks Given only Status was Reviewed",
								Date: moment().format("DD-MM-YYYY hh:mm a"),
								Name:
									Original_row_Action_Data[0]["Actions_Taken"].length +
									1 +
									"." +
									Person_Name +
									" (" +
									User_id +
									") " +
									Original_row_Action_Data[0]["User_Department"],
							},
						];

						Original_row_Action_Data[0]["Actions_Taken"] = [
							...Original_row_Action_Data[0]["Actions_Taken"],
							...temp_dict4,
						];

						axios
							.get("http://10.3.230.62:5050/UserInputupdate", {
								headers: {
									datas: JSON.stringify(Original_row_Action_Data),
								},
							})
							.then((response) => {
								if (response.data === "Success") {
									setrow_Action_Data(
										Original_row_Action_Data[0]["Actions_Taken"]
									);
									setUser_Status_Change_Acceptance();
									toast.current.show({
										severity: "success",
										detail: "Comment Added",
										life: 3000,
									});
								} else {
									// setStatus_updated(false);
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
					// else {
					//   var temp_dict = [
					//     {
					//       Action: "No Remarks Given only Status was Reviewed",
					//       Date: moment().format("DD-MM-YYYY hh:mm a"),
					//       Name:
					//         Original_row_Action_Data[0]["Actions_Taken"].length +
					//         1 +
					//         "." +
					//         Person_Name +
					//         " (" +
					//         User_id +
					//         ") " +
					//         Original_row_Action_Data[0]["User_Department"] +
					//         " " +
					//         User_Status_Change_Acceptance,
					//     },
					//   ];

					//   Original_row_Action_Data[0]["Actions_Taken"] = [
					//     ...Original_row_Action_Data[0]["Actions_Taken"],
					//     ...temp_dict,
					//   ];

					//   axios
					//     .get("http://10.3.230.62:5050/UserInputupdate", {
					//       headers: {
					//         datas: JSON.stringify(Original_row_Action_Data),
					//       },
					//     })
					//     .then((response) => {
					//       if (response.data === "Success") {
					//         setrow_Action_Data(
					//           Original_row_Action_Data[0]["Actions_Taken"]
					//         );
					//         setUser_Status_Change_Acceptance();
					//         toast.current.show({
					//           severity: "success",
					//           detail: "Comment Added",
					//           life: 3000,
					//         });
					//       } else {
					//         setStatus_updated(false);
					//         toast.current.show({
					//           severity: "error",
					//           summary: "Cancelled",
					//           detail: "Update Cancelled",
					//           life: 3000,
					//         });
					//       }
					//     })
					//     .catch((error) => {});
					// }
					// get_User_Input_data();
				}}
				footer={Action_box_footer}
				className="premium-dialog"
			>
				<div style={{ padding: "16px" }}>
					<Container fluid style={{ padding: 0 }}>
						<Row>
							{/* Form Subject */}
							<Col md={Dont_Hide_Status ? 6 : 12}>
								<div className="premium-card" style={{ marginBottom: "20px" }}>
									<span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Subject Of Ticket</span>
									<h3 style={{ margin: "8px 0 0 0", fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{Subject}</h3>
								</div>
							</Col>

							{/* Status Review Block (Visible when Resolved by handlers but not confirmed by User) */}
							{Dont_Hide_Status && (
								<Col md={6}>
									<div className="premium-card" style={{ marginBottom: "20px", border: "1px solid var(--primary-light)", background: "rgba(99, 102, 241, 0.02)" }}>
										<span style={{ fontSize: "0.8rem", color: "var(--primary-color)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Status Confirmation Required</span>
										<div className="flex align-items-center gap-3 mt-3 justify-content-between">
											<div>
												<span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Proposed: </span>
												<Tag value={row_Status_data?.[0]?.Present_Status} severity="success" />
											</div>
											<div className="flex gap-2">
												<Button
													tooltip="Confirm that the service request is resolved"
													severity="success"
													raised
													label="Approve &amp; Close"
													icon="pi pi-check"
													onClick={() => {
														setUser_Status_Change_Acceptance(
															"(Accepted the Status change from " +
																row_Status_data[0].Old_Status +
																" to " +
																row_Status_data[0].Present_Status +
																")"
														);
														row_Status_data[0]["Old_Status"] =
															row_Status_data[0]["Present_Status"];

														axios
															.get("http://10.3.230.62:5050/UserInputStatusupdate", {
																headers: {
																	datas: JSON.stringify(row_Status_data),
																},
															})
															.then((response) => {
																if (response.data === "Success") {
																	Original_row_Action_Data[0]["Old_Status"] =
																		Original_row_Action_Data[0]["Present_Status"];

																	setTicket_closed(true);
																	setDont_Hide_Status(false);
																	toast.current.show({
																		severity: "success",
																		detail: "Ticket Closed Successfully",
																		life: 3000,
																	});
																} else {
																	toast.current.show({
																		severity: "error",
																		summary: "Cancelled",
																		detail: "Update Failed",
																		life: 3000,
																	});
																}
															})
															.catch((error) => {});
													}}
												/>
												<Button
													tooltip="Reopen or dispute the resolution status"
													severity="danger"
													raised
													label="Deny Resolution"
													icon="pi pi-times"
													onClick={() => {
														setUser_Status_Change_Acceptance(
															"(Rejected the Status change from " +
																row_Status_data[0]["Old_Status"] +
																" to " +
																row_Status_data[0]["Present_Status"] +
																")"
														);
														row_Status_data[0]["Present_Status"] =
															row_Status_data[0]["Old_Status"];

														axios
															.get("http://10.3.230.62:5050/UserInputStatusupdate", {
																headers: {
																	datas: JSON.stringify(row_Status_data),
																},
															})
															.then((response) => {
																if (response.data === "Success") {
																	Original_row_Action_Data[0]["Present_Status"] =
																		Original_row_Action_Data[0]["Old_Status"];

																	setTicket_closed(false);
																	setDont_Hide_Status(false);
																	toast.current.show({
																		severity: "success",
																		detail: "Ticket Dispute Registered",
																		life: 3000,
																	});
																} else {
																	toast.current.show({
																		severity: "error",
																		summary: "Cancelled",
																		detail: "Dispute Failed",
																		life: 3000,
																	});
																}
															})
															.catch((error) => {});
													}}
												/>
											</div>
										</div>
									</div>
								</Col>
							)}
						</Row>

						<Row>
							{/* Form Description */}
							<Col sm={12}>
								<div className="premium-card" style={{ marginBottom: "28px" }}>
									<span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Problem Details</span>
									<p style={{ margin: "12px 0 0 0", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-main)", whiteSpace: "pre-line" }}>{Brief}</p>
								</div>
							</Col>
						</Row>

						{/* Audit / Timeline Section */}
						<Row>
							<Col sm={12}>
								<div className="premium-card">
									<span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "24px" }}>Action Timeline &amp; Remarks</span>
									
									<Timeline
										value={row_Action_Data}
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

						{/* Add Remarks field */}
						<Row hidden={!Comment_box_show}>
							<Col sm={12}>
								<div className="premium-card animate-fade-in" style={{ border: "1px solid var(--primary-light)", background: "rgba(99, 102, 241, 0.01)" }}>
									<h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "12px" }}>Write Remarks / Comment</h4>
									<InputTextarea
										autoResize
										value={Action_Comment_Box || ""}
										onChange={(e) => setAction_Comment_Box(e.target.value)}
										rows={3}
										className="w-full"
										placeholder="Input actions taken, status updates or remarks..."
									/>
								</div>
							</Col>
						</Row>
					</Container>
				</div>
			</Dialog>

			{/* Edit Description Dialog */}
			<Dialog
				header="Modify Request Description"
				visible={Description_visible}
				onHide={() => {
					setDescription_visible(false);
					setDescription_button_click_no(0);
					setDescription_Edit_Button_Name("Enable Editing");
					setDescription_Edit_Enable(false);
				}}
				style={{ width: "480px" }}
				footer={Description_box_footer}
				className="premium-dialog"
			>
				<div className="py-4">
					<p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>Modify details of the raise ticket. Save changes once editing is active.</p>
					<InputTextarea
						autoResize
						value={Description_Field_box || ""}
						onChange={(e) => {
							if (Description_Edit_Enable) {
								setDescription_Field_box(e.target.value);
							}
						}}
						rows={5}
						className="w-full"
						placeholder="Description box content..."
						readOnly={!Description_Edit_Enable}
						style={{ cursor: Description_Edit_Enable ? "text" : "not-allowed" }}
					/>
				</div>
			</Dialog>
		</>
	);
}

export default Data;

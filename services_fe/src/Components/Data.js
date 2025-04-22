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
				.get("http://10.3.200.63:5050/ExportDataAlluser", {
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
			// 		.get("http://10.3.200.63:5050/ExportData", {
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
			// 		.get("http://10.3.200.63:5050/ExportDataAlluser", {
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
				.get("http://10.3.200.63:5050/ExportDataAdmin", {
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
			.get("http://10.3.200.63:5050/UserBreifupdate", {
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
						"http://10.3.200.63:5050/download?File_Name=Docket_No " +
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
										.get("http://10.3.200.63:5050/UserInputupdate", {
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
										.get("http://10.3.200.63:5050/UserInputupdate", {
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
									.get("http://10.3.200.63:5050/UserInputupdate", {
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
									.get("http://10.3.200.63:5050/UserInputupdate", {
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
			<Fieldset hidden={!page_hide}>
				<div className="card flex justify-content-center">
					<h1>Please Login again by SSO</h1>
				</div>
			</Fieldset>

			<Toast ref={toast} />
			<ConfirmDialog
				visible={Confirm_box_visible}
				onHide={() => setConfirm_box_visible(false)}
				message="Are you sure you want to Update Status?"
				header="Alert"
				icon="pi pi-exclamation-triangle"
				accept={accept}
				reject={reject}
			/>

			<Fieldset
				hidden={page_hide}
				legend={
					<div className="flex align-items-center ">
						<span
							className="pi pi-file-export"
							style={{ fontWeight: "bold", fontSize: "small" }}
						></span>
						<span className="font-bold text-small">User Data</span>
					</div>
				}
			>
				<Container>
					<Row>
						<Col sm={3}>
							<div hidden={!isAdmin}>
								<span
									hidden={!isAdmin}
									className="p-float-label"
									style={{ marginLeft: "70%", marginTop: "-10%" }}
								>
									<h4>Admin Mode</h4>

									<div hidden={!isAdmin}>
										<InputSwitch
											disabled={!isAdmin}
											style={{ marginLeft: "4%", marginTop: "-15%" }}
											checked={AdminChecked}
											onChange={(e) => setAdminChecked(e.value)}
										/>
									</div>
								</span>
							</div>
						</Col>

						<Col sm={6}>
							<div className="card flex justify-content-center">
								<span className="p-float-label">
									<Button
										icon="pi pi-download"
										severity="success"
										raised
										rounded
										label="Fetch Your Data"
										aria-label="Your Data"
										onClick={() => {
											get_User_Input_data();
										}}
									/>
								</span>
							</div>
						</Col>
						<Col sm={3}>
							<div className="card flex justify-content-right">
								<span className="p-float-label" style={{ marginTop: "-10%" }}>
									<h4>{DepartmentalChecked_button}</h4>

									<InputSwitch
										tooltip={"switch between Department & User"}
										style={{ marginLeft: "24%", marginTop: "-15%" }}
										checked={DepartmentalChecked}
										onChange={(e) => setDepartmentalChecked(e.value)}
									/>
								</span>
							</div>
						</Col>
					</Row>
				</Container>

				<div
					className="card"
					hidden={show_table}
					style={{
						width: "auto",
						whitespace: "nowrap",
					}}
				>
					<DataTable
						paginator
						rows={5}
						rowsPerPageOptions={[5, 10, Original_Api_data.length]}
						tableStyle={{ minWidth: "50rem" }}
						paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
						currentPageReportTemplate="{first} to {last} of {totalRecords}"
						scrollable
						// scrollHeight="400px"
						className="mt-4"
						removableSort
						value={Original_Api_data}
						showGridlines
						isDataSelectable={isRowSelectable}
					>
						<Column
							style={{
								maxWidth: "5rem",
								minWidth: "5rem",
								whitespace: "pre-wrap",
							}}
							field="Docket_Number"
							header="Docket Number"
						></Column>
						<Column
							style={{
								maxWidth: "14rem",
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
							header="subject of Concern"
							sortable
						></Column>
						<Column
							style={{
								maxWidth: "12rem",
								minWidth: "12rem",
								whitespace: "pre-wrap",
							}}
							body={DescriptionBodyTemplate}
							field="Breif"
							header="Description"
						></Column>
						<Column
							style={{
								maxWidth: "11rem",
								minWidth: "11rem",
								whitespace: "pre-wrap",
							}}
							field="Input_Date"
							header="Concern Raising Date & Time"
							sortable
						></Column>

						<Column
							style={{
								maxWidth: "12rem",
								minWidth: "12rem",
								whitespace: "pre-wrap",
							}}
							body={filebutton}
							field="File"
							header="Relevant Attachments"
							sortable
						></Column>

						<Column
							style={{
								maxWidth: "10rem",
								minWidth: "10rem",
								whitespace: "pre-wrap",
							}}
							body={ActionBodyTemplate}
							field="Actions_Taken"
							header="Actions Taken"
							sortable
						></Column>
						<Column
							style={{
								maxWidth: "13rem",
								minWidth: "13rem",
								whitespace: "pre-wrap",
							}}
							body={Present_Status_Body_Template}
							field="Present_Status"
							header="Present Status"
							sortable
						></Column>

						<Column
							style={{
								maxWidth: "13rem",
								minWidth: "13rem",
								whitespace: "pre-wrap",
							}}
							field="Data_Filled_by"
							header="Data Filled by"
							sortable
						></Column>

						{/* <Column
              style={{
                whitespace: "pre-wrap",
              }}
              field="User_Department"
              header="User Department"
              sortable
            ></Column> */}
					</DataTable>
				</div>
			</Fieldset>

			<Dialog
				maximized
				maximizable
				dismissableMask
				header="Actions Taken so far"
				visible={Action_box_show}
				style={{ width: "50vw'" }}
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
							.get("http://10.3.200.63:5050/UserInputupdate", {
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
					//     .get("http://10.3.200.63:5050/UserInputupdate", {
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
			>
				<div className="flex flex-wrap gap-1 justify-content-between align-items-center">
				<div className="field"></div>
					<div className="field">
						<span className="p-float-label">
							<h4>1. Subject of the Service Request</h4>
							<br />
							<InputTextarea autoResize value={Subject} rows={2} cols={60} />
						</span>
					</div>

					{Dont_Hide_Status ? (
						<>
							<div className="field">
								<DataTable
									style={{ width: "100%" }}
									scrolldirection="horizontal"
									responsivelayout="scroll"
									value={row_Status_data}
									showGridlines
								>
									<Column
										style={{ minWidth: "10rem" }}
										body={Old_Status_Body_Template}
										field="Old_Status"
										header="Past Status of the Reguest"
									></Column>
									<Column
										style={{ minWidth: "10rem" }}
										body={Present_Status_Body_Template}
										field="Present_Status"
										header="Present Status of the Request"
									></Column>
								</DataTable>
							</div>

							<div className="field">
								<Button
									tooltip="Click if issue is resolved"
									severity="success"
									raised
									rounded
									label="Approve"
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
											.get("http://10.3.200.63:5050/UserInputStatusupdate", {
												headers: {
													datas: JSON.stringify(row_Status_data),
												},
											})
											.then((response) => {
												if (response.data === "Success") {
													Original_row_Action_Data[0]["Old_Status"] =
														Original_row_Action_Data[0]["Present_Status"];

													// setStatus_updated(true);
													setTicket_closed(true);
													setDont_Hide_Status(false);
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
											severity: "success",

											summary: "Accepted",

											detail: "This Action is Irreversible",

											life: 3000,
										});
									}}
									autoFocus
								/>
								<div className="field"></div>
								<Button
									tooltip="Click if issue isn't resolved"
									style={{ backgroundColor: "red", color: "white" }}
									severity="danger"
									raised
									rounded
									label="Deny"
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
											.get("http://10.3.200.63:5050/UserInputStatusupdate", {
												headers: {
													datas: JSON.stringify(row_Status_data),
												},
											})
											.then((response) => {
												if (response.data === "Success") {
													Original_row_Action_Data[0]["Present_Status"] =
														Original_row_Action_Data[0]["Old_Status"];

													// setStatus_updated(true);
													setTicket_closed(false);
													setDont_Hide_Status(false);
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
										toast.current.show({
											severity: "error",
											summary: "Rejected",
											detail: "This Action is Irreversible",
											life: 3000,
										});
									}}
									className="p-button-text"
								/>
							</div>
							<div className="field"></div>
						</>
					) : (
						<><div className="field"></div>
						<div className="field"></div>
						<div className="field"></div>
						</>
						
					)}

					<Divider />
					<div className="field"></div>
					<div className="field">
						<span className="p-float-label">
							<h4>2. Brief Description of the Service Request</h4>
							<br />
							<InputTextarea autoResize value={Brief} rows={5} cols={175} />
						</span>
					</div>
					<div className="field"></div>

					<Divider />
					<div className="field"></div>
					<div className="field">
						<div className="card">
							<Timeline
								value={row_Action_Data}
								layout="vertical"
								// align="alternate"
								className="customized-timeline"
								content={customizedContent}
							/>
						</div>
					</div>
					<div className="field"></div>
					<Divider />
					<div className="field"></div>
					<div className="field" hidden={!Comment_box_show}>
						<h4>Enter your Remarks</h4>
						<InputTextarea
							hidden={!Comment_box_show}
							autoResize
							value={Action_Comment_Box}
							onChange={(e) => setAction_Comment_Box(e.target.value)}
							rows={2}
							cols={180}
						/>
					</div>
					<div className="field"></div>
				</div>
			</Dialog>

			<div className="card flex justify-content-center">
				<Dialog
					header="Edit Description"
					visible={Description_visible}
					onHide={() => {
						setDescription_visible(false);
						setDescription_button_click_no(0);
						setDescription_Edit_Button_Name("Enable Editing");
						setDescription_Edit_Enable(false);
					}}
					style={{ width: "30vw" }}
					breakpoints={{ "960px": "75vu", "641px": "100vw" }}
					footer={Description_box_footer}
				>
					<div className="card flex justify-content-center">
						<InputTextarea
							autoResize
							value={Description_Field_box}
							onChange={(e) => {
								if (Description_Edit_Enable) {
									setDescription_Field_box(e.target.value);
								}
							}}
							rows={2}
							cols={80}
							// disabled={!Description_Edit_Enable}
						/>
					</div>
				</Dialog>
			</div>
		</>
	);
}
export default Data;

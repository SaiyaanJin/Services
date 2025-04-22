import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Container, Row, Col } from "react-grid-system";
import { Fieldset } from "primereact/fieldset";
import { Divider } from "primereact/divider";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import {jwtDecode} from "jwt-decode";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import moment from "moment";
import { FileUpload } from "primereact/fileupload";

function Input(params) {
	const search = useLocation().search;
	const id = new URLSearchParams(search).get("token");
	const navigate = useNavigate();
	const [page_hide, setpage_hide] = useState(true);
	params.var4(page_hide);
	// const [Selected_departmentl, setSelected_departmentl] = useState();
	const [Selected_department, setSelected_department] = useState();
	const [Subject, setSubject] = useState();
	const [Brief, setBrief] = useState();
	const [File, setFile] = useState([]);
	const [checked, setChecked] = useState(false);
	const toast = useRef();
	const [User_id, setUser_id] = useState();
	const [Person_Name, setPerson_Name] = useState();
	const [User_Department, setUser_Department] = useState();
	const [count, setcount] = useState(true);
	const [visible1, setVisible1] = useState(false);
	const [upload_allow, setupload_allow] = useState(false);
	const [visible2, setVisible2] = useState(false);
	const [success_insert, setsuccess_insert] = useState(false);
	const [Docket_No, setDocket_No] = useState();

	const [Selected_department_dropdown, setSelected_department_dropdown] =
		useState();

	const [Selected_division_dropdown, setSelected_division_dropdown] =
		useState();

	const [division_dropdown, setdivision_dropdown] = useState();

	const Department = [
		{ name: "System Operation", code: "System Operation" },
		{ name: "Market Operation", code: "Market Operation" },
		{ name: "Logistics", code: "Logistics" },
		{ name: "Cyber Security", code: "Cyber Security" },
		{ name: "Finance", code: "Finance" },
		{ name: "Human Resource", code: "Human Resource" },
		{ name: "Contract Services", code: "Contract Services" },
	];

	const SO_Division = [
		{ name: "Operational Planning", code: "Operational Planning" },
		{ name: "Real Time Operation", code: "Real Time Operation" },
		{ name: "Post Despatch", code: "Post Despatch" },
	];

	const MO_Division = [
		{
			name: "Interface Energy Metering, Accounting & Settlement",
			code: "Interface Energy Metering, Accounting & Settlement",
		},

		{
			name: "Regulatory Affairs, Market Operation planning & Coordination",
			code: "Regulatory Affairs, Market Operation planning & Coordination",
		},
		{ name: "Open Access", code: "Open Access" },
		{ name: "Market Coordination", code: "Market Coordination" },
	];

	const Logistic_Division = [
		{ name: "OT (Decision Support)", code: "System Operation" },
		{ name: "Communication", code: "Communication" },
		{ name: "IT", code: "IT" },
		{ name: "TS", code: "TS" },
	];

	const Cyber_Division = [{ name: "Cyber Security", code: "Cyber Security" }];

	const FinanceDivision = [
		{ name: "Finance & Accounts", code: "Finance & Accounts" },
	];

	const HR_Division = [{ name: "Human Resource", code: "Human Resource" }];

	const CS_Division = [
		{ name: "Contract Services", code: "Contract Services" },
	];

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
						setpage_hide(true);
					} else if (response.data === "Bad Token") {
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
								decoded["Department"] === "IT-TS" ||
								decoded["Department"] === "IT"
							) {
								setUser_Department("Information Technology");
							}
							if (
								decoded["Department"] === "MO" ||
								decoded["Department"] === "MO-I" ||
								decoded["Department"] === "MO-II" ||
								decoded["Department"] === "MO-III" ||
								decoded["Department"] === "MO-IV"
							) {
								setUser_Department("Market Operation");
							}
							if (
								decoded["Department"] === "MIS" ||
								decoded["Department"] === "SS" ||
								decoded["Department"] === "CR" ||
								decoded["Department"] === "SO"
							) {
								setUser_Department("System Operation");
							}

							if (decoded["Department"] === "SCADA") {
								setUser_Department("SCADA");
							}
							if (decoded["Department"] === "CS") {
								setUser_Department("Contracts & Services");
							}
							if (decoded["Department"] === "TS") {
								setUser_Department("Technical Services");
							}

							if (decoded["Department"] === "HR") {
								setUser_Department("Human Resource");
							}
							if (decoded["Department"] === "COMMUNICATION") {
								setUser_Department("Communication");
							}
							if (decoded["Department"] === "F&A") {
								setUser_Department("Finance & Accounts");
							}
							if (decoded["Department"] === "CR") {
								setUser_Department("Control Room");
							}
						}
					}
				})
				.catch((error) => {});
		} else {
			setpage_hide(true);
			params.var2("Invalid_Token");
		}

		if (checked) {
			if (!Selected_department) {
				setChecked(false);
				showError("Department Field can't be left blank");
			} else {
				if (!Subject) {
					setChecked(false);
					showError("subject Field can't be left blank");
				} else {
					if (!Brief) {
						setChecked(false);
						showError("Description of Issue Field can't be left blank");
					}
				}
			}
		}

		if (Selected_department && Subject && Brief) {
			setupload_allow(true);
		}

		if (Person_Name && User_id && count) {
			showInfo(Person_Name + " (" + User_id + ")");
			setcount(false);
		}
	}, [
		Selected_department,
		Subject,
		checked,
		Brief,
		User_id,
		page_hide,
		Person_Name,
	]);

	useEffect(() => {
		if (Selected_department_dropdown) {
			if (Selected_department_dropdown["name"] === "System Operation") {
				setdivision_dropdown(SO_Division);
			}

			if (Selected_department_dropdown["name"] === "Market Operation") {
				setdivision_dropdown(MO_Division);
			}

			if (Selected_department_dropdown["name"] === "Logistics") {
				setdivision_dropdown(Logistic_Division);
			}

			if (Selected_department_dropdown["name"] === "Cyber Security") {
				setdivision_dropdown(Cyber_Division);
			}

			if (Selected_department_dropdown["name"] === "Finance") {
				setdivision_dropdown(FinanceDivision);
			}

			if (Selected_department_dropdown["name"] === "Human Resource") {
				setdivision_dropdown(HR_Division);
			}

			if (Selected_department_dropdown["name"] === "Contract Services") {
				setdivision_dropdown(CS_Division);
			}
		}

		if (Selected_department_dropdown && Selected_division_dropdown) {
			setSelected_department(
				Selected_department_dropdown["name"] +
					" : " +
					Selected_division_dropdown["name"]
			);
		}
	}, [Selected_department_dropdown, Selected_division_dropdown]);

	const submit_data = () => {
		if (File.length === 0) {
			setFile(["No file was Uploaded"]);
		}
		const data_to_send = {
			Department: Selected_department,
			Subject: Subject,
			Breif: Brief,
			Input_Date: moment().format("DD-MM-YYYY hh:mm a"),
			File: File,
			Data_Filled_by: Person_Name + " (" + User_id + ")",
			User_Department: User_Department,
			Data_Edited_by: "",
			Present_Status: "New Service Request",
			Actions_Taken: [],
			Old_Status: "",
			Ticket_Closed: false,
		};

		var final_data = JSON.stringify(data_to_send);

		axios
			.get("http://10.3.200.63:5050/DataInsert", {
				headers: { Data: final_data },
			})
			.then((response) => {
				if (response.data[0] === "Duplicate Data") {
					showWarn(response.data);
				}

				if (response.data[0] === "Data Inserted SuccessFully") {
					showSuccess(response.data[0]);
					setsuccess_insert(true);
					setDocket_No(response.data[1]);
				}
			})
			.catch((error) => {});
	};

	const inserted_footerContent = (
		<div>
			{/* <Button
        label="No"
        icon="pi pi-times"
        onClick={() => setsuccess_insert(false)}
        className="p-button-text"
      /> */}
			<Button
				label="OK"
				icon="pi pi-check"
				onClick={() => {
					setsuccess_insert(false);
					navigate("/Data?token=" + id);
				}}
				autoFocus
			/>
		</div>
	);

	const showSuccess = (variable) => {
		toast.current.show({
			severity: "success",
			summary: "Dear " + Person_Name + " (" + User_id + ")",
			detail: variable,
			life: 3000,
		});
	};

	const showInfo = (v) => {
		toast.current.show({
			severity: "info",
			summary: v,
			detail: "Please fill all fields carefully",
			life: 4000,
		});
	};

	const showError = (variable) => {
		toast.current.show({
			severity: "error",
			summary: "Dear " + Person_Name + " (" + User_id + ")",
			detail: variable,
			life: 3000,
		});
	};

	const showWarn = (variable) => {
		toast.current.show({
			severity: "warn",
			summary: "Dear " + Person_Name + " (" + User_id + ")",
			detail: variable,
			life: 3000,
		});
	};

	const file_name = (e) => {
		var filenames = [];
		for (var i = 0; i < e.files.length; i++) {
			filenames = [...filenames, ...[e.files[i].name]];
		}
		let arr = [...File, ...filenames];

		setFile([...new Set(arr)]);
	};

	return (
		<>
			<Dialog
				header="Attention"
				visible={success_insert}
				style={{ width: "50vw" }}
				onHide={() => setsuccess_insert(false)}
				footer={inserted_footerContent}
			>
				<p className="m-0">
					Service Request for {Selected_department} Department is seccessfully
					registered on {moment().format("DD-MM-YYYY hh:mm a")} by{" "}
					{Person_Name + " (" + User_id + ")"} with Docket Number {Docket_No}.
					<br></br>
					Click OK to View your Logged Service Requests
				</p>
			</Dialog>
			<div className="card flex justify-content-center">
				<Dialog
					header="Departments"
					visible={visible1}
					style={{ width: "20vw" }}
					breakpoints={{ "960px": "75vw", "641px": "100vw" }}
				></Dialog>

				<Dialog
					header="Departments"
					visible={visible1}
					style={{ width: "20vw" }}
					breakpoints={{ "960px": "75vw", "641px": "100vw" }}
				></Dialog>

				<Dialog
					header="Complaint Against Department"
					visible={visible1 && !page_hide}
					onHide={() => setVisible1(false)}
					style={{ width: "20vw" }}
					breakpoints={{ "960px": "75vw", "641px": "100vw" }}
				>
					<div className="card flex justify-content-center">
						<Dropdown
							value={Selected_department_dropdown}
							onChange={(e) => {
								setSelected_department_dropdown(e.value);
								setVisible1(false);
								setVisible2(true);
							}}
							options={Department}
							optionLabel="name"
							placeholder="select Department"
							className="w-full md:w-14rem"
						/>
					</div>
				</Dialog>
			</div>

			{Selected_department_dropdown ? (
				<>
					<div className="card flex justify-content-center">
						<Dialog
							header={Selected_department_dropdown["name"] + " Division"}
							visible={visible2}
							style={{ width: "30vw" }}
							breakpoints={{ "960px": "75vu", "641px": "100vw" }}
						>
							<div className="card flex justify-content-center">
								<Dropdown
									value={Selected_division_dropdown}
									onChange={(e) => {
										setSelected_division_dropdown(e.value);
										setVisible2(false);
									}}
									options={division_dropdown}
									optionLabel="name"
									placeholder="select Division"
									className="w-full md:w-14rem"
								/>
							</div>
						</Dialog>
					</div>
				</>
			) : (
				<></>
			)}

			{page_hide && (
				<Fieldset>
					<div className="card flex justify-content-center">
						<h1>Please Login again by SSO</h1>
					</div>
				</Fieldset>
			)}

			{!page_hide && (
				<Fieldset
					hidden={page_hide}
					legend={
						<div className="flex align-items-center ">
							<span
								className="pi pi-spin pi-cog"
								style={{ fontWeight: "bold", fontSize: "small" }}
							></span>
							<span>Service Request Input</span>
						</div>
					}
				>
					<Container>
						<Row>
							<Col sm={6}>
								<div className="card flex justify-content-left">
									<span className="p-float-label">
										<h3>1. Concerned Department/ Division</h3>

										<InputTextarea
											value={Selected_department}
											className="w-full md:w-26rem"
											rows={2}
											onClick={(e) => setVisible1(true)}
										/>
									</span>
								</div>
							</Col>

							<Col sm={6}>
								<div
									className="card flex justify-content-right"
									style={{ marginLeft: "14%" }}
								>
									<span className="p-float-label">
										<h3>2. Subject of the Service Request</h3>

										<InputTextarea
											autoResize
											value={Subject}
											onChange={(e) => setSubject(e.target.value)}
											rows={2}
											cols={80}
										/>
									</span>
								</div>
							</Col>
						</Row>
					</Container>

					<Divider />

					<Container>
						<Row>
							<Col sm={12}>
								<div className="card flex justify-content-left">
									<span className="p-float-label">
										<h3>3. Briefly Describe your Service Request</h3>

										<InputTextarea
											autoResize
											value={Brief}
											onChange={(e) => setBrief(e.target.value)}
											rows={5}
											cols={200}
										/>
									</span>
								</div>
							</Col>
						</Row>
					</Container>

					<Divider />

					<Container>
						<Row>
							<Col sm={12}>
								<div className="card flex justify-content-center">
									<span className="p-float-label" style={{ width: "100%" }}>
										<h3>4. Upload Supporting Files</h3>

										<FileUpload
											chooseLabel={"Select Files"}
											uploadLabel={"Upload to Server"}
											cancelLabel={"Clear All"}
											previewWidth={300}
											disabled={!upload_allow}
											name="demo[]"
											onUpload={file_name}
											url="http://10.3.200.63:5050/upload"
											accept="pdf/*"
											maxFileSize={10000000}
											multiple
											emptyTemplate={
												<p className="m-0">
													Drag and drop relevant files supporting the issue.
												</p>
											}
										/>
									</span>
								</div>
							</Col>
						</Row>
					</Container>

					<br />
					<br />

					<div className="card flex justify-content-center">
						<Checkbox
							onChange={(e) => setChecked(e.checked)}
							checked={checked}
						></Checkbox>
					</div>
					<br />
					<div className="card flex justify-content-center">
						<h3>I've Filled all Data Correctly and wish to Submit</h3>
					</div>
					<br />
					<div className="card flex justify-content-center">
						<Toast ref={toast} />
						<div className="flex flex-wrap gap-2">
							<Button
								disabled={!checked}
								label="Submit Data"
								className="p-button-success"
								onClick={submit_data}
							/>
						</div>
					</div>
				</Fieldset>
			)}
		</>
	);
}
export default Input;

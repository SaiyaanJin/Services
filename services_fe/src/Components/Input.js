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
import { Avatar } from "primereact/avatar";
import { Badge } from "primereact/badge";

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
			.get("http://10.3.230.62:5050/DataInsert", {
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
			{/* Success Confirmation Dialog */}
			<Dialog
				header="Registration Success"
				visible={success_insert}
				style={{ width: "450px" }}
				onHide={() => setsuccess_insert(false)}
				footer={inserted_footerContent}
				className="premium-dialog"
			>
				<div className="text-center py-4">
					<Avatar icon="pi pi-check-circle" size="xlarge" shape="circle" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--success-color)", width: "64px", height: "64px", fontSize: "28px", margin: "0 auto 16px auto" }} />
					<p className="m-0" style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-main)" }}>
						Service Request for <strong style={{ color: "var(--primary-color)" }}>{Selected_department}</strong> has been successfully registered!
					</p>
					<div className="my-3 p-3" style={{ background: "var(--bg-color)", borderRadius: "var(--border-radius-sm)", border: "1px solid var(--border-color)" }}>
						<span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Docket Number</span>
						<strong style={{ fontSize: "1.2rem", color: "var(--text-main)", fontFamily: "var(--font-heading)", letterSpacing: "1px" }}>{Docket_No}</strong>
					</div>
					<span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Registered on {moment().format("DD-MM-YYYY hh:mm a")} by {Person_Name}</span>
				</div>
			</Dialog>

			{/* Department Selection Dialog */}
			<Dialog
				header="Select Target Department"
				visible={visible1 && !page_hide}
				onHide={() => setVisible1(false)}
				style={{ width: "320px" }}
				breakpoints={{ "960px": "75vw", "641px": "100vw" }}
				className="premium-dialog"
			>
				<div className="py-4">
					<p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>Choose which department is responsible for resolving your issue:</p>
					<Dropdown
						value={Selected_department_dropdown}
						onChange={(e) => {
							setSelected_department_dropdown(e.value);
							setVisible1(false);
							setVisible2(true);
						}}
						options={Department}
						optionLabel="name"
						placeholder="Select Department"
						className="w-full"
					/>
				</div>
			</Dialog>

			{/* Division Selection Dialog */}
			{Selected_department_dropdown && (
				<Dialog
					header={`${Selected_department_dropdown["name"]} - Select Division`}
					visible={visible2}
					onHide={() => setVisible2(false)}
					style={{ width: "360px" }}
					breakpoints={{ "960px": "75vw", "641px": "100vw" }}
					className="premium-dialog"
				>
					<div className="py-4">
						<p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>Specify the divisions/groups within this department:</p>
						<Dropdown
							value={Selected_division_dropdown}
							onChange={(e) => {
								setSelected_division_dropdown(e.value);
								setVisible2(false);
							}}
							options={division_dropdown}
							optionLabel="name"
							placeholder="Select Division"
							className="w-full"
						/>
					</div>
				</Dialog>
			)}

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

			{/* Form Layout */}
			{!page_hide && (
				<div style={{ padding: "16px 2.2% 40px 2.2%" }}>
					<div className="flex align-items-center gap-3 mb-4" style={{ paddingLeft: "8px" }}>
						<Avatar icon="pi pi-plus" style={{ backgroundColor: "rgba(79, 70, 229, 0.1)", color: "var(--primary-color)" }} shape="circle" />
						<div>
							<h1 style={{ textAlign: "left", padding: 0, margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>Create New Service Request</h1>
							<span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Carefully provide relevant information below to raise a ticket</span>
						</div>
					</div>

					<Container fluid style={{ padding: 0 }}>
						<Row>
							{/* Step 1: Concerned Department */}
							<Col md={6}>
								<div className="premium-card" style={{ height: "calc(100% - 24px)" }}>
									<div className="flex align-items-center gap-2 mb-3">
										<Badge value="1" severity="info" style={{ borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }} />
										<h3 style={{ margin: 0, fontWeight: 700 }}>Target Department &amp; Division</h3>
									</div>
									<p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px" }}>Click inside the field below to select the department and division responsible for this request.</p>
									<span className="p-float-label">
										<InputTextarea
											value={Selected_department || ""}
											className="w-full"
											rows={2}
											onClick={() => setVisible1(true)}
											placeholder="Click here to select department..."
											readOnly
											style={{ cursor: "pointer", borderStyle: "dashed" }}
										/>
									</span>
								</div>
							</Col>

							{/* Step 2: Subject */}
							<Col md={6}>
								<div className="premium-card" style={{ height: "calc(100% - 24px)" }}>
									<div className="flex align-items-center gap-2 mb-3">
										<Badge value="2" severity="info" style={{ borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }} />
										<h3 style={{ margin: 0, fontWeight: 700 }}>Subject of Service Request</h3>
									</div>
									<p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px" }}>Enter a short, descriptive summary explaining the core focus of the raised concern.</p>
									<span className="p-float-label">
										<InputTextarea
											autoResize
											value={Subject || ""}
											onChange={(e) => setSubject(e.target.value)}
											rows={2}
											className="w-full"
											placeholder="Describe the subject of concern..."
										/>
									</span>
								</div>
							</Col>
						</Row>

						<Row>
							{/* Step 3: Description */}
							<Col sm={12}>
								<div className="premium-card">
									<div className="flex align-items-center gap-2 mb-3">
										<Badge value="3" severity="info" style={{ borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }} />
										<h3 style={{ margin: 0, fontWeight: 700 }}>Detailed Description</h3>
									</div>
									<p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px" }}>Kindly describe the issue in full detail. Mention steps to reproduce, hardware/software specifications, or constraints.</p>
									<span className="p-float-label">
										<InputTextarea
											autoResize
											value={Brief || ""}
											onChange={(e) => setBrief(e.target.value)}
											rows={5}
											className="w-full"
											placeholder="Describe your issue details here..."
										/>
									</span>
								</div>
							</Col>
						</Row>

						<Row>
							{/* Step 4: File Upload */}
							<Col sm={12}>
								<div className="premium-card">
									<div className="flex align-items-center gap-2 mb-3">
										<Badge value="4" severity="info" style={{ borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }} />
										<h3 style={{ margin: 0, fontWeight: 700 }}>Supporting Attachments</h3>
									</div>
									<p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px" }}>Upload any supporting documents, screenshots, or logs (PDF format, max 10MB). Fill in the steps above to enable uploading.</p>
									<FileUpload
										chooseLabel="Select PDF Files"
										uploadLabel="Upload Files"
										cancelLabel="Clear"
										previewWidth={120}
										disabled={!upload_allow}
										name="demo[]"
										onUpload={file_name}
										url="http://10.3.230.62:5050/upload"
										accept="application/pdf"
										maxFileSize={10000000}
										multiple
										emptyTemplate={
											<div className="flex flex-column align-items-center justify-content-center py-4" style={{ color: "var(--text-muted)" }}>
												<i className="pi pi-file-pdf mb-2" style={{ fontSize: "2.5rem" }}></i>
												<span className="text-center" style={{ fontSize: "0.85rem" }}>Drag and drop PDF files here to support your ticket.</span>
											</div>
										}
									/>
								</div>
							</Col>
						</Row>
					</Container>

					{/* Submission Card */}
					<div className="premium-card text-center" style={{ padding: "40px 24px", marginTop: "16px", background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)" }}>
						<div className="flex justify-content-center align-items-center gap-3 mb-3">
							<Checkbox
								onChange={(e) => setChecked(e.checked)}
								checked={checked}
								style={{ transform: "scale(1.2)" }}
							/>
							<span style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-main)", userSelect: "none", cursor: "pointer" }} onClick={() => setChecked(!checked)}>
								I declare that all the information provided is correct and complete
							</span>
						</div>
						<p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "24px" }}>Please verify all input sections are complete. The Submit button is enabled once checked.</p>
						<Button
							disabled={!checked}
							label="Submit Ticket"
							icon="pi pi-send"
							className="p-button-success"
							style={{ padding: "12px 40px", fontSize: "1rem" }}
							onClick={submit_data}
						/>
					</div>
				</div>
			)}

			<Toast ref={toast} />
		</>
	);
}

export default Input;

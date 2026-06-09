import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Checkbox } from "primereact/checkbox";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { FileUpload } from "primereact/fileupload";
import { Button } from "primereact/button";
import { useAuth } from "../context/AuthContext";
import { useTickets } from "../hooks/useTickets";
import apiClient from "../api";

const NewTicketPage = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const toast = useRef(null);
	const { createTicket, loading } = useTickets();

	// Form states
	const [selectedDept, setSelectedDept] = useState(null);
	const [selectedDivision, setSelectedDivision] = useState(null);
	const [subject, setSubject] = useState("");
	const [description, setDescription] = useState("");
	const [declared, setDeclared] = useState(false);
	
	// Uploaded files list
	const [uploadedFiles, setUploadedFiles] = useState([]);
	
	// Success modal state
	const [docketNo, setDocketNo] = useState(null);
	const [successVisible, setSuccessVisible] = useState(false);

	const fileUploadRef = useRef(null);

	// Load drafts on mount
	useEffect(() => {
		const savedSubject = localStorage.getItem("draft_subject");
		const savedDesc = localStorage.getItem("draft_description");
		if (savedSubject) setSubject(savedSubject);
		if (savedDesc) setDescription(savedDesc);
	}, []);

	// Auto-save drafts to localStorage
	const handleSubjectChange = (val) => {
		setSubject(val);
		localStorage.setItem("draft_subject", val);
	};

	const handleDescChange = (val) => {
		setDescription(val);
		localStorage.setItem("draft_description", val);
	};

	const clearDrafts = () => {
		localStorage.removeItem("draft_subject");
		localStorage.removeItem("draft_description");
		setSubject("");
		setDescription("");
		setUploadedFiles([]);
		if (fileUploadRef.current) {
			fileUploadRef.current.clear();
		}
	};

	// Dropdown constants
	const departments = [
		{ label: "Human Resource", value: "HR" },
		{ label: "Contract Services", value: "CS" },
		{ label: "Finance & Accounts", value: "FA" },
		{ label: "Cyber Security", value: "CYBER" },
		{ label: "System Operation", value: "SO" },
		{ label: "Market Operation", value: "MO" },
		{ label: "Logistics Division", value: "LOGISTICS" },
	];

	const divisionOptions = {
		SO: [
			{ label: "Post Despatch", value: "System Operation : Post Despatch" },
			{ label: "Real Time Operation", value: "System Operation : Real Time Operation" },
			{ label: "Operational Planning", value: "System Operation : Operational Planning" },
		],
		MO: [
			{ label: "Open Access", value: "Market Operation : Open Access" },
			{ label: "Market Coordination", value: "Market Operation : Market Coordination" },
			{ label: "Interface Energy Metering, Accounting & Settlement", value: "Market Operation : Interface Energy Metering, Accounting & Settlement" },
			{ label: "Regulatory Affairs, Market Operation planning & Coordination", value: "Market Operation : Regulatory Affairs, Market Operation planning & Coordination" },
		],
		LOGISTICS: [
			{ label: "Technical Services", value: "Logistics : TS" },
			{ label: "IT Services", value: "Logistics : IT" },
			{ label: "Communication Services", value: "Logistics : Communication" },
			{ label: "OT (Decision Support)", value: "Logistics : OT (Decision Support)" },
		]
	};

	const getFinalDepartmentValue = () => {
		if (selectedDept === "HR") return "Human Resource : Human Resource";
		if (selectedDept === "CS") return "Contract Services : Contract Services";
		if (selectedDept === "FA") return "Finance : Finance & Accounts";
		if (selectedDept === "CYBER") return "Cyber Security : Cyber Security";
		return selectedDivision; // For SO, MO, LOGISTICS, return sub-division directly
	};

	// Secure file uploading
	const onUploadHandler = async (e) => {
		const files = e.files;
		const formData = new FormData();
		
		files.forEach((file) => {
			formData.append("demo[]", file);
		});

		try {
			// Call upload endpoint
			await apiClient.post("/upload", formData, {
				headers: { "Content-Type": "multipart/form-data" }
			});
			
			const names = files.map(f => f.name);
			setUploadedFiles(names);
			toast.current?.show({
				severity: "success",
				summary: "Upload Successful",
				detail: `${files.length} file(s) attached successfully.`
			});
		} catch (err) {
			toast.current?.show({
				severity: "error",
				summary: "Upload Failed",
				detail: err.response?.data?.detail || "Failed to attach files. Please check file type and size."
			});
		}
	};

	// Form Submission
	const handleSubmit = async () => {
		const targetDept = getFinalDepartmentValue();
		
		if (!targetDept) {
			toast.current?.show({ severity: "warn", summary: "Validation Failed", detail: "Please select a target department/division." });
			return;
		}
		if (!subject.trim()) {
			toast.current?.show({ severity: "warn", summary: "Validation Failed", detail: "Subject cannot be empty." });
			return;
		}
		if (description.trim().length < 15) {
			toast.current?.show({ severity: "warn", summary: "Validation Failed", detail: "Description must be at least 15 characters long." });
			return;
		}

		// Auto upload files if selected but not yet uploaded
		let currentUploadedFiles = [...uploadedFiles];
		if (fileUploadRef.current && fileUploadRef.current.files && fileUploadRef.current.files.length > 0) {
			const unuploadedFiles = fileUploadRef.current.files.filter(f => !uploadedFiles.includes(f.name));
			if (unuploadedFiles.length > 0) {
				const formData = new FormData();
				unuploadedFiles.forEach((file) => {
					formData.append("demo[]", file);
				});

				try {
					await apiClient.post("/upload", formData, {
						headers: { "Content-Type": "multipart/form-data" }
					});
					const newNames = unuploadedFiles.map(f => f.name);
					currentUploadedFiles = [...uploadedFiles, ...newNames];
					setUploadedFiles(currentUploadedFiles);
				} catch (err) {
					toast.current?.show({
						severity: "error",
						summary: "Auto-Upload Failed",
						detail: "Failed to upload chosen files automatically."
					});
					return; // Stop ticket submission
				}
			}
		}

		const ticketData = {
			Subject: subject.trim(),
			Breif: description.trim(),
			File: currentUploadedFiles,
			Department: targetDept,
			Data_Filled_by: `${user.name} (${user.emp_id})`,
			User_Department: user.department,
			Present_Status: "New Service Request",
			Actions_Taken: [],
			Old_Status: "",
			Ticket_Closed: false
		};

		try {
			const res = await createTicket(ticketData);
			if (res[0] === "Data Inserted SuccessFully") {
				setDocketNo(res[1]);
				setSuccessVisible(true);
				clearDrafts();
			} else {
				toast.current?.show({ severity: "error", summary: "Submission Failed", detail: res[0] || "Duplicate ticket check failed." });
			}
		} catch (err) {
			toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to submit request." });
		}
	};

	const showDivisionSelector = ["SO", "MO", "LOGISTICS"].includes(selectedDept);

	return (
		<div className="w-full flex flex-column gap-4 animate-slide-up" style={{ padding: '8px' }}>
			<Toast ref={toast} />

			{/* Custom Header Navigation & Info Bar */}
			<div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center gap-3 mb-1" style={{ padding: '0 8px' }}>
				<div className="flex align-items-center gap-3">
					<div className="flex align-items-center justify-content-center border-round-xl" style={{ 
						width: '48px', 
						height: '48px', 
						backgroundColor: '#f5f3ff', 
						color: '#6366f1',
						border: '1px solid #e0e7ff'
					}}>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="12" y1="18" x2="12" y2="12" />
							<line x1="9" y1="15" x2="15" y2="15" />
						</svg>
					</div>
					<div>
						<h2 className="text-2xl font-bold text-900 m-0 mb-1" style={{ letterSpacing: '-0.5px' }}>Raise a Service Request</h2>
						<p className="text-sm text-600 m-0">Submit a service request ticket to any Grid India/ERLDC department queue.</p>
					</div>
				</div>

				<div className="info-alert-card">
					<div className="flex align-items-center justify-content-center border-round-lg bg-indigo-100 text-indigo-700" style={{ width: '32px', height: '32px', flexShrink: 0 }}>
						<i className="pi pi-shield" style={{ fontSize: '0.95rem' }} />
					</div>
					<div>
						<div className="text-xs font-bold text-900">Your request is important!</div>
						<div className="text-2xs text-500 mt-0.5">We'll get back to you as soon as possible.</div>
					</div>
				</div>
			</div>

			{/* Form Card */}
			<div className="new-ticket-card">
				<div className="flex flex-column gap-4">
					
					{/* Target Dept & Subject Side-by-side */}
					<div className="grid col-12 p-0 m-0 gap-4">
						<div className="col flex flex-column gap-2 p-0">
							<label className="text-sm font-semibold text-800">Target Department <span className="text-red-500">*</span></label>
							<div className="input-with-icon">
								<i className="pi pi-building" />
								<Dropdown
									value={selectedDept}
									options={departments}
									onChange={(e) => {
										setSelectedDept(e.value);
										setSelectedDivision(null);
									}}
									placeholder="Select department..."
								/>
							</div>
						</div>

						<div className="col flex flex-column gap-2 p-0">
							<label className="text-sm font-semibold text-800">Subject <span className="text-red-500">*</span></label>
							<div className="input-with-icon">
								<i className="pi pi-file" />
								<InputText
									value={subject}
									onChange={(e) => handleSubjectChange(e.target.value)}
									placeholder="Summarize your service request briefly..."
									maxLength={100}
								/>
							</div>
						</div>
					</div>

					{/* Division Selection (Conditionally displayed) */}
					{showDivisionSelector && (
						<div className="grid col-12 p-0 m-0 gap-4 animate-slide-up">
							<div className="col-12 md:col-6 flex flex-column gap-2 p-0">
								<label className="text-sm font-semibold text-800">Assign Division <span className="text-red-500">*</span></label>
								<div className="input-with-icon">
									<i className="pi pi-sitemap" />
									<Dropdown
										value={selectedDivision}
										options={divisionOptions[selectedDept]}
										onChange={(e) => setSelectedDivision(e.value)}
										placeholder="Select division..."
									/>
								</div>
							</div>
						</div>
					)}

					{/* Detailed Description */}
					<div className="flex flex-column gap-2">
						<div className="flex justify-content-between align-items-center">
							<label className="text-sm font-semibold text-800">Detailed Description <span className="text-red-500">*</span></label>
							<span className="text-xs text-500">{description.length} / 5000 characters</span>
						</div>
						<div className="input-with-icon textarea-icon">
							<i className="pi pi-align-left" />
							<InputTextarea
								value={description}
								onChange={(e) => handleDescChange(e.target.value)}
								placeholder="Provide details about the issue or request. Minimum 15 characters..."
								rows={6}
								autoResize={false}
							/>
						</div>
					</div>

					{/* Attachments Section */}
					<div className="flex flex-column gap-2">
						<div className="flex align-items-baseline gap-2">
							<label className="text-sm font-semibold text-800">Attachments</label>
							<span className="text-xs text-500">You can upload up to 10MB per file.</span>
						</div>
						<FileUpload
							ref={fileUploadRef}
							name="demo[]"
							customUpload
							uploadHandler={onUploadHandler}
							multiple
							accept=".txt,.pdf,.png,.jpg,.jpeg,.gif"
							maxFileSize={10000000}
							emptyTemplate={
								<div className="flex flex-column align-items-center justify-content-center py-5 border-2 border-dashed border-round-xl bg-slate-50 cursor-pointer" style={{ borderColor: '#c7d2fe' }}>
									<div className="flex align-items-center justify-content-center border-round-circle mb-3 bg-indigo-50 text-indigo-500" style={{ width: '48px', height: '48px' }}>
										<i className="pi pi-cloud-upload" style={{ fontSize: "1.5rem" }}></i>
									</div>
									<span className="text-sm font-semibold text-700">Drag & drop files here, or click to browse</span>
									<span className="text-xs text-500 mt-1">Allowed formats: PDF, TXT, PNG, JPG, GIF (Max 10MB per file)</span>
								</div>
							}
							className="premium-uploader border-round-xl"
						/>
					</div>

					{/* Declaration Banner Checkbox */}
					<div className={`declaration-banner flex align-items-center gap-3 transition-all ${declared ? 'active' : ''}`}>
						<Checkbox
							onChange={(e) => setDeclared(e.checked)}
							checked={declared}
							inputId="declared"
						/>
						<label htmlFor="declared" className="text-sm font-semibold text-800 cursor-pointer select-none">
							I declare that all the information provided is correct, complete, and accurate.
						</label>
					</div>

					{/* Action buttons footer */}
					<div className="flex justify-content-end gap-3 mt-2">
						<button
							className="btn-clear-draft"
							onClick={clearDrafts}
							disabled={!subject && !description}
							type="button"
						>
							<i className="pi pi-trash" />
							<span>Clear Draft</span>
						</button>
						<button
							className="btn-submit-request"
							onClick={handleSubmit}
							disabled={!declared || loading}
							type="button"
						>
							{loading ? <i className="pi pi-spin pi-spinner" /> : <i className="pi pi-send" />}
							<span>Submit Request</span>
						</button>
					</div>
				</div>
			</div>

			{/* Success Dialog */}
			<Dialog
				visible={successVisible}
				onHide={() => {
					setSuccessVisible(false);
					navigate("/Data");
				}}
				header="Ticket Logged Successfully"
				style={{ width: "380px" }}
				className="text-center"
				footer={
					<div className="flex justify-content-center">
						<Button label="OK" className="p-button-indigo px-5 border-round-pill" onClick={() => {
							setSuccessVisible(false);
							navigate("/Data");
						}} />
					</div>
				}
				closable={false}
			>
				<div className="flex flex-column align-items-center gap-3 py-3">
					<i className="pi pi-check-circle text-emerald-500" style={{ fontSize: "3.5rem" }} />
					<p className="text-800 m-0">Your request has been registered under:</p>
					<h3 className="text-2xl font-bold text-indigo-600 m-0">Docket: {docketNo}</h3>
					<p className="text-xs text-500 m-0 mt-1">An email notification has been dispatched to the concerned department.</p>
				</div>
			</Dialog>
		</div>
	);
};

export default NewTicketPage;

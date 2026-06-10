import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
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
	const [priority, setPriority] = useState("Medium");
	const [tags, setTags] = useState([]);
	
	// Config states
	const [configuredTags, setConfiguredTags] = useState([]);
	const [templates, setTemplates] = useState([]);
	const [selectedTemplate, setSelectedTemplate] = useState(null);

	const getFilteredTemplates = () => {
		if (!selectedDept) return [];
		let targetDeptName = "";
		if (selectedDept === "HR") targetDeptName = "Human Resource";
		else if (selectedDept === "CS") targetDeptName = "Contracts & Services";
		else if (selectedDept === "FA") targetDeptName = "Finance & Accounts";
		else if (selectedDept === "CYBER") targetDeptName = "Cyber Security";
		else if (selectedDivision) {
			targetDeptName = selectedDivision;
		} else {
			if (selectedDept === "SO") targetDeptName = "System Operation";
			if (selectedDept === "MO") targetDeptName = "Market Operation";
			if (selectedDept === "LOGISTICS") targetDeptName = "Logistics";
		}
		
		return templates.filter(t => 
			t.department && (
				t.department.toLowerCase().includes(targetDeptName.toLowerCase()) ||
				targetDeptName.toLowerCase().includes(t.department.toLowerCase())
			)
		);
	};
	const filteredTemplates = getFilteredTemplates();

	const handleTemplateChange = (e) => {
		const val = e.value;
		setSelectedTemplate(val);
		if (!val) return;
		const template = templates.find(t => t.id === val);
		if (template) {
			if (template.default_subject) {
				setSubject(template.default_subject);
				localStorage.setItem("draft_subject", template.default_subject);
				triggerSuggestions(template.default_subject);
			}
			if (template.default_description) {
				setDescription(template.default_description);
				localStorage.setItem("draft_description", template.default_description);
			}
		}
	};


	// Suggestion & duplicate states
	const [duplicates, setDuplicates] = useState([]);
	const [kbArticles, setKbArticles] = useState([]);
	
	// Uploaded files list
	const [uploadedFiles, setUploadedFiles] = useState([]);
	
	// Success modal state
	const [docketNo, setDocketNo] = useState(null);
	const [successVisible, setSuccessVisible] = useState(false);

	const fileUploadRef = useRef(null);

	// Load drafts on mount
	// Load configs, templates, and drafts on mount
	useEffect(() => {
		apiClient.get("/admin/tags").then(res => setConfiguredTags(res.data || [])).catch(() => {});
		apiClient.get("/admin/templates").then(res => setTemplates(res.data || [])).catch(() => {});

		const savedSubject = localStorage.getItem("draft_subject");
		const savedDesc = localStorage.getItem("draft_description");
		if (savedSubject) {
			setSubject(savedSubject);
			triggerSuggestions(savedSubject);
		}
		if (savedDesc) setDescription(savedDesc);
	}, []);

	const triggerSuggestions = async (subj) => {
		if (!subj || subj.trim().length < 4) {
			setDuplicates([]);
			setKbArticles([]);
			return;
		}
		try {
			const dupRes = await apiClient.get(`/tickets/search?q=${encodeURIComponent(subj)}`);
			setDuplicates(dupRes.data || []);
		} catch (e) {
			setDuplicates([]);
		}
		try {
			const kbRes = await apiClient.get(`/kb/search?q=${encodeURIComponent(subj)}`);
			setKbArticles(kbRes.data || []);
		} catch (e) {
			setKbArticles([]);
		}
	};

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
		setDuplicates([]);
		setKbArticles([]);
		setTags([]);
		setPriority("Medium");
		setSelectedTemplate(null);
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
			Ticket_Closed: false,
			Priority: priority,
			Tags: tags
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
										setSelectedTemplate(null);
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
									onBlur={() => triggerSuggestions(subject)}
									placeholder="Summarize your service request briefly..."
									maxLength={100}
								/>
							</div>
						</div>
					</div>

					{/* Template Picker */}
					{filteredTemplates.length > 0 && (
						<div className="flex flex-column gap-2 animate-slide-up">
							<label className="text-sm font-semibold text-800">Use a Template</label>
							<div className="input-with-icon">
								<i className="pi pi-clone" style={{ left: "14px" }} />
								<Dropdown
									value={selectedTemplate}
									options={filteredTemplates.map(t => ({ label: t.name, value: t.id }))}
									onChange={handleTemplateChange}
									placeholder="Select a pre-configured template..."
									showClear
									className="w-full"
								/>
							</div>
						</div>
					)}

					{/* Duplicate Detection Warning */}
					{duplicates.length > 0 && (
						<div style={{
							background: "#fffbeb",
							border: "1px solid #fef3c7",
							borderRadius: "12px",
							padding: "16px",
							display: "flex",
							flexDirection: "column",
							gap: "8px"
						}} className="animate-slide-up">
							<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#d97706", fontWeight: "700", fontSize: "0.85rem" }}>
								<i className="pi pi-exclamation-triangle" />
								Warning: Similar open tickets found in queue
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
								{duplicates.map(dup => (
									<a 
										key={dup.Docket_Number} 
										href={`/ticket/${dup.Docket_Number}`}
										target="_blank"
										rel="noopener noreferrer"
										style={{ color: "#b45309", fontSize: "0.78rem", textDecoration: "underline" }}
									>
										Docket #{dup.Docket_Number}: {dup.Subject} ({dup.Present_Status})
									</a>
								))}
							</div>
						</div>
					)}

					{/* KB Articles Suggestions */}
					{kbArticles.length > 0 && (
						<div style={{
							background: "#f0fdf4",
							border: "1px solid #dcfce7",
							borderRadius: "12px",
							padding: "16px",
							display: "flex",
							flexDirection: "column",
							gap: "10px"
						}} className="animate-slide-up">
							<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#16a34a", fontWeight: "700", fontSize: "0.85rem" }}>
								<i className="pi pi-lightbulb" />
								Before you submit: Did you find these articles helpful?
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
								{kbArticles.map(art => (
									<div key={art.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<span style={{ color: "#15803d", fontSize: "0.78rem", fontWeight: "600" }}>
											💡 {art.title} — <span style={{ color: "#64748b", fontWeight: "400" }}>{art.summary}</span>
										</span>
										<button
											type="button"
											onClick={() => {
												toast.current?.show({
													severity: "success",
													summary: "Issue Resolved",
													detail: "Thank you for using the Knowledge Base! Form cleared."
												});
												clearDrafts();
											}}
											style={{
												padding: "4px 10px", background: "#16a34a", color: "#fff",
												border: "none", borderRadius: "4px", fontSize: "0.7rem",
												cursor: "pointer", fontWeight: "600"
											}}
										>
											This resolved my issue
										</button>
									</div>
								))}
							</div>
						</div>
					)}

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

					{/* Priority & Tags Selection */}
					<div className="grid col-12 p-0 m-0 gap-4">
						<div className="col flex flex-column gap-2 p-0">
							<label className="text-sm font-semibold text-800">Priority</label>
							<div className="input-with-icon">
								<i className="pi pi-exclamation-triangle" />
								<Dropdown
									value={priority}
									options={[
										{ label: "🔴 Critical", value: "Critical" },
										{ label: "🟠 High", value: "High" },
										{ label: "🟡 Medium", value: "Medium" },
										{ label: "🟢 Low", value: "Low" }
									]}
									onChange={(e) => setPriority(e.value)}
									placeholder="Select priority..."
								/>
							</div>
						</div>

						<div className="col flex flex-column gap-2 p-0">
							<label className="text-sm font-semibold text-800">Tags</label>
							<div className="input-with-icon">
								<i className="pi pi-tag" />
								<MultiSelect
									value={tags}
									options={configuredTags.map(t => ({ label: `#${t.name}`, value: t.name }))}
									onChange={(e) => setTags(e.value)}
									placeholder="Select tags..."
									display="chip"
									className="w-full"
								/>
							</div>
						</div>
					</div>

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
							accept=".txt,.pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg,.log,.csv,.json,.xml,.md"
							maxFileSize={10000000}
							emptyTemplate={
								<div className="flex flex-column align-items-center justify-content-center py-5 border-2 border-dashed border-round-xl bg-slate-50 cursor-pointer" style={{ borderColor: '#c7d2fe' }}>
									<div className="flex align-items-center justify-content-center border-round-circle mb-3 bg-indigo-50 text-indigo-500" style={{ width: '48px', height: '48px' }}>
										<i className="pi pi-cloud-upload" style={{ fontSize: "1.5rem" }}></i>
									</div>
									<span className="text-sm font-semibold text-700">Drag & drop files here, or click to browse</span>
									<span className="text-xs text-500 mt-1">Allowed formats: PDF, TXT, PNG, JPG, GIF, BMP, WEBP, SVG, LOG, CSV, JSON, XML, MD (Max 10MB per file)</span>
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

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { Editor } from "primereact/editor";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api";
import { TableSkeleton } from "../components/common/SkeletonLoader";
import moment from "moment";
import "quill/dist/quill.snow.css";

// Custom toolbar template for the Rich Text Editor to support heading styles, text formatting, colors, lists, alignments, links, and media (images/videos)
const kbEditorHeader = (
	<div className="ql-toolbar ql-snow" style={{ borderTopLeftRadius: "8px", borderTopRightRadius: "8px" }}>
		<span className="ql-formats">
			<select className="ql-header" defaultValue="0">
				<option value="1">Heading 1</option>
				<option value="2">Heading 2</option>
				<option value="3">Heading 3</option>
				<option value="0">Normal Text</option>
			</select>
		</span>
		<span className="ql-formats">
			<button className="ql-bold" aria-label="Bold"></button>
			<button className="ql-italic" aria-label="Italic"></button>
			<button className="ql-underline" aria-label="Underline"></button>
			<button className="ql-strike" aria-label="Strike"></button>
		</span>
		<span className="ql-formats">
			<select className="ql-color" aria-label="Text Color"></select>
			<select className="ql-background" aria-label="Background Color"></select>
		</span>
		<span className="ql-formats">
			<button className="ql-list" value="ordered" aria-label="Ordered List"></button>
			<button className="ql-list" value="bullet" aria-label="Bullet List"></button>
			<select className="ql-align" aria-label="Text Alignment"></select>
		</span>
		<span className="ql-formats">
			<button className="ql-link" aria-label="Insert Link"></button>
			<button className="ql-image" aria-label="Insert Image"></button>
			<button className="ql-video" aria-label="Insert Video"></button>
			<button className="ql-clean" aria-label="Clear Formatting"></button>
		</span>
	</div>
);

const KnowledgeBasePage = () => {
	const { user } = useAuth();
	const toast = useRef(null);

	const [articles, setArticles] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedDept, setSelectedDept] = useState("All");
	const [loading, setLoading] = useState(true);

	// Article Detail Modal
	const [selectedArticle, setSelectedArticle] = useState(null);
	const [detailDialog, setDetailDialog] = useState(false);

	// Create / Edit Modal
	const [articleDialog, setArticleDialog] = useState(false);
	const [dialogMode, setDialogMode] = useState("create"); // create, edit
	const [dialogMaximized, setDialogMaximized] = useState(true);
	const [currentArticle, setCurrentArticle] = useState({ id: "", title: "", department: "", content: "", summary: "" });

	const departmentsList = [
		{ label: "All Departments", value: "All" },
		{ label: "Information Technology", value: "Information Technology" },
		{ label: "Contracts & Services", value: "Contracts & Services" },
		{ label: "Human Resource", value: "Human Resource" },
		{ label: "Finance & Accounts", value: "Finance & Accounts" },
		{ label: "Communication", value: "Communication" },
		{ label: "SCADA", value: "SCADA" },
		{ label: "Technical Services", value: "Technical Services" },
		{ label: "Market Operation", value: "Market Operation" },
		{ label: "System Operation", value: "System Operation" }
	];

	const loadArticles = useCallback(async () => {
		setLoading(true);
		try {
			let url = "/kb/articles";
			if (selectedDept !== "All") {
				url += `?department=${encodeURIComponent(selectedDept)}`;
			}
			const res = await apiClient.get(url);
			setArticles(res.data || []);
		} catch (err) {
			console.error("Failed to load KB articles:", err);
			toast.current?.show({ severity: "error", summary: "Error", detail: "Could not load knowledge base articles" });
		} finally {
			setLoading(false);
		}
	}, [selectedDept]);

	useEffect(() => {
		loadArticles();
	}, [loadArticles]);

	// Search handler
	const handleSearch = async (e) => {
		const val = e.target.value;
		setSearchQuery(val);
		if (val.trim().length >= 2) {
			setLoading(true);
			try {
				const res = await apiClient.get(`/kb/search?q=${encodeURIComponent(val)}`);
				setArticles(res.data || []);
			} catch (err) {
				console.error("KB Search failed:", err);
			} finally {
				setLoading(false);
			}
		} else if (val.trim() === "") {
			loadArticles();
		}
	};

	// Save (Create/Edit) Article
	const handleSaveArticle = async () => {
		const isContentEmpty = !currentArticle.content || currentArticle.content === "<p><br></p>";
		if (!currentArticle.title || !currentArticle.department || isContentEmpty) return;
		try {
			if (dialogMode === "create") {
				await apiClient.post("/kb/articles", currentArticle);
				toast.current?.show({ severity: "success", summary: "Article Published", detail: "Successfully published KB article" });
			} else {
				await apiClient.put(`/kb/articles/${currentArticle.id}`, currentArticle);
				toast.current?.show({ severity: "success", summary: "Article Updated", detail: "Successfully updated KB article" });
			}
			setArticleDialog(false);
			loadArticles();
		} catch (err) {
			toast.current?.show({ severity: "error", summary: "Operation Failed", detail: "Failed to save article" });
		}
	};

	// Delete Article
	const handleDeleteArticle = async (e, id) => {
		e.stopPropagation(); // prevent opening details dialog
		if (!window.confirm("Are you sure you want to delete this knowledge base article?")) return;
		try {
			await apiClient.delete(`/kb/articles/${id}`);
			toast.current?.show({ severity: "success", summary: "Article Deleted" });
			setArticles(articles.filter(a => a.id !== id));
		} catch (err) {
			toast.current?.show({ severity: "error", summary: "Delete Failed" });
		}
	};

	// Open Edit Dialog
	const openEdit = (e, art) => {
		e.stopPropagation(); // prevent opening details dialog
		setDialogMode("edit");
		setDialogMaximized(true);
		setCurrentArticle({
			id: art.id,
			title: art.title,
			department: art.department,
			content: art.content,
			summary: art.summary || ""
		});
		setArticleDialog(true);
	};

	// Open Create Dialog
	const openCreate = () => {
		setDialogMode("create");
		setDialogMaximized(true);
		setCurrentArticle({ id: "", title: "", department: "", content: "", summary: "" });
		setArticleDialog(true);
	};

	return (
		<div className="w-full flex flex-column gap-4 animate-slide-up" style={{ padding: "0 8px" }}>
			<Toast ref={toast} />

			{/* Header */}
			<div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3">
				<div>
					<h2 className="text-2xl font-bold text-900 m-0 mb-1" style={{ letterSpacing: "-0.5px" }}>Knowledge Base</h2>
					<p className="text-sm text-600 m-0">Browse troubleshooting guides, FAQs, and procedures documentation</p>
				</div>
				{user && (
					<Button 
						label="Publish Article" 
						icon="pi pi-plus" 
						className="p-button-indigo border-round-pill" 
						onClick={openCreate} 
					/>
				)}
			</div>

			{/* Search & Filter Bar */}
			<div className="flex flex-column sm:flex-row gap-3 mb-2 align-items-center">
				<span className="p-input-icon-left w-full sm:w-24rem">
					<i className="pi pi-search text-400" style={{ left: "14px" }} />
					<InputText 
						value={searchQuery} 
						onChange={handleSearch} 
						placeholder="Search articles title, content..." 
						className="w-full search-queue-input"
					/>
				</span>
				<div className="w-full sm:w-16rem">
					<Dropdown 
						value={selectedDept} 
						options={departmentsList} 
						onChange={(e) => setSelectedDept(e.value)} 
						placeholder="Filter by Department" 
						className="w-full"
					/>
				</div>
			</div>

			{/* Articles Cards Grid */}
			{loading ? (
				<TableSkeleton />
			) : articles.length === 0 ? (
				<div className="flex flex-column align-items-center justify-content-center py-8 bg-white border-round-xl border-1 border-slate-200">
					<i className="pi pi-search text-400 mb-3" style={{ fontSize: "2.5rem" }} />
					<h3 className="text-lg font-bold text-800 m-0 mb-1">No articles found</h3>
					<p className="text-sm text-500 m-0">Try typing a different search query or select another department</p>
				</div>
			) : (
				<div className="grid col-12 p-0 m-0 gap-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
					{articles.map((art) => (
						<div 
							key={art.id} 
							onClick={() => {
								setSelectedArticle(art);
								setDetailDialog(true);
							}}
							className="premium-card flex flex-column justify-content-between p-4 cursor-pointer"
							style={{ minHeight: "200px" }}
						>
							<div>
								<div className="flex justify-content-between align-items-start mb-2 gap-2">
									<span className="px-2.5 py-1 text-xs font-bold border-round-pill bg-indigo-50 text-indigo-700" style={{ whiteSpace: "nowrap" }}>
										{art.department}
									</span>
									
									{(user?.role === "admin" || art.created_by_emp_id === user?.emp_id || (!art.created_by_emp_id && art.created_by === user?.name)) && (
										<div className="flex gap-1">
											<button 
												onClick={(e) => openEdit(e, art)} 
												className="p-1 border-round-circle bg-slate-50 text-slate-600 hover:bg-slate-100"
												style={{ border: "none", cursor: "pointer" }}
												title="Edit"
											>
												<i className="pi pi-pencil text-xs" />
											</button>
											<button 
												onClick={(e) => handleDeleteArticle(e, art.id)} 
												className="p-1 border-round-circle bg-rose-50 text-rose-600 hover:bg-rose-100"
												style={{ border: "none", cursor: "pointer" }}
												title="Delete"
											>
												<i className="pi pi-trash text-xs" />
											</button>
										</div>
									)}
								</div>
								
								<h3 className="text-base font-bold text-900 mb-2 line-clamp-2 hover:text-indigo-600 transition-colors">
									{art.title}
								</h3>
								
								<p className="text-sm text-600 line-clamp-3 mb-3 m-0">
									{art.summary}
								</p>
							</div>

							<div className="flex justify-content-between align-items-center border-top-1 border-slate-100 pt-3 text-xs text-500">
								<span>By {art.created_by}</span>
								<span>{moment(art.updated_at).format("DD MMM YYYY")}</span>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Article Details Dialog */}
			<Dialog 
				header={
					<div className="flex flex-column gap-1">
						<span className="px-2.5 py-0.5 text-xs font-bold border-round-pill bg-indigo-50 text-indigo-700 align-self-start">
							{selectedArticle?.department}
						</span>
						<span className="font-bold text-xl text-900 mt-1">{selectedArticle?.title}</span>
					</div>
				}
				visible={detailDialog} 
				onHide={() => setDetailDialog(false)} 
				style={{ width: "750px" }}
				modal
				dismissableMask
			>
				{selectedArticle && (
					<div className="flex flex-column gap-3 py-2">
						<div className="flex justify-content-between align-items-center text-xs text-500 border-bottom-1 border-slate-100 pb-2">
							<span>Author: <strong>{selectedArticle.created_by}</strong></span>
							<span>Last Updated: <strong>{moment(selectedArticle.updated_at).format("DD MMM YYYY, h:mm a")}</strong></span>
						</div>
						
						<div 
							className="text-sm text-800 line-height-4 m-0 ql-editor" 
							dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
						/>
					</div>
				)}
			</Dialog>

			{/* Create/Edit Article Dialog */}
			<Dialog 
				header={dialogMode === "create" ? "Publish KB Article" : "Edit KB Article"} 
				visible={articleDialog} 
				onHide={() => setArticleDialog(false)} 
				maximized={dialogMaximized}
				onMaximize={(e) => setDialogMaximized(e.maximized)}
				maximizable
				modal 
				footer={
					<div className="flex justify-content-end gap-2">
						<Button label="Cancel" className="p-button-text" onClick={() => setArticleDialog(false)} />
						<Button 
							label={dialogMode === "create" ? "Publish" : "Update"} 
							className="p-button-indigo" 
							onClick={handleSaveArticle} 
							disabled={!currentArticle.title || !currentArticle.department || !currentArticle.content || currentArticle.content === "<p><br></p>"} 
						/>
					</div>
				}
			>
				<div className="flex flex-column gap-3 py-2">
					<div className="flex flex-column md:flex-row gap-3 w-full">
						<div className="field flex flex-column gap-2 flex-grow-1">
							<label className="text-sm font-semibold">Article Title</label>
							<InputText 
								value={currentArticle.title} 
								onChange={(e) => setCurrentArticle({ ...currentArticle, title: e.target.value })} 
								placeholder="e.g. How to connect to the printer network" 
								className="w-full"
							/>
						</div>
						
						<div className="field flex flex-column gap-2 md:w-20rem">
							<label className="text-sm font-semibold">Department Category</label>
							<Dropdown 
								value={currentArticle.department} 
								options={departmentsList.filter(d => d.value !== "All")} 
								onChange={(e) => setCurrentArticle({ ...currentArticle, department: e.value })} 
								placeholder="Select Department Category" 
								className="w-full"
							/>
						</div>
					</div>

					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Summary / Brief description</label>
						<InputTextarea 
							value={currentArticle.summary} 
							onChange={(e) => setCurrentArticle({ ...currentArticle, summary: e.target.value })} 
							placeholder="Short summary displayed on the card..." 
							rows={2}
							className="w-full"
						/>
					</div>

					<div className="field flex flex-column gap-2">
						<label className="text-sm font-semibold">Article Content Details</label>
						<Editor 
							value={currentArticle.content} 
							onTextChange={(e) => setCurrentArticle({ ...currentArticle, content: e.htmlValue || "" })} 
							headerTemplate={kbEditorHeader}
							style={{ height: dialogMaximized ? "calc(100vh - 380px)" : "380px", minHeight: "300px" }}
							placeholder="Write full article body text with rich styling..." 
						/>
					</div>
				</div>
			</Dialog>
		</div>
	);
};

export default KnowledgeBasePage;
export { KnowledgeBasePage };

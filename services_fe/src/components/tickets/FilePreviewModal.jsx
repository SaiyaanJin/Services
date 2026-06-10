import React, { useState } from "react";
import { API_BASE_URL } from "../../api";

const getFileType = (filename) => {
	const ext = filename?.split(".")?.pop()?.toLowerCase() || "";
	if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext)) return "image";
	if (ext === "pdf") return "pdf";
	if (["txt", "log", "csv", "json", "xml", "md"].includes(ext)) return "text";
	return "unknown";
};

const getFileIcon = (filename) => {
	const type = getFileType(filename);
	if (type === "image") return { icon: "pi pi-image", color: "#10b981", bg: "#d1fae5" };
	if (type === "pdf") return { icon: "pi pi-file-pdf", color: "#ef4444", bg: "#fef2f2" };
	if (type === "text") return { icon: "pi pi-file", color: "#6366f1", bg: "#ede9fe" };
	return { icon: "pi pi-paperclip", color: "#64748b", bg: "#f1f5f9" };
};

const FilePreviewModal = ({ files, uploadBasePath }) => {
	const [previewFile, setPreviewFile] = useState(null);
	const [textContent, setTextContent] = useState("");
	const [textLoading, setTextLoading] = useState(false);

	if (!files || files === "No file was Uploaded" || files.length === 0) return null;

	const fileList = typeof files === "string"
		? files.split("|").filter(f => f && f !== "No file was Uploaded")
		: Array.isArray(files) ? files : [];

	if (fileList.length === 0) return null;

	const token = localStorage.getItem("sso_token") || "";
	const getPreviewUrl = (filename) =>
		`${API_BASE_URL}/preview?filename=${encodeURIComponent(filename)}&token=${encodeURIComponent(token)}`;

	const getDownloadUrl = (filename) =>
		`${API_BASE_URL}/download?path=${encodeURIComponent(filename)}&File_Name=Attachment&token=${encodeURIComponent(token)}`;

	const openPreview = async (filename) => {
		const type = getFileType(filename);
		setPreviewFile({ name: filename, type });
		if (type === "text") {
			setTextLoading(true);
			try {
				const res = await fetch(getPreviewUrl(filename), {
					headers: { Authorization: `Bearer ${token}` }
				});
				if (res.ok) {
					const text = await res.text();
					setTextContent(text);
				} else {
					setTextContent("Could not load file content.");
				}
			} catch {
				setTextContent("Error loading file.");
			} finally {
				setTextLoading(false);
			}
		}
	};

	return (
		<div>
			{/* Attachment Chips */}
			<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
				{fileList.map((filename, idx) => {
					const iconInfo = getFileIcon(filename);
					const type = getFileType(filename);
					const canPreview = ["image", "pdf", "text"].includes(type);
					return (
						<div key={idx} style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							background: iconInfo.bg,
							border: `1px solid ${iconInfo.color}30`,
							borderRadius: "8px",
							padding: "6px 10px",
							maxWidth: "240px",
							flexShrink: 0
						}}>
							<i className={iconInfo.icon} style={{ color: iconInfo.color, fontSize: "0.85rem", flexShrink: 0 }} />
							<span style={{
								fontSize: "0.75rem",
								color: "var(--text-color, #1e293b)",
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
								flex: 1
							}} title={filename}>
								{filename}
							</span>
							<div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
								{canPreview && (
									<button
										onClick={() => openPreview(filename)}
										title="Preview"
										style={{
											background: "none", border: "none", cursor: "pointer",
											color: iconInfo.color, padding: "2px 4px", borderRadius: "4px",
											fontSize: "0.72rem"
										}}
									>
										<i className="pi pi-eye" />
									</button>
								)}
								<a
									href={getDownloadUrl(filename)}
									download
									title="Download"
									style={{
										color: iconInfo.color, textDecoration: "none",
										display: "flex", alignItems: "center", padding: "2px 4px",
										borderRadius: "4px", fontSize: "0.72rem"
									}}
								>
									<i className="pi pi-download" />
								</a>
							</div>
						</div>
					);
				})}
			</div>

			{/* Preview Modal */}
			{previewFile && (
				<div
					onClick={() => setPreviewFile(null)}
					style={{
						position: "fixed", inset: 0,
						background: "rgba(0,0,0,0.85)",
						zIndex: 99999,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "20px"
					}}
				>
					<div
						onClick={e => e.stopPropagation()}
						style={{
							background: "var(--surface-card, #1e293b)",
							borderRadius: "16px",
							overflow: "hidden",
							maxWidth: "90vw",
							maxHeight: "90vh",
							display: "flex",
							flexDirection: "column",
							boxShadow: "0 25px 80px rgba(0,0,0,0.5)"
						}}
					>
						{/* Modal Header */}
						<div style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "12px 16px",
							background: "rgba(0,0,0,0.3)",
							borderBottom: "1px solid rgba(255,255,255,0.1)"
						}}>
							<span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: "600" }}>
								<i className={getFileIcon(previewFile.name).icon} style={{ marginRight: "8px", color: getFileIcon(previewFile.name).color }} />
								{previewFile.name}
							</span>
							<div style={{ display: "flex", gap: "8px" }}>
								<a
									href={getDownloadUrl(previewFile.name)}
									download
									style={{
										color: "#94a3b8", textDecoration: "none",
										padding: "4px 10px", borderRadius: "6px",
										fontSize: "0.78rem", border: "1px solid rgba(255,255,255,0.1)"
									}}
								>
									<i className="pi pi-download" /> Download
								</a>
								<button
									onClick={() => setPreviewFile(null)}
									style={{
										background: "none", border: "1px solid rgba(255,255,255,0.1)",
										borderRadius: "6px", padding: "4px 10px",
										cursor: "pointer", color: "#94a3b8", fontSize: "0.78rem"
									}}
								>
									<i className="pi pi-times" />
								</button>
							</div>
						</div>

						{/* Preview Content */}
						<div style={{ overflowY: "auto", maxHeight: "calc(90vh - 60px)", padding: "8px" }}>
							{previewFile.type === "image" && (
								<img
									src={getPreviewUrl(previewFile.name)}
									alt={previewFile.name}
									style={{ maxWidth: "80vw", maxHeight: "80vh", display: "block", margin: "auto", borderRadius: "8px" }}
								/>
							)}
							{previewFile.type === "pdf" && (
								<iframe
									src={getPreviewUrl(previewFile.name)}
									title={previewFile.name}
									style={{ width: "75vw", height: "80vh", border: "none", borderRadius: "8px" }}
								/>
							)}
							{previewFile.type === "text" && (
								<pre style={{
									color: "#e2e8f0",
									background: "#0f172a",
									padding: "16px",
									borderRadius: "8px",
									fontSize: "0.8rem",
									lineHeight: 1.6,
									maxWidth: "70vw",
									maxHeight: "75vh",
									overflowY: "auto",
									whiteSpace: "pre-wrap",
									wordBreak: "break-word"
								}}>
									{textLoading ? "Loading..." : textContent}
								</pre>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default FilePreviewModal;

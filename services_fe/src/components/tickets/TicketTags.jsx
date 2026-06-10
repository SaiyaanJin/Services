import React, { useState, useEffect } from "react";
import apiClient from "../../api";

const TicketTags = ({ tags = [], docketNumber, canEdit = false, onTagsChange }) => {
	const [allTags, setAllTags] = useState([]);
	const [editing, setEditing] = useState(false);
	const [selectedTags, setSelectedTags] = useState(tags);

	useEffect(() => {
		apiClient.get("/admin/tags")
			.then(res => setAllTags(res.data || []))
			.catch(() => {});
	}, []);

	useEffect(() => {
		setSelectedTags(tags);
	}, [tags]);

	const toggleTag = (tagName) => {
		setSelectedTags(prev =>
			prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
		);
	};

	const saveTags = async () => {
		try {
			await apiClient.post(`/UserInputupdate`, {
				Docket_Number: docketNumber,
				Tags: selectedTags
			});
			onTagsChange?.(selectedTags);
			setEditing(false);
		} catch {
			setEditing(false);
		}
	};

	const getTagColor = (tagName) => {
		const found = allTags.find(t => t.name === tagName);
		return found?.color || "#6366f1";
	};

	if (!tags?.length && !canEdit) return null;

	return (
		<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
			{selectedTags.map(tag => (
				<span key={tag} style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "4px",
					background: `${getTagColor(tag)}18`,
					color: getTagColor(tag),
					padding: "2px 10px",
					borderRadius: "20px",
					fontSize: "0.72rem",
					fontWeight: "600",
					border: `1px solid ${getTagColor(tag)}40`
				}}>
					<span style={{
						width: "6px", height: "6px",
						borderRadius: "50%",
						background: getTagColor(tag),
						display: "inline-block"
					}} />
					#{tag}
				</span>
			))}

			{canEdit && !editing && (
				<button
					onClick={() => setEditing(true)}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						background: "none",
						border: "1px dashed var(--surface-border, #e2e8f0)",
						borderRadius: "20px",
						padding: "2px 10px",
						fontSize: "0.72rem",
						color: "#94a3b8",
						cursor: "pointer"
					}}
				>
					<i className="pi pi-plus" style={{ fontSize: "0.6rem" }} />
					Add tag
				</button>
			)}

			{editing && (
				<div style={{
					position: "fixed",
					inset: 0,
					background: "rgba(0,0,0,0.3)",
					zIndex: 9999,
					display: "flex",
					alignItems: "center",
					justifyContent: "center"
				}} onClick={() => setEditing(false)}>
					<div onClick={e => e.stopPropagation()} style={{
						background: "var(--surface-card, #fff)",
						borderRadius: "12px",
						padding: "20px",
						width: "320px",
						boxShadow: "0 20px 60px rgba(0,0,0,0.15)"
					}}>
						<h4 style={{ margin: "0 0 16px", fontSize: "0.9rem", fontWeight: "700" }}>
							<i className="pi pi-tag mr-2" style={{ color: "#6366f1" }} />
							Manage Tags
						</h4>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
							{allTags.map(tag => {
								const selected = selectedTags.includes(tag.name);
								return (
									<span
										key={tag.id}
										onClick={() => toggleTag(tag.name)}
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "4px",
											background: selected ? `${tag.color}22` : "var(--surface-100, #f1f5f9)",
											color: selected ? tag.color : "#64748b",
											border: selected ? `2px solid ${tag.color}` : "2px solid transparent",
											padding: "4px 12px",
											borderRadius: "20px",
											fontSize: "0.75rem",
											fontWeight: "600",
											cursor: "pointer",
											transition: "all 0.15s"
										}}
									>
										#{tag.name}
										{selected && <i className="pi pi-check" style={{ fontSize: "0.6rem" }} />}
									</span>
								);
							})}
						</div>
						<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
							<button onClick={() => setEditing(false)} style={{
								padding: "6px 14px", background: "none",
								border: "1px solid var(--surface-border, #e2e8f0)", borderRadius: "8px",
								cursor: "pointer", fontSize: "0.8rem", color: "#64748b"
							}}>Cancel</button>
							<button onClick={saveTags} style={{
								padding: "6px 14px", background: "#6366f1",
								border: "none", borderRadius: "8px",
								cursor: "pointer", fontSize: "0.8rem", color: "#fff", fontWeight: "600"
							}}>Save Tags</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default TicketTags;

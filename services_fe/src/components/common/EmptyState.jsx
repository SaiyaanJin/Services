import React from "react";
import { Button } from "primereact/button";

export const EmptyState = ({ 
	icon = "pi pi-inbox", 
	title = "No Data Found", 
	description = "We couldn't find any records matching your request.", 
	actionLabel, 
	onAction 
}) => {
	return (
		<div className="flex flex-column align-items-center justify-content-center py-6 px-4 text-center bg-white border-round-xl shadow-sm border-1 border-100 mt-4 animate-slide-up">
			<div className="flex align-items-center justify-content-center w-4rem h-4rem border-circle bg-indigo-50 text-indigo-500 mb-3">
				<i className={`${icon}`} style={{ fontSize: "2.2rem" }} />
			</div>
			<h3 className="text-xl font-bold text-900 m-0 mb-2">{title}</h3>
			<p className="text-muted max-w-26rem m-0 mb-4 line-height-3 text-600" style={{ maxWidth: "320px" }}>
				{description}
			</p>
			{actionLabel && onAction && (
				<Button 
					label={actionLabel} 
					icon="pi pi-plus" 
					className="p-button-indigo p-button-raised" 
					onClick={onAction} 
				/>
			)}
		</div>
	);
};

export default EmptyState;

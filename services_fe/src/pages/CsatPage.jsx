import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import apiClient from "../api";

const CsatPage = () => {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token") || "";
	const initialRating = parseInt(searchParams.get("rating") || "0", 10);

	const [rating, setRating] = useState(initialRating >= 1 && initialRating <= 5 ? initialRating : 0);
	const [hoverRating, setHoverRating] = useState(0);
	const [comment, setComment] = useState("");
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState("idle"); // idle, success, error, already_submitted
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		if (initialRating >= 1 && initialRating <= 5) {
			setRating(initialRating);
		}
	}, [initialRating]);

	const handleSubmit = async () => {
		if (rating === 0) return;
		setLoading(true);
		try {
			await apiClient.post("/tickets/csat", {
				token,
				rating,
				comment
			});
			setStatus("success");
		} catch (err) {
			console.error("CSAT submission failed:", err);
			if (err.response?.status === 409) {
				setStatus("already_submitted");
			} else {
				setStatus("error");
				setErrorMessage(err.response?.data?.detail || "Could not submit rating. The feedback link might be invalid or expired.");
			}
		} finally {
			setLoading(false);
		}
	};

	if (!token) {
		return (
			<div className="flex align-items-center justify-content-center min-h-screen" style={{ backgroundColor: "#0b0c1e" }}>
				<div className="text-center p-6 border-round-xl" style={{ maxWidth: "450px", background: "#131835", border: "1px solid #1a1c35" }}>
					<i className="pi pi-exclamation-circle text-rose-500 mb-4" style={{ fontSize: "3rem" }} />
					<h2 className="text-xl font-bold text-white mb-2">Invalid Access Link</h2>
					<p className="text-sm text-slate-400">This feedback link is invalid. Please use the link provided in your ticket resolution email.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex align-items-center justify-content-center min-h-screen" style={{ backgroundColor: "#0b0c1e", padding: "20px" }}>
			<div className="w-full p-5 border-round-2xl text-center shadow-8 animate-slide-up" style={{ maxWidth: "480px", background: "#131835", border: "1px solid #1a1c35" }}>
				
				{/* Branding Logo */}
				<div className="flex justify-content-center mb-4">
					<div className="flex align-items-center justify-content-center border-round-xl bg-indigo-600" style={{ width: "50px", height: "50px" }}>
						<i className="pi pi-check-circle text-white text-2xl" />
					</div>
				</div>

				{status === "idle" && (
					<>
						<h2 className="text-2xl font-bold text-white mb-2" style={{ letterSpacing: "-0.5px" }}>How did we do?</h2>
						<p className="text-sm text-slate-400 mb-5">Your feedback helps us improve our service quality. Please rate your satisfaction with the ticket resolution.</p>

						{/* Five Interactive Star Icons */}
						<div className="flex justify-content-center gap-3 mb-4">
							{[1, 2, 3, 4, 5].map((star) => (
								<button
									key={star}
									type="button"
									onMouseEnter={() => setHoverRating(star)}
									onMouseLeave={() => setHoverRating(0)}
									onClick={() => setRating(star)}
									style={{
										background: "none",
										border: "none",
										cursor: "pointer",
										fontSize: "2.5rem",
										color: star <= (hoverRating || rating) ? "#fbbf24" : "#334155",
										transition: "transform 0.15s ease, color 0.15s ease",
										transform: hoverRating === star ? "scale(1.2)" : "scale(1)"
									}}
								>
									★
								</button>
							))}
						</div>

						{/* Optional Comment text area */}
						<div className="field flex flex-column gap-2 mb-4 text-left">
							<label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Tell us more (Optional)</label>
							<InputTextarea
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								placeholder="What did we do well, or how could we improve?"
								rows={4}
								style={{
									width: "100%",
									background: "#0b0c1e",
									border: "1px solid #1a1c35",
									color: "#ffffff"
								}}
							/>
						</div>

						<Button
							label={loading ? "Submitting..." : "Submit Feedback"}
							icon={loading ? "pi pi-spin pi-spinner" : "pi pi-check"}
							className="p-button-indigo w-full py-3 border-round-xl font-bold"
							onClick={handleSubmit}
							disabled={rating === 0 || loading}
						/>
					</>
				)}

				{status === "success" && (
					<div className="py-4">
						<i className="pi pi-check-circle text-emerald-500 mb-4" style={{ fontSize: "4rem" }} />
						<h2 className="text-2xl font-bold text-white mb-2">Thank you!</h2>
						<p className="text-sm text-slate-400">Your feedback has been successfully registered. We appreciate you taking the time to help us improve.</p>
					</div>
				)}

				{status === "already_submitted" && (
					<div className="py-4">
						<i className="pi pi-info-circle text-indigo-500 mb-4" style={{ fontSize: "4rem" }} />
						<h2 className="text-2xl font-bold text-white mb-2">Already Rated</h2>
						<p className="text-sm text-slate-400">Feedback rating for this ticket has already been submitted. You can only rate each ticket once.</p>
					</div>
				)}

				{status === "error" && (
					<div className="py-4">
						<i className="pi pi-times-circle text-rose-500 mb-4" style={{ fontSize: "4rem" }} />
						<h2 className="text-2xl font-bold text-white mb-2">Submission Error</h2>
						<p className="text-sm text-slate-400 mb-4">{errorMessage}</p>
						<Button
							label="Try Again"
							className="p-button-outlined p-button-indigo w-full py-2 border-round-xl"
							onClick={() => setStatus("idle")}
						/>
					</div>
				)}

			</div>
		</div>
	);
};

export default CsatPage;

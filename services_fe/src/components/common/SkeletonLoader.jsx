import React from "react";
import { Skeleton } from "primereact/skeleton";
import { Divider } from "primereact/divider";

export const MetricsSkeleton = () => {
	return (
		<div className="grid col-12 gap-4 justify-content-center p-0 m-0">
			{[1, 2, 3, 4].map((i) => (
				<div key={i} className="col-12 sm:col-5 md:col-2 premium-card p-4 border-round-xl bg-white shadow-sm flex flex-column gap-3">
					<div className="flex justify-content-between align-items-center">
						<Skeleton width="40%" height="1rem" borderRadius="10px"></Skeleton>
						<Skeleton shape="circle" size="2rem"></Skeleton>
					</div>
					<Skeleton width="60%" height="2.5rem" borderRadius="10px"></Skeleton>
					<Skeleton width="80%" height="0.8rem" borderRadius="10px"></Skeleton>
				</div>
			))}
		</div>
	);
};

export const TableSkeleton = () => {
	return (
		<div className="premium-card p-4 bg-white border-round-xl shadow-sm">
			<div className="flex justify-content-between align-items-center mb-4">
				<Skeleton width="30%" height="2rem" borderRadius="8px"></Skeleton>
				<Skeleton width="15%" height="2rem" borderRadius="8px"></Skeleton>
			</div>
			<DataTableSkeleton rows={5} />
		</div>
	);
};

export const DataTableSkeleton = ({ rows = 5 }) => {
	return (
		<div className="w-full flex flex-column gap-3">
			{[...Array(rows)].map((_, i) => (
				<div key={i} className="flex gap-4 align-items-center py-3 px-2 border-bottom-1 border-200">
					<Skeleton width="10%" height="1.2rem" borderRadius="4px"></Skeleton>
					<Skeleton width="40%" height="1.2rem" borderRadius="4px"></Skeleton>
					<Skeleton width="15%" height="1.2rem" borderRadius="4px"></Skeleton>
					<Skeleton width="15%" height="1.2rem" borderRadius="4px"></Skeleton>
					<Skeleton width="20%" height="1.2rem" borderRadius="4px"></Skeleton>
				</div>
			))}
		</div>
	);
};

export const TicketDetailSkeleton = () => {
	return (
		<div className="grid col-12 gap-4 m-0 p-0 justify-content-center">
			<div className="col-12 md:col-8 flex flex-column gap-4">
				<div className="premium-card p-4 bg-white border-round-xl shadow-sm">
					<div className="flex align-items-center gap-3 mb-3">
						<Skeleton shape="circle" size="3.5rem"></Skeleton>
						<div className="flex-grow-1 flex flex-column gap-2">
							<Skeleton width="70%" height="1.8rem" borderRadius="6px"></Skeleton>
							<Skeleton width="30%" height="1rem" borderRadius="6px"></Skeleton>
						</div>
					</div>
					<Divider />
					<div className="flex flex-column gap-3 mt-3">
						<Skeleton width="100%" height="1.2rem"></Skeleton>
						<Skeleton width="100%" height="1.2rem"></Skeleton>
						<Skeleton width="85%" height="1.2rem"></Skeleton>
					</div>
				</div>

				<div className="premium-card p-4 bg-white border-round-xl shadow-sm flex flex-column gap-4">
					<Skeleton width="25%" height="1.5rem" borderRadius="6px"></Skeleton>
					<div className="flex flex-column gap-3">
						{[1, 2].map((i) => (
							<div key={i} className="flex gap-3 align-items-start border-1 border-100 p-3 border-round-lg">
								<Skeleton shape="circle" size="2.5rem"></Skeleton>
								<div className="flex-grow-1 flex flex-column gap-2">
									<div className="flex justify-content-between">
										<Skeleton width="40%" height="1rem"></Skeleton>
										<Skeleton width="20%" height="0.8rem"></Skeleton>
									</div>
									<Skeleton width="90%" height="1rem"></Skeleton>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="col-12 md:col-4 flex flex-column gap-4">
				<div className="premium-card p-4 bg-white border-round-xl shadow-sm flex flex-column gap-3">
					<Skeleton width="50%" height="1.5rem" borderRadius="6px"></Skeleton>
					<Divider />
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="flex justify-content-between align-items-center py-2">
							<Skeleton width="30%" height="1rem"></Skeleton>
							<Skeleton width="50%" height="1rem"></Skeleton>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Fieldset } from "primereact/fieldset";
import { Toast } from "primereact/toast";
import jwt_decode from "jwt-decode";
import { useLocation } from "react-router-dom";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { OrganizationChart } from "primereact/organizationchart";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Avatar } from "primereact/avatar";
import { Divider } from "primereact/divider";
import "../cssfiles/Animation.css";

function Dashboard(params) {
	const search = useLocation().search;
	const id = new URLSearchParams(search).get("token");
	const [page_hide, setpage_hide] = useState(true);
	params.var1(page_hide);
	const toast = useRef();
	const [data, setdata] = useState();
	const [User_id, setUser_id] = useState();
	const [Person_Name, setPerson_Name] = useState();
	const [Department, setDepartment] = useState();
	const [count, setcount] = useState(true);
	const [expandedRows, setExpandedRows] = useState([]);
	const [emp_data, setemp_data] = useState();
	const [isAdmin, setisAdmin] = useState(false);
	const [AdminChecked, setAdminChecked] = useState(false);

	const [globalFilterValue, setGlobalFilterValue] = useState("");

	const [filters, setFilters] = useState({
		global: { value: null, matchMode: FilterMatchMode.CONTAINS },
		Name: {
			operator: FilterOperator.AND,
			constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
		},
		Emp_id: {
			operator: FilterOperator.AND,
			constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
		},
		Department: {
			operator: FilterOperator.AND,
			constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
		},
		Mail: {
			operator: FilterOperator.AND,
			constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
		},
		Mobile: {
			operator: FilterOperator.AND,
			constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
		},
	});

	const onGlobalFilterChange = (e) => {
		const value = e.target.value;
		let _filters = { ...filters };

		_filters["global"].value = value;

		setFilters(_filters);
		setGlobalFilterValue(value);
	};

	useEffect(() => {
		axios
			.get("https://sso.erldc.in:5000/emp_data", {
				headers: { Data: "Sanju8@92" },
			})
			.then((response) => {
				setemp_data(response.data);
			});

		if (id) {
			params.var2(id);

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
						var decoded = jwt_decode(response.data["Final_Token"], "it@posoco");

						if (!decoded["Login"] && decoded["Reason"] === "Session Expired") {
							alert("Session Expired, Please Login Again via SSO");

							axios
								.post("https://sso.erldc.in:5000/1ogout", {
									headers: { token: id },
								})
								.then((response) => {
									window.location = "https://sso.erldc.in:3000";
								})
								.catch((error) => {});
							window.location = "https://sso.erldc.in:3000";
						} else {
							setUser_id(decoded["User"]);
							setpage_hide(!decoded["Login"]);
							setPerson_Name(decoded["Person_Name"]);

							if (
								decoded["Department"] === "IT-TS" ||
								decoded["Department"] === "IT"
							) {
								setDepartment("Information Technology (IT)");
							}
							if (
								decoded["Department"] === "MO" ||
								decoded["Department"] === "MO-I" ||
								decoded["Department"] === "MO-II" ||
								decoded["Department"] === "MO-III" ||
								decoded["Department"] === "MO-IV"
							) {
								setDepartment("Market Operation (MO)");
							}
							if (
								decoded["Department"] === "MIS" ||
								decoded["Department"] === "SS" ||
								decoded["Department"] === "CR" ||
								decoded["Department"] === "SO"
							) {
								setDepartment("System Operation (SO)");
							}

							if (decoded["Department"] === "SCADA") {
								setDepartment("SCADA");
							}
							if (decoded["Department"] === "CS") {
								setDepartment("Contracts & Services (CS)");
							}
							if (decoded["Department"] === "TS") {
								setDepartment("Technical Services (TS)");
							}

							if (decoded["Department"] === "HR") {
								setDepartment("Human Resource (HR)");
							}
							if (decoded["Department"] === "COMMUNICATION") {
								setDepartment("Communication");
							}
							if (decoded["Department"] === "F&A") {
								setDepartment("Finance & Accounts (F&A)");
							}
							if (decoded["Department"] === "CR") {
								setDepartment("Control Room (CR)");
							}

							if (
								decoded["User"] === "00162" &&
								decoded["Person_Name"] === "Sanjay Kumar"
							) {
								setisAdmin(true);
							} else {
								setisAdmin(false);
							}
						}
					}
				})
				.catch((error) => {});
		} else {
			setpage_hide(true);
			params.var2("Invalid_Token");
		}
		if (Person_Name && User_id && count) {
			// showInfo(Person_Name + " (" + User_id + ")");
			setcount(false);

			axios
				.get("http://10.3.200.63:5050/Dashboard", {
					headers: { Data: Person_Name + " (" + User_id + ")" },
				})
				.then((response) => {
					setdata(response.data);
				})
				.catch((error) => {});
		}
	}, [User_id, page_hide, Person_Name, Department]);

	const showInfo = (v) => {
		toast.current.show({
			severity: "info",
			summary: v,
			detail: "Logged In",
			life: 4000,
		});
	};

	const headerTemplate = (data) => {
		return (
			<React.Fragment>
				<span className="vertical-align-middle ml-2 font-bold line-height-3">
					{data.Department}
				</span>
			</React.Fragment>
		);
	};

	return (
		<>
			<Fieldset hidden={!page_hide}>
				<div className="card flex justify-content-center">
					<h1>Please Login again by SSO</h1>
				</div>
			</Fieldset>

			<Divider align="left" hidden={page_hide}>
				<span
					className="p-tag"
					style={{ backgroundColor: "#000000", fontSize: "large" }}
				>
					<Avatar
						icon="pi pi-sitemap"
						style={{ backgroundColor: "#000000", color: "#ffffff" }}
						shape="square"
					/>
					Department Data Tab
				</span>
			</Divider>

			<div className="card flex justify-content-center">
				<marquee>
					Welcome &nbsp;
					<b>
						Sh. {Person_Name} ({User_id})
					</b>
					&nbsp; of &nbsp;<b>{Department}</b>
				</marquee>
			</div>

			<div
				className="card"
				style={{
					width: "95.5vw",
					// whiteSpace: "nowrap",
				}}
			>
				<DataTable
					// paginator
					// rows={6}
					// rowsPerPageOptions={[6, 7, 8, 9]}
					tableStyle={{ minWidth: "50rem" }}
					// paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
					// currentPageReportTemplate="{first} to {last} of {totalRecords}"
					// scrollable
					// scrollHeight="420px"
					className="mt-4"
					removableSort
					value={data}
					showGridlines
					// size="large"
				>
					<Column
						style={{
							whiteSpace: "pre-wrap",
							fontWeight: "bold",
						}}
						field="Department"
						header="Department Name"
						headerClassName="head"
						sortable
						dataType="text"
					></Column>
					<Column
						alignHeader="center"
						align={"center"}
						className="total"
						style={{
							whiteSpace: "pre-wrap",
						}}
						field="Total"
						header="Total Services"
						sortable
						dataType="numeric"
						headerClassName="head3"
					></Column>
					<Column
						alignHeader="center"
						align={"center"}
						className="resolved"
						sstyle={{
							whiteSpace: "pre-wrap",
						}}
						field="Resolved"
						header="Resolved Services"
						sortable
						dataType="numeric"
						headerClassName="head1"
					></Column>
					<Column
						alignHeader="center"
						align={"center"}
						className="pending"
						style={{
							whiteSpace: "pre-wrap",
						}}
						field="Pending"
						header="Pending Services"
						sortable
						dataType="numeric"
						headerClassName="head2"
					></Column>
				</DataTable>
			</div>
			<div className="card flex justify-content-center">
				<Toast ref={toast} />
			</div>
			<br />

			{/* <div hidden={page_hide || !isAdmin}> */}
			<div hidden={page_hide}>
				<Divider align="center">
					<span className="p-tag">Employee Details</span>
				</Divider>
				<div className="card">
					<span className="p-input-icon-left">
						<i className="pi pi-search" />

						<InputText
							col={20}
							value={globalFilterValue}
							onChange={onGlobalFilterChange}
							placeholder="Search Employees of ERLDC"
						/>
					</span>
					<DataTable
						filters={filters}
						globalFilterFields={[
							"Name",
							"Emp_id",
							"Department",
							"Mail",
							"Mobile",
						]}
						emptyMessage="Nothing found."
						rows={5}
						scrollable
						scrollHeight="800px"
						value={emp_data}
						rowGroupMode="subheader"
						groupRowsBy="Department"
						sortMode="single"
						sortField="Department"
						sortOrder={1}
						expandableRowGroups
						expandedRows={expandedRows}
						onRowToggle={(e) => setExpandedRows(e.data)}
						rowGroupHeaderTemplate={headerTemplate}
						tableStyle={{ minWidth: "50rem", height: "" }}
						showGridlines
					>
						<Column
							field="Department"
							header="Department"
							style={{ width: "20%" }}
							headerClassName="head4"
							frozen
						></Column>
						<Column
							field="Name"
							header="Employee Name"
							style={{ width: "20%" }}
							headerClassName="head4"
						></Column>
						<Column
							field="Emp_id"
							header="Employee id"
							style={{ width: "20%" }}
							headerClassName="head4"
						></Column>
						<Column
							field="Mail"
							header="E-Mail id"
							style={{ width: "20%" }}
							headerClassName="head4"
						></Column>
						<Column
							field="Mobile"
							header="Contact Number"
							style={{ width: "20%" }}
							headerClassName="head4"
						></Column>
					</DataTable>
				</div>
				{/* </Fieldset> */}
			</div>
		</>
	);
}
export default Dashboard;

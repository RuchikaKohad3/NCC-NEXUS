import React, { useState } from "react";
import "./anoAttendance.css";

const sessions = [
	{ name: "January", drills: [
		{ name: "Drill 1", date: "2026-01-05", time: "09:00" },
		{ name: "Drill 2", date: "2026-01-12", time: "09:00" },
		{ name: "Drill 3", date: "2026-01-19", time: "09:00" },
		{ name: "Drill 4", date: "2026-01-26", time: "09:00" },
		{ name: "Drill 5", date: "2026-01-30", time: "09:00" },
	] },
	{ name: "February", drills: [
		{ name: "Drill 1", date: "2026-02-03", time: "09:00" },
		{ name: "Drill 2", date: "2026-02-10", time: "09:00" },
		{ name: "Drill 3", date: "2026-02-17", time: "09:00" },
		{ name: "Drill 4", date: "2026-02-24", time: "09:00" },
		{ name: "Drill 5", date: "2026-02-28", time: "09:00" },
	] },
	{ name: "March", drills: [
		{ name: "Drill 1", date: "2026-03-03", time: "09:00" },
		{ name: "Drill 2", date: "2026-03-10", time: "09:00" },
		{ name: "Drill 3", date: "2026-03-17", time: "09:00" },
		{ name: "Drill 4", date: "2026-03-24", time: "09:00" },
		{ name: "Drill 5", date: "2026-03-28", time: "09:00" },
	] },
	{ name: "April", drills: [
		{ name: "Drill 1", date: "2026-04-03", time: "09:00" },
		{ name: "Drill 2", date: "2026-04-10", time: "09:00" },
		{ name: "Drill 3", date: "2026-04-17", time: "09:00" },
		{ name: "Drill 4", date: "2026-04-24", time: "09:00" },
		{ name: "Drill 5", date: "2026-04-28", time: "09:00" },
	] },
];

const cadets = [
	{ name: "Shami Dubey", attendance: {
		January: [true, true, false, true, true],
		February: [true, false, true, true, true],
		March: [true, true, true, false, true],
		April: [true, false, true, true, false],
	} },
	{ name: "Rohit Singh", attendance: {
		January: [true, false, true, true, false],
		February: [true, true, false, true, true],
		March: [false, true, true, true, false],
		April: [true, true, false, true, true],
	} },
	{ name: "Priya Sharma", attendance: {
		January: [false, true, true, false, true],
		February: [true, true, true, false, false],
		March: [true, false, true, true, true],
		April: [false, true, true, false, true],
	} },
	{ name: "Amit Verma", attendance: {
		January: [true, true, true, true, false],
		February: [false, true, true, true, true],
		March: [true, true, false, true, true],
		April: [true, false, true, true, true],
	} },
	{ name: "Neha Gupta", attendance: {
		January: [false, false, true, true, true],
		February: [true, false, false, true, true],
		March: [true, true, false, false, true],
		April: [true, true, true, false, false],
	} },
	{ name: "Sahil Khan", attendance: {
		January: [true, false, false, true, false],
		February: [false, true, true, false, true],
		March: [true, true, false, true, false],
		April: [false, true, true, true, true],
	} },
	{ name: "Anjali Mehta", attendance: {
		January: [true, true, true, false, true],
		February: [true, true, false, true, false],
		March: [true, false, true, true, true],
		April: [true, true, false, true, true],
	} },
];

function calculateAttendance(attArr) {
	const total = attArr.length;
	const attended = attArr.filter(Boolean).length;
	const percent = total ? ((attended / total) * 100).toFixed(1) : "0";
	return { attended, total, percent };
}

const AnoAttendance = () => {
	const [selectedSession, setSelectedSession] = useState(sessions[0].name);

	const drills = sessions.find(s => s.name === selectedSession)?.drills || [];

	const handleDownload = () => {
		// Simple CSV download
		let csv = "Cadet Name,";
		drills.forEach(d => { csv += `${d.name} (${d.date} ${d.time}),`; });
		csv += "Total Drills,Total Attendance,Percentage\n";
		cadets.forEach(c => {
			csv += `${c.name},`;
			const attArr = c.attendance[selectedSession] || [];
			attArr.forEach(a => { csv += a ? "Present," : "Absent,"; });
			const { attended, total, percent } = calculateAttendance(attArr);
			csv += `${total},${attended},${percent}\n`;
		});
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${selectedSession}_attendance.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="ano-attendance-container">
			<h2>Attendance Monitoring</h2>
			<div className="session-select">
				<label>Session: </label>
				<select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
					{sessions.map(s => (
						<option key={s.name} value={s.name}>{s.name}</option>
					))}
				</select>
				<button className="download-btn" onClick={handleDownload}>Download Attendance</button>
			</div>
			<table className="attendance-table">
				<thead>
					<tr>
						<th style={{whiteSpace: 'nowrap'}}>Cadet Name</th>
						{drills.map((d, idx) => (
							<th key={idx}>
								<div style={{lineHeight: '1.2'}}>
									<div>{d.name}</div>
									<div style={{fontSize: '0.92em', color: '#555'}}>{d.date} {d.time}</div>
								</div>
							</th>
						))}
						<th>Total Drills</th>
						<th>Total Attendance</th>
						<th>Percentage</th>
					</tr>
				</thead>
				<tbody>
					{cadets.map((c, idx) => {
						const attArr = c.attendance[selectedSession] || [];
						const { attended, total, percent } = calculateAttendance(attArr);
						return (
							<tr key={idx}>
								<td style={{whiteSpace: 'nowrap'}}>{c.name}</td>
								{attArr.map((a, i) => (
									<td key={i} className={a ? "present" : "absent"}>{a ? "P" : "A"}</td>
								))}
								{/* Fill empty cells if drills > attendance */}
								{drills.length > attArr.length && Array(drills.length - attArr.length).fill(0).map((_, i) => <td key={`empty-${i}`}></td>)}
								<td>{drills.length}</td>
								<td>{attended}</td>
								<td>{percent}%</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};

export default AnoAttendance;

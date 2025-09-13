import React from 'react'
import { NavLink } from 'react-router-dom'


export default function Sidebar(){
const items = [
['/', 'Dashboard'],
['/flights', 'Flights'],
['/crew', 'Crew'],
['/rosters', 'RosterTable'],
['/approvals', 'Approvals'],
]
return (
<aside className="w-64 h-auto bg-slate-900 text-slate-100 p-4">
<div className="text-xl font-bold mb-6">Roster Admin</div>
<nav className="space-y-1">
{items.map(([to,label]) => (
<NavLink key={to} to={to} className={({isActive})=>`block px-3 py-2 rounded ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`}>
{label}
</NavLink>
))}
</nav>
</aside>
)
}
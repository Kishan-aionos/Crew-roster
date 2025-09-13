import React from 'react'


export default function Header(){
return (
<header className="bg-white shadow p-4 flex items-center justify-between">
<div className="font-semibold">Roster Dashboard</div>
<div className="space-x-2">
<button className="px-3 py-1 bg-indigo-600 text-white rounded">New</button>
<button className="px-3 py-1 border rounded">Sync</button>
</div>
</header>
)
}
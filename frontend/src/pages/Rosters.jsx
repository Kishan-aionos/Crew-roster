import React, {useEffect, useState} from 'react'
import api from '../lib/api'


export default function Rosters(){
const [rosters, setRosters] = useState([])
useEffect(()=> api.get('/rosters').then(r=>setRosters(r.data)).catch(console.error), [])
return (
<div>
<h1 className="text-2xl font-semibold mb-4">All Rosters</h1>
<div className="space-y-2">
{rosters.map(r => (
<div key={r.id} className="card">
<div>{r.flight_no} — {r.full_name} ({r.role_on_flight})</div>
</div>
))}
</div>
</div>
)
}
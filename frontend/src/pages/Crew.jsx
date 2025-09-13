import React, {useEffect, useState} from 'react'
import api from '../lib/api'


export default function Crew(){
const [crew, setCrew] = useState([])
useEffect(()=>{ api.get('/crew').then(r=>setCrew(r.data)).catch(console.error) }, [])
return (
<div>
<h1 className="text-2xl font-semibold mb-4">Crew</h1>
<div className="grid grid-cols-3 gap-4">
{crew.map(c => (
<div key={c.id} className="card">
<div className="font-medium">{c.full_name}</div>
<div className="text-sm text-slate-500">{c.role} — {c.base_airport}</div>
</div>
))}
</div>
</div>
)
}
import React, {useEffect, useState} from 'react'
import { listApprovals, approve } from '../lib/api'


export default function Approvals(){
const [items, setItems] = useState([])
useEffect(()=> listApprovals().then(setItems).catch(console.error), [])


async function decide(id, status){
await approve(id, status)
setItems(prev => prev.filter(i => i.id !== id))
}


return (
<div>
<h1 className="text-2xl font-semibold mb-4">Approvals</h1>
<div className="space-y-2">
{items.map(it => (
<div key={it.id} className="card flex justify-between items-center">
<div>
<div className="font-medium">{it.actor} — {it.action}</div>
<div className="text-sm text-slate-500">{it.details}</div>
</div>
<div className="space-x-2">
<button onClick={()=>decide(it.id,'approved')} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
<button onClick={()=>decide(it.id,'denied')} className="px-3 py-1 bg-red-600 text-white rounded">Deny</button>
</div>
</div>
))}
</div>
</div>
)
}
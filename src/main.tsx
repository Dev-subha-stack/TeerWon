import React,{useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import{createClient}from'@supabase/supabase-js';
import'./style.css';

const supabase=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

function App(){
 const[s,setS]=useState<any>(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[username,setUsername]=useState('');
 const[groups,setGroups]=useState<any[]>([]),[active,setActive]=useState<any>(null),[tab,setTab]=useState('chat');
 const[messages,setMessages]=useState<any[]>([]),[tasks,setTasks]=useState<any[]>([]),[requests,setRequests]=useState<any[]>([]);
 const[title,setTitle]=useState(''),[details,setDetails]=useState(''),[contactName,setContactName]=useState(''),[contactInfo,setContactInfo]=useState(''),[amount,setAmount]=useState('');

 useEffect(()=>{supabase.auth.getSession().then(x=>setS(x.data.session));const{sub}=supabase.auth.onAuthStateChange((_,x)=>setS(x)).data;return()=>sub.unsubscribe()},[]);
 useEffect(()=>{if(s)loadGroups()},[s]);

 async function auth(signup:boolean){const r=signup?await supabase.auth.signUp({email,password,options:{data:{username}}}):await supabase.auth.signInWithPassword({email,password});if(r.error)alert(r.error.message);else if(signup)alert('Account created. Check email confirmation if enabled.')}
 async function loadGroups(){const{data,error}=await supabase.from('groups').select('*').order('created_at',{ascending:false});if(error)alert(error.message);setGroups(data||[])}
 async function createGroup(){const name=prompt('Group name');if(!name)return;const description=prompt('Description')||'';const{error}=await supabase.from('groups').insert({name,description,created_by:s.user.id});if(error)alert(error.message);loadGroups()}
 async function open(g:any){
  setActive(g);
  const[m,t,r]=await Promise.all([
   supabase.from('messages').select('*,profiles(username)').eq('group_id',g.id).order('created_at'),
   supabase.from('tasks').select('*').eq('group_id',g.id).order('created_at',{ascending:false}),
   supabase.from('user_requests').select('*').eq('group_id',g.id).order('created_at',{ascending:false})
  ]);
  setMessages(m.data||[]);setTasks(t.data||[]);setRequests(r.data||[]);
 }
 async function join(g:any){const r=await supabase.from('group_members').insert({group_id:g.id,user_id:s.user.id});if(r.error&&!r.error.message.includes('duplicate'))alert(r.error.message);open(g)}
 async function send(){if(!active)return;const content=prompt('Message');if(content){const r=await supabase.from('messages').insert({group_id:active.id,user_id:s.user.id,content});if(r.error)alert(r.error.message);else open(active)}}
 async function task(){if(!active)return;const title=prompt('Task title');if(!title)return;const description=prompt('Task details')||'';const r=await supabase.from('tasks').insert({group_id:active.id,title,description,created_by:s.user.id});if(r.error)alert('Only group admins can create tasks');else open(active)}
 async function submitRequest(e:React.FormEvent){
  e.preventDefault();if(!active||!title.trim())return;
  const payload:any={group_id:active.id,user_id:s.user.id,title:title.trim(),details,contact_name:contactName||null,contact_info:contactInfo||null};
  if(amount.trim())payload.amount=Number(amount);
  const r=await supabase.from('user_requests').insert(payload);
  if(r.error)alert(r.error.message);else{setTitle('');setDetails('');setContactName('');setContactInfo('');setAmount('');alert('Request sent to the group admins.');open(active)}
 }
 async function reviewRequest(id:string,status:string){const admin_note=prompt('Admin note (optional)')||null;const r=await supabase.from('user_requests').update({status,admin_note,reviewed_by:s.user.id,reviewed_at:new Date().toISOString()}).eq('id',id);if(r.error)alert(r.error.message);else open(active)}

 if(!s)return <main className="auth"><h1>TeerWon</h1><p>Groups · Tasks · Chat</p><input placeholder="Username for signup" value={username} onChange={e=>setUsername(e.target.value)}/><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><button onClick={()=>auth(false)}>Login</button><button onClick={()=>auth(true)}>Create account</button></main>;

 if(!active)return <main><header>TeerWon <button onClick={()=>supabase.auth.signOut()}>Logout</button></header><section><button onClick={createGroup}>＋ Create group</button>{groups.map(g=><article key={g.id} onClick={()=>open(g)}><h3>{g.name}</h3><p>{g.description}</p><button onClick={e=>{e.stopPropagation();join(g)}}>Join / Open</button></article>)}</section></main>;

 return <main>
  <header><button onClick={()=>setActive(null)}>←</button><b>{active.name}</b></header>
  <nav><button onClick={()=>setTab('chat')}>Chat</button><button onClick={()=>setTab('tasks')}>Tasks</button><button onClick={()=>setTab('requests')}>Requests</button></nav>
  {tab==='chat'&&<section>{messages.map(m=><div className="message" key={m.id}><b>{m.profiles?.username||'User'}</b><br/>{m.content}</div>)}<button className="fab" onClick={send}>＋</button></section>}
  {tab==='tasks'&&<section><button onClick={task}>＋ Create task</button>{tasks.map(t=><article key={t.id}><h3>{t.title}</h3><p>{t.description}</p></article>)}</section>}
  {tab==='requests'&&<section>
   <h2>Send a request to admins</h2>
   <p className="privacy">Only share contact information you are comfortable giving to this group's admins.</p>
   <form onSubmit={submitRequest}>
    <input required placeholder="Request title" value={title} onChange={e=>setTitle(e.target.value)}/>
    <textarea placeholder="Explain your request or task" value={details} onChange={e=>setDetails(e.target.value)}/>
    <input placeholder="Your name (optional)" value={contactName} onChange={e=>setContactName(e.target.value)}/>
    <input placeholder="Contact info, e.g. email (optional)" value={contactInfo} onChange={e=>setContactInfo(e.target.value)}/>
    <input type="number" min="0" step="0.01" placeholder="Optional amount for a legitimate non-gambling request" value={amount} onChange={e=>setAmount(e.target.value)}/>
    <button type="submit">Send to admins</button>
   </form>
   <h2>Requests</h2>
   {requests.map(r=><article key={r.id}><h3>{r.title}</h3><p>{r.details}</p><small>Status: <b>{r.status}</b></small>{r.contact_name&&<p>Name: {r.contact_name}</p>}{r.contact_info&&<p>Contact: {r.contact_info}</p>}{r.amount!=null&&<p>Amount: {r.amount}</p>}{r.admin_note&&<p>Admin: {r.admin_note}</p>}
    {r.status==='open'&&<div><button onClick={()=>reviewRequest(r.id,'approved')}>Approve</button><button className="danger" onClick={()=>reviewRequest(r.id,'rejected')}>Reject</button></div>}
   </article>)}
  </section>}
 </main>
}
createRoot(document.getElementById('root')!).render(<App/>);
'use client';
import { useState } from 'react';
import { importBrokerCsv, type ImportResult } from '@/lib/broker-import';
import type { Holdings } from '@/lib/holdings';
const money = (n: number) => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(n);

export function BrokerImport({onImport, onPending, onSave}: {onImport:(h:Holdings)=>void; onPending:(pending:boolean)=>void; onSave:()=>boolean}) {
  const [source,setSource]=useState(''), [filename,setFilename]=useState('');
  const [result,setResult]=useState<ImportResult|null>(null), [account,setAccount]=useState('');
  const [error,setError]=useState('');
  const ready=!!result && (result.accounts.length<=1 || account!=='');
  const amzn=ready?result.holdings.positions.find(p=>p.symbol==='AMZN'):undefined;
  function choose(id:string) {
    setAccount(id); setError('');
    if(!id){onPending(true);return;}
    try {const next=importBrokerCsv(source,undefined,id);setResult(next);onImport(next.holdings);onPending(false);}
    catch(e){setError(e instanceof Error?e.message:'Unable to read account.');onPending(true);}
  }
  return <section className="panel" aria-label="Broker import review">
    <h2>Import and review your positions</h2>
    <p>Choose a positions CSV, then review one account before saving. Your file is read only in this browser.</p>
    <label>Import broker positions (CSV)<input type="file" accept=".csv,text/csv" onChange={async e=>{
      const file=e.target.files?.[0];if(!file)return;
      setError('');setResult(null);setAccount('');setFilename(file.name);onPending(true);
      try {
        if(file.size>2000000)throw new Error('Use a file under 2 MB.');
        const text=await file.text(), discovered=importBrokerCsv(text);
        const parsed=discovered.accounts.length===1?importBrokerCsv(text,undefined,discovered.accounts[0].id):discovered;
        setSource(text);setFilename(file.name);setResult(parsed);
        if(parsed.accounts.length<=1){onImport(parsed.holdings);onPending(false);}
      }catch(err){setError(`${file.name}: ${err instanceof Error?err.message:'Could not import this CSV.'}`);}
      e.target.value='';
    }}/></label>
    {error&&<p role="alert">{error} Your saved snapshot has not been replaced.</p>}
    {(error||result)&&<button onClick={()=>{setResult(null);setError('');setSource('');setAccount('');onPending(false);}}>Close import review</button>}
    {result&&<>
      <p role="status">Read {filename}. {result.accounts.length>1?(account===''?`${result.accounts.length} accounts found. Choose one below; your saved snapshot is unchanged.`:`Account selected. Review the figures before saving.`):'Review the imported figures below, then save.'}</p>
      {result.exportedAt&&<p>File downloaded: <strong>{result.exportedAt}</strong>. This is not necessarily the price date.</p>}
      {result.accounts.length>1&&<label>Account to import<select value={account} onChange={e=>choose(e.target.value)}><option value="">Choose an account</option>{result.accounts.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>}
      {ready&&<>
        <h3>Import summary — {result.holdings.scope}</h3>
        <div className="table-wrap"><table><tbody>
          <tr><th>Account total from rows</th><td>{money(result.holdings.totalValue)}</td></tr>
          <tr><th>Cash / money market balance</th><td>{money(result.holdings.cashAvailable)}</td></tr>
          <tr><th>Snapshot date to confirm below</th><td>{result.holdings.asOf}</td></tr>
          <tr><th>Imported stock / fund symbols</th><td>{result.holdings.positions.length}</td></tr>
          <tr><th>Other reported holdings value</th><td>{money(result.unmodeledValue)} — included in total, excluded from stock analysis</td></tr>
          <tr><th>AMZN shares</th><td>{amzn?amzn.shares.toLocaleString('en-US',{maximumFractionDigits:6}):'No AMZN in this account'}</td></tr>
          {amzn&&<><tr><th>AMZN market value</th><td>{money(amzn.shares*amzn.price)}</td></tr><tr><th>Total AMZN cost basis</th><td>{amzn.averageCost==null?'Missing — enter it before comparing sale taxes':money(amzn.averageCost*amzn.shares)}</td></tr></>}
        </tbody></table></div>
        <p>Cash here is the reported balance, not verified withdrawable cash or buying power. Account selection keeps taxable and retirement positions separate. Confirm the account type before modeling sale taxes.</p>
        <h3>Items to review</h3>
        <ul>{result.warnings.map((w,i)=><li key={`w${i}`}>{w}</li>)}{result.skipped.map((w,i)=><li key={`s${i}`}>{w}</li>)}{result.guessedFunds.length>0&&<li>Check fund classifications: {result.guessedFunds.join(', ')}.</li>}{!result.skipped.length&&<li>No position rows skipped.</li>}</ul>
        <p>Review or edit the snapshot fields below. Saving replaces the previous snapshot in this browser. On the AMZN page, choose “Use my private AMZN holding” to load it.</p>
        {amzn&&<button onClick={()=>{if(onSave())window.location.assign('/amzn');}}>Save and open AMZN comparison</button>}
      </>}
    </>}
  </section>;
}

import { Window } from 'happy-dom';
import { coreFixture, statusFixture, economyFixture } from './fixtures';
import assert from 'node:assert/strict';
const win = new Window({ url: 'http://localhost/preview/' });
for (const key of ['window','document','navigator','HTMLElement','HTMLInputElement','HTMLSelectElement','HTMLDialogElement','Element','Node','DocumentFragment','Event','MouseEvent','KeyboardEvent','CustomEvent','MutationObserver','localStorage','sessionStorage','location','getComputedStyle']) {
  const v=key==='window'?win:(win as any)[key];
  Object.defineProperty(globalThis,key,{value:typeof v==='function'&&key==='getComputedStyle'?v.bind(win):v,configurable:true,writable:true});
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
win.HTMLDialogElement.prototype.showModal = function(){this.setAttribute('open','');};
win.HTMLDialogElement.prototype.close = function(){this.removeAttribute('open');};
const React = await import('react');
(globalThis as any).React=React;
const { createRoot } = await import('react-dom/client');
const { getByRole, getByLabelText, getByTestId, findByText, waitFor, fireEvent } = await import('@testing-library/dom');
const { default: userEventModule } = await import('@testing-library/user-event');
const user = userEventModule.setup({document:win.document as any});
const { encodeFunctionResult, encodeEventTopics, encodeAbiParameters, parseAbiParameters, toFunctionSelector } = await import('viem');
const { miningAbi, coreAbi, stakingAbi } = await import('../src/lib/abi');
const { CONTRACTS, WAD } = await import('../src/lib/constants');
const { WagmiProvider } = await import('wagmi');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
let apiFails=false, rejectSignature=false;const transactions:any[]=[];
const account='0x1111111111111111111111111111111111111111'; // test-only EIP-1193 identity; no signer/key
const txHash='0x'+'12'.repeat(32); const blockHash='0x'+'34'.repeat(32);
const fixtures:any={core:coreFixture(),status:statusFixture(),'economy/state':economyFixture()};
fixtures.status.generatedAt=new Date().toISOString();fixtures['economy/state'].chain.safeBlockTimestamp=new Date().toISOString();
fixtures.core.chain.safeThroughBlock=fixtures['economy/state'].chain.safeThroughBlock;
const block=BigInt(fixtures.core.chain.safeThroughBlock); const height=BigInt(fixtures.core.core.blockHeight);const round=BigInt(fixtures.core.core.settledThroughRound);
const receipt={transactionHash:txHash,transactionIndex:'0x0',blockHash,blockNumber:'0x'+(block-2n).toString(16),from:account,to:CONTRACTS.mining,cumulativeGasUsed:'0x10000',gasUsed:'0x10000',contractAddress:null,status:'0x1',effectiveGasPrice:'0x1',type:'0x2',logsBloom:'0x'+'00'.repeat(256),logs:[{address:CONTRACTS.mining,topics:encodeEventTopics({abi:miningAbi,eventName:'Checkpointed',args:{throughRound:round}}),data:encodeAbiParameters(parseAbiParameters('uint64,uint256'),[height,123n*WAD]),blockNumber:'0x'+(block-2n).toString(16),transactionHash:txHash,transactionIndex:'0x0',blockHash,logIndex:'0x0',removed:false}]};
const requests:string[]=[];
function rpc(method:string,params:any[]) {
 requests.push(method);
 if(method==='eth_chainId')return '0xaa36a7';
 if(method==='eth_blockNumber')return '0x'+block.toString(16);
 if(method==='eth_getTransactionReceipt')return receipt;
 if(method==='eth_getCode')return '0x6080';
 if(method==='eth_call'){
  const t=params[0],data=t.data;
  const abi=t.to.toLowerCase()===CONTRACTS.mining.toLowerCase()?miningAbi:t.to.toLowerCase()===CONTRACTS.core.toLowerCase()?coreAbi:stakingAbi;
  const func=abi.find((f:any)=>f.type==='function'&&toFunctionSelector(f)===data.slice(0,10)) as any;
  if(!func)throw new Error('Unexpected contract call '+data);
  let result:any;
  if(func.name==='checkpoint')return '0x';
  if(func.name==='checkpointStatus')result=[false,round,true];
  if(func.name==='core')result=CONTRACTS.core;
  if(func.name==='state'&&abi===miningAbi)result={minted:123n*WAD,processedThroughRound:round-1n,startRound:17n,startHeight:0n,fundedBlocks:height,guardian:CONTRACTS.core,bootstrapped:true,startCaptured:true,paused:false,active:true};
  if(func.name==='state'&&abi===coreAbi)result={settledThroughRound:round,cumulativeWork:18553n,cumulativeBlockUnits:height*1000000000n,blockHeight:height,blockProgress:0n,workPerThousandBlocks:8238,authorizationNonce:1n,paused:false};
  if(func.name==='recentExits')result=5_000_000n*WAD;
  if(func.name==='totalStaked')result=95_000_000n*WAD;
  if(func.name==='totalFresh')result=[0n,0n];
  if(func.name==='issued')result=123n*WAD;
  return encodeFunctionResult({abi,functionName:func.name,result} as any);
 }
 throw new Error('Unexpected RPC '+method);
}
globalThis.fetch=async (input:any,init:any)=>{
 const url=String(input?.url??input);
 if(url.startsWith('https://api.squeekchain.com/v1/'))return new Response(JSON.stringify(apiFails?{schemaVersion:1,status:'unavailable'}:fixtures[url.split('/v1/')[1]]),{status:200,headers:{'Content-Type':'application/json'}});
 if(url.includes('publicnode.com')||url.includes('drpc.org')){const payload=JSON.parse(init?.body??await input.text());const handle=(r:any)=>({jsonrpc:'2.0',id:r.id,result:rpc(r.method,r.params)});return new Response(JSON.stringify(Array.isArray(payload)?payload.map(handle):handle(payload)),{headers:{'Content-Type':'application/json'}});}
 throw new Error('Unexpected external request '+url);
};
(win as any).fetch=globalThis.fetch;
const listeners=new Map<string,Set<Function>>();let connected=false;let chain='0xaa36a7';
const emit=(name:string,p:any)=>listeners.get(name)?.forEach(fn=>fn(p));
const provider={isMetaMask:false,request:async({method,params=[]}:any)=>{
 requests.push('wallet:'+method);
 if(method==='eth_accounts')return connected?[account]:[];
 if(method==='eth_requestAccounts'){connected=true;return [account];}
 if(method==='eth_chainId')return chain;
 if(method==='wallet_switchEthereumChain'){chain=params[0].chainId;emit('chainChanged',chain);return null;}
 if(method==='wallet_getCapabilities')return {};
 if(method==='eth_sendTransaction'){if(rejectSignature)throw Object.assign(new Error('User rejected request'),{code:4001});transactions.push(params[0]);return txHash;}
 return rpc(method,params);
},on:(name:string,fn:Function)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name)!.add(fn);},removeListener:(name:string,fn:Function)=>listeners.get(name)?.delete(fn)};
(win as any).ethereum=provider;
const announce=()=>win.dispatchEvent(new win.CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'21111111-1111-4111-a111-111111111111',name:'Keeper test wallet',icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',rdns:'test.squeekkeeper'},provider}}));
win.addEventListener('eip6963:requestProvider',announce);
const { config }=await import('../src/lib/wallet-config');
const { default:App }=await import('../src/App');
const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
const el=win.document.createElement('div');win.document.body.append(el);const root=createRoot(el as any);let passed=0;
const check=(name:string)=>{passed++;console.log('PASS',name);};
const click=async(el:any)=>{await React.act(async()=>{await user.click(el);});};
const change=async(el:any,value:string)=>{await React.act(async()=>{fireEvent.change(el,{target:{value}});});};
try{
 await React.act(async()=>{root.render(React.createElement(WagmiProvider,{config,reconnectOnMount:false},React.createElement(QueryClientProvider,{client},React.createElement(App))));});
 await waitFor(()=>assert.equal(getByTestId(el,'height').textContent,height.toLocaleString('en-US')));
 check('public API renders settled height in paper mode');
 assert.equal(getByTestId(el,'total-power').textContent,'5,000');assert.equal(transactions.length,0);check('default calculator works with no wallet and no transaction');
 await change(getByLabelText(el,'Squeek level'),'3');assert.equal(getByTestId(el,'sqk-power').textContent,'10,680');assert.equal(getByTestId(el,'cooldown').textContent,'14,000 blocks');check('level change recomputes power and survivor cooldown');
 await change(getByLabelText(el,'Staked SQK'),'-1');assert.equal(getByLabelText(el,'Staked SQK').getAttribute('aria-invalid'),'true');assert.equal(getByTestId(el,'total-power').textContent,'Check inputs');check('invalid amount never becomes zero');
 await change(getByLabelText(el,'Staked SQK'),'40000');await change(getByLabelText(el,'Squeeks at this level'),'1');assert.ok(el.textContent!.includes('Set at least two Squeeks'));check('a merge requires two same-level Squeeks');
 await change(getByLabelText(el,'Squeek level'),'10');assert.ok(el.textContent!.includes('Maximum level'));check('level 10 blocks further merging');
 await click(getByRole(el,'button',{name:'Reset'}));assert.equal(getByTestId(el,'total-power').textContent,'5,000');check('reset restores the explicit example position');
 await change(getByRole(el,'combobox',{name:'Exit fee input source'}),'custom');await click(getByRole(el,'button',{name:'Bank run example'}));assert.equal(getByTestId(el,'fee-now').textContent,'60.00%');assert.equal(getByTestId(el,'fee-after').textContent,'2.00%');check('bank-run scenario and waiting comparison');
 await click(getByRole(el,'button',{name:'Quiet example'}));assert.equal(getByTestId(el,'fee-now').textContent,'2.00%');check('quiet scenario');
 apiFails=true;await click(getByRole(el,'button',{name:'Refresh'}));await waitFor(()=>assert.equal(getByTestId(el,'height').textContent,'unknown'));assert.equal(getByTestId(el,'total-power').textContent,'5,000');check('API outage clears live values but keeps paper mode working');
 apiFails=false;await click(getByRole(el,'button',{name:'Refresh'}));await waitFor(()=>assert.equal(getByTestId(el,'height').textContent,height.toLocaleString('en-US')));check('refresh recovers public data');
 await click(getByRole(el,'button',{name:'Checkpoint',exact:true}));assert.ok(getByRole(win.document.body as any,'dialog',{name:'Connect a wallet'}));assert.ok(getByRole(win.document.body as any,'button',{name:'Keeper test wallet'}));assert.equal(transactions.length,0);check('checkpoint opens named EIP-6963 picker before any signing');
 await click(getByRole(win.document.body as any,'button',{name:'Close dialog'}));assert.equal(win.document.querySelector('dialog'),null);check('connect sheet closes');
 await click(getByRole(el,'button',{name:'Connect',exact:true}));await click(getByRole(win.document.body as any,'button',{name:'Keeper test wallet'}));await waitFor(()=>assert.ok(el.textContent!.includes('0x1111…1111')));check('named provider connects without relay');
 await React.act(async()=>{chain='0x1';emit('chainChanged',chain);});await waitFor(()=>assert.ok((getByRole(el,'button',{name:'Checkpoint',exact:true}) as any).disabled));check('wrong chain disables checkpoint');
 await click(getByRole(el,'button',{name:'Switch to Sepolia',exact:true}));await waitFor(()=>assert.equal((getByRole(el,'button',{name:'Checkpoint',exact:true}) as any).disabled,false));check('switch request restores Sepolia');
 await click(getByRole(el,'button',{name:'Checkpoint',exact:true}));assert.equal(transactions.length,0);assert.ok(win.document.querySelector('dialog')?.textContent?.includes(CONTRACTS.mining));check('review shows exact function, chain and contract without submitting');
 await click(getByRole(win.document.body as any,'button',{name:'Send checkpoint'}));await waitFor(()=>assert.ok(el.textContent!.includes('Issued 123 SQK')),{timeout:10000});assert.equal(transactions.length,1);assert.equal(transactions[0].to.toLowerCase(),CONTRACTS.mining.toLowerCase());assert.equal(transactions[0].data,toFunctionSelector('checkpoint()'));assert.equal(transactions[0].from.toLowerCase(),account);assert.ok(el.textContent!.includes(txHash));check('mock wallet sends only checkpoint and renders hash plus confirmed event result');
 rejectSignature=true;await click(getByRole(el,'button',{name:'Checkpoint',exact:true}));await click(getByRole(win.document.body as any,'button',{name:'Send checkpoint'}));await waitFor(()=>assert.ok(el.textContent!.includes('Request cancelled in your wallet')));assert.equal(transactions.length,1);check('rejected signature is recoverable and does not report success');
 assert.ok(!requests.some(r=>/signTypedData|personal_sign|wallet_sendCalls/.test(r)));check('no approval, token transfer or message signing is requested');
 console.log(`${passed} DOM interaction checks passed. Layout, native modal focus and browser rendering are not covered by Happy DOM.`);
}finally{await React.act(async()=>root.unmount());client.clear();void win.happyDOM.close();}

process.exit(0);

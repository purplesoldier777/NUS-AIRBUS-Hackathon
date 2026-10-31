/* Independent deterministic domain evaluators. No LLM or private reasoning is used. */
(function(root){
'use strict';
const hard=typeof module!=='undefined'?require('./hard-rules.js'):root.HardRules;
const ROLES=['atc','pilot','ground'];
function permutations(xs){return xs.length===0?[[]]:xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(rest=>[x,...rest]));}
function id(plan){let hash=2166136261;for(const c of JSON.stringify(plan)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return 'p-'+(hash>>>0).toString(16).padStart(8,'0');}
const MAX_CANDIDATES=192;
function combinations(items,n){if(!n)return [[]];return items.flatMap(x=>combinations(items,n-1).map(rest=>[x,...rest]));}
function orderVariants(s){const fs=s.flights,slack=f=>hard.fuelState(s,f,{action:f.operation,landing:f.eta,diversion_start:f.eta}).margin_minutes;
const bases=[...[
 [...fs].sort((a,b)=>a.eta-b.eta||a.callsign.localeCompare(b.callsign)),
 [...fs].sort((a,b)=>(a.eta+slack(a))-(b.eta+slack(b))||a.callsign.localeCompare(b.callsign)),
 [...fs].sort((a,b)=>b.connections-a.connections||a.eta-b.eta),
 [...fs].sort((a,b)=>a.connection_departure-b.connection_departure||a.eta-b.eta),
 [...fs], [...fs].reverse()
]];
const orders=new Map();const add=o=>orders.set(o.map(f=>f.id).join('|'),o);bases.forEach(add);
for(let i=0;i<fs.length-1;i++)for(const base of bases){const o=[...base];[o[i],o[i+1]]=[o[i+1],o[i]];add(o);}return [...orders.values()];}
function buildPlan(s,order,assignment,aware){const events=[],names=Object.keys(s.ground.stands);
for(let i=0;i<order.length;i++){const f=order[i];if(f.operation==='divert'){const start=f.eta,trip=hard.alternateTrip(s,f),landing=start+Math.ceil(trip+f.alternate_approach_minutes);events.push({flight:f.id,action:'divert',alternate:f.alternate.id,diversion_start:start,landing,on_stand:landing,crew_end:landing,departure_time:null,takeoff_time:null,stand:'DIVERT',runway:null,taxiway:null,taxi_route:[],wake:f.wake});continue;}
let earliest=Math.max(f.eta,s.atc.runway_reopens);for(const prev of events.filter(e=>e.action==='arrive')){const lead=s.flights.find(f=>f.id===prev.flight);earliest=Math.max(earliest,prev.landing+Math.ceil(hard.spacingNm(s,{...lead,runway:prev.runway},f)*60/f.approach_speed_kts));}
const eventFor=(standId)=>{const stand=s.ground.stands[standId],at=t=>{const on=t+s.atc.taxi_minutes,crewEnd=on+f.turnaround,departure=Math.max(f.next_departure,crewEnd);return {flight:f.id,action:'arrive',runway:f.runway,landing:t,stand:standId,taxiway:stand.route[0],taxi_route:[...stand.route],on_stand:on,crew_end:crewEnd,departure_time:departure,takeoff_time:departure+s.atc.taxi_out_minutes,wake:f.wake};};let landing=earliest;
if(aware){for(;landing<=s.rules.search_horizon_minutes;landing++){const e=at(landing),arrivals=events.filter(x=>x.action==='arrive');if(s.rules.operational_profile==='challenge-workbook-v1'){if(standId!==f.original_stand&&landing-s.atc.decision_time<s.rules.gate_notice_minutes)continue;if(!hard.movementCheck(s,{events:[...events,e]}).pass)continue;const departures=[...arrivals.map(o=>({time:o.takeoff_time,runway:o.runway,wake:o.wake})),...s.atc.departures];if(departures.some(d=>hard.sameWakeStream(s,d.runway,e.runway)&&Math.abs(e.takeoff_time-d.time)*60<(s.rules.departure_wake_seconds[d.wake+'_'+e.wake]||s.rules.departure_default_seconds)))continue;}if(hard.runwayClosed(s,f.runway,landing)||hard.weatherClosed(s,f.runway,landing)||hard.runwayClosed(s,f.runway,e.takeoff_time)||e.on_stand<Math.max(stand.available,s.ground.equipment_ready))continue;if(arrivals.some(o=>o.stand===standId&&e.on_stand<o.departure_time+s.rules.gate_buffer_minutes&&o.on_stand<e.departure_time+s.rules.gate_buffer_minutes))continue;const overlap=arrivals.filter(o=>o.on_stand<e.crew_end&&o.crew_end>e.on_stand),points=[e.on_stand,...overlap.map(o=>Math.max(e.on_stand,o.on_stand))];if(points.some(t=>overlap.filter(o=>o.on_stand<=t&&t<o.crew_end).length>=s.ground.crew_capacity))continue;break;}if(landing>s.rules.search_horizon_minutes)landing=earliest;}
return at(landing);};
let e;if(assignment==='greedy'){e=names.map(eventFor).sort((a,b)=>{const blocked=x=>s.ground.stands[x.stand].route.some(k=>s.atc.blocked_taxiways.includes(k))?1:0;return blocked(a)-blocked(b)||a.landing-b.landing||a.departure_time-b.departure_time||a.stand.localeCompare(b.stand);})[0];}else e=eventFor(assignment[i]);events.push(e);
}
const p={state_version:s.state_version,events};p.id=id(p);return p;}
function generate(s){if(hard.issues(s).length)return [];const plans=new Map(),names=Object.keys(s.ground.stands),n=s.flights.length;let count=2*names.length**n;for(let i=2;i<=n;i++)count*=i;
const add=(order,assignment,aware)=>{const p=buildPlan(s,order,assignment,aware);plans.set(p.id,p);};
if(count<=MAX_CANDIDATES){for(const order of permutations(s.flights))for(const assignment of combinations(names,n))for(const aware of [false,true])add(order,assignment,aware);}
else{const orders=orderVariants(s),assignments=['greedy',...names.map(name=>Array(n).fill(name)),...names.slice(0,4).map((_,offset)=>Array.from({length:n},(_,i)=>names[(i+offset)%names.length]))];
// Cover every priority ordering before spending remaining budget on route alternatives.
for(const assignment of assignments){for(const order of orders){for(const aware of [false,true]){if(plans.size>=MAX_CANDIDATES)return [...plans.values()];add(order,assignment,aware);}}}}
return [...plans.values()];}
function check(code,label,pass,evidence){return {code,label,pass,evidence};}
class AtcAgent{
 constructor(s){this.s=s;this.role='atc';}
 evaluate(p){return hard.evaluate('atc',this.s,p);}
 cost(p){const m=metrics(this.s,p);return m.last_landing+m.total_holding;}
}
class PilotAgent{
 constructor(s){this.s=s;this.role='pilot';}
 evaluate(p){return hard.evaluate('pilot',this.s,p);}
 cost(p){const m=metrics(this.s,p);return m.flights.reduce((v,x)=>v+x.holding*this.s.flights.find(f=>f.id===x.flight).burn_per_min,0)+m.missed_connections*100+m.turbulence_exposure*20;}
}
class GroundAgent{
 constructor(s){this.s=s;this.role='ground';}
 evaluate(p){return hard.evaluate('ground',this.s,p);}
 cost(p){const m=metrics(this.s,p);return m.overtime*(this.s.rules.ground_overtime_multiplier||1)*10+m.remote_stands*10+m.turnaround_delay;}
}
function compare(a,b){for(let i=0;i<a.length;i++){if(a[i]<b[i])return -1;if(a[i]>b[i])return 1;}return 0;}
// Demonstration policy, not a certified ATC prioritisation rule. Hard checks always veto.
function metrics(s,p){const fs=Object.fromEntries(s.flights.map(f=>[f.id,f]));
const perFlight=p.events.map(e=>{const f=fs[e.flight],fuel=hard.fuelState(s,f,e),deadline=f.connection_departure-s.rules.minimum_connection_minutes;return {flight:f.id,callsign:f.callsign,action:e.action,alternate:e.alternate||null,landing:e.landing,on_stand:e.on_stand,connection_deadline:deadline,stand:e.stand,holding:fuel.holding,projected_fuel:fuel.projected,protected_fuel:fuel.protected_fuel,margin_minutes:fuel.margin_minutes,latest_safe_landing:f.eta+(f.fuel-fuel.protected_fuel)/f.burn_per_min+(e.action==='divert'?Math.ceil(fuel.trip_minutes+f.alternate_approach_minutes):0),connections_missed:e.action==='divert'||e.on_stand>deadline?f.connections:0};});
return {turbulence_exposure:p.events.reduce((n,e)=>n+Math.max(0,e.landing-fs[e.flight].eta)*(fs[e.flight].holding_turbulence??1),0),turnaround_delay:p.events.filter(e=>e.action==='arrive').reduce((n,e)=>n+Math.max(0,e.departure_time-fs[e.flight].next_departure),0),minimum_margin:Math.min(...perFlight.map(f=>f.margin_minutes)),missed_connections:perFlight.reduce((v,f)=>v+f.connections_missed,0),total_holding:perFlight.reduce((v,f)=>v+f.holding,0),last_landing:Math.max(...p.events.map(e=>e.landing)),overtime:p.events.filter(e=>e.action==='arrive').reduce((v,e)=>v+Math.max(0,e.crew_end-s.ground.crew_shift_end),0),holding_fuel_burn:perFlight.reduce((n,x)=>n+x.holding*fs[x.flight].burn_per_min,0),remote_stands:p.events.filter(e=>s.ground.stands[e.stand]?.kind==='remote'||e.stand==='R1'&&!s.ground.stands[e.stand]?.kind).length,flights:perFlight};}
function stableKey(s,p){const fs=Object.fromEntries(s.flights.map(f=>[f.id,f]));return JSON.stringify([...p.events].sort((a,b)=>a.landing-b.landing||fs[a.flight].callsign.localeCompare(fs[b.flight].callsign)).map(e=>[e.landing,fs[e.flight].callsign,e.stand]));}
function policyRank(s,p){const m=metrics(s,p);return [-m.minimum_margin,m.missed_connections,m.turbulence_exposure,m.total_holding,m.last_landing,m.overtime,m.remote_stands,stableKey(s,p)];}
function policySummary(s,plan,options,valid){const ranked=options.filter(valid).sort((a,b)=>compare(policyRank(s,a),policyRank(s,b)));
 return {search_mode:(2*Object.keys(s.ground.stands).length**s.flights.length*s.flights.reduce((v,_,i)=>v*(i+1),1))<=MAX_CANDIDATES?'exhaustive':'bounded',candidate_limit:MAX_CANDIDATES,name:'Feasibility → fuel margin → connections → delay → ground cost',scope:'Illustrative, explicit simulation policy; not certified operational priority.',feasible_candidates:ranked.length,candidates_considered:options.length,metrics:plan?metrics(s,plan):null,alternatives:ranked.slice(0,3).map(p=>({id:p.id,...metrics(s,p)}))};
}
function runCore(s,{failAgent=null,rounds=3}={}){rounds=Math.max(1,Math.min(3,Math.floor(rounds)||3));
 const missing=hard.issues(s);if(missing.length)return {status:'NOT_EVALUATED',mode:'interactive-rules',plan:null,log:[{type:'DATA_REQUIRED',sender:'validator',reason:'Required hard-rule inputs missing or invalid: '+missing.join(', '),missing}],checks:{},missing};
 const agents=[new AtcAgent(s),new PilotAgent(s),new GroundAgent(s)],options=generate(s),log=[],seen=new Set();
// Run-local memoisation: candidates are immutable within this invocation.
for(const agent of agents){const evaluate=agent.evaluate.bind(agent),cost=agent.cost.bind(agent),cache=new Map(),costs=new Map();agent.evaluate=p=>{if(!cache.has(p.id))cache.set(p.id,evaluate(p));return cache.get(p.id);};agent.cost=p=>{if(!costs.has(p.id))costs.set(p.id,cost(p));return costs.get(p.id);};}
 const valid=p=>p.state_version===s.state_version&&p.events.length===s.flights.length&&new Set(p.events.map(e=>e.flight)).size===s.flights.length&&p.events.every(e=>s.flights.some(f=>f.id===e.flight))&&agents.every(a=>a.evaluate(p).every(c=>c.pass));
 const bestPolicy=options.filter(valid).sort((a,b)=>compare(policyRank(s,a),policyRank(s,b)))[0];
 let proposal=[...options].sort((a,b)=>compare([agents[0].cost(a),stableKey(s,a)],[agents[0].cost(b),stableKey(s,b)]))[0],cause='ROUND_LIMIT';
 for(let round=1;round<=rounds;round++){
 seen.add(proposal.id);log.push({type:'PROPOSE',sender:'coordinator',receiver:'all',round,proposal,reason:round===1?'ATC initial capacity proposal only—not a jointly prioritised plan. Pilot and Ground must validate it.':'Revised using the published policy: all hard checks, then the weakest fuel margin, connections, delay and ground costs. Counterproposals cannot bypass that policy.'});
 let replies=[];
 for(const agent of agents){if(agent.role===failAgent){const failure={type:'ERROR',sender:agent.role,receiver:'all',error:'InjectedAgentOutage',turn:round,proposal_id:proposal.id,state_version:s.state_version};log.push(failure);replies.push(failure);cause='AGENT_FAILURE';continue;}
 const checks=agent.evaluate(proposal),failed=checks.filter(c=>!c.pass),preferred=options.filter(p=>agent.evaluate(p).every(c=>c.pass)).sort((a,b)=>compare([agent.cost(a),stableKey(s,a)],[agent.cost(b),stableKey(s,b)]))[0];
 const metric=metrics(s,proposal);const preference=agent.role==='atc'?`Last landing T+${Math.max(...proposal.events.map(e=>e.landing))}. Throughput is a preference; all hard constraints still apply.`:agent.role==='pilot'?`${metric.holding_fuel_burn.toFixed(1)} kg simulated holding burn; ${metric.missed_connections} connecting passengers miss their configured deadline. Turbulence exposure ${metric.turbulence_exposure} weighted holding-minutes (configured assumption). Connections and comfort cannot override reserves.`:`${metric.remote_stands} remote-stand assignment(s); ${proposal.events.reduce((v,e)=>v+Math.max(0,e.crew_end-s.ground.crew_shift_end),0)} simulated crew overtime minutes. Turnaround departure delay ${metric.turnaround_delay} min. Overtime cannot override capacity.`;
 const message={turn:round,sender:agent.role,receiver:'all',type:failed.length?'REJECT':'ACCEPT',proposal_id:proposal.id,state_version:s.state_version,constraint_failures:failed.map(c=>c.code),checks,preference_summary:preference,preference_fit:(()=>{const local=options.filter(p=>agent.evaluate(p).every(c=>c.pass)).map(p=>agent.cost(p));if(!local.length)return null;const lo=Math.min(...local),hi=Math.max(...local),current=agent.cost(proposal);return {score:hi===lo?(current<=lo?1:0):Math.max(0,Math.min(1,(hi-current)/(hi-lo))),cost:current,best:lo,worst:hi,definition:'Min–max normalised local cost across domain-feasible generated candidates. This is a preference display, never a safety threshold.'};})(),
 reason:failed.length?`${failed.length} check(s) failed: ${[...new Set(failed.map(c=>c.code.replaceAll('_',' ').toLowerCase()))].join(', ')}.`:`All ${checks.length} domain checks passed. Accept this compromise.`,
 counter_id:failed.length&&preferred?preferred.id:null,action:failed.length?(preferred?'Request revision. Offer a domain-feasible alternative for peer review.':'No domain-feasible alternative in this candidate set; request escalation.'):'Accept this plan version; acceptance does not extend to future revisions.'};
 message.request=failed.length?'Revise the schedule to satisfy the failed checks; safety limits stay fixed.':'Preserve this exact feasible plan version.';message.offer=failed.length&&preferred?{counter_id:preferred.id,conditions:['Every domain must check this candidate against the same state version.','All hard rules must pass before commitment.'],adjustments:preferred.events.map(e=>{const old=proposal.events.find(o=>o.flight===e.flight);return {flight:e.flight,arrival_delta_minutes:e.landing-old.landing,from_stand:old.stand,to_stand:e.stand};}).filter(e=>e.arrival_delta_minutes||e.from_stand!==e.to_stand)}:null;message.concession=!failed.length&&preferred&&agent.cost(proposal)>agent.cost(preferred)?'Accepting a less-preferred local outcome; every other domain must still validate this plan version.':'No additional local concession recorded.';
 log.push(message);replies.push(message);
 }
 if(replies.length!==3)break;
 if(replies.every(m=>m.type==='ACCEPT')&&valid(proposal)&&(!bestPolicy||compare(policyRank(s,proposal),policyRank(s,bestPolicy))===0))return {status:'CONSENSUS',mode:'interactive-rules',plan:proposal,log,validation:Object.fromEntries(agents.map(a=>[a.role,a.evaluate(proposal)])),policy:policySummary(s,proposal,options,valid),checks:Object.fromEntries(agents.map(a=>[a.role,[]]))};
 const counters=replies.map(m=>m.counter_id).filter(Boolean),remaining=options.filter(p=>!seen.has(p.id));
 if(!remaining.length){cause='CANDIDATES_EXHAUSTED';if(round<rounds)continue;break;}
 const rank=p=>{const failures=agents.reduce((v,a)=>v+a.evaluate(p).filter(c=>!c.pass).length,0);return [valid(p)?0:1,valid(p)?0:failures,...policyRank(s,p),counters.includes(p.id)?0:1];};
 proposal=remaining.sort((a,b)=>compare(rank(a),rank(b)))[0];
 }
 const feasible=options.filter(valid).sort((a,b)=>compare(policyRank(s,a),policyRank(s,b)));
 const fallback=feasible[0]||null;log.push({type:'FALLBACK',sender:'coordinator',receiver:'all',reason:cause,proposal_id:fallback?.id||null});
 const closest=options.map(p=>({p,failed:agents.flatMap(a=>a.evaluate(p).filter(c=>!c.pass).map(c=>({...c,domain:a.role})))})).sort((a,b)=>a.failed.length-b.failed.length||stableKey(s,a.p).localeCompare(stableKey(s,b.p)))[0];
 return {diagnostics:!fallback&&closest?{scope:'Closest generated candidate, not a committed plan',failures:closest.failed,candidates_checked:options.length}:null,status:fallback?'FALLBACK':'ESCALATE',mode:'interactive-rules',plan:fallback,log,validation:fallback?Object.fromEntries(agents.map(a=>[a.role,a.evaluate(fallback)])):{},policy:policySummary(s,fallback,options,valid),checks:fallback?Object.fromEntries(agents.map(a=>[a.role,[]])):{}};
}

function allChecks(s,p){return ROLES.flatMap(role=>hard.evaluate(role,s,p).map(c=>({...c,domain:role})));}
function analyse(s,result,{repairs=false}={}){if(hard.issues(s).length)return null;const baseline=buildPlan(s,[...s.flights].sort((a,b)=>a.eta-b.eta||a.callsign.localeCompare(b.callsign)),'greedy',true),checks=allChecks(s,baseline),baselineValid=checks.every(c=>c.pass),selected=result.plan?metrics(s,result.plan):null;const out={baseline:{name:'First scheduled arrival first; greedy compatible stand; same hard rules',valid:baselineValid,plan:baseline,failures:checks.filter(c=>!c.pass),metrics:baselineValid?metrics(s,baseline):null},selected,repairs:[],scope:'Same cohort and operational snapshot; no claim about unobserved traffic or real-world savings.'};
if(baselineValid&&selected)out.change={holding_minutes:out.baseline.metrics.total_holding-selected.total_holding,holding_fuel_kg:out.baseline.metrics.holding_fuel_burn-selected.holding_fuel_burn,missed_connections:out.baseline.metrics.missed_connections-selected.missed_connections,turnaround_delay:out.baseline.metrics.turnaround_delay-selected.turnaround_delay};
if(repairs&&!result.plan){const trials=[[1,0],[0,1],[2,0],[0,2],[1,1],[3,0]];for(const [crews,gates] of trials){const copy=JSON.parse(JSON.stringify(s));copy.ground.crew_capacity+=crews;if(copy.ground.total_gates&&Object.keys(copy.ground.stands).length+gates>copy.ground.total_gates)continue;for(let i=0;i<gates;i++){const id='RECOVERY'+(i+1);copy.ground.stands[id]={available:0,taxiway:id,route:[id],compatible:['small','large','heavy','super'],kind:'gate'};}if(copy.ground.available_gate_limit!==undefined)copy.ground.available_gate_limit=Object.keys(copy.ground.stands).length;const candidate=generate(copy).find(p=>allChecks(copy,p).every(c=>c.pass));if(candidate)out.repairs.push({extra_teams:crews,released_gates:gates,description:[crews?crews+' additional available ground team(s)':null,gates?'release '+gates+' compatible gate(s) from background occupancy':null].filter(Boolean).join(' + '),plan:candidate,requires_verification:true,scope:'Hypothetical resource availability. Validate with the operator before applying; no fuel, duty, wake or weather margin changed.'});}out.repairs.sort((a,b)=>a.extra_teams+a.released_gates-b.extra_teams-b.released_gates);out.repair_search='Six bounded resource scenarios; smallest successful change among those tested, not a global minimum.';}
return out;}
function run(s,options={}){const result=runCore(s,options);result.analysis=analyse(s,result,{repairs:!!options.decisionSupport});return result;}

function snapshot(s){const missing=hard.issues(s);if(missing.length)return {missing,candidates:[]};return {missing:[],candidates:generate(s).map(plan=>({plan,checks:Object.fromEntries(['atc','pilot','ground'].map(r=>[r,hard.evaluate(r,s,plan)])),metrics:metrics(s,plan),rank:policyRank(s,plan),stable_key:stableKey(s,plan)}))};}
root.RecoveryEngine={analyse,hard,snapshot,run,generate,metrics,policyRank,stableKey,AtcAgent,PilotAgent,GroundAgent};
if(typeof module!=='undefined')module.exports=root.RecoveryEngine;
})(typeof window!=='undefined'?window:globalThis);

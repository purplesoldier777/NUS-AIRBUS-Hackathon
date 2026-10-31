import json
from pathlib import Path
import unittest
import server

def seed():
    text=(server.ROOT/'dist/data.js').read_text()
    return json.loads(text.split('=',1)[1].strip().rstrip(';'))['recovery']['scenario']

class BackendTests(unittest.TestCase):
    def test_three_contexts_and_code_veto(self):
        bodies=[]
        def accept(body,timeout):
            bodies.append(json.loads(json.dumps(body)))
            return {'decision':'ACCEPT','reason':'Model requests acceptance','counter_id':None}
        s=seed();s['disruption']={'source':'manual','description':'Gate equipment failure delayed this arrival.'}
        result=server.run(s,'test-model',transport=accept)
        self.assertEqual(result['status'],'CONSENSUS')
        self.assertEqual(len({b['system'] for b in bodies}),3)
        first=[b for b in bodies if len(b['messages'])==1]
        self.assertEqual(len(first),3)
        payloads=[json.loads(b['messages'][0]['content']) for b in first]
        self.assertTrue(all('historical_seed' in p for p in payloads))
        self.assertTrue(all(p['disruption']==s['disruption'] for p in payloads))
        self.assertTrue(any(m['type']=='REJECT' and m['sender']=='ground' for m in result['log']))
        self.assertTrue(all(c['pass'] for role in server.ROLES for c in result['validation'][role]))
        proposal=result['plan']['id']
        self.assertEqual({m['sender'] for m in result['log'] if m['type']=='ACCEPT' and m['proposal_id']==proposal},set(server.ROLES))
        self.assertLessEqual(sum(m['type']=='PROPOSE' for m in result['log']),3)
        atc=next(p for p,b in zip(payloads,first) if 'ATC agent' in b['system'])
        self.assertNotIn('fuel',atc['domain']['flights'][0])
    def test_unavailable_model_uses_validated_non_ai_fallback(self):
        def fail(*_): raise TimeoutError()
        result=server.run(seed(),'test',transport=fail)
        self.assertEqual(result['status'],'FALLBACK')
        self.assertTrue(all(c['pass'] for role in server.ROLES for c in result['validation'][role]))
        self.assertTrue(any(m['type']=='ERROR' for m in result['log']))
    def test_no_candidate_does_not_force_consensus(self):
        s=seed();s['flights'][0]['fuel']=1
        result=server.run(s,'test',transport=lambda *_:{'decision':'ACCEPT','reason':'unsafe request','counter_id':None})
        self.assertEqual(result['status'],'ESCALATE');self.assertIsNone(result['plan'])
        self.assertTrue(any(c['code']=='FUEL_RESERVE' for c in result['diagnostics']['failures']))
    def test_missing_data_stops_before_any_model_call(self):
        s=seed();del s['flights'][0]['fuel']
        def forbidden(*_): self.fail('Must not call model with missing operational data')
        self.assertEqual(server.run(s,'test',transport=forbidden)['status'],'NOT_EVALUATED')

if __name__=='__main__': unittest.main()

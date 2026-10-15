import copy
import hashlib
import hmac
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
os.environ['AURORA_DB'] = tempfile.mktemp(suffix='.db')
import server as s
from fastapi.testclient import TestClient

class BillingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        s.DB = Path(self.temp.name)/'test.db'
        s.init_db()
        self.client = TestClient(s.app)
        self.origin = {'Origin':s.PUBLIC_URL}
        r = self.client.post('/api/auth/register',json={'email':'owner@example.com','password':'a strong test password'},headers=self.origin)
        self.assertEqual(r.status_code,200)
        with s.db() as c:
            self.uid = c.execute('SELECT id FROM users').fetchone()['id']

    def tearDown(self):
        self.client.close()
        self.temp.cleanup()

    def subscription(self, provider='stripe', status='pending', until=0, schedule='schedule_test'):
        with s.db() as c:
            c.execute('INSERT INTO subscriptions(id,user_id,product,provider,remote_id,status,until,license_hash,schedule_id) VALUES(?,?,?,?,?,?,?,?,?)',
                ('order',self.uid,'suite',provider,'sub_test',status,until,s.digest('AUR-'+'k'*43),schedule))
            return dict(c.execute('SELECT * FROM subscriptions').fetchone())

    def stripe_state(self, status='trialing', price=1000):
        trial_end = int(time.time())+3*86400
        return {'id':'sub_test','status':status,'trial_end':trial_end,'metadata':{'aurora_order':'order'},
            'items':{'data':[{'quantity':1,'current_period_end':trial_end,'price':{'id':'price_intro','product':'prod_test','currency':'usd','unit_amount':price,'recurring':{'interval':'month','interval_count':1}}}]},
            'latest_invoice':{'status':'paid'},'cancel_at_period_end':False}

    def test_password_and_sessions_are_hashed(self):
        with s.db() as c:
            self.assertNotIn('a strong test password',c.execute('SELECT password FROM users').fetchone()[0])
            self.assertNotEqual(c.execute('SELECT token FROM sessions').fetchone()[0],self.client.cookies['aurora_session'])
        self.assertEqual(self.client.get('/api/account').status_code,200)
        self.assertEqual(self.client.post('/api/logout',json={},headers=self.origin).status_code,200)
        self.assertEqual(self.client.get('/api/account').status_code,401)

    def test_cross_origin_write_is_rejected(self):
        self.assertEqual(self.client.post('/api/logout',json={},headers={'Origin':'https://evil.example'}).status_code,403)

    def test_wrong_password_rejected(self):
        self.assertEqual(self.client.post('/api/auth/login',json={'email':'owner@example.com','password':'this is incorrect'},headers=self.origin).status_code,401)

    def test_checkout_without_credentials_cannot_start_trial(self):
        with patch.object(s,'ready',return_value=False):
            r=self.client.post('/api/checkout',json={'product':'facebook','provider':'stripe','consent':True},headers=self.origin)
        self.assertEqual(r.status_code,503)
        with s.db() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM subscriptions').fetchone()[0],0)

    def test_checkout_requires_explicit_consent(self):
        r=self.client.post('/api/checkout',json={'product':'facebook','provider':'stripe','consent':False},headers=self.origin)
        self.assertEqual(r.status_code,400)

    def test_unapproved_and_unknown_licenses_denied(self):
        self.subscription()
        with patch.object(s,'stripe',return_value=self.stripe_state('incomplete')):
            r=self.client.post('/api/license/validate',json={'key':'AUR-'+'k'*43,'product':'instagram'})
        self.assertEqual(r.status_code,403)
        self.assertEqual(self.client.post('/api/license/validate',json={'key':'AUR-'+'x'*43,'product':'facebook'}).status_code,403)

    def test_approved_trial_unlocks_all_three(self):
        self.subscription()
        with patch.object(s,'stripe',return_value=self.stripe_state()):
            for product in s.PRODUCTS:
                r=self.client.post('/api/license/validate',json={'key':'AUR-'+'k'*43,'product':product})
                self.assertEqual(r.status_code,200)
                self.assertTrue(r.json()['valid'])

    def test_trial_expiry_and_failed_payment_deny_access(self):
        self.subscription()
        state=self.stripe_state();state['trial_end']=int(time.time())-1
        with patch.object(s,'stripe',return_value=state):
            self.assertEqual(self.client.post('/api/license/validate',json={'key':'AUR-'+'k'*43,'product':'facebook'}).status_code,403)
        for status in ['past_due','unpaid','canceled','paused']:
            with patch.object(s,'stripe',return_value=self.stripe_state(status)):
                self.assertEqual(self.client.post('/api/license/validate',json={'key':'AUR-'+'k'*43,'product':'tiktok'}).status_code,403)

    def test_wrong_price_or_wrong_order_cannot_unlock(self):
        row=self.subscription()
        for change in ['price','metadata']:
            state=self.stripe_state()
            if change=='price':state['items']['data'][0]['price']['unit_amount']=1
            else:state['metadata']['aurora_order']='other-order'
            with patch.object(s,'stripe',return_value=state):self.assertFalse(s.allowed(s.sync_subscription(row)))

    def test_new_license_revokes_old_key_and_stores_only_hash(self):
        self.subscription()
        with patch.object(s,'stripe',return_value=self.stripe_state()):
            r=self.client.post('/api/subscriptions/order/license',json={},headers=self.origin)
            self.assertEqual(r.status_code,200)
            key=r.json()['key']
            self.assertEqual(self.client.post('/api/license/validate',json={'key':'AUR-'+'k'*43,'product':'facebook'}).status_code,403)
            self.assertEqual(self.client.post('/api/license/validate',json={'key':key,'product':'facebook'}).status_code,200)
        with s.db() as c:self.assertEqual(c.execute('SELECT license_hash FROM subscriptions').fetchone()[0],s.digest(key))

    def test_another_account_cannot_rotate_key(self):
        self.subscription()
        self.client.post('/api/auth/register',json={'email':'other@example.com','password':'another strong password'},headers=self.origin)
        self.assertEqual(self.client.post('/api/subscriptions/order/license',json={},headers=self.origin).status_code,404)

    def test_redirect_does_not_grant_access(self):
        self.assertEqual(self.client.get('/?checkout=returned').status_code,200)
        with s.db() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM subscriptions').fetchone()[0],0)
        self.assertEqual(self.client.get('/api/download/facebook').status_code,403)

    def test_stripe_signature_and_replay_protection(self):
        raw=json.dumps({'id':'evt_1','type':'irrelevant','data':{'object':{}}}).encode()
        stamp=str(int(time.time()))
        signature=hmac.new(b'test-secret',stamp.encode()+b'.'+raw,hashlib.sha256).hexdigest()
        with patch.dict(os.environ,{'STRIPE_WEBHOOK_SECRET':'test-secret'}):
            self.assertEqual(self.client.post('/api/webhooks/stripe',content=raw,headers={'stripe-signature':'t='+stamp+',v1=bad'}).status_code,400)
            for _ in range(2):
                self.assertEqual(self.client.post('/api/webhooks/stripe',content=raw,headers={'stripe-signature':'t='+stamp+',v1='+signature}).status_code,200)
        with s.db() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM events').fetchone()[0],1)

    def test_paypal_signature_failure_does_not_process(self):
        with patch.dict(os.environ,{'PAYPAL_WEBHOOK_ID':'wh_test'}),patch.object(s,'paypal',return_value={'verification_status':'FAILURE'}):
            self.assertEqual(self.client.post('/api/webhooks/paypal',json={'id':'event'}).status_code,400)

    def paypal_plan(self):
        def cycle(seq,tenure,unit,count,value,total):
            return {'sequence':seq,'tenure_type':tenure,'frequency':{'interval_unit':unit,'interval_count':count},
                'total_cycles':total,'pricing_scheme':{'fixed_price':{'value':value,'currency_code':'USD'}}}
        return {'status':'ACTIVE','billing_cycles':[cycle(1,'TRIAL','DAY',3,'0',1),cycle(2,'TRIAL','MONTH',1,'10',3),cycle(3,'REGULAR','MONTH',1,'30',0)],'payment_preferences':{'setup_fee':{'value':'0'}}}

    def test_paypal_exact_free_intro_and_regular_phases_required(self):
        plan=self.paypal_plan();self.assertTrue(s.check_paypal_plan(plan))
        for seq,field,value in [(0,'total_cycles',2),(1,'total_cycles',4)]:
            bad=copy.deepcopy(plan);bad['billing_cycles'][seq][field]=value;self.assertFalse(s.check_paypal_plan(bad))
        bad=copy.deepcopy(plan);bad['billing_cycles'][2]['pricing_scheme']['fixed_price']['value']='10';self.assertFalse(s.check_paypal_plan(bad))

    def test_paypal_approval_pending_and_canceled_deny_trial(self):
        row=self.subscription(provider='paypal')
        state={'id':'sub_test','custom_id':'order','plan_id':'plan_test','start_time':s.datetime.now(s.timezone.utc).isoformat(),'status':'ACTIVE'}
        with patch.dict(os.environ,{'PAYPAL_PLAN_ID':'plan_test'}):
            with patch.object(s,'paypal',return_value=state):self.assertTrue(s.allowed(s.sync_subscription(row)))
            for status in ['APPROVAL_PENDING','CANCELLED','SUSPENDED','EXPIRED']:
                state['status']=status
                with patch.object(s,'paypal',return_value=state):self.assertFalse(s.allowed(s.sync_subscription(row)))

    def test_stripe_offer_schedule_has_exact_three_intro_months(self):
        row=self.subscription(schedule=None);state=self.stripe_state()
        def provider(url,data=None,headers=None,form=False):
            if url.endswith('/prices'):return {'id':'price_regular'}
            return {'id':'schedule_new','current_phase':{'start_date':int(time.time())}}
        with patch.dict(os.environ,{'STRIPE_SECRET_KEY':'test-not-a-real-key'}),patch.object(s,'request_json',side_effect=provider),patch.object(s,'stripe') as stripe:
            s.schedule_offer(row,state)
        args=stripe.call_args.args[1]
        self.assertEqual(args['phases[0][end_date]'],state['trial_end'])
        self.assertEqual(args['phases[1][end_date]'],s.months_after(state['trial_end'],3))
        self.assertEqual(args['phases[2][items][0][price]'],'price_regular')
        self.assertEqual(args['end_behavior'],'release')

    def test_regular_price_is_thirty_after_intro(self):
        row=self.subscription();state=self.stripe_state('active',3000)
        state['trial_end']=int(time.time())-120*86400
        with patch.object(s,'stripe',return_value=state):self.assertTrue(s.allowed(s.sync_subscription(row)))
        state['items']['data'][0]['price']['unit_amount']=1000
        with patch.object(s,'stripe',return_value=state):self.assertFalse(s.allowed(s.sync_subscription(row)))

    def test_stripe_cancellation_preserves_current_access(self):
        self.subscription();state=self.stripe_state();state['cancel_at_period_end']=True
        with patch.object(s,'stripe',return_value=state):
            r=self.client.post('/api/subscriptions/order/cancel',json={},headers=self.origin)
            self.assertEqual(r.status_code,200)
            self.assertTrue(self.client.post('/api/license/validate',json={'key':'AUR-'+'k'*43,'product':'facebook'}).json()['valid'])

    def test_calendar_months_include_end_of_month(self):
        stamp=s.datetime(2028,1,31,tzinfo=s.timezone.utc).timestamp()
        self.assertEqual(s.datetime.fromtimestamp(s.months_after(stamp,1),s.timezone.utc).day,29)

if __name__=='__main__':unittest.main()

"""Aurora storefront and subscription licensing. Run with uvicorn server:app."""
import base64
import calendar
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).parent
DB = Path(os.getenv('AURORA_DB', ROOT / '.data/aurora.db'))
PUBLIC_URL = os.getenv('PUBLIC_URL', 'http://127.0.0.1:8000').rstrip('/')
SCOPE = 'suite'
PRODUCTS = {'facebook': 'Facebook Studio', 'instagram': 'Instagram Studio', 'tiktok': 'TikTok Studio'}
PAYPAL_BASE = 'https://api-m.paypal.com' if os.getenv('PAYPAL_ENV') == 'live' else 'https://api-m.sandbox.paypal.com'
app = FastAPI(docs_url=None, redoc_url=None)

def db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(DB, timeout=15)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    return c

def init_db():
    with db() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires REAL);
        CREATE TABLE IF NOT EXISTS subscriptions(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),product TEXT,
          provider TEXT,remote_id TEXT UNIQUE,checkout_id TEXT,status TEXT DEFAULT 'pending',until REAL DEFAULT 0,
          trial_end REAL DEFAULT 0,canceling INTEGER DEFAULT 0,license_hash TEXT UNIQUE,schedule_id TEXT,
          UNIQUE(user_id,product));
        CREATE TABLE IF NOT EXISTS events(provider TEXT,event_id TEXT,PRIMARY KEY(provider,event_id));
        CREATE TABLE IF NOT EXISTS attempts(bucket TEXT PRIMARY KEY,count INTEGER,reset REAL);
        ''')
init_db()

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def throttle(bucket, limit=20):
    now = time.time()
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        c.execute('DELETE FROM attempts WHERE reset < ?', (now,))
        row = c.execute('SELECT * FROM attempts WHERE bucket=?', (bucket,)).fetchone()
        if row and row['count'] >= limit:
            raise HTTPException(429, 'Too many attempts. Please try again in 15 minutes.')
        c.execute('INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1', (bucket, now+900))

@app.middleware('http')
async def security(request, call_next):
    if request.method == 'POST':
        if int(request.headers.get('content-length', '0') or 0) > 131072:
            return JSONResponse({'detail': 'Request too large'}, status_code=413)
        # Session-based writes require same-origin requests; webhooks and key-auth validation are separate.
        if request.url.path not in ['/api/license/validate', '/api/webhooks/stripe', '/api/webhooks/paypal']:
            if request.headers.get('origin') != PUBLIC_URL:
                return JSONResponse({'detail': 'Origin rejected'}, status_code=403)
    response = await call_next(request)
    response.headers.update({'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'})
    if request.url.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    return response

def user(request):
    token = request.cookies.get('aurora_session', '')
    with db() as c:
        row = c.execute('SELECT users.id,users.email FROM users JOIN sessions ON users.id=sessions.user_id WHERE token=? AND expires>?', (digest(token),time.time())).fetchone()
    if not row:
        raise HTTPException(401, 'Sign in to continue.')
    return dict(row)

def request_json(url, data=None, headers=None, form=False):
    headers = dict(headers or {})
    if data is not None:
        headers['Content-Type'] = 'application/x-www-form-urlencoded' if form else 'application/json'
        data = (urllib.parse.urlencode(data) if form else json.dumps(data)).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(url,data=data,headers=headers), timeout=20) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except (urllib.error.URLError, ValueError):
        raise HTTPException(502, 'Payment provider could not be reached. No access was granted; please try again.')

def stripe(path, data=None):
    return request_json('https://api.stripe.com/v1/'+path, data,
        {'Authorization': 'Bearer '+os.environ['STRIPE_SECRET_KEY']}, form=True)

def paypal(path, data=None, request_id=None):
    auth = base64.b64encode((os.environ['PAYPAL_CLIENT_ID']+':'+os.environ['PAYPAL_CLIENT_SECRET']).encode()).decode()
    token = request_json(PAYPAL_BASE+'/v1/oauth2/token', {'grant_type':'client_credentials'}, {'Authorization':'Basic '+auth}, form=True)['access_token']
    headers = {'Authorization':'Bearer '+token}
    if request_id:
        headers['PayPal-Request-Id'] = request_id
    return request_json(PAYPAL_BASE+path, data, headers)

def ready(provider):
    names = ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'] if provider == 'stripe' else ['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_WEBHOOK_ID','PAYPAL_PLAN_ID']
    return all(os.getenv(n) for n in names) and PUBLIC_URL.startswith('https://')

def epoch(value):
    return datetime.fromisoformat(value.replace('Z','+00:00')).timestamp() if value else 0

def check_paypal_plan(plan):
    cycles = plan.get('billing_cycles', [])
    trial = [x for x in cycles if x.get('tenure_type') == 'TRIAL']
    regular = [x for x in cycles if x.get('tenure_type') == 'REGULAR']
    return (plan.get('status') == 'ACTIVE' and len(cycles) == 3 and len(trial) == 2 and len(regular) == 1
        and trial[0].get('sequence') == 1 and trial[1].get('sequence') == 2 and regular[0].get('sequence') == 3
        and trial[0].get('total_cycles') == 1 and trial[0].get('frequency') == {'interval_unit':'DAY','interval_count':3}
        and float(trial[0].get('pricing_scheme',{}).get('fixed_price',{}).get('value',-1)) == 0
        and trial[1].get('frequency') == {'interval_unit':'MONTH','interval_count':1}
        and trial[1].get('total_cycles') == 3
        and trial[1].get('pricing_scheme',{}).get('fixed_price',{}).get('currency_code') == 'USD'
        and float(trial[1].get('pricing_scheme',{}).get('fixed_price',{}).get('value',0)) == 10
        and regular[0].get('frequency') == {'interval_unit':'MONTH','interval_count':1}
        and regular[0].get('total_cycles') == 0
        and regular[0].get('pricing_scheme',{}).get('fixed_price',{}).get('currency_code') == 'USD'
        and float(regular[0].get('pricing_scheme',{}).get('fixed_price',{}).get('value',0)) == 30
        and float(plan.get('payment_preferences',{}).get('setup_fee',{}).get('value',0)) == 0
        and not plan.get('taxes',{}).get('percentage'))

def months_after(stamp, count):
    d = datetime.fromtimestamp(stamp,timezone.utc)
    month = d.month-1+count
    year = d.year+month//12
    month = month%12+1
    return int(d.replace(year=year,month=month,day=min(d.day,calendar.monthrange(year,month)[1])).timestamp())

def schedule_offer(row, subscription):
    """Set exact billing phases: 3-day free trial, three $10 months, then $30/month."""
    if row['schedule_id']:
        return
    trial_end = subscription.get('trial_end') or 0
    if trial_end <= time.time():
        raise HTTPException(503,'Subscription offer could not be initialized before trial end. Contact support.')
    price = subscription['items']['data'][0]['price']
    intro_end = months_after(trial_end,3)
    regular = request_json('https://api.stripe.com/v1/prices',{
        'currency':'usd','unit_amount':3000,'recurring[interval]':'month','product':price['product']},
        {'Authorization':'Bearer '+os.environ['STRIPE_SECRET_KEY'],'Idempotency-Key':'regular-price-'+row['id']},form=True)
    schedule = request_json('https://api.stripe.com/v1/subscription_schedules',{'from_subscription':subscription['id']},
        {'Authorization':'Bearer '+os.environ['STRIPE_SECRET_KEY'],'Idempotency-Key':'offer-schedule-'+row['id']},form=True)
    fields = {'end_behavior':'release', 'phases[0][start_date]':schedule['current_phase']['start_date'],
        'phases[0][end_date]':trial_end,'phases[0][trial_end]':trial_end,
        'phases[1][start_date]':trial_end,'phases[1][end_date]':intro_end,
        'phases[2][start_date]':intro_end,'phases[2][end_date]':months_after(intro_end,1)}
    for i,pid in enumerate([price['id'],price['id'],regular['id']]):
        fields[f'phases[{i}][items][0][price]'] = pid
        fields[f'phases[{i}][items][0][quantity]'] = 1
        fields[f'phases[{i}][metadata][aurora_order]'] = row['id']
        fields[f'phases[{i}][proration_behavior]'] = 'none'
    stripe('subscription_schedules/'+schedule['id'],fields)
    with db() as c:
        c.execute('UPDATE subscriptions SET schedule_id=? WHERE id=?',(schedule['id'],row['id']))

def sync_subscription(row):
    """Read canonical provider state, never trust a browser redirect or webhook snapshot."""
    if not row['remote_id']:
        return dict(row)
    until = trial_end = 0
    canceling = False
    status = 'inactive'
    if row['provider'] == 'stripe':
        s = stripe('subscriptions/'+row['remote_id']+'?expand[]=latest_invoice')
        price = s['items']['data'][0]['price']
        trial_end = s.get('trial_end') or 0
        expected_amount = 1000 if time.time() < months_after(trial_end,3) else 3000
        valid = (s.get('metadata',{}).get('aurora_order') == row['id'] and len(s['items']['data']) == 1
            and s['items']['data'][0].get('quantity') == 1 and price.get('unit_amount') == expected_amount and price.get('currency') == 'usd'
            and price.get('recurring',{}).get('interval') == 'month' and price['recurring'].get('interval_count') == 1)
        if valid and s['status'] in ('trialing','active'):
            schedule_offer(row,s)
        if valid and s['status'] == 'trialing' and trial_end > time.time():
            status, until = 'trialing', trial_end
        elif valid and s['status'] == 'active' and isinstance(s.get('latest_invoice'),dict) and s['latest_invoice'].get('status') == 'paid':
            status = 'active'
            until = s.get('current_period_end') or s['items']['data'][0].get('current_period_end',0)
        canceling = s.get('cancel_at_period_end',False)
    else:
        s = paypal('/v1/billing/subscriptions/'+row['remote_id'])
        info = s.get('billing_info',{})
        trial_end = epoch(s.get('start_time')) + 3*86400
        valid = s.get('custom_id') == row['id'] and s.get('plan_id') == os.getenv('PAYPAL_PLAN_ID')
        if valid and s['status'] == 'ACTIVE':
            if time.time() < trial_end:
                status, until = 'trialing', trial_end
            elif (info.get('last_payment',{}).get('amount',{}).get('currency_code') == 'USD'
                  and float(info.get('last_payment',{}).get('amount',{}).get('value',0)) == (10 if time.time()<months_after(trial_end,3) else 30)
                  and float(info.get('outstanding_balance',{}).get('value',0)) == 0):
                status, until = 'active', epoch(info.get('next_billing_time'))
        # PayPal cancellation takes effect immediately; Stripe cancels at the period end.
    with db() as c:
        c.execute('UPDATE subscriptions SET status=?,until=?,trial_end=?,canceling=? WHERE id=?', (status,until,trial_end,int(canceling),row['id']))
        return dict(c.execute('SELECT * FROM subscriptions WHERE id=?', (row['id'],)).fetchone())

def allowed(row):
    return row['status'] in ('active','trialing') and row['until'] > time.time()

class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=12,max_length=128)

@app.get('/api/config')
def config():
    return {'scope':SCOPE,'price':10,'regularPrice':30,'introMonths':3,'currency':'USD','trialDays':3,
        'providers':{p:ready(p) for p in ['stripe','paypal']}}

@app.post('/api/auth/{action}')
def auth(action: str, body: Credentials, request: Request):
    if action not in ('register','login'):
        raise HTTPException(404)
    throttle('auth:'+request.client.host)
    email = body.email.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):
        raise HTTPException(400,'Enter a valid email address.')
    with db() as c:
        if action == 'register':
            uid, salt = secrets.token_hex(16), secrets.token_hex(16)
            hashed = hashlib.scrypt(body.password.encode(),salt=salt.encode(),n=16384,r=8,p=1).hex()
            try:
                c.execute('INSERT INTO users VALUES(?,?,?)',(uid,email,salt+':'+hashed))
            except sqlite3.IntegrityError:
                raise HTTPException(409,'Unable to register. If you already have an account, sign in.')
        else:
            row = c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
            salt, expected = row['password'].split(':') if row else ('0'*32,'0'*128)
            actual = hashlib.scrypt(body.password.encode(),salt=salt.encode(),n=16384,r=8,p=1).hex()
            if not hmac.compare_digest(actual,expected):
                raise HTTPException(401,'Email or password is incorrect.')
            uid = row['id']
        token = secrets.token_urlsafe(32)
        c.execute('DELETE FROM sessions WHERE expires<?',(time.time(),))
        c.execute('INSERT INTO sessions VALUES(?,?,?)',(digest(token),uid,time.time()+7*86400))
    response = JSONResponse({'email':email})
    response.set_cookie('aurora_session',token,httponly=True,samesite='strict',secure=PUBLIC_URL.startswith('https://'),max_age=7*86400)
    return response

@app.post('/api/logout')
def logout(request: Request):
    with db() as c:
        c.execute('DELETE FROM sessions WHERE token=?',(digest(request.cookies.get('aurora_session','')),))
    response = JSONResponse({'ok':True})
    response.delete_cookie('aurora_session')
    return response

@app.get('/api/account')
def account(request: Request):
    u = user(request)
    with db() as c:
        rows = c.execute('SELECT * FROM subscriptions WHERE user_id=?',(u['id'],)).fetchall()
    result = []
    for row in rows:
        r = sync_subscription(row)
        result.append({k:r[k] for k in ['id','product','provider','status','until','trial_end','canceling']})
    return {**u,'subscriptions':result}

class Checkout(BaseModel):
    product: str
    provider: str
    consent: bool

@app.post('/api/checkout')
def checkout(body: Checkout, request: Request):
    u = user(request)
    throttle('checkout:'+u['id'],10)
    if body.provider not in ('stripe','paypal') or body.product not in PRODUCTS:
        raise HTTPException(400,'Choose a product and payment provider.')
    if not body.consent:
        raise HTTPException(400,'Please agree to the recurring subscription terms.')
    if not ready(body.provider):
        raise HTTPException(503,'Checkout is not configured yet. No payment or trial has started.')
    product = 'suite' if SCOPE == 'suite' else body.product
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        old = c.execute('SELECT * FROM subscriptions WHERE user_id=? AND product=?',(u['id'],product)).fetchone()
        if old:
            if old['status'] != 'pending' or old['remote_id']:
                raise HTTPException(409,'This product already has a subscription. Manage it in your account. A second trial is not available.')
            if old['provider'] != body.provider:
                raise HTTPException(409,'Continue with your original payment provider to avoid duplicate subscriptions.')
            oid = old['id']
        else:
            oid = secrets.token_hex(16)
            c.execute('INSERT INTO subscriptions(id,user_id,product,provider) VALUES(?,?,?,?)',(oid,u['id'],product,body.provider))
    title = 'Aurora Series' if product == 'suite' else 'Aurora '+PRODUCTS[product]
    if body.provider == 'stripe':
        data = {'mode':'subscription','customer_email':u['email'],'client_reference_id':oid,
            'custom_text[submit][message]':'3 days free, then $10/month for 3 paid months, then $30/month for all three Aurora studios. Cancel before renewal.',
            'success_url':PUBLIC_URL+'/?checkout=returned#account','cancel_url':PUBLIC_URL+'/?checkout=canceled#pricing',
            'line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':1000,
            'line_items[0][price_data][recurring][interval]':'month',
            'line_items[0][price_data][product_data][name]':title,'line_items[0][quantity]':1,
            'subscription_data[trial_period_days]':3,'subscription_data[metadata][aurora_order]':oid,
            'payment_method_collection':'always','subscription_data[trial_settings][end_behavior][missing_payment_method]':'cancel'}
        # Stable idempotency key prevents two open trial subscriptions for concurrent/retried checkout requests.
        s = request_json('https://api.stripe.com/v1/checkout/sessions',data,
            {'Authorization':'Bearer '+os.environ['STRIPE_SECRET_KEY'],'Idempotency-Key':'checkout-'+oid},form=True)
        remote, checkout_id, url = None, s['id'], s['url']
    else:
        plan = paypal('/v1/billing/plans/'+os.environ['PAYPAL_PLAN_ID'])
        if not check_paypal_plan(plan):
            raise HTTPException(503,'PayPal plan must have a free 3-day trial, three $10 monthly cycles, then $30/month, without a setup fee or added tax.')
        s = paypal('/v1/billing/subscriptions',{'plan_id':os.environ['PAYPAL_PLAN_ID'],'custom_id':oid,
            'application_context':{'brand_name':'Aurora','user_action':'SUBSCRIBE_NOW','return_url':PUBLIC_URL+'/?checkout=returned#account','cancel_url':PUBLIC_URL+'/?checkout=canceled#pricing'}},request_id=oid)
        remote, checkout_id = s['id'], None
        url = next(x['href'] for x in s['links'] if x['rel']=='approve')
    with db() as c:
        c.execute('UPDATE subscriptions SET remote_id=?,checkout_id=? WHERE id=?',(remote,checkout_id,oid))
    return {'url':url}

def owned_subscription(sid, request):
    u = user(request)
    with db() as c:
        row = c.execute('SELECT * FROM subscriptions WHERE id=? AND user_id=?',(sid,u['id'])).fetchone()
    if not row:
        raise HTTPException(404,'Subscription not found.')
    # Stripe return is reconciled server-side even if its webhook has not arrived yet.
    if row['provider']=='stripe' and not row['remote_id'] and row['checkout_id']:
        session = stripe('checkout/sessions/'+row['checkout_id'])
        if session.get('status')=='complete' and session.get('client_reference_id')==sid and session.get('subscription'):
            with db() as c:
                c.execute('UPDATE subscriptions SET remote_id=? WHERE id=?',(session['subscription'],sid))
                row = c.execute('SELECT * FROM subscriptions WHERE id=?',(sid,)).fetchone()
    return sync_subscription(row)

@app.post('/api/subscriptions/{sid}/refresh')
def refresh(sid: str, request: Request):
    r = owned_subscription(sid,request)
    return {'status':r['status'],'valid':allowed(r)}

@app.post('/api/subscriptions/{sid}/license')
def license_key(sid: str, request: Request):
    row = owned_subscription(sid,request)
    if not allowed(row):
        raise HTTPException(403,'An approved trial or paid subscription is required.')
    key = 'AUR-'+secrets.token_urlsafe(32)
    with db() as c:
        c.execute('UPDATE subscriptions SET license_hash=? WHERE id=?',(digest(key),sid))
    return {'key':key,'message':'Store this key securely. Generating another key revokes the previous one.'}

@app.post('/api/subscriptions/{sid}/cancel')
def cancel(sid: str, request: Request):
    row = owned_subscription(sid,request)
    if not row['remote_id']:
        raise HTTPException(409,'No approved subscription to cancel.')
    if row['provider']=='stripe':
        if row['canceling']:
            return {'ok':True}
        if row['schedule_id']:
            schedule = stripe('subscription_schedules/'+row['schedule_id'])
            if schedule.get('status') in ('active','not_started'):
                stripe('subscription_schedules/'+row['schedule_id']+'/release',{})
        stripe('subscriptions/'+row['remote_id'],{'cancel_at_period_end':'true'})
    else:
        paypal('/v1/billing/subscriptions/'+row['remote_id']+'/cancel',{'reason':'Customer canceled in Aurora account'})
    sync_subscription(row)
    return {'ok':True}

class Validation(BaseModel):
    key: str = Field(min_length=10,max_length=128)
    product: str

@app.post('/api/license/validate')
def validate_license(body: Validation, request: Request):
    throttle('license:'+request.client.host,120)
    with db() as c:
        row = c.execute('SELECT * FROM subscriptions WHERE license_hash=?',(digest(body.key),)).fetchone()
    if not row or body.product not in PRODUCTS or row['product'] not in (body.product,'suite'):
        raise HTTPException(403,'License not valid for this extension.')
    row = sync_subscription(row)
    if not allowed(row):
        raise HTTPException(403,'Trial or paid access has ended. Manage your subscription in Aurora.')
    return {'valid':True,'product':body.product,'status':row['status'],'expires':row['until']}

@app.get('/api/download/{product}')
def download(product: str, request: Request):
    u = user(request)
    if product not in PRODUCTS:
        raise HTTPException(404)
    with db() as c:
        row = c.execute('SELECT * FROM subscriptions WHERE user_id=? AND product IN (?,?)',(u['id'],product,'suite')).fetchone()
    if not row or not allowed(sync_subscription(row)):
        raise HTTPException(403,'An approved trial or paid subscription is required.')
    path = ROOT/'artifacts'/f'aurora-{product}.zip'
    if not path.exists():
        raise HTTPException(503,'Release package is not built yet.')
    return FileResponse(path,filename=path.name)

@app.post('/api/webhooks/stripe')
async def stripe_webhook(request: Request):
    secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    if not secret:
        raise HTTPException(503)
    raw = await request.body()
    signature = request.headers.get('stripe-signature','')
    parts = urllib.parse.parse_qs(signature.replace(',','&'))
    try:
        stamp = parts['t'][0]
        expected = hmac.new(secret.encode(),stamp.encode()+b'.'+raw,hashlib.sha256).hexdigest()
        if abs(time.time()-int(stamp))>300 or not any(hmac.compare_digest(expected,x) for x in parts.get('v1',[])):
            raise ValueError()
        event = json.loads(raw)
    except (KeyError,ValueError):
        raise HTTPException(400,'Invalid webhook signature.')
    return handle_event('stripe',event)

@app.post('/api/webhooks/paypal')
async def paypal_webhook(request: Request):
    if not os.getenv('PAYPAL_WEBHOOK_ID'):
        raise HTTPException(503)
    event = await request.json()
    verification = paypal('/v1/notifications/verify-webhook-signature',{
        **{k:request.headers.get('paypal-'+k.replace('_','-'),'') for k in ['auth_algo','cert_url','transmission_id','transmission_sig','transmission_time']},
        'webhook_id':os.environ['PAYPAL_WEBHOOK_ID'],'webhook_event':event})
    if verification.get('verification_status')!='SUCCESS':
        raise HTTPException(400,'Invalid webhook signature.')
    return handle_event('paypal',event)

def handle_event(provider,event):
    eid = event.get('id')
    if not eid:
        raise HTTPException(400,'Missing event id.')
    with db() as c:
        if c.execute('SELECT 1 FROM events WHERE provider=? AND event_id=?',(provider,eid)).fetchone():
            return {'received':True}
        if provider=='stripe':
            obj = event.get('data',{}).get('object',{})
            if event.get('type')=='checkout.session.completed':
                oid = obj.get('client_reference_id')
                row = c.execute('SELECT * FROM subscriptions WHERE id=? AND provider=? AND checkout_id=?',(oid,provider,obj.get('id'))).fetchone()
                if row and obj.get('subscription'):
                    c.execute('UPDATE subscriptions SET remote_id=? WHERE id=?',(obj['subscription'],oid))
            remote = obj.get('id') if obj.get('object')=='subscription' else obj.get('subscription')
        else:
            obj = event.get('resource',{})
            remote = obj.get('billing_agreement_id') or obj.get('id')
        row = c.execute('SELECT * FROM subscriptions WHERE provider=? AND remote_id=?',(provider,remote)).fetchone()
    if row:
        sync_subscription(row)  # Failure returns an error; provider retries rather than losing the event.
    with db() as c:
        c.execute('INSERT OR IGNORE INTO events VALUES(?,?)',(provider,eid))
    return {'received':True}

@app.get('/health')
def health():
    return {'ok':True}

app.mount('/',StaticFiles(directory=ROOT/'public',html=True),name='storefront')

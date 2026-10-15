"""Functional browser checks against the local running development server."""
import json
from pathlib import Path
import sqlite3
import uuid
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
email='browser-test-'+uuid.uuid4().hex+'@example.com'
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8000')
    expect(page).to_have_title('Aurora — Make room for your next chapter.')
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),width
    for product,title in [('facebook','Facebook Studio'),('instagram','Instagram Studio'),('tiktok','TikTok Studio')]:
        page.locator('[data-product='+product+']').click()
        expect(page.locator('#detail-title')).to_have_text(title)
        page.locator('#detail-dialog [data-close]').click()
    page.locator('#preview-button').click()
    expect(page.locator('#detail-body')).to_contain_text('illustration')
    page.keyboard.press('Escape')
    page.get_by_text('What happens after my free trial?',exact=False).click()
    expect(page.locator('details').first).to_have_attribute('open','')
    expect(page.locator('details').first).to_contain_text('$30/month')
    page.locator('[data-trial]').first.click()
    page.locator('[name=email]').fill(email)
    page.locator('[name=password]').fill('browser-test-password-123')
    page.locator('#auth-submit').click()
    expect(page.locator('#payment-step')).to_be_visible()
    expect(page.locator('#signed-in-email')).to_contain_text(email)
    for provider in ['stripe','paypal']:
        expect(page.locator('[data-pay='+provider+']')).to_be_disabled()
    expect(page.locator('#checkout-status')).to_contain_text('Payment setup is pending')
    page.keyboard.press('Escape')
    page.locator('#account-button').click()
    expect(page.locator('#account-email')).to_have_text(email)
    expect(page.locator('#subscriptions')).to_contain_text('Approve a subscription')
    page.locator('#logout').click()
    expect(page.locator('#account')).to_be_hidden()
    page.locator('#privacy-button').click()
    expect(page.locator('#detail-body')).to_contain_text('License verification')
    page.keyboard.press('Escape')
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('scrollTo(0,0)')
    (ROOT/'artifacts').mkdir(exist_ok=True)
    page.screenshot(path=str(ROOT/'artifacts/aurora-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(ROOT/'artifacts/aurora-mobile.png'),full_page=True)
    assert not errors,errors
    browser.close()
# Remove only this run's test account from the development database.
with sqlite3.connect(ROOT/'.data/aurora.db') as c:
    uid=c.execute('SELECT id FROM users WHERE email=?',(email,)).fetchone()
    if uid:
        c.execute('DELETE FROM sessions WHERE user_id=?',(uid[0],))
        c.execute('DELETE FROM users WHERE id=?',(uid[0],))
print('Browser checks passed: 4 viewport widths, 3 studio dialogs, FAQ, account creation, blocked unconfigured checkout, logout, privacy, and no JS errors.')

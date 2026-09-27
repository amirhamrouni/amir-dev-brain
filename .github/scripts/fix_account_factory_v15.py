from pathlib import Path
import runpy

runpy.run_path('.github/scripts/fix_account_factory_v14.py', run_name='__main__')

root = Path('tools/account-factory-android/app/src/main/java/com/amir/accountfactory')

# --- JsScripts: TikTok email OTP route must beat generic phone heuristics; cookie button must be actionable. ---
p = root / 'JsScripts.java'
s = p.read_text()

old_consent = "const CONSENT=['allow all cookies','accept all cookies','accept all','allow cookies','only allow essential cookies','decline optional cookies','alle cookies toestaan','alles accepteren','accepteren','alleen essentiële cookies toestaan','autoriser tous les cookies','accepter tout','tout accepter','refuser les cookies facultatifs'];"
new_consent = "const CONSENT=['allow all','allow all cookies','accept all cookies','accept all','allow cookies','only allow essential cookies','decline optional cookies','alle cookies toestaan','alles accepteren','accepteren','alleen essentiële cookies toestaan','autoriser tous les cookies','accepter tout','tout accepter','refuser les cookies facultatifs'];"
if old_consent not in s:
    raise SystemExit('CONSENT list marker not found')
s = s.replace(old_consent, new_consent, 1)

old_phone = "const phoneish=ins.some(x=>(x.type||'').toLowerCase()==='tel'||((x.placeholder+' '+x.name+' '+x.aria).toLowerCase().includes('phone'))); if(phoneish&&['send code','sms','text message','phone number','mobile number'].some(k=>body.includes(k)))return 'PHONE_REQUIRED';"
new_phone = "if(url.includes('/signup/email/digit-code')||url.includes('/signup/email/verify'))return 'EMAIL_OTP'; const phoneish=ins.some(x=>(x.type||'').toLowerCase()==='tel'||((x.placeholder+' '+x.name+' '+x.aria).toLowerCase().includes('phone'))); if(phoneish&&['send code','sms','text message','phone number','mobile number'].some(k=>body.includes(k)))return 'PHONE_REQUIRED';"
if old_phone not in s:
    raise SystemExit('PHONE heuristic marker not found')
s = s.replace(old_phone, new_phone, 1)

old_fillotp = "const fillOtp=()=>fill(['input[autocomplete=one-time-code]','input[name*=code i]','input[placeholder*=code i]','input[aria-label*=code i]','input[inputmode=numeric]'],P.code);"
new_fillotp = "const fillOtp=()=>{const code=String(P.code||'').replace(/[^0-9]/g,'');if(!code)return false;const sels=['input[autocomplete=one-time-code]','input[name*=code i]','input[placeholder*=code i]','input[aria-label*=code i]','input[inputmode=numeric]'];const one=find(sels);if(one&&String(one.getAttribute('maxlength')||'')!=='1')return setNative(one,code);const parts=[];for(const el of all){if(!vis(el)||(el.tagName||'').toLowerCase()!=='input')continue;const max=String(el.getAttribute('maxlength')||'');const mode=(el.getAttribute('inputmode')||'').toLowerCase();const meta=norm((el.getAttribute('name')||'')+' '+(el.getAttribute('aria-label')||'')+' '+(el.getAttribute('placeholder')||''));if(max==='1'||mode==='numeric'||meta.includes('code'))parts.push(el)}if(parts.length>=code.length){for(let i=0;i<code.length;i++){if(!setNative(parts[i],code[i]))return false}return true}if(one)return setNative(one,code);return false};"
if old_fillotp not in s:
    raise SystemExit('fillOtp marker not found')
s = s.replace(old_fillotp, new_fillotp, 1)

old_dismiss = "if(ACTION==='dismiss'){let c=0;if(consentPresent()&&(clickTargets(CONSENT,true)||clickTargets(CONSENT,false)))c++; if(clickTargets(NOTNOW,true))c++; return c}"
new_dismiss = "if(ACTION==='dismiss'){let c=0;if(clickTargets(['allow all','allow all cookies','accept all cookies','accept all'],true)||(consentPresent()&&(clickTargets(CONSENT,true)||clickTargets(CONSENT,false))))c++; if(clickTargets(NOTNOW,true))c++; return c}"
if old_dismiss not in s:
    raise SystemExit('dismiss marker not found')
s = s.replace(old_dismiss, new_dismiss, 1)
p.write_text(s)

# --- FlowEngine: route-level override, explicit Allow all fallback, and submit after OTP fill. ---
p = root / 'FlowEngine.java'
s = p.read_text()
old_state = '                String state = web.detectState();\n'
new_state = "                String currentUrl = web.currentUrl().toLowerCase(Locale.ROOT);\n                String state = (currentUrl.contains(\"/signup/email/digit-code\") || currentUrl.contains(\"/signup/email/verify\")) ? \"EMAIL_OTP\" : web.detectState();\n"
if old_state not in s:
    raise SystemExit('FlowEngine state marker not found')
s = s.replace(old_state, new_state, 1)

old_consent_flow = '                    boolean clicked = web.clickText(new String[]{"allow all cookies","accept all cookies","accept all"}, true);'
new_consent_flow = '                    boolean clicked = web.clickText(new String[]{"allow all","allow all cookies","accept all cookies","accept all","decline optional cookies"}, true);'
if old_consent_flow not in s:
    raise SystemExit('FlowEngine consent marker not found')
s = s.replace(old_consent_flow, new_consent_flow, 1)

old_otp = '                    if (web.fillOtp(code)) { settle(2600); continue; }'
new_otp = '                    if (web.fillOtp(code)) { listener.onState(state, "email code inserted"); settle(650); web.clickProgress(); settle(2600); continue; }'
if old_otp not in s:
    raise SystemExit('FlowEngine OTP fill marker not found')
s = s.replace(old_otp, new_otp, 1)
p.write_text(s)

# --- Regression tests: protect the exact bugs seen on the physical phone. ---
t = Path('tools/account-factory-android/app/src/test/java/com/amir/accountfactory/TikTokEmailOtpCookieRegressionTest.java')
t.parent.mkdir(parents=True, exist_ok=True)
t.write_text(r'''package com.amir.accountfactory;

import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;

public class TikTokEmailOtpCookieRegressionTest {
    @Test public void jsRecognizesTikTokEmailOtpRouteBeforePhoneHeuristic() throws Exception {
        String js = JsScripts.action("detect", new JSONObject());
        int emailRoute = js.indexOf("/signup/email/digit-code");
        int phoneHeuristic = js.indexOf("const phoneish=");
        assertTrue(emailRoute >= 0);
        assertTrue(phoneHeuristic >= 0);
        assertTrue("email OTP route must be checked before phone heuristic", emailRoute < phoneHeuristic);
    }

    @Test public void jsContainsExactTikTokAllowAllCookieAction() throws Exception {
        String js = JsScripts.action("dismiss", new JSONObject());
        assertTrue(js.contains("'allow all'"));
        assertTrue(js.contains("clickTargets(['allow all'"));
    }

    @Test public void otpFillerSupportsSegmentedDigitInputs() throws Exception {
        String js = JsScripts.action("fillOtp", new JSONObject().put("code", "123456"));
        assertTrue(js.contains("maxlength"));
        assertTrue(js.contains("parts.length>=code.length"));
        assertTrue(js.contains("setNative(parts[i],code[i])"));
    }
}
''')

# Static source assertions make the patch fail closed if later source reconstruction changes.
js = (root / 'JsScripts.java').read_text()
flow = (root / 'FlowEngine.java').read_text()
assert "'/signup/email/digit-code'" in js
assert "['allow all','allow all cookies'" in js
assert 'parts.length>=code.length' in js
assert 'currentUrl.contains("/signup/email/digit-code")' in flow
assert 'email code inserted' in flow

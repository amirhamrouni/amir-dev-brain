from pathlib import Path
import runpy

# v1.5b already contains: 16-char TikTok password, email digit-code=>EMAIL_OTP,
# exact "Allow all" cookie handling, segmented OTP input support, and Mail.tm parser fixes.
runpy.run_path('.github/scripts/fix_account_factory_v15b.py', run_name='__main__')

root = Path('tools/account-factory-android/app/src/main/java/com/amir/accountfactory')
p = root / 'MailTmClient.java'
s = p.read_text()

# Global pacing + domain cache prevents request bursts from tripping Mail.tm 429.
marker = '    private static final String PASSWORD_CHARS = "abcdef0123456789";\n'
fields = '''    private static final String PASSWORD_CHARS = "abcdef0123456789";
    private static final Object RATE_LOCK = new Object();
    private static long lastRequestAtMs = 0L;
    private static volatile List<String> cachedDomains = null;
    private static volatile long cachedDomainsUntilMs = 0L;
'''
if 'RATE_LOCK' not in s:
    if marker not in s:
        raise SystemExit('MailTmClient field marker not found')
    s = s.replace(marker, fields, 1)

# Stronger bounded 429 backoff when POST /accounts is rate-limited.
old = '''                last = rr.code + ": " + trim(rr.body, 180);
                if (rr.code == 429) Thread.sleep(1800L);
                else if (rr.code >= 500) Thread.sleep(900L);
'''
new = '''                last = rr.code + ": " + trim(rr.body, 180);
                if (rr.code == 429) Thread.sleep(rateBackoffMs(i));
                else if (rr.code >= 500) Thread.sleep(1800L);
'''
if old not in s:
    raise SystemExit('Mail.tm account rate-limit marker not found')
s = s.replace(old, new, 1)

# Cache domains for 15 minutes and retry GET /domains on 429/5xx.
old_domains = '''    private List<String> activeDomains() throws Exception {
        Response r = request("GET", BASE + "/domains", null, null);
        if (r.code < 200 || r.code >= 300) throw new IllegalStateException("Mail.tm domains failed: " + r.code);
        JSONArray rows = collection(r.body);
        ArrayList<String> out = new ArrayList<>();
        for (int i=0;i<rows.length();i++) {
            JSONObject x = rows.getJSONObject(i);
            if (x.optBoolean("isActive", true) && !x.optBoolean("isPrivate", false) && !x.optString("domain", "").trim().isEmpty()) out.add(x.getString("domain"));
        }
        return out;
    }
'''
new_domains = '''    private synchronized List<String> activeDomains() throws Exception {
        long now = System.currentTimeMillis();
        if (cachedDomains != null && now < cachedDomainsUntilMs && !cachedDomains.isEmpty()) return new ArrayList<>(cachedDomains);
        Response r = null;
        long[] waits = new long[]{0L, 2500L, 6000L, 12000L};
        for (int i=0;i<waits.length;i++) {
            if (waits[i] > 0) Thread.sleep(waits[i]);
            r = request("GET", BASE + "/domains", null, null);
            if (r.code >= 200 && r.code < 300) break;
            if (!(r.code == 429 || r.code >= 500)) break;
        }
        if (r == null || r.code < 200 || r.code >= 300) throw new IllegalStateException("Mail.tm domains failed: " + (r == null ? 0 : r.code));
        JSONArray rows = collection(r.body);
        ArrayList<String> out = new ArrayList<>();
        for (int i=0;i<rows.length();i++) {
            JSONObject x = rows.getJSONObject(i);
            if (x.optBoolean("isActive", true) && !x.optBoolean("isPrivate", false) && !x.optString("domain", "").trim().isEmpty()) out.add(x.getString("domain"));
        }
        if (!out.isEmpty()) {
            cachedDomains = new ArrayList<>(out);
            cachedDomainsUntilMs = System.currentTimeMillis() + 15L * 60L * 1000L;
        }
        return out;
    }
'''
if old_domains not in s:
    raise SystemExit('Mail.tm activeDomains marker not found')
s = s.replace(old_domains, new_domains, 1)

# Pace every Mail.tm request to <= ~2.2 req/s, well below service burst limits.
old_req = '''    private static Response request(String method, String url, String body, String token) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
'''
new_req = '''    private static Response request(String method, String url, String body, String token) throws Exception {
        throttle();
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
'''
if old_req not in s:
    raise SystemExit('Mail.tm request marker not found')
s = s.replace(old_req, new_req, 1)

insert_marker = '    private static String readAll(InputStream in) throws Exception {\n'
helpers = '''    static long rateBackoffMs(int attempt) {
        long[] waits = new long[]{3000L, 7000L, 15000L, 25000L, 35000L};
        int i = Math.max(0, Math.min(attempt, waits.length - 1));
        return waits[i];
    }

    private static void throttle() throws InterruptedException {
        synchronized (RATE_LOCK) {
            long now = System.currentTimeMillis();
            long wait = 450L - (now - lastRequestAtMs);
            if (wait > 0) Thread.sleep(wait);
            lastRequestAtMs = System.currentTimeMillis();
        }
    }

'''
if 'static long rateBackoffMs(' not in s:
    if insert_marker not in s:
        raise SystemExit('Mail.tm helper insertion marker not found')
    s = s.replace(insert_marker, helpers + insert_marker, 1)
p.write_text(s)

# If provider remains rate-limited after bounded retries, cool down before next persona.
p = root / 'Runner.java'
s = p.read_text()
old_catch = '''        catch (Exception e) {
            account.status="EMAIL_ERROR"; account.notes=trim(e.toString(),500); db.update(account);
            log(account.id,"ERROR","Email provider: " + e.getMessage()); return;
        }
'''
new_catch = '''        catch (Exception e) {
            account.status="EMAIL_ERROR"; account.notes=trim(e.toString(),500); db.update(account);
            String mailError = String.valueOf(e.getMessage());
            log(account.id,"ERROR","Email provider: " + mailError);
            if (mailError.contains("429")) {
                log(account.id,"WARN","Mail.tm rate limited; cooling down before next persona");
                sleep(30000L);
            }
            return;
        }
'''
if old_catch not in s:
    raise SystemExit('Runner email-error marker not found')
s = s.replace(old_catch, new_catch, 1)
p.write_text(s)

# Regression policy test for 429 backoff.
t = Path('tools/account-factory-android/app/src/test/java/com/amir/accountfactory/MailTmBackoffPolicyTest.java')
t.parent.mkdir(parents=True, exist_ok=True)
t.write_text('''package com.amir.accountfactory;\n\nimport org.junit.Test;\nimport static org.junit.Assert.*;\n\npublic class MailTmBackoffPolicyTest {\n    @Test public void backoffIsIncreasingAndBounded() {\n        assertEquals(3000L, MailTmClient.rateBackoffMs(0));\n        assertEquals(7000L, MailTmClient.rateBackoffMs(1));\n        assertEquals(15000L, MailTmClient.rateBackoffMs(2));\n        assertEquals(25000L, MailTmClient.rateBackoffMs(3));\n        assertEquals(35000L, MailTmClient.rateBackoffMs(4));\n        assertEquals(35000L, MailTmClient.rateBackoffMs(99));\n    }\n}\n''')

# Fail closed if critical v1.5 fixes disappeared during reconstruction.
js = (root / 'JsScripts.java').read_text()
flow = (root / 'FlowEngine.java').read_text()
runner = (root / 'Runner.java').read_text()
mail = (root / 'MailTmClient.java').read_text()
assert "/signup/email/digit-code" in js and "EMAIL_OTP" in js
assert "['allow all','allow all cookies'" in js
assert "parts.length>=code.length" in js
assert "email code inserted" in flow
assert "rateBackoffMs" in mail and "cachedDomainsUntilMs" in mail and "throttle();" in mail
assert "Mail.tm rate limited; cooling down" in runner

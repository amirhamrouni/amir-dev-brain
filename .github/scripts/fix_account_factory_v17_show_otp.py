from pathlib import Path
import runpy

runpy.run_path('.github/scripts/fix_account_factory_v16.py', run_name='__main__')

root = Path('tools/account-factory-android/app/src/main/java/com/amir/accountfactory')
p = root / 'Runner.java'
s = p.read_text()
old = '''                            String code = mail.waitForCode(current.mailToken, cfg.emailCodeTimeoutSeconds, current.platform, attemptStarted);\n                            if (!code.trim().isEmpty()) { current.lastCode=code; db.update(current); }\n                            return code;'''
new = '''                            String code = mail.waitForCode(current.mailToken, cfg.emailCodeTimeoutSeconds, current.platform, attemptStarted);\n                            if (!code.trim().isEmpty()) {\n                                current.lastCode = code;\n                                current.notes = "Email OTP captured and saved securely";\n                                db.update(current);\n                                ui.log("[OTP] #" + current.id + " " + current.platform + " EMAIL OTP: " + code);\n                                change.changed();\n                            }\n                            return code;'''
if old not in s:
    raise SystemExit('Runner OTP capture marker not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Regression: captured OTP must be visible to the user while remaining persisted in encrypted last_code.
t = Path('tools/account-factory-android/app/src/test/java/com/amir/accountfactory/OtpVisibilityRegressionTest.java')
t.parent.mkdir(parents=True, exist_ok=True)
t.write_text('''package com.amir.accountfactory;\n\nimport org.junit.Test;\nimport static org.junit.Assert.*;\nimport java.nio.file.*;\n\npublic class OtpVisibilityRegressionTest {\n    @Test public void runnerDisplaysCapturedOtpAndPersistsLastCode() throws Exception {\n        String src = Files.readString(Paths.get("src/main/java/com/amir/accountfactory/Runner.java"));\n        assertTrue(src.contains("current.lastCode = code"));\n        assertTrue(src.contains("EMAIL OTP: " + code));\n        assertTrue(src.contains("db.update(current)"));\n    }\n}\n''')

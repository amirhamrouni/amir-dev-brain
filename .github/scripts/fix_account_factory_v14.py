from pathlib import Path
import runpy

runpy.run_path('.github/scripts/fix_account_factory_v13.py', run_name='__main__')

root = Path('tools/account-factory-android/app/src/main/java/com/amir/accountfactory')
p = root / 'PersonaGenerator.java'
s = p.read_text()
old = '''    public static String makePassword() {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < 18; i++) b.append(PASSWORD_CHARS.charAt(R.nextInt(PASSWORD_CHARS.length())));
        b.append('A').append('a').append('7').append('!');
        return b.toString();
    }
'''
new = '''    public static String makePassword() {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < 12; i++) b.append(PASSWORD_CHARS.charAt(R.nextInt(PASSWORD_CHARS.length())));
        b.append('A').append('a').append('7').append('!');
        return b.toString();
    }
'''
if old not in s:
    raise SystemExit('PersonaGenerator password block not found')
s = s.replace(old, new)
p.write_text(s)

t = Path('tools/account-factory-android/app/src/test/java/com/amir/accountfactory/PersonaPasswordPolicyTest.java')
t.parent.mkdir(parents=True, exist_ok=True)
t.write_text('''package com.amir.accountfactory;\n\nimport org.junit.Test;\nimport static org.junit.Assert.*;\n\npublic class PersonaPasswordPolicyTest {\n    @Test public void generatedPasswordsFitTikTokPolicy() {\n        for (int i=0;i<200;i++) {\n            String p = PersonaGenerator.makePassword();\n            assertTrue("length=" + p.length(), p.length() >= 8 && p.length() <= 20);\n            assertEquals(16, p.length());\n            assertTrue(p.matches(".*[A-Za-z].*"));\n            assertTrue(p.matches(".*[0-9].*"));\n            assertTrue(p.matches(".*[^A-Za-z0-9].*"));\n        }\n    }\n}\n''')

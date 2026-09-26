# Amir User-Correction Protocol

Purpose: convert Amir's direct corrections into durable working rules so the same mistake is not repeated across chats, agents, prompts, scripts, or project steps.

## Authority
- When Amir explicitly corrects wording, pronunciation, dialect, workflow, sequence, UI behavior, or a project rule, the correction overrides the assistant/model's previous version.
- A direct correction from Amir is an approved working rule unless he later replaces it.
- Do not preserve the wrong form beside the corrected form as an equally valid alternative.

## Mandatory correction loop
1. Identify exactly what was wrong.
2. Replace the wrong value/form in the current output.
3. Propagate the correction through every later step/frame/template that depends on it.
4. Record the reusable correction in Amir Dev Brain when it can affect future work.
5. Before producing the next related output, check the latest recorded correction first.
6. If Amir corrects the correction again, the newest explicit correction wins.

## Tunisian dialogue / Google Vids rules
- Prefer Amir's own Tunisian wording and pronunciation over generic Arabic or guessed Tunisian.
- For Latin Tunisian, preserve the exact wording Amir approves; do not silently rewrite it into MSA or another dialect.
- Current approved correction: use `ena el mo7ami` for «أنا المحامي» in this script context, not `ena m7ami`.
- Current approved address: `Ya ra2is el markaz` for «يا رئيس المركز».
- When dialogue is intended for generation, verify speaker, wording, pronunciation, continuity, and scene order before delivery.

## Persistence rule
Any future explicit correction from Amir that changes how a recurring task should be done must be added to the relevant Amir Brain rule/protocol/project record instead of remaining only in chat history.

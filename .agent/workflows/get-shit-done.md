---
description: Ativa o framework GSD (Spec-Driven Development) para desenvolver uma funcionalidade complexa com segurança, planejamento e commits atômicos.
---
# Get Shit Done (GSD) Framework

Quando acionado, você, o Agente de IA, deve abandonar a abordagem de "sair codando" e seguir estritamente o pipeline de Spec-Driven Development, inspirado no repositório gsd-build.

## Fases do GSD:

**Passo 1: Planejamento (PLAN)**
1. Leia o requerimento do usuário com profundidade.
2. Crie um artefato ou arquivo `PLAN.md` detalhando *exatamente* o que precisa ser feito em passos técnicos e pequenos (máximo de 3 passos viáveis). Trabalhe sempre de trás para a frente a partir do objetivo pretendido.
3. Pare e apresente o plano ao usuário para aprovação. Não escreva código ainda.

**Passo 2: Execução Atômica (EXECUTE)**
1. Com o plano aprovado, inicie o **Passo 1 do PLAN.md**.
2. Escreva o código estritamente necessário para aquele único passo. Não tente resolver todo o problema de uma vez.
3. Se o passo for grande demais, divida-o novamente.

**Passo 3: Verificação (VERIFY)**
1. Confirme se as mudanças não quebraram lógicas adjacentes no projeto. Verifique tipagens e rotas.
2. Auxilie o usuário informando como testar o passo atômico acabado de concluir.

**Passo 4: Registro (COMMIT / STATE)**
1. Crie ou atualize o documento `STATE.md` se aplicável (para projetos grandes), documentando a etapa que acabou de vencer.
2. Avance para o próximo passo no plano.

O foco total é evitar regressões de código mantendo sub-tarefas pequenas e controláveis.

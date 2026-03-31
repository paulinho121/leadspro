---
description: Instrui o Agente de IA a compreender, gerar e gerenciar documentação e diagramas nativos do Obsidian (Markdown avançado e JSON Canvas).
---

# Obsidian Agent Skills

Ao receber tarefas de documentação arquitetural, visão geral do projeto ou mapeamento visual de fluxos complexos (como AgentMatrix ou Bancos de Dados) e quando instruído neste workflow, adote um formato nativamente compatível e maximizado para o **Obsidian**.

## 1. Documentação (Obsidian Markdown)
*   **Wikilinks Bi-Direcionais:** Quando você mencionar arquivos importantes, serviços ou componentes React, utilize formato de wikilinks em Markdown: `[[Nome_do_Arquivo.ts]]` ou `[[Serviço de Descoberta]]`.
*   **Frontmatter Padrão:** Todo novo documento `md` criado na documentação deverá nascer com o Properties Base YAML do Obsidian:
    ```yaml
    ---
    tag: [leadpro, architecture]
    date: {DATA_ATUAL}
    status: draft # ou active
    ---
    ```
*   **Callouts de Ênfase:** Ao apresentar riscos de código, segredos ou dependências (ex: Chaves de API), use callouts para chamar a atenção:
    ```markdown
    > [!warning] Perigo
    > O Token do Supabase não deve estar no Front-end!
    ```

## 2. Diagramas de Arquitetura em JSON Canvas (.canvas)
*   O Obsidian usa nativamente os arquivos `.canvas`. Se o usuário pedir um fluxo detalhado visual, não tente gerar Mermaid se o foco for ser visualmente gerenciável; prefira escrever e exportar arquivos `.canvas` gerando as tags.
*   Estrutura de Base JSON do Canvas de um nó simples:
    ```json
    {
      "nodes": [
        {"id": "node1", "type": "text", "text": "Supabase DB", "x": 0, "y": 0, "width": 200, "height": 100}
      ]
    }
    ```
*   Use as propriedades "color" ("1" para vermelho, "2" laranja, "3" amarelo, "4" verde, "5" ciano, "6" roxo) para distinguir entre diferentes camadas da arquitetura do projeto.

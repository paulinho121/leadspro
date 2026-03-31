# Controle de Estado - GSD (Get Shit Done)

## Estado Atual do Refatoramento de Layout

### ✅ Fase A: Componentização Básica
- **Status:** **CONCLUÍDO**
- **O que foi feito:**
  - Extração da `<aside>` com mais de 250 linhas do `App.tsx` para `components/layout/Sidebar.tsx`.
  - Extração do `<nav>` inferior (Mobile) para `components/layout/MobileNav.tsx`.
  - Remoção dos estados atrelados especificamente ao Layout (como `showAccountCard`) para os devidos componentes.
  - Limpeza estrutural do Root `App.tsx`.

### ✅ Fase B: Componentização do Header 
- **Status:** **CONCLUÍDO**
- **O que foi feito:** O `<header>` complexo foi isolado em `components/layout/Header.tsx`, limpando ainda mais a raiz da UI sem quebrar os contadores reativos.

### ✅ Fase C: Centralização (Shell)
- **Status:** **CONCLUÍDO (Otimizado)**
- **O que foi feito:** Após a restauração e refatoração em blocos atômicos, o próprio `App.tsx` agora atua como o *Shell Orchestrator*. Ele apenas invoca `<Sidebar />`, `<MobileNav />` e `<Header />` repassando as props necessárias. Criar um `<MainLayout>` intermediário adicionaria *prop-drilling* redundante, então a estrutura atual é a mais eficiente.

---
*Este arquivo documenta as mudanças atômicas para que possamos rastrear regressões caso ocorram.*

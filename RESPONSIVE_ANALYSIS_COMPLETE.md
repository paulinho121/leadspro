/* ========================================
   RESPONSIVE MASTER SYSTEM - LEADPRO
   100% Responsive Design Implementation
   ======================================== */

/* 🎯 BREAKPOINT SYSTEM */
:root {
  /* Breakpoints Padronizados */
  --bp-xs: 0px;
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
  --bp-2xl: 1536px;
  
  /* Container Widths */
  --container-xs: 100%;
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  --container-2xl: 1536px;
  
  /* Spacing Scale */
  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  
  /* Typography Fluid */
  --text-xs: clamp(0.75rem, 2vw, 0.875rem);
  --text-sm: clamp(0.875rem, 2.5vw, 1rem);
  --text-base: clamp(1rem, 3vw, 1.125rem);
  --text-lg: clamp(1.125rem, 3.5vw, 1.25rem);
  --text-xl: clamp(1.25rem, 4vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 5vw, 2rem);
  --text-3xl: clamp(1.875rem, 6vw, 2.5rem);
  --text-4xl: clamp(2.25rem, 7vw, 3rem);
}

/* 🏗️ CONTAINER SYSTEM */
.container-master {
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--space-md);
}

@media (min-width: 640px) {
  .container-master {
    max-width: var(--container-sm);
    padding: 0 var(--space-lg);
  }
}

@media (min-width: 768px) {
  .container-master {
    max-width: var(--container-md);
    padding: 0 var(--space-xl);
  }
}

@media (min-width: 1024px) {
  .container-master {
    max-width: var(--container-lg);
  }
}

@media (min-width: 1280px) {
  .container-master {
    max-width: var(--container-xl);
  }
}

@media (min-width: 1536px) {
  .container-master {
    max-width: var(--container-2xl);
  }
}

/* 📱 SAFE AREA COMPLETE */
.safe-area-all {
  padding-top: max(env(safe-area-inset-top), var(--space-md));
  padding-right: max(env(safe-area-inset-right), var(--space-md));
  padding-bottom: max(env(safe-area-inset-bottom), var(--space-md));
  padding-left: max(env(safe-area-inset-left), var(--space-md));
}

.safe-area-top {
  padding-top: max(env(safe-area-inset-top), var(--space-md));
}

.safe-area-bottom {
  padding-bottom: max(env(safe-area-inset-bottom), var(--space-md));
}

.safe-area-sides {
  padding-left: max(env(safe-area-inset-left, var(--space-md));
  padding-right: max(env(safe-area-inset-right, var(--space-md));
}

/* Landscape Safe Areas */
@media (orientation: landscape) {
  .safe-area-landscape {
    padding-left: max(env(safe-area-inset-left, var(--space-md));
    padding-right: max(env(safe-area-inset-right, var(--space-md));
  }
}

/* 📏 TYPOGRAPHY FLUID SYSTEM */
.text-fluid-xs { font-size: var(--text-xs); line-height: 1.4; }
.text-fluid-sm { font-size: var(--text-sm); line-height: 1.5; }
.text-fluid-base { font-size: var(--text-base); line-height: 1.6; }
.text-fluid-lg { font-size: var(--text-lg); line-height: 1.6; }
.text-fluid-xl { font-size: var(--text-xl); line-height: 1.5; }
.text-fluid-2xl { font-size: var(--text-2xl); line-height: 1.4; }
.text-fluid-3xl { font-size: var(--text-3xl); line-height: 1.3; }
.text-fluid-4xl { font-size: var(--text-4xl); line-height: 1.2; }

/* Heading Fluid System */
.heading-fluid-1 { font-size: var(--text-4xl); font-weight: 800; line-height: 1.1; }
.heading-fluid-2 { font-size: var(--text-3xl); font-weight: 700; line-height: 1.2; }
.heading-fluid-3 { font-size: var(--text-2xl); font-weight: 600; line-height: 1.3; }
.heading-fluid-4 { font-size: var(--text-xl); font-weight: 600; line-height: 1.4; }
.heading-fluid-5 { font-size: var(--text-lg); font-weight: 500; line-height: 1.5; }
.heading-fluid-6 { font-size: var(--text-base); font-weight: 500; line-height: 1.6; }

/* 🎨 GRID SYSTEM AVANÇADO */
.grid-master {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
}

@media (min-width: 640px) {
  .grid-master {
    gap: var(--space-lg);
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

@media (min-width: 768px) {
  .grid-master {
    gap: var(--space-xl);
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }
}

@media (min-width: 1024px) {
  .grid-master {
    gap: var(--space-xl);
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }
}

/* Grid Específicos */
.grid-2-master {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .grid-2-master {
    grid-template-columns: repeat(2, 1fr);
  }
}

.grid-3-master {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .grid-3-master {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-3-master {
    grid-template-columns: repeat(3, 1fr);
  }
}

.grid-4-master {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .grid-4-master {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-4-master {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 📱 NAVIGATION RESPONSIVA */
.nav-master {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  flex-wrap: wrap;
}

@media (min-width: 768px) {
  .nav-master {
    flex-wrap: nowrap;
    padding: var(--space-md) var(--space-lg);
  }
}

/* Sidebar Responsivo */
.sidebar-master {
  position: fixed;
  top: 0;
  left: -100%;
  width: 280px;
  height: 100vh;
  background: var(--color-surface);
  transition: left 0.3s ease;
  z-index: 50;
  overflow-y: auto;
}

.sidebar-master.open {
  left: 0;
}

@media (min-width: 1024px) {
  .sidebar-master {
    position: static;
    width: auto;
    height: auto;
    left: auto;
    transition: none;
  }
}

/* 🎯 CARD SYSTEM */
.card-master {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: var(--space-md);
  transition: all 0.3s ease;
}

@media (min-width: 768px) {
  .card-master {
    padding: var(--space-lg);
    border-radius: 1rem;
  }
}

.card-master:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

/* 📊 TABLE RESPONSIVE */
.table-master {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table-master th,
.table-master td {
  padding: var(--space-sm);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

@media (min-width: 768px) {
  .table-master th,
  .table-master td {
    padding: var(--space-md);
  }
}

/* Table Mobile - Card View */
@media (max-width: 767px) {
  .table-master,
  .table-master thead,
  .table-master tbody,
  .table-master th,
  .table-master td,
  .table-master tr {
    display: block;
  }
  
  .table-master thead tr {
    position: absolute;
    top: -9999px;
    left: -9999px;
  }
  
  .table-master tr {
    border: 1px solid var(--color-border);
    margin-bottom: var(--space-md);
    border-radius: 0.5rem;
  }
  
  .table-master td {
    border: none;
    border-bottom: 1px solid var(--color-border);
    position: relative;
    padding-left: 50%;
  }
  
  .table-master td:before {
    position: absolute;
    top: var(--space-sm);
    left: var(--space-sm);
    width: 45%;
    padding-right: 10px;
    white-space: nowrap;
    font-weight: 600;
  }
}

/* 🎪 FORM RESPONSIVE */
.form-master {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

@media (min-width: 768px) {
  .form-master {
    max-width: 600px;
    margin: 0 auto;
  }
}

.form-group-master {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

@media (min-width: 768px) {
  .form-group-master {
    flex-direction: row;
    align-items: flex-end;
  }
  
  .form-group-master > * {
    flex: 1;
  }
}

/* 🎯 BUTTON RESPONSIVE */
.btn-master {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-md);
  border-radius: 0.5rem;
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px;
  min-width: 44px;
}

@media (min-width: 768px) {
  .btn-master {
    padding: var(--space-md) var(--space-lg);
    font-size: var(--text-base);
    border-radius: 0.75rem;
  }
}

/* 📱 MOBILE OPTIMIZATIONS */

/* Touch Targets */
@media (pointer: coarse) {
  .btn-master,
  button,
  a,
  [role="button"],
  input,
  select,
  textarea {
    min-height: 44px;
    min-width: 44px;
  }
}

/* Hover State Disabled on Touch */
@media (hover: none) {
  .btn-master:hover,
  .card-master:hover,
  .nav-master a:hover {
    transform: none;
  }
}

/* Text Selection */
@media (max-width: 768px) {
  * {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  input,
  textarea {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
  }
}

/* 🎪 ACCESSIBILITY ENHANCEMENTS */

/* Focus Management */
.focus-master:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Skip Links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--color-primary);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 100;
}

.skip-link:focus {
  top: 6px;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* High Contrast */
@media (prefers-contrast: high) {
  .card-master {
    border: 2px solid var(--color-text);
  }
  
  .btn-master {
    border: 2px solid var(--color-text);
  }
}

/* 🖥️ DESKTOP ENHANCEMENTS */

/* Large Screens */
@media (min-width: 1920px) {
  .container-master {
    max-width: 1920px;
  }
  
  .text-fluid-4xl {
    font-size: clamp(3rem, 8vw, 4rem);
  }
}

/* Ultra-wide Screens */
@media (min-width: 2560px) {
  .container-master {
    max-width: 2560px;
  }
  
  .grid-master {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  }
}

/* 📱 MOBILE SPECIFIC FIXES */

/* iOS Safari */
@supports (-webkit-touch-callout: none) {
  .container-master {
    padding-left: calc(env(safe-area-inset-left) + var(--space-md));
    padding-right: calc(env(safe-area-inset-right) + var(--space-md));
  }
}

/* Android Chrome */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  .btn-master {
    padding: calc(var(--space-sm) + 2px) calc(var(--space-md) + 2px);
  }
}

/* Small Screens */
@media (max-width: 380px) {
  .container-master {
    padding: 0 var(--space-sm);
  }
  
  .card-master {
    padding: var(--space-sm);
  }
  
  .text-fluid-sm {
    font-size: 0.875rem;
  }
}

/* 🎯 UTILIDADES RESPONSIVAS */

.hide-mobile { display: block; }
.hide-tablet { display: block; }
.hide-desktop { display: block; }

@media (max-width: 767px) {
  .hide-mobile { display: none !important; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .hide-tablet { display: none !important; }
}

@media (min-width: 1024px) {
  .hide-desktop { display: none !important; }
}

.show-mobile { display: none; }
.show-tablet { display: none; }
.show-desktop { display: none; }

@media (max-width: 767px) {
  .show-mobile { display: block !important; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .show-tablet { display: block !important; }
}

@media (min-width: 1024px) {
  .show-desktop { display: block !important; }
}

/* 🎪 DEBUG RESPONSIVE */

/* Responsive Debug Border (remover em produção) */
.responsive-debug {
  border: 2px solid red;
}

@media (max-width: 767px) {
  .responsive-debug::before {
    content: "MOBILE";
    position: absolute;
    top: 0;
    left: 0;
    background: red;
    color: white;
    padding: 2px 6px;
    font-size: 10px;
    z-index: 9999;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .responsive-debug::before {
    content: "TABLET";
    position: absolute;
    top: 0;
    left: 0;
    background: orange;
    color: white;
    padding: 2px 6px;
    font-size: 10px;
    z-index: 9999;
  }
}

@media (min-width: 1024px) {
  .responsive-debug::before {
    content: "DESKTOP";
    position: absolute;
    top: 0;
    left: 0;
    background: green;
    color: white;
    padding: 2px 6px;
    font-size: 10px;
    z-index: 9999;
  }
}

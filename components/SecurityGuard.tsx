
import React, { useEffect } from 'react';

// ⚠️ DEV MODE: SecurityGuard bloqueios desabilitados temporariamente para debugging.
// Re-habilitar antes de ir para produção descomentando o SecurityGuard original.
const SecurityGuard: React.FC = () => {
    useEffect(() => {
        // Mensagem de boas-vindas no console (mantida)
        console.log(
            "%c🚀 LEADFLOW PRO - NEURAL MATRIX v3.5 [DEV MODE ATIVO]",
            "color: #f97316; font-size: 20px; font-weight: bold;"
        );
        console.log(
            "%c⚠️  SecurityGuard desabilitado para debug. Não esqueça de reabilitar em produção!",
            "color: #facc15; font-size: 13px; font-weight: 500;"
        );
    }, []);

    // Retorna null — sem bloqueios, sem overlay
    return null;
};

export default SecurityGuard;

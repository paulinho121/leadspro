
import React, { useState, useRef } from 'react';
import {
    Upload, FileText, Check,
    AlertCircle, X, Loader2,
    Database, Phone, Mail, User
} from 'lucide-react';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { LeadStatus } from '../types';

interface LeadImporterProps {
    tenantId: string;
    onImportComplete: () => void;
}

const LeadImporter: React.FC<LeadImporterProps> = ({ tenantId, onImportComplete }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successCount, setSuccessCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = event.target?.result;
            if (selectedFile.name.endsWith('.csv')) {
                Papa.parse(selectedFile, {
                    header: true,
                    complete: (results) => {
                        setPreview(results.data.slice(0, 5));
                    },
                    error: (err) => setError('Erro ao ler CSV: ' + err.message)
                });
            } else {
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet);
                setPreview(json.slice(0, 5));
            }
        };

        if (selectedFile.name.endsWith('.csv')) {
            reader.readAsText(selectedFile);
        } else {
            reader.readAsBinaryString(selectedFile);
        }
    };

    const processImport = async () => {
        if (!file || !tenantId) return;
        setIsProcessing(true);
        setError(null);

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                let leads: any[] = [];
                const data = event.target?.result;

                if (file.name.endsWith('.csv')) {
                    const results = Papa.parse(data as string, { header: true });
                    leads = results.data;
                } else {
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    leads = XLSX.utils.sheet_to_json(sheet);
                }

                // Normalização de campos com suporte a múltiplos nomes (Excel comum)
                const formattedLeads = leads
                    .filter(l => (l.nome || l.name || l.empresa || l.company)) // Garante que tem nome
                    .map(l => ({
                        tenant_id: tenantId,
                        name: l.nome || l.name || l.empresa || l.company,
                        phone: String(l.telefone || l.phone || l.whatsapp || l.celular || ''),
                        email: l.email || l.mail || l.correio || '',
                        website: l.website || l.site || '',
                        industry: l.nicho || l.industry || l.setor || 'Importado',
                        location: l.localizacao || l.location || l.cidade || '',
                        status: LeadStatus.NEW,
                        details: { ...l, source: 'excel_import' }
                    }));

                if (formattedLeads.length === 0) {
                    throw new Error('Nenhum dado válido encontrado no arquivo.');
                }

                // Inserir no Supabase (Batch de 500 por vez)
                const batchSize = 500;
                let count = 0;
                for (let i = 0; i < formattedLeads.length; i += batchSize) {
                    const batch = formattedLeads.slice(i, i + batchSize);
                    const { error: insertError } = await supabase
                        .from('leads')
                        .insert(batch);

                    if (insertError) throw insertError;
                    count += batch.length;
                }

                setSuccessCount(count);
                onImportComplete();
                setTimeout(() => {
                    setFile(null);
                    setPreview([]);
                    setSuccessCount(0);
                }, 3000);
            };

            if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reader.readAsBinaryString(file);
            }
        } catch (err: any) {
            console.error('Erro na importação:', err);
            setError(err.message || 'Falha ao processar arquivo.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="glass-strong p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Database size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Importação de Leads</h3>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em]">Format_Support:_.xlsx,_.csv</p>
                </div>
            </div>

            {!file ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                >
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-all">
                        <Upload className="text-slate-500 group-hover:text-primary" size={32} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-white">Clique ou arraste seu arquivo</p>
                        <p className="text-[10px] text-slate-500 uppercase mt-1">Colunas recomendadas: Nome, Telefone, Email</p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileChange}
                    />
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-4">
                            <FileText className="text-primary" size={24} />
                            <div>
                                <p className="text-sm font-bold text-white">{file.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        <button onClick={() => setFile(null)} className="text-slate-500 hover:text-white p-2">
                            <X size={20} />
                        </button>
                    </div>

                    {preview.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Pré-visualização (Primeiras 5 linhas)</p>
                            <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
                                <table className="w-full text-[10px] text-left">
                                    <thead className="bg-white/5 text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-2">Nome</th>
                                            <th className="px-4 py-2">Contato</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {preview.map((row, i) => (
                                            <tr key={i} className="text-slate-300">
                                                <td className="px-4 py-3 font-bold truncate max-w-[150px]">{row.nome || row.name || row.empresa || 'N/A'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Phone size={10} className="text-primary/50" />
                                                        <span>{row.telefone || row.phone || 'N/A'}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs">
                            <AlertCircle size={16} />
                            <p>{error}</p>
                        </div>
                    )}

                    {successCount > 0 && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-500 text-xs animate-in zoom-in-95">
                            <Check size={16} />
                            <p>Sucesso! {successCount} leads importados e prontos para prospecção.</p>
                        </div>
                    )}

                    <button
                        onClick={processImport}
                        disabled={isProcessing || successCount > 0}
                        className="w-full py-5 bg-primary text-slate-900 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Mapeando Dados...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Confirmar Importação
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default LeadImporter;

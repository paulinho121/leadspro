
import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Users, CheckCircle, Download, MoreHorizontal,
  Mail, Phone, ExternalLink, Sparkles, Filter
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface LeadDashboardProps {
  leads: Lead[];
  onEnrich: (lead: Lead) => void;
}

const LeadDashboard: React.FC<LeadDashboardProps> = ({ leads, onEnrich }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const stats = [
    { label: 'Total Leads', value: leads.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Enriched', value: leads.filter(l => l.status === LeadStatus.ENRICHED).length, icon: Sparkles, color: 'bg-purple-500' },
    { label: 'Converted', value: leads.filter(l => l.status === LeadStatus.EXPORTED).length, icon: CheckCircle, color: 'bg-emerald-500' },
    { label: 'Win Rate', value: '12%', icon: TrendingUp, color: 'bg-orange-500' },
  ];

  const chartData = [
    { name: 'Software', value: 45 },
    { name: 'Energy', value: 25 },
    { name: 'Logistics', value: 30 },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`${stat.color} p-3 rounded-lg text-white shadow-lg shadow-${stat.color.split('-')[1]}-100`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h4 className="text-2xl font-bold text-slate-800">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-lg font-bold text-slate-800">Recent Leads</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Filter leads..."
                  className="pl-4 pr-10 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Filter className="absolute right-3 top-2 w-4 h-4 text-slate-400" />
              </div>
              <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                <Download className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Industry</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{lead.name}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> {lead.website}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                        {lead.industry}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        lead.status === LeadStatus.ENRICHED ? 'bg-purple-100 text-purple-700' :
                        lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                          <Mail className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all">
                          <Phone className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => onEnrich(lead)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        {lead.status === LeadStatus.ENRICHED ? 'View' : 'Enrich'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[300px]">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Distribution by Industry</h3>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-xs font-medium text-slate-500 mt-2">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> SaaS</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500" /> Energy</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Logistics</span>
            </div>
          </div>

          <div className="bg-blue-600 p-6 rounded-xl shadow-lg shadow-blue-200 text-white relative overflow-hidden">
            <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-white/10 rotate-12" />
            <h3 className="text-lg font-bold mb-2">Upgrade to Pro</h3>
            <p className="text-blue-100 text-sm mb-4 relative z-10">Get 10x more leads and automatic CRM sync with Gemini Advanced integration.</p>
            <button className="w-full py-2 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors relative z-10">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDashboard;

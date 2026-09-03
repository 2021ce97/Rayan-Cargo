import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  X, 
  Server, 
  Layers, 
  ShieldCheck, 
  Terminal,
  Code2,
  FileCode,
  HardDrive
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const { t, language, syncWithDatabase } = useApp();
  const isRtl = language === 'fa' || language === 'ps';
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [sqlSchema, setSqlSchema] = useState('');
  const [activeTab, setActiveTab] = useState<'status' | 'guide' | 'sql'>('status');

  // Interactive connection states
  const [dbPassword, setDbPassword] = useState('');
  const [connectionString, setConnectionString] = useState('');
  const [showAdvancedUri, setShowAdvancedUri] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectResult, setConnectResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchDbInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/database/info');
      if (res.ok) {
        const data = await res.json();
        setDbInfo(data);
      }
      const schemaRes = await fetch('/api/database/schema');
      if (schemaRes.ok) {
        const schemaText = await schemaRes.text();
        setSqlSchema(schemaText);
      }
    } catch (e) {
      console.warn('Failed to fetch db info:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setConnectResult(null);

    try {
      const payload: any = {};
      if (connectionString.trim()) {
        payload.connectionString = connectionString.trim();
      } else if (dbPassword.trim()) {
        payload.password = dbPassword.trim();
      } else {
        setConnectResult({ success: false, message: 'Please enter your Supabase database password.' });
        setIsConnecting(false);
        return;
      }

      const res = await fetch('/api/database/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setConnectResult({ success: true, message: data.message || 'Connected to Supabase PostgreSQL successfully!' });
        await fetchDbInfo();
        await syncWithDatabase();
      } else {
        setConnectResult({ success: false, message: data.error || 'Failed to connect. Please verify your password.' });
      }
    } catch (err: any) {
      setConnectResult({ success: false, message: err.message || 'Network error while contacting database endpoint.' });
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDbInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySchema = () => {
    if (!sqlSchema) return;
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  const handleCopyEnvSample = () => {
    const sample = `DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"`;
    navigator.clipboard.writeText(sample);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" id="supabase-modal-overlay">
      <div 
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        dir={isRtl ? 'rtl' : 'ltr'}
        id="supabase-guide-modal-content"
      >
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Supabase Cloud PostgreSQL Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Database & Cloud Persistence
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Full-stack persistence with PostgreSQL schema auto-migrations and instant in-memory fallback.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Connection Status</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Setup & Connect Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Supabase SQL Schema</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'status' && (
            <div className="space-y-5">
              {/* Connection Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
                dbInfo?.isRealDb 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                  : 'bg-blue-50/80 border-blue-200 text-blue-900'
              }`}>
                <div className="flex items-start gap-3">
                  {dbInfo?.isRealDb ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <HardDrive className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-extrabold text-sm">
                      {dbInfo?.isRealDb ? 'Connected to Supabase PostgreSQL Database' : 'In-Memory Ultra-Fast Database Engine Active'}
                    </div>
                    <p className="text-xs mt-1 text-slate-600">
                      {dbInfo?.isRealDb
                        ? 'Your app is directly reading and writing all records to your cloud Supabase database.'
                        : 'Running with local in-memory zero-latency storage. To connect your remote Supabase database, add DATABASE_URL in Settings.'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-600">
                      <span className="font-semibold text-slate-800">Connection URI:</span>
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-200">{dbInfo?.connectionUrl || 'Local Engine'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={fetchDbInfo}
                  disabled={loading}
                  className="p-2 rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs transition-all flex items-center gap-1.5 font-bold cursor-pointer disabled:opacity-50"
                  title="Test Connection"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Table Records Summary Grid */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Database Tables & Managed Records
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-lg font-black text-slate-900">{dbInfo?.stats?.branches ?? 0}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">branches</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-lg font-black text-slate-900">{dbInfo?.stats?.users ?? 0}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">users</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-lg font-black text-slate-900">{dbInfo?.stats?.shipments ?? 0}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">shipments</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-lg font-black text-slate-900">{dbInfo?.stats?.expenses ?? 0}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">expenses</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-lg font-black text-slate-900">{dbInfo?.stats?.settlements ?? 0}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">settlements</div>
                  </div>
                </div>
              </div>

              {/* Interactive Live Supabase Connection Setup */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg space-y-4 border border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-sm text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>Connect Your Supabase Project (wgdmwuhkuanxykwqvpyp)</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Enter your Supabase database password to instantly connect, run migrations, and synchronize all data to your tables.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    Live Connector
                  </span>
                </div>

                <form onSubmit={handleConnectSupabase} className="space-y-3">
                  {!showAdvancedUri ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Supabase Database Password (Postgres user):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={dbPassword}
                          onChange={(e) => setDbPassword(e.target.value)}
                          placeholder="Enter your Supabase database password..."
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isConnecting || !dbPassword.trim()}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                          <span>{isConnecting ? 'Connecting...' : 'Connect Supabase'}</span>
                        </button>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Target: db.wgdmwuhkuanxykwqvpyp.supabase.co</span>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedUri(true)}
                          className="text-emerald-400 hover:underline cursor-pointer"
                        >
                          Custom URI / Connection String →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-300">
                          Full Direct Connection String (PostgreSQL URI):
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedUri(false)}
                          className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                        >
                          ← Simple Password Mode
                        </button>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={connectionString}
                          onChange={(e) => setConnectionString(e.target.value)}
                          placeholder="postgresql://postgres:[PASSWORD]@db.wgdmwuhkuanxykwqvpyp.supabase.co:5432/postgres"
                          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isConnecting || !connectionString.trim()}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                          <span>{isConnecting ? 'Validating & Migrating Tables...' : 'Test & Connect Custom URI'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {connectResult && (
                    <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      connectResult.success
                        ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-200'
                        : 'bg-red-950/80 border border-red-700 text-red-200'
                    }`}>
                      {connectResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-bold">{connectResult.success ? 'Success!' : 'Connection Warning'}</div>
                        <div className="text-[11px] mt-0.5 opacity-90">{connectResult.message}</div>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Security & Multi-Tenant Highlights */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Automatic Schema Migration & Backward Compatibility</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Upon startup, Rayan Cargo's backend runs automatic <code className="text-red-600 font-mono">CREATE TABLE IF NOT EXISTS</code> and column synchronization (including 13-digit Tazkira ID fields and commission tracking).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-sm">
                  How to Connect Supabase to Rayan Cargo in 4 Steps
                </h3>
                <p className="text-slate-500">
                  Follow this guide to connect your Supabase database in less than 2 minutes.
                </p>
              </div>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center">1</span>
                      <span>Create a Supabase Project</span>
                    </div>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                    >
                      <span>supabase.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-slate-600">
                    Log in to Supabase and create a new project. Choose a region close to your users (e.g. South Asia - Mumbai or Middle East - Bahrain).
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center">2</span>
                    <span>Get Your PostgreSQL Connection String</span>
                  </div>
                  <p className="text-slate-600">
                    In your Supabase project dashboard, navigate to <strong>Project Settings</strong> &rarr; <strong>Database</strong> &rarr; <strong>Connection String</strong>. Select the <strong>URI</strong> tab (or Session / Transaction Pooler on port 6543 / 5432).
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center">3</span>
                      <span>Set the DATABASE_URL Environment Variable</span>
                    </div>
                    <button
                      onClick={handleCopyEnvSample}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedEnv ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedEnv ? 'Copied' : 'Copy Example'}</span>
                    </button>
                  </div>
                  <p className="text-slate-600">
                    Add the <code className="text-emerald-700 font-mono font-bold">DATABASE_URL</code> variable to your project settings with your database password:
                  </p>
                  <pre className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {`DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"`}
                  </pre>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <div className="font-bold text-emerald-950 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center">4</span>
                    <span>Automatic Setup & Instant Synchronization</span>
                  </div>
                  <p className="text-emerald-900">
                    Once the variable is saved, Rayan Cargo automatically connects, validates credentials, creates all required tables and indexes, and synchronizes all branch and shipment records in real time!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">
                    Complete PostgreSQL / Supabase DDL Schema
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    You can execute this directly in Supabase's SQL Editor if you wish to run manual migrations.
                  </p>
                </div>

                <button
                  onClick={handleCopySchema}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL Schema'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-80 border border-slate-800 leading-relaxed">
                  {sqlSchema || 'Loading SQL schema...'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>PostgreSQL 16 &amp; Supabase Engine Ready</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Radio,
  Settings,
  Flame,
  Check,
  Copy,
  Layers,
  Activity,
  Bot,
  MessageSquare,
  HelpCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Source, Digest, DeliveryLog, SupportedLanguage } from '@/lib/types';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'generate' | 'sources' | 'history' | 'settings'>('generate');
  const [sources, setSources] = useState<Source[]>([]);
  const [digests, setDigests] = useState<Digest[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Digest Generation Form State
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('ar');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash-lite');
  const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | 'manual'>('manual');
  const [currentPreviewDigest, setCurrentPreviewDigest] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // New Source Form State
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState<'x_account' | 'rss' | 'web'>('x_account');
  const [newSourceHandle, setNewSourceHandle] = useState('');
  const [newSourceCategory, setNewSourceCategory] = useState('general');
  const [newSourceLanguage, setNewSourceLanguage] = useState<SupportedLanguage>('ar');
  const [isAddingSource, setIsAddingSource] = useState(false);

  // Load initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Load sources
      const sourcesRes = await fetch('/api/sources');
      const sourcesData = await sourcesRes.json();
      if (sourcesData.success) {
        setSources(sourcesData.sources || []);
      }

      // Load digests and logs
      const digestsRes = await fetch('/api/digests');
      const digestsData = await digestsRes.json();
      if (digestsData.success) {
        setDigests(digestsData.digests || []);
        setLogs(digestsData.logs || []);
        if (digestsData.digests?.length > 0 && !currentPreviewDigest) {
          setCurrentPreviewDigest(digestsData.digests[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Run Test Connections
  const handleRunTests = async (service = 'all') => {
    setIsTesting(true);
    setTestModalOpen(true);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, model: selectedModel }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResults(data.results);
      } else {
        showToast(data.error || 'فشل الفحص', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Generate News Digest Now
  const handleGenerateDigest = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/digests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: targetLanguage,
          model: selectedModel,
          timeSlot: timeSlot,
          skipDelivery: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        showToast('تم توليد النشرة وإرسالها بنجاح!');
        setCurrentPreviewDigest(data.result.digest || {
          title: 'ملخص الأخبار الذكي',
          summary_ar: data.result.formattedOutput,
          summary_fr: data.result.formattedOutput,
          language: targetLanguage,
          created_at: new Date().toISOString(),
          sources_count: sources.length,
          raw_posts_count: data.result.fetchedPostsCount,
        });
        fetchData();
      } else {
        showToast(data.error || 'حدث خطأ أثناء التوليد', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Add Source
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName || !newSourceHandle) {
      showToast('يرجى ملء كافة الحقول المطلوبة', 'error');
      return;
    }

    setIsAddingSource(true);
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName,
          type: newSourceType,
          url_or_handle: newSourceHandle,
          category: newSourceCategory,
          language: newSourceLanguage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('تمت إضافة المصدر بنجاح');
        setNewSourceName('');
        setNewSourceHandle('');
        fetchData();
      } else {
        showToast(data.error || 'فشلت إضافة المصدر', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsAddingSource(false);
    }
  };

  // Delete Source
  const handleDeleteSource = async (id: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المصدر؟')) return;
    try {
      const res = await fetch(`/api/sources?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('تم حذف المصدر بنجاح');
        setSources(sources.filter((s) => s.id !== id));
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Toggle Source Active
  const handleToggleSource = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSources(sources.map((s) => (s.id === id ? { ...s, is_active: !currentStatus } : s)));
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md transition-all duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-950/90 text-rose-300 border border-rose-500/30'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-8 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/20">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                AI News Pulse
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
                  {selectedModel.includes('2.5') ? 'Gemini 2.5 Flash Lite' : selectedModel}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                منصة الرصد والتلخيص الذكي للأخبار عبر OpenRouter وإرسالها لـ Telegram و WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => handleRunTests('all')}
            disabled={isTesting}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95"
          >
            <Activity className={`w-4 h-4 text-cyan-400 ${isTesting ? 'animate-spin' : ''}`} />
            فحص الاتصالات (Health Check)
          </button>

          <button
            onClick={handleGenerateDigest}
            disabled={isGenerating}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-blue-600 hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/25 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'جاري التلخيص والإرسال...' : 'توليد وإرسال الآن'}
          </button>
        </div>
      </header>

      {/* KPI METRICS OVERVIEW */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 my-6">
        <div className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">المصادر المتابعة</span>
            <Radio className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {sources.length}
            <span className="text-xs font-normal text-emerald-400 mr-2">
              ({sources.filter((s) => s.is_active).length} نشط)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">حسابات X وخلاصات الأخبار</div>
        </div>

        <div className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">النشرات المولدة</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{digests.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">ملخصات ذكية مكتملة</div>
        </div>

        <div className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">الجدولة اليومية</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-300">3 مرات يومياً</div>
          <div className="text-[11px] text-slate-400 mt-1">08:00 ص • 14:00 ظ • 20:00 م</div>
        </div>

        <div className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">قنوات التوزيع</span>
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold">
              Telegram
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              WhatsApp
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">تسليم مباشر متزامن</div>
        </div>
      </section>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === 'generate'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          التوليد والمعاينة الحية
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === 'sources'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Radio className="w-4 h-4" />
          إدارة المصادر ({sources.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === 'history'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          سجل النشرات والإرسال ({digests.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
            activeTab === 'settings'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          الإعدادات والربط
        </button>
      </div>

      {/* TAB CONTENT 1: GENERATE & PREVIEW */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-5 space-y-5">
            <div className="glass-card p-5 rounded-2xl">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                خيارات التوليد الفوري
              </h2>

              {/* Language Selector */}
              <div className="space-y-2 mb-4">
                <label className="text-xs font-semibold text-slate-300 block">
                  لغة التقرير المرسل (Output Language):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ar', label: 'العربية 🇸🇦' },
                    { id: 'fr', label: 'Français 🇫🇷' },
                    { id: 'dual_ar_fr', label: 'مزدوج AR+FR 🌐' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setTargetLanguage(lang.id as any)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                        targetLanguage === lang.id
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  * يتم جلب الأخبار من المصادر بمختلف اللغات (عربي، فرنسي، إنجليزي) وتلخيصها باللغة المختارة هنا.
                </p>
              </div>

              {/* AI Model Selector */}
              <div className="space-y-2 mb-4">
                <label className="text-xs font-semibold text-slate-300 block">
                  نموذج الذكاء الاصطناعي (OpenRouter Model):
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="google/gemini-2.5-flash-lite">google/gemini-2.5-flash-lite (الافتراضي الموصى به)</option>
                  <option value="google/gemini-2.0-flash-001">google/gemini-2.0-flash-001</option>
                  <option value="deepseek/deepseek-chat">deepseek/deepseek-chat</option>
                  <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet</option>
                  <option value="openai/gpt-4o-mini">openai/gpt-4o-mini</option>
                </select>
              </div>

              {/* Time Slot Label */}
              <div className="space-y-2 mb-5">
                <label className="text-xs font-semibold text-slate-300 block">فترة النشرة (Time Slot):</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'morning', label: 'صباحية 🌅' },
                    { id: 'afternoon', label: 'ظهيرة ☀️' },
                    { id: 'evening', label: 'مسائية 🌙' },
                    { id: 'manual', label: 'يدوي ⚡' },
                  ].map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setTimeSlot(slot.id as any)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all border ${
                        timeSlot === slot.id
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Generate Button */}
              <button
                onClick={handleGenerateDigest}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'جاري جلب الأخبار والتلخيص...' : 'توليد النشرة وإرسالها فوراً 🚀'}
              </button>
            </div>

            {/* Quick Status Notice */}
            <div className="glass-card p-4 rounded-2xl border-l-4 border-cyan-500">
              <div className="flex items-start gap-3">
                <Radio className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs text-slate-300 space-y-1">
                  <span className="font-bold text-white block">ملاحظة حول الجدولة الآلية:</span>
                  يتم إرسال النشرة تلقائياً 3 مرات في اليوم (08:00، 14:00، 20:00) عبر Vercel Cron Job دون أي تدخل يدوي.
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Panel */}
          <div className="lg:col-span-7">
            <div className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col h-full min-h-[500px]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-bold text-white">معاينة النشرة (Live Digest Preview)</h2>
                </div>
                {currentPreviewDigest && (
                  <button
                    onClick={() =>
                      copyToClipboard(
                        targetLanguage === 'fr'
                          ? currentPreviewDigest.summary_fr || currentPreviewDigest.summary_ar
                          : currentPreviewDigest.summary_ar || currentPreviewDigest.summary_fr
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'تم النسخ' : 'نسخ النص'}
                  </button>
                )}
              </div>

              {/* Preview Body */}
              <div className="flex-1 mt-4">
                {isGenerating ? (
                  <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                      <Sparkles className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white">جاري جمع الأخبار وصياغة التقرير...</h3>
                      <p className="text-xs text-slate-400">
                        استدعاء {selectedModel} لتلخيص وتحليل المنشورات
                      </p>
                    </div>
                  </div>
                ) : currentPreviewDigest ? (
                  <div className="space-y-4">
                    {/* Digest Metadata Header */}
                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                      <span className="font-bold text-cyan-400">{currentPreviewDigest.title}</span>
                      <span className="text-slate-600">•</span>
                      <span>{new Date(currentPreviewDigest.created_at).toLocaleTimeString('ar-SA')}</span>
                      <span className="text-slate-600">•</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {currentPreviewDigest.raw_posts_count || 0} خبر معالج
                      </span>
                    </div>

                    {/* Formatted Content */}
                    <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800/80 font-sans text-xs sm:text-sm leading-relaxed text-slate-200 whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                      {targetLanguage === 'fr'
                        ? currentPreviewDigest.summary_fr || currentPreviewDigest.summary_ar
                        : currentPreviewDigest.summary_ar || currentPreviewDigest.summary_fr}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
                    <Sparkles className="w-12 h-12 text-slate-700" />
                    <p className="text-xs sm:text-sm max-w-sm">
                      لم يتم توليد أي نشرة بعد. اضغط على زر "توليد النشرة وإرسالها فوراً" للبدء في سحب وتلخيص الأخبار.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: SOURCES MANAGEMENT */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Add New Source Card */}
          <div className="glass-card p-5 rounded-2xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              إضافة مصدر جديد (حساب X، رابط RSS، أو موقع إخباري)
            </h2>

            <form onSubmit={handleAddSource} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">اسم المصدر:</label>
                <input
                  type="text"
                  placeholder="مثلاً: أخبار الذكاء الاصطناعي"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">نوع المصدر:</label>
                <select
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="x_account">حساب X / Twitter (@handle)</option>
                  <option value="rss">خلاصة RSS (URL)</option>
                  <option value="web">صفحة ويب / موقع إخباري</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  {newSourceType === 'x_account' ? 'اسم الحساب (@):' : 'الرابط الكامل (URL):'}
                </label>
                <input
                  type="text"
                  placeholder={newSourceType === 'x_account' ? '@elonmusk أو @AJABreaking' : 'https://example.com/rss'}
                  value={newSourceHandle}
                  onChange={(e) => setNewSourceHandle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">لغة المصدر:</label>
                <select
                  value={newSourceLanguage}
                  onChange={(e) => setNewSourceLanguage(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ar">العربية (AR)</option>
                  <option value="fr">Français (FR)</option>
                  <option value="en">English (EN)</option>
                  <option value="all">متعدد اللغات (All)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isAddingSource}
                  className="w-full py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {isAddingSource ? 'جاري الإضافة...' : 'إضافة المصدر'}
                </button>
              </div>
            </form>
          </div>

          {/* Sources List Table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                المصادر المسجلة ({sources.length})
              </h2>
              <button
                onClick={fetchData}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                تحديث
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">المصدر</th>
                    <th className="py-3 px-4">النوع</th>
                    <th className="py-3 px-4">المعرف / الرابط</th>
                    <th className="py-3 px-4">اللغة</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {sources.map((source) => (
                    <tr key={source.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        {source.name}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            source.type === 'x_account'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {source.type === 'x_account' ? 'X / Twitter' : 'RSS / Web'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400 max-w-xs truncate">
                        {source.url_or_handle}
                      </td>
                      <td className="py-3 px-4">
                        <span className="uppercase text-[11px] font-bold text-slate-400">
                          {source.language}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleSource(source.id, source.is_active)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                            source.is_active
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {source.is_active ? 'نشط' : 'معطل'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteSource(source.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all"
                          title="حذف المصدر"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sources.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                        لا توجد مصادر مضافة بعد. أضف أول مصدر من النموذج أعلاه.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: HISTORY & DELIVERY LOGS */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              أرشيف النشرات السابقة ({digests.length})
            </h2>

            <div className="space-y-3">
              {digests.map((digest) => (
                <div
                  key={digest.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{digest.title}</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                        {digest.time_slot}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">
                      {digest.summary_ar || digest.summary_fr}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{new Date(digest.created_at).toLocaleString('ar-SA')}</span>
                    <button
                      onClick={() => {
                        setCurrentPreviewDigest(digest);
                        setActiveTab('generate');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold transition-all"
                    >
                      معاينة
                    </button>
                  </div>
                </div>
              ))}
              {digests.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  لا يوجد أرشيف نشرات سابقة بعد.
                </div>
              )}
            </div>
          </div>

          {/* Delivery Logs */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              سجل وصول الإشعارات إلى Telegram و WhatsApp
            </h2>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.channel === 'telegram'
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {log.channel}
                    </span>
                    <span className="text-slate-300">
                      {log.status === 'success' ? 'تم الإرسال بنجاح' : `فشل الإرسال: ${log.error_message || ''}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    <span className="text-slate-500 text-[11px]">
                      {new Date(log.sent_at).toLocaleTimeString('ar-SA')}
                    </span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="py-6 text-center text-slate-500 text-xs">
                  لا توجد سجلات إرسال بعد.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: SETTINGS & SUPABASE SETUP */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supabase SQL Setup Card */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">إعداد قاعدة بيانات Supabase</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              قم بفتح لوحة تحكم <b>Supabase</b> ➔ ثم اذهب إلى <b>SQL Editor</b> ➔ والصق الكود التالي لإنشاء الجداول اللازمة بنقرة واحدة:
            </p>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-64 leading-tight">
{`-- AI News Pulse Schema
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url_or_handle TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  language TEXT DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raw_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  external_id TEXT UNIQUE,
  author TEXT,
  content TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  time_slot TEXT DEFAULT 'manual',
  language TEXT DEFAULT 'ar',
  summary_ar TEXT,
  summary_fr TEXT,
  raw_posts_count INT DEFAULT 0,
  sources_count INT DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_id UUID REFERENCES digests(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);`}
              </pre>
            </div>
          </div>

          {/* Environment Variables Reference */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">متغيرات البيئة (.env.local)</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              تأكد من ضبط المتغيرات التالية في ملف <code>.env.local</code> أو في لوحة إعدادات Vercel:
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
              <div><span className="text-cyan-400">NEXT_PUBLIC_SUPABASE_URL</span>=...</div>
              <div><span className="text-cyan-400">SUPABASE_SERVICE_ROLE_KEY</span>=...</div>
              <div><span className="text-cyan-400">OPENROUTER_API_KEY</span>=sk-or-v1-...</div>
              <div><span className="text-cyan-400">OPENROUTER_MODEL</span>=google/gemini-2.5-flash-lite</div>
              <div><span className="text-cyan-400">TELEGRAM_BOT_TOKEN</span>=...</div>
              <div><span className="text-cyan-400">TELEGRAM_CHAT_ID</span>=...</div>
              <div><span className="text-cyan-400">WHATSAPP_INSTANCE_ID</span>=...</div>
              <div><span className="text-cyan-400">WHATSAPP_API_TOKEN</span>=...</div>
              <div><span className="text-cyan-400">WHATSAPP_TARGET_NUMBER</span>=...</div>
            </div>
          </div>
        </div>
      )}

      {/* HEALTH CHECK & TEST CONNECTIONS MODAL */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-xl w-full rounded-2xl p-6 space-y-5 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                نتائج فحص الاتصالات (Connection Diagnostics)
              </h3>
              <button
                onClick={() => setTestModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {isTesting ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                <p className="text-xs text-slate-400">جاري فحص الاتصال بكافة الخدمات...</p>
              </div>
            ) : testResults ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {/* Supabase Status */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  {testResults.supabase?.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-white block">قاعدة بيانات Supabase</span>
                    <p className="text-slate-400">{testResults.supabase?.message}</p>
                  </div>
                </div>

                {/* OpenRouter Status */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  {testResults.openrouter?.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-white block">
                      الذكاء الاصطناعي OpenRouter ({selectedModel})
                    </span>
                    <p className="text-slate-400">{testResults.openrouter?.message}</p>
                    {testResults.openrouter?.sampleReply && (
                      <p className="text-cyan-300 font-mono text-[11px] mt-1 bg-slate-950 p-2 rounded">
                        رد النموذج: "{testResults.openrouter.sampleReply}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Telegram Status */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  {testResults.telegram?.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-white block">بوت Telegram</span>
                    <p className="text-slate-400">{testResults.telegram?.message}</p>
                  </div>
                </div>

                {/* WhatsApp Status */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  {testResults.whatsapp?.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-white block">بوابة WhatsApp</span>
                    <p className="text-slate-400">{testResults.whatsapp?.message}</p>
                  </div>
                </div>

                {/* X Scraper Status */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  {testResults.x_scraper?.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-white block">جلب البيانات من X (Twitter)</span>
                    <p className="text-slate-400">{testResults.x_scraper?.message}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setTestModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

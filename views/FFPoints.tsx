import React, { useState, useEffect, useCallback } from 'react';
import { User, FFTask, FFTaskCompletion, FFReward, FFRedemption } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { useLanguage } from '../src/i18n/LanguageContext';
import {
    Star, Plus, CheckCircle, XCircle, Clock, Gift, Award,
    Trash2, Edit2, X, Save, Package, Zap, Trophy, ChevronDown,
    ChevronUp, AlertCircle, RefreshCw
} from 'lucide-react';
import { Button } from '../components/Button';

interface Props {
    user: User;
    allUsersProfiles: User[];
}

const REWARD_CATEGORIES = ['Uniforme', 'Instrumento', 'Acessório', 'Outro'];

const categoryColor: Record<string, string> = {
    'Uniforme': 'bg-blue-900/40 text-blue-300 border-blue-800',
    'Instrumento': 'bg-purple-900/40 text-purple-300 border-purple-800',
    'Acessório': 'bg-green-900/40 text-green-300 border-green-800',
    'Outro': 'bg-stone-700 text-stone-300 border-stone-600',
};

const statusBadge = (status: string) => {
    if (status === 'approved') return <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">Aprovado</span>;
    if (status === 'rejected') return <span className="text-xs bg-red-900/40 text-red-400 border border-red-800 px-2 py-0.5 rounded-full">Recusado</span>;
    return <span className="text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-800 px-2 py-0.5 rounded-full">Pendente</span>;
};

export const FFPoints: React.FC<Props> = ({ user, allUsersProfiles }) => {
    const isAdmin = user.role === 'admin';
    const { t } = useLanguage();

    // ─── Tab ─────────────────────────────────────────────────────────────────
    type Tab = 'store' | 'tasks' | 'history' | 'manage';
    const [tab, setTab] = useState<Tab>('store');

    // ─── Data ─────────────────────────────────────────────────────────────────
    const [tasks, setTasks] = useState<FFTask[]>([]);
    const [completions, setCompletions] = useState<FFTaskCompletion[]>([]);
    const [rewards, setRewards] = useState<FFReward[]>([]);
    const [redemptions, setRedemptions] = useState<FFRedemption[]>([]);
    const [myPoints, setMyPoints] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // ─── Admin forms ──────────────────────────────────────────────────────────
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState<FFTask | null>(null);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', points: '', target_role: 'all' as 'all' | 'staff' | 'aluno' });

    const [showRewardForm, setShowRewardForm] = useState(false);
    const [editingReward, setEditingReward] = useState<FFReward | null>(null);
    const [rewardForm, setRewardForm] = useState({
        title: '', description: '', points_cost: '', category: 'Outro', stock: '-1'
    });

    // ─── Fetch data ───────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            // Tasks
            const { data: tasksData } = await supabase
                .from('ff_tasks')
                .select('*')
                .order('created_at', { ascending: false });
            setTasks(tasksData || []);

            // Task completions
            let compQuery = supabase.from('ff_task_completions').select('*').order('created_at', { ascending: false });
            if (!isAdmin) compQuery = compQuery.eq('user_id', user.id);
            const { data: compData } = await compQuery;
            setCompletions(compData || []);

            // Rewards
            const { data: rewardsData } = await supabase
                .from('ff_rewards')
                .select('*')
                .order('points_cost', { ascending: true });
            setRewards(rewardsData || []);

            // Redemptions
            let redQuery = supabase.from('ff_redemptions').select('*').order('created_at', { ascending: false });
            if (!isAdmin) redQuery = redQuery.eq('user_id', user.id);
            const { data: redData } = await redQuery;
            setRedemptions(redData || []);

            // Calculate my points
            const myApprovedCompletions = (compData || []).filter(
                (c: any) => c.user_id === user.id && c.status === 'approved'
            );
            const earned = myApprovedCompletions.reduce((sum: number, c: any) => {
                const task = (tasksData || []).find((t: any) => t.id === c.task_id);
                return sum + (task?.points || 0);
            }, 0);

            const myApprovedRedemptions = (redData || []).filter(
                (r: any) => r.user_id === user.id && r.status === 'approved'
            );
            const spent = myApprovedRedemptions.reduce((sum: number, r: any) => sum + (r.points_cost || 0), 0);
            setMyPoints(earned - spent);
        } finally {
            setLoading(false);
        }
    }, [user.id, isAdmin]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ─── User actions ─────────────────────────────────────────────────────────
    const requestCompletion = async (task: FFTask) => {
        // Check if already pending/approved for this task
        const existing = completions.find(c => c.task_id === task.id && c.user_id === user.id && c.status !== 'rejected');
        if (existing) {
            alert('Você já solicitou ou completou esta tarefa.');
            return;
        }
        const { error } = await supabase.from('ff_task_completions').insert({
            task_id: task.id,
            task_title: task.title,
            user_id: user.id,
            user_name: user.nickname || user.name,
            status: 'pending',
        });
        if (error) { alert('Erro ao solicitar: ' + error.message); return; }
        alert(`Solicitação enviada! Aguarde aprovação do administrador.`);
        fetchAll();
    };

    const requestRedemption = async (reward: FFReward) => {
        if (myPoints < reward.points_cost) {
            alert('FFPoints insuficientes para resgatar esta recompensa.');
            return;
        }
        const pendingRedemption = redemptions.find(r => r.reward_id === reward.id && r.user_id === user.id && r.status === 'pending');
        if (pendingRedemption) {
            alert('Você já tem uma solicitação pendente para esta recompensa.');
            return;
        }
        if (!window.confirm(`Resgatar "${reward.title}" por ${reward.points_cost} FFPoints?`)) return;
        const { error } = await supabase.from('ff_redemptions').insert({
            reward_id: reward.id,
            reward_title: reward.title,
            user_id: user.id,
            user_name: user.nickname || user.name,
            points_cost: reward.points_cost,
            status: 'pending',
        });
        if (error) { alert('Erro ao resgatar: ' + error.message); return; }
        alert(`Resgate solicitado! O administrador irá processar em breve.`);
        fetchAll();
    };

    // ─── Admin: task CRUD ─────────────────────────────────────────────────────
    const openTaskForm = (task?: FFTask) => {
        if (task) {
            setEditingTask(task);
            setTaskForm({ 
                title: task.title, 
                description: task.description, 
                points: String(task.points),
                target_role: task.target_role || 'all'
            });
        } else {
            setEditingTask(null);
            setTaskForm({ title: '', description: '', points: '', target_role: 'all' });
        }
        setShowTaskForm(true);
    };

    const saveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        const pts = parseInt(taskForm.points);
        if (!taskForm.title || isNaN(pts) || pts <= 0) { alert('Preencha todos os campos corretamente.'); return; }

        const payload = {
            title: taskForm.title, 
            description: taskForm.description, 
            points: pts,
            target_role: taskForm.target_role
        };

        if (editingTask) {
            const { error } = await supabase.from('ff_tasks').update(payload).eq('id', editingTask.id);
            if (error) { alert('Erro: ' + error.message); return; }
        } else {
            const { error } = await supabase.from('ff_tasks').insert({
                ...payload,
                is_active: true, 
                created_by: user.id,
            });
            if (error) { alert('Erro: ' + error.message); return; }
        }
        setShowTaskForm(false);
        fetchAll();
    };

    const toggleTaskActive = async (task: FFTask) => {
        await supabase.from('ff_tasks').update({ is_active: !task.is_active }).eq('id', task.id);
        fetchAll();
    };

    const deleteTask = async (task: FFTask) => {
        if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
        await supabase.from('ff_tasks').delete().eq('id', task.id);
        fetchAll();
    };

    // ─── Admin: reward CRUD ───────────────────────────────────────────────────
    const openRewardForm = (reward?: FFReward) => {
        if (reward) {
            setEditingReward(reward);
            setRewardForm({
                title: reward.title, description: reward.description,
                points_cost: String(reward.points_cost), category: reward.category,
                stock: String(reward.stock)
            });
        } else {
            setEditingReward(null);
            setRewardForm({ title: '', description: '', points_cost: '', category: 'Outro', stock: '-1' });
        }
        setShowRewardForm(true);
    };

    const saveReward = async (e: React.FormEvent) => {
        e.preventDefault();
        const cost = parseInt(rewardForm.points_cost);
        if (!rewardForm.title || isNaN(cost) || cost <= 0) { alert('Preencha todos os campos corretamente.'); return; }

        const payload = {
            title: rewardForm.title, description: rewardForm.description,
            points_cost: cost, category: rewardForm.category,
            stock: parseInt(rewardForm.stock) || -1, is_active: true, created_by: user.id,
        };

        if (editingReward) {
            const { error } = await supabase.from('ff_rewards').update(payload).eq('id', editingReward.id);
            if (error) { alert('Erro: ' + error.message); return; }
        } else {
            const { error } = await supabase.from('ff_rewards').insert(payload);
            if (error) { alert('Erro: ' + error.message); return; }
        }
        setShowRewardForm(false);
        fetchAll();
    };

    const deleteReward = async (reward: FFReward) => {
        if (!window.confirm(`Excluir a recompensa "${reward.title}"?`)) return;
        await supabase.from('ff_rewards').delete().eq('id', reward.id);
        fetchAll();
    };

    // ─── Admin: approve / reject ──────────────────────────────────────────────
    const handleCompletion = async (completion: FFTaskCompletion, status: 'approved' | 'rejected') => {
        await supabase.from('ff_task_completions').update({ status }).eq('id', completion.id);
        fetchAll();
    };

    const handleRedemption = async (redemption: FFRedemption, status: 'approved' | 'rejected') => {
        await supabase.from('ff_redemptions').update({ status }).eq('id', redemption.id);
        fetchAll();
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const getUserPoints = (userId: string) => {
        const earnedCompletions = completions.filter(c => c.user_id === userId && c.status === 'approved');
        const earned = earnedCompletions.reduce((sum, c) => {
            const task = tasks.find(t => t.id === c.task_id);
            return sum + (task?.points || 0);
        }, 0);
        const spent = redemptions
            .filter(r => r.user_id === userId && r.status === 'approved')
            .reduce((sum, r) => sum + (r.points_cost || 0), 0);
        return earned - spent;
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    const activeTasks = tasks.filter(t => {
        if (!t.is_active) return false;
        if (!t.target_role || t.target_role === 'all') return true;
        if (t.target_role === 'staff') return user.role === 'admin' || user.role === 'professor';
        if (t.target_role === 'aluno') return user.role === 'aluno';
        return true;
    });
    const activeRewards = rewards.filter(r => r.is_active);
    const myCompletions = completions.filter(c => c.user_id === user.id);
    const myRedemptions = redemptions.filter(r => r.user_id === user.id);

    const pendingCompletions = completions.filter(c => c.status === 'pending');
    const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
    const totalPending = pendingCompletions.length + pendingRedemptions.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-orange-400 w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            {/* ── Header / Balance ── */}
            <div className="bg-gradient-to-r from-orange-900/40 to-yellow-900/30 border border-orange-700/50 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Star className="text-yellow-400 fill-yellow-400 w-6 h-6" />
                            <h1 className="text-2xl font-bold text-white">FFPoints</h1>
                        </div>
                        <p className="text-stone-400 text-sm">Complete tarefas, ganhe pontos, resgate recompensas!</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 bg-orange-600/20 border border-orange-500/40 rounded-xl px-4 py-2">
                            <Star className="text-yellow-400 fill-yellow-400 w-5 h-5" />
                            <span className="text-2xl font-bold text-yellow-400">{myPoints.toLocaleString()}</span>
                            <span className="text-stone-400 text-sm">pts</span>
                        </div>
                        <span className="text-xs text-stone-500 mt-1">{t('ffp.balance')}</span>
                    </div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-stone-900 rounded-xl p-1 overflow-x-auto">
                {([
                    { id: 'store', label: t('ffp.tab.store'), icon: Gift },
                    { id: 'tasks', label: t('ffp.tab.tasks'), icon: Zap },
                    { id: 'history', label: t('ffp.tab.history'), icon: Trophy },
                    ...(isAdmin ? [{ id: 'manage', label: `${t('ffp.tab.manage')}${totalPending > 0 ? ` (${totalPending})` : ''}`, icon: Award }] : []),
                ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex-1 min-w-max flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'}`}
                    >
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </div>

            {/* ══════════════ STORE TAB ══════════════ */}
            {tab === 'store' && (
                <div className="space-y-4">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <Gift className="text-orange-400" size={20} />
                        Recompensas Disponíveis
                    </h2>
                    {activeRewards.length === 0 ? (
                        <div className="text-center text-stone-500 py-12 bg-stone-900 rounded-xl border border-stone-700">
                            <Package className="mx-auto mb-3 text-stone-600" size={40} />
                            <p>Nenhuma recompensa disponível ainda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeRewards.map(reward => {
                                const canAfford = myPoints >= reward.points_cost;
                                const hasPending = redemptions.some(r => r.reward_id === reward.id && r.user_id === user.id && r.status === 'pending');
                                const hasApproved = redemptions.some(r => r.reward_id === reward.id && r.user_id === user.id && r.status === 'approved');
                                return (
                                    <div key={reward.id} className={`bg-stone-900 border rounded-xl p-4 flex flex-col gap-3 transition-all ${canAfford ? 'border-stone-700 hover:border-orange-700/50' : 'border-stone-800 opacity-75'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-white">{reward.title}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border mt-1 inline-block ${categoryColor[reward.category] || categoryColor['Outro']}`}>
                                                    {reward.category}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-yellow-900/30 border border-yellow-800/50 rounded-lg px-2 py-1 ml-2 shrink-0">
                                                <Star className="text-yellow-400 fill-yellow-400 w-3.5 h-3.5" />
                                                <span className="text-yellow-400 font-bold text-sm">{reward.points_cost.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        {reward.description && <p className="text-stone-400 text-sm">{reward.description}</p>}
                                        {reward.stock > 0 && (
                                            <p className="text-xs text-stone-500">Estoque: {reward.stock} unidades</p>
                                        )}
                                        {hasApproved ? (
                                            <span className="text-xs text-green-400 flex items-center gap-1">
                                                <CheckCircle size={13} /> Resgatado com sucesso!
                                            </span>
                                        ) : hasPending ? (
                                            <span className="text-xs text-yellow-400 flex items-center gap-1">
                                                <Clock size={13} /> Resgate aguardando aprovação
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => requestRedemption(reward)}
                                                disabled={!canAfford}
                                                className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${canAfford
                                                    ? 'bg-orange-600 hover:bg-orange-500 text-white'
                                                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'}`}
                                            >
                                                {canAfford ? 'Resgatar' : 'Pontos insuficientes'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════ TASKS TAB ══════════════ */}
            {tab === 'tasks' && (
                <div className="space-y-4">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <Zap className="text-yellow-400" size={20} />
                        {t('ffp.tasks.title')}
                    </h2>
                    {activeTasks.length === 0 ? (
                        <div className="text-center text-stone-500 py-12 bg-stone-900 rounded-xl border border-stone-700">
                            <Zap className="mx-auto mb-3 text-stone-600" size={40} />
                            <p>Nenhuma tarefa disponível ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeTasks.map(task => {
                                const myCompletion = completions.find(c => c.task_id === task.id && c.user_id === user.id && c.status !== 'rejected');
                                return (
                                    <div key={task.id} className="bg-stone-900 border border-stone-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-white">{task.title}</h3>
                                                <div className="flex items-center gap-1 bg-yellow-900/30 border border-yellow-800/50 rounded-full px-2 py-0.5">
                                                    <Star className="text-yellow-400 fill-yellow-400 w-3 h-3" />
                                                    <span className="text-yellow-400 font-bold text-xs">+{task.points}</span>
                                                </div>
                                            </div>
                                            {task.description && <p className="text-stone-400 text-sm">{task.description}</p>}
                                        </div>
                                        <div className="shrink-0">
                                            {myCompletion ? (
                                                <div>
                                                    {statusBadge(myCompletion.status)}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => requestCompletion(task)}
                                                    className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                                                >
                                                    Solicitar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════ HISTORY TAB ══════════════ */}
            {tab === 'history' && (
                <div className="space-y-6">
                    {/* My task completions */}
                    <div>
                        <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-3">
                            <Zap className="text-yellow-400" size={18} />
                            {t('ffp.history.tasks')}
                        </h2>
                        {myCompletions.length === 0 ? (
                            <p className="text-stone-500 text-sm bg-stone-900 rounded-xl p-4 border border-stone-700">Nenhuma tarefa solicitada ainda.</p>
                        ) : (
                            <div className="space-y-2">
                                {myCompletions.map(c => {
                                    const task = tasks.find(t => t.id === c.task_id);
                                    return (
                                        <div key={c.id} className="bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-white text-sm font-medium">{c.task_title || task?.title || 'Tarefa'}</p>
                                                <p className="text-stone-500 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : ''}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {c.status === 'approved' && task && (
                                                    <span className="text-yellow-400 font-bold text-sm flex items-center gap-1">
                                                        <Star className="fill-yellow-400 w-3 h-3" />+{task.points}
                                                    </span>
                                                )}
                                                {statusBadge(c.status)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* My redemptions */}
                    <div>
                        <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-3">
                            <Gift className="text-orange-400" size={18} />
                            {t('ffp.history.redemptions')}
                        </h2>
                        {myRedemptions.length === 0 ? (
                            <p className="text-stone-500 text-sm bg-stone-900 rounded-xl p-4 border border-stone-700">Nenhum resgate realizado ainda.</p>
                        ) : (
                            <div className="space-y-2">
                                {myRedemptions.map(r => (
                                    <div key={r.id} className="bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-white text-sm font-medium">{r.reward_title || 'Recompensa'}</p>
                                            <p className="text-stone-500 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {r.status === 'approved' && (
                                                <span className="text-red-400 font-bold text-sm flex items-center gap-1">
                                                    <Star className="fill-red-400 w-3 h-3" />-{r.points_cost}
                                                </span>
                                            )}
                                            {statusBadge(r.status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* All users ranking — visible to everyone */}
                    <div>
                        <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-3">
                            <Trophy className="text-yellow-400" size={18} />
                            {t('ffp.ranking')}
                        </h2>
                        <div className="space-y-2">
                            {allUsersProfiles
                                .filter(u => u.status !== 'archived')
                                .map(u => ({ ...u, pts: getUserPoints(u.id) }))
                                .sort((a, b) => b.pts - a.pts)
                                .slice(0, 15)
                                .map((u, idx) => (
                                    <div key={u.id} className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${u.id === user.id ? 'bg-orange-900/20 border-orange-700/50' : 'bg-stone-900 border-stone-700'}`}>
                                        <span className={`w-6 text-center text-sm font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-stone-300' : idx === 2 ? 'text-orange-400' : 'text-stone-500'}`}>
                                            {idx + 1}
                                        </span>
                                        <span className="flex-1 text-white text-sm">{u.nickname || u.name}</span>
                                        <div className="flex items-center gap-1">
                                            <Star className="text-yellow-400 fill-yellow-400 w-3.5 h-3.5" />
                                            <span className="text-yellow-400 font-bold text-sm">{u.pts.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MANAGE TAB (Admin only) ══════════════ */}
            {tab === 'manage' && isAdmin && (
                <div className="space-y-8">
                    {/* ── Pending approvals ── */}
                    {totalPending > 0 && (
                        <div>
                            <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-3">
                                <AlertCircle className="text-yellow-400" size={20} />
                                {t('ffp.manage.pending')} ({totalPending})
                            </h2>

                            {/* Task completions */}
                            {pendingCompletions.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    <p className="text-stone-400 text-sm font-medium uppercase tracking-wide">Tarefas</p>
                                    {pendingCompletions.map(c => {
                                        const task = tasks.find(t => t.id === c.task_id);
                                        const profile = allUsersProfiles.find(u => u.id === c.user_id);
                                        return (
                                            <div key={c.id} className="bg-stone-900 border border-yellow-800/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-white font-medium">{c.task_title || task?.title}</p>
                                                    <p className="text-stone-400 text-sm">{c.user_name || profile?.name}</p>
                                                    {task && (
                                                        <span className="text-xs flex items-center gap-1 text-yellow-400 mt-1">
                                                            <Star className="fill-yellow-400 w-3 h-3" />+{task.points} FFPoints
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleCompletion(c, 'approved')}
                                                        className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm"
                                                    >
                                                        <CheckCircle size={14} /> {t('ffp.manage.approve')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleCompletion(c, 'rejected')}
                                                        className="flex items-center gap-1 bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm"
                                                    >
                                                        <XCircle size={14} /> {t('ffp.manage.reject')}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Redemptions */}
                            {pendingRedemptions.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-stone-400 text-sm font-medium uppercase tracking-wide">Resgates</p>
                                    {pendingRedemptions.map(r => {
                                        const profile = allUsersProfiles.find(u => u.id === r.user_id);
                                        const userPts = getUserPoints(r.user_id);
                                        return (
                                            <div key={r.id} className="bg-stone-900 border border-orange-800/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-white font-medium">{r.reward_title}</p>
                                                    <p className="text-stone-400 text-sm">{r.user_name || profile?.name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs flex items-center gap-1 text-red-400">
                                                            <Star className="fill-red-400 w-3 h-3" />-{r.points_cost} FFPoints
                                                        </span>
                                                        <span className="text-xs text-stone-500">Saldo atual: {userPts} pts</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleRedemption(r, 'approved')}
                                                        className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm"
                                                    >
                                                        <CheckCircle size={14} /> {t('ffp.manage.deliver')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRedemption(r, 'rejected')}
                                                        className="flex items-center gap-1 bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm"
                                                    >
                                                        <XCircle size={14} /> {t('ffp.manage.reject')}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── All users balance ── */}
                    <div>
                        <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-3">
                            <Trophy className="text-yellow-400" size={20} />
                            {t('ffp.manage.balances')}
                        </h2>
                        <div className="space-y-2">
                            {allUsersProfiles
                                .filter(u => u.status !== 'archived')
                                .map(u => ({ ...u, pts: getUserPoints(u.id) }))
                                .sort((a, b) => b.pts - a.pts)
                                .map((u, idx) => (
                                    <div key={u.id} className="flex items-center gap-3 bg-stone-900 border border-stone-700 px-4 py-2 rounded-lg">
                                        <span className="text-stone-500 text-sm w-5 text-right">{idx + 1}</span>
                                        <div className="flex-1">
                                            <span className="text-white text-sm">{u.nickname || u.name}</span>
                                            <span className="text-stone-500 text-xs ml-2">({u.role})</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Star className="text-yellow-400 fill-yellow-400 w-3.5 h-3.5" />
                                            <span className="text-yellow-400 font-bold text-sm">{u.pts.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* ── Task management ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                                <Zap className="text-yellow-400" size={20} />
                                {t('ffp.manage.tasks')}
                            </h2>
                            <button
                                onClick={() => { setShowRewardForm(false); openTaskForm(); }}
                                className="flex items-center gap-1 bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm"
                            >
                                <Plus size={14} /> {t('ffp.manage.new_task')}
                            </button>
                        </div>

                        {showTaskForm && (
                            <form onSubmit={saveTask} className="bg-stone-900 border border-orange-700/50 rounded-xl p-4 mb-4 space-y-3">
                                <h3 className="text-white font-medium">{editingTask ? t('common.edit') : t('ffp.manage.new_task')}</h3>
                                <div>
                                    <label className="text-xs text-stone-400 block mb-1">{t('ffp.manage.task.title')}</label>
                                    <input
                                        type="text" required value={taskForm.title}
                                        onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                                        className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-stone-400 block mb-1">{t('ffp.manage.task.desc')}</label>
                                    <textarea
                                        value={taskForm.description}
                                        onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                                        className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white text-sm"
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-stone-400 block mb-1">{t('common.category')}</label>
                                    <select
                                        value={taskForm.target_role}
                                        onChange={e => setTaskForm(f => ({ ...f, target_role: e.target.value as any }))}
                                        className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white text-sm"
                                    >
                                        <option value="all">Todos (Alunos e Professores)</option>
                                        <option value="staff">Administradores e Professores</option>
                                        <option value="aluno">Somente Alunos</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-stone-400 block mb-1">{t('ffp.manage.task.points')}</label>
                                    <input
                                        type="number" required min="1" value={taskForm.points}
                                        onChange={e => setTaskForm(f => ({ ...f, points: e.target.value }))}
                                        className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white text-sm"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={() => setShowTaskForm(false)} className="text-stone-400 px-3 py-1.5 hover:text-white text-sm">{t('common.cancel')}</button>
                                    <Button type="submit">{editingTask ? t('common.save') : t('ffp.manage.new_task')}</Button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-2">
                            {tasks.map(task => (
                                <div key={task.id} className={`bg-stone-900 border rounded-lg px-4 py-3 flex items-center gap-3 ${task.is_active ? 'border-stone-700' : 'border-stone-800 opacity-60'}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white text-sm font-medium">{task.title}</span>
                                            <span className="text-xs flex items-center gap-0.5 text-yellow-400">
                                                <Star className="fill-yellow-400 w-3 h-3" />{task.points}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${
                                                task.target_role === 'staff' ? 'border-purple-500/50 text-purple-400' :
                                                task.target_role === 'aluno' ? 'border-blue-500/50 text-blue-400' :
                                                'border-stone-500/50 text-stone-500'
                                            }`}>
                                                {task.target_role === 'staff' ? 'Staff' : task.target_role === 'aluno' ? 'Alunos' : 'Todos'}
                                            </span>
                                            {!task.is_active && <span className="text-xs text-stone-500">(inativa)</span>}
                                        </div>
                                        {task.description && <p className="text-stone-500 text-xs mt-0.5">{task.description}</p>}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => openTaskForm(task)} className="p-1.5 text-stone-400 hover:text-blue-400 rounded" title="Editar">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => toggleTaskActive(task)} className={`p-1.5 rounded text-xs ${task.is_active ? 'text-green-400 hover:text-red-400' : 'text-stone-500 hover:text-green-400'}`} title={task.is_active ? 'Desativar' : 'Ativar'}>
                                            {task.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                        </button>
                                        <button onClick={() => deleteTask(task)} className="p-1.5 text-stone-400 hover:text-red-500 rounded" title="Excluir">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {tasks.length === 0 && <p className="text-stone-500 text-sm">Nenhuma tarefa criada ainda.</p>}
                        </div>
                    </div>

                    {/* ── Reward management ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                                <Gift className="text-orange-400" size={20} />
                                {t('ffp.manage.rewards')}
                            </h2>
                            <button
                                onClick={() => { setShowTaskForm(false); openRewardForm(); }}
                                className="flex items-center gap-1 bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm"
                            >
                                <Plus size={14} /> {t('ffp.manage.new_reward')}
                            </button>
                        </div>

                        {showRewardForm && (
                            <form onSubmit={saveReward} className="bg-stone-900 border border-orange-700/50 rounded-xl p-4 mb-4 space-y-3">
                                <h3 className="text-white font-medium">{editingReward ? t('common.edit') : t('ffp.manage.new_reward')}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-stone-400 block mb-1">{t('ffp.manage.reward.title')}</label>
                                        <input type="text" required value={rewardForm.title}
                                            onChange={e => setRewardForm(f => ({ ...f, title: e.target.value }))}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-400 block mb-1">{t('ffp.manage.reward.category')}</label>
                                        <select value={rewardForm.category}
                                            onChange={e => setRewardForm(f => ({ ...f, category: e.target.value }))}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white text-sm">
                                            {REWARD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-400 block mb-1">{t('ffp.manage.reward.cost')}</label>
                                        <input type="number" required min="1" value={rewardForm.points_cost}
                                            onChange={e => setRewardForm(f => ({ ...f, points_cost: e.target.value }))}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-400 block mb-1">{t('ffp.manage.reward.stock')}</label>
                                        <input type="number" min="-1" value={rewardForm.stock}
                                            onChange={e => setRewardForm(f => ({ ...f, stock: e.target.value }))}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-stone-400 block mb-1">{t('ffp.manage.reward.desc')}</label>
                                    <textarea value={rewardForm.description}
                                        onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))}
                                        className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white text-sm"
                                        rows={2} />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={() => setShowRewardForm(false)} className="text-stone-400 px-3 py-1.5 hover:text-white text-sm">{t('common.cancel')}</button>
                                    <Button type="submit">{editingReward ? t('common.save') : t('ffp.manage.new_reward')}</Button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-2">
                            {rewards.map(reward => (
                                <div key={reward.id} className={`bg-stone-900 border rounded-lg px-4 py-3 flex items-center gap-3 ${reward.is_active ? 'border-stone-700' : 'border-stone-800 opacity-60'}`}>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-white text-sm font-medium">{reward.title}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${categoryColor[reward.category] || categoryColor['Outro']}`}>{reward.category}</span>
                                            <span className="text-xs flex items-center gap-0.5 text-yellow-400">
                                                <Star className="fill-yellow-400 w-3 h-3" />{reward.points_cost}
                                            </span>
                                            {reward.stock >= 0 && <span className="text-xs text-stone-500">Estoque: {reward.stock}</span>}
                                            {!reward.is_active && <span className="text-xs text-stone-500">(inativa)</span>}
                                        </div>
                                        {reward.description && <p className="text-stone-500 text-xs mt-0.5">{reward.description}</p>}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => openRewardForm(reward)} className="p-1.5 text-stone-400 hover:text-blue-400 rounded" title="Editar">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => deleteReward(reward)} className="p-1.5 text-stone-400 hover:text-red-500 rounded" title="Excluir">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {rewards.length === 0 && <p className="text-stone-500 text-sm">Nenhuma recompensa criada ainda.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

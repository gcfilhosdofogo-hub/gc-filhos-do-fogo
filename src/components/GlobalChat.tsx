import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Edit2, Check, Cake, MessageSquare, X, Send, Minus } from 'lucide-react';
import { User } from '../../types';

interface ChatMessage {
    id: string;
    sender_id: string;
    sender_name: string;
    text: string;
    created_at: string;
    is_edited?: boolean; // We can use this locally or wait for backend update
}

interface GlobalChatProps {
    currentUser: User;
    allUsersProfiles: User[];
}

export const GlobalChat: React.FC<GlobalChatProps> = ({ currentUser, allUsersProfiles }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [editMsgText, setEditMsgText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Compute Birthdays today
    const [birthdaysToday, setBirthdaysToday] = useState<User[]>([]);

    useEffect(() => {
        const todayStr = new Date().toISOString().slice(5, 10); // MM-DD
        const bdays = allUsersProfiles.filter(u => u.birthDate && u.birthDate.slice(5, 10) === todayStr);
        setBirthdaysToday(bdays);
    }, [allUsersProfiles]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
            setUnreadCount(0);
        }
    }, [messages, isOpen, isMinimized]);

    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('global_chat')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(50);

            if (!error && data) {
                setMessages(data as ChatMessage[]);
            }
        };

        fetchMessages();

        const channel = supabase
            .channel('public:global_chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat' }, payload => {
                const newMsg = payload.new as ChatMessage;
                setMessages(prev => [...prev, newMsg]);

                if (!isOpen || isMinimized) {
                    setUnreadCount(prev => prev + 1);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'global_chat' }, payload => {
                const updatedMsg = payload.new as ChatMessage;
                setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, isMinimized]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageText = newMessage.trim();
        setNewMessage(''); // optimistic clear

        const { error } = await supabase
            .from('global_chat')
            .insert({
                sender_id: currentUser.id,
                sender_name: currentUser.nickname || currentUser.name,
                text: messageText
            });

        if (error) {
            console.error('Error sending message:', error);
            alert('Não foi possível enviar a mensagem. Verifique sua conexão ou se a tabela global_chat foi criada.');
            setNewMessage(messageText); // restore if failed
        }
    };

    const handleSaveEdit = async () => {
        if (!editingMsgId || !editMsgText.trim()) return;

        const { error } = await supabase
            .from('global_chat')
            .update({ text: editMsgText.trim(), is_edited: true })
            .eq('id', editingMsgId);

        if (error) {
            console.error('Error updating message:', error);
            alert('Não foi possível editar a mensagem. Você pode precisar de permissões (Policy) de UPDATE no Supabase.');
        } else {
            // Optimistic update
            setMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, text: editMsgText.trim(), is_edited: true } : m));
        }
        setEditingMsgId(null);
        setEditMsgText('');
    };

    const handleCancelEdit = () => {
        setEditingMsgId(null);
        setEditMsgText('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => { setIsOpen(true); setIsMinimized(false); }}
                className="fixed bottom-6 right-6 bg-pink-600 hover:bg-pink-500 text-white p-4 rounded-full shadow-2xl transition-all transform hover:scale-105 z-50 flex items-center justify-center animate-bounce-slow"
                title="Chat Global"
            >
                <div className="relative">
                    <MessageSquare size={24} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-pink-600 animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </div>
            </button>
        );
    }

    return (
        <div className={`fixed right-4 sm:right-6 bottom-4 sm:bottom-6 w-[90vw] sm:w-[350px] bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl z-50 flex flex-col transition-all duration-300 ease-in-out ${isMinimized ? 'h-14' : 'h-[500px] max-h-[80vh]'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-stone-800 bg-stone-800/50 rounded-t-2xl cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-pink-500" />
                    <h3 className="font-bold text-white text-sm">Chat Global</h3>
                    {isMinimized && unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2">
                            {unreadCount} novas
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-700 rounded transition-colors" title="Minimizar" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
                        <Minus size={16} />
                    </button>
                    <button className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-700 rounded transition-colors" title="Fechar" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Messages Area - Only shown if not minimized */}
            {!isMinimized && (
                <>
                    {/* Birthday Banner */}
                    {birthdaysToday.length > 0 && !isMinimized && (
                        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex flex-col gap-1">
                            <h4 className="text-yellow-500 text-xs font-bold flex items-center gap-1">
                                <Cake size={14} /> Aniversariantes de Hoje!
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {birthdaysToday.map(u => (
                                    <span key={u.id} className="text-stone-300 text-[11px] bg-stone-900 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                                        {u.nickname || u.name} 🎉
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-stone-900/50">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-stone-500 italic space-y-2">
                                <MessageSquare size={32} className="opacity-20" />
                                <p className="text-sm">Nenhuma mensagem ainda.</p>
                                <p className="text-xs">Seja o primeiro a dizer olá!</p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isMe = msg.sender_id === currentUser.id;
                                const showName = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
                                const senderProfile = allUsersProfiles.find(u => u.id === msg.sender_id);
                                const displayName = senderProfile?.nickname || senderProfile?.name || msg.sender_name;
                                const avatarSrc = senderProfile?.photo_url || null;

                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showName && !isMe && (
                                            <div className="flex items-center gap-2 mb-1 ml-1">
                                                {avatarSrc ? (
                                                    <img src={avatarSrc} alt={displayName} className="w-5 h-5 rounded-full object-cover border border-stone-700" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-stone-700 flex items-center justify-center text-[8px] font-bold text-white uppercase border border-stone-600">
                                                        {displayName.substring(0, 2)}
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-bold text-stone-400">{displayName}</span>
                                            </div>
                                        )}

                                        {/* Editing Mode */}
                                        {editingMsgId === msg.id ? (
                                            <div className={`max-w-[85%] rounded-2xl p-2 bg-stone-800 border border-stone-700 text-stone-200 shadow-xl`}>
                                                <textarea
                                                    value={editMsgText}
                                                    onChange={e => setEditMsgText(e.target.value)}
                                                    className="w-full bg-stone-900 text-sm text-white border border-stone-700 rounded p-2 focus:outline-none focus:border-pink-500 h-20 custom-scrollbar"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button onClick={handleCancelEdit} className="text-xs text-stone-400 hover:text-white px-2 py-1">Cancelar</button>
                                                    <button onClick={handleSaveEdit} className="text-xs bg-pink-600 hover:bg-pink-500 text-white px-3 py-1 rounded flex items-center gap-1">
                                                        <Check size={12} /> Salvar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="group flex items-center gap-2 max-w-[85%]">
                                                {/* Edit Button for 'Me' (shown on left of bubble) */}
                                                {isMe && (
                                                    <button
                                                        onClick={() => { setEditingMsgId(msg.id); setEditMsgText(msg.text); }}
                                                        className="text-stone-500 hover:text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                        title="Editar mensagem"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                )}

                                                <div className={`rounded-2xl px-4 py-2 flex flex-col ${isMe ? 'bg-pink-600 text-white rounded-tr-sm' : 'bg-stone-800 border border-stone-700 text-stone-200 rounded-tl-sm'}`}>
                                                    <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                                                    <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-pink-200' : 'text-stone-500'}`}>
                                                        {msg.is_edited && <span className="text-[8px] italic opacity-80">(editado)</span>}
                                                        <span className="text-[9px]">
                                                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-stone-900 border-t border-stone-800 rounded-b-2xl">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Digite sua mensagem..."
                                className="flex-1 bg-stone-800 border border-stone-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10 flex-shrink-0"
                            >
                                <Send size={16} className="ml-0.5" />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

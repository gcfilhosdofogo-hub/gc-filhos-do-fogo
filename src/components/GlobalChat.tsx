import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Edit2, Check, Cake, MessageSquare, X, Send, Minus, Mic, Square, Trash2, Reply, Smile } from 'lucide-react';
import { User } from '../../types';

interface ChatMessage {
    id: string;
    sender_id: string;
    sender_name: string;
    text: string;
    created_at: string;
    is_edited?: boolean; // We can use this locally or wait for backend update
    audio_url?: string; // NEW: URL do áudio, caso seja mensagem de voz
    reply_to_id?: string;
    reply_text?: string;
    reply_sender_name?: string;
    reactions?: Record<string, string[]>; // emoji -> array of user_ids
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
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
    const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const COMMON_EMOJIS = ['❤️', '😂', '🔥', '👏', '😮', '😢'];

    // Audio Recording States
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);

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

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

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

                if (newMsg.sender_id !== currentUser.id) {
                    if (!isOpen || isMinimized) {
                        setUnreadCount(prev => prev + 1);
                    }

                    // Play Notification Sound
                    try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Quick subtle pop sound
                        audio.volume = 0.5;
                        audio.play().catch(() => { });
                    } catch (e) {
                        // ignore audio play errors (e.g. user hasn't interacted with document yet)
                    }

                    // Show Browser Notification if running in background/minimized
                    if ('Notification' in window && Notification.permission === 'granted') {
                        if (document.hidden || !isOpen || isMinimized) {
                            new Notification(`Nova mensagem de ${newMsg.sender_name}`, {
                                body: newMsg.text,
                                icon: '/logo.png' // Adjust if there's a specific icon path
                            });
                        }
                    }
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
                text: messageText,
                reply_to_id: replyTo?.id,
                reply_text: replyTo?.text,
                reply_sender_name: replyTo?.sender_name
            });

        if (error) {
            console.error('Error sending message:', error);
            alert('Não foi possível enviar a mensagem. Verifique sua conexão ou se a tabela global_chat foi criada.');
            setNewMessage(messageText); // restore if failed
        } else {
            setReplyTo(null);
        }
    };

    const handleReaction = async (message: ChatMessage, emoji: string) => {
        const userId = currentUser.id;
        const currentReactions = message.reactions || {};
        const userIds = currentReactions[emoji] || [];

        let newUserIds;
        if (userIds.includes(userId)) {
            newUserIds = userIds.filter(id => id !== userId);
        } else {
            newUserIds = [...userIds, userId];
        }

        const updatedReactions = {
            ...currentReactions,
            [emoji]: newUserIds
        };

        // If no one is reacting with this emoji anymore, remove the key
        if (newUserIds.length === 0) {
            delete updatedReactions[emoji];
        }

        const { error } = await supabase
            .from('global_chat')
            .update({ reactions: updatedReactions })
            .eq('id', message.id);

        if (error) {
            console.error('Error updating reactions:', error);
        }
        setShowReactionPicker(null);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop()); // release mic
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerIntervalRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error accessing mic:", err);
            alert("Não foi possível acessar seu microfone. Verifique as permissões do navegador.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        }
    };

    const cancelRecording = () => {
        stopRecording();
        setAudioBlob(null);
        audioChunksRef.current = [];
        setRecordingTime(0);
    };

    const handleSendAudio = async () => {
        if (!audioBlob) return;

        const fileName = `chat-audio-${currentUser.id}-${Date.now()}.webm`;

        try {
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('chat_audio')
                .upload(fileName, audioBlob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error("Error uploading audio:", uploadError);
                alert("Falha ao salvar áudio. Verifique se o bucket 'chat_audio' existe e se as políticas (RLS) permitem inserção.");
                return;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('chat_audio')
                .getPublicUrl(fileName);

            const audioUrl = urlData.publicUrl;

            // Send standard message with audioUrl
            const { error: dbError } = await supabase
                .from('global_chat')
                .insert({
                    sender_id: currentUser.id,
                    sender_name: currentUser.nickname || currentUser.name,
                    text: '🎵 Mensagem de voz',
                    audio_url: audioUrl
                });

            if (dbError) throw dbError;

            // Clear recording state
            setAudioBlob(null);
            audioChunksRef.current = [];
            setRecordingTime(0);

        } catch (err) {
            console.error("Error sending audio message:", err);
            alert("Falha ao enviar áudio.");
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
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


                                                <div
                                                    onClick={() => setActiveMessageId(activeMessageId === msg.id ? null : msg.id)}
                                                    className={`rounded-2xl px-4 py-2 flex flex-col relative cursor-pointer transition-all ${activeMessageId === msg.id ? 'ring-2 ring-pink-500/50 scale-[1.02]' : ''} ${isMe ? 'bg-pink-600 text-white rounded-tr-sm' : 'bg-stone-800 border border-stone-700 text-stone-200 rounded-tl-sm'}`}
                                                >
                                                    {/* Reply Content */}
                                                    {msg.reply_to_id && (
                                                        <div className={`text-[10px] mb-1 p-2 rounded border-l-2 bg-black/20 ${isMe ? 'border-pink-300' : 'border-stone-500'}`}>
                                                            <p className="font-bold opacity-70">{msg.reply_sender_name}</p>
                                                            <p className="line-clamp-1 opacity-60">{msg.reply_text}</p>
                                                        </div>
                                                    )}

                                                    {msg.audio_url ? (
                                                        <div className="flex flex-col gap-2">
                                                            <p className="text-sm italic opacity-80">{msg.text}</p>
                                                            <audio controls src={msg.audio_url} className="h-8 max-w-[200px]" />
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                                                    )}

                                                    <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-pink-200' : 'text-stone-500'}`}>
                                                        {msg.is_edited && <span className="text-[8px] italic opacity-80">(editado)</span>}
                                                        <span className="text-[9px]">
                                                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    {/* Reactions Display */}
                                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                        <div className={`absolute -bottom-3 flex flex-wrap gap-1 ${isMe ? 'right-0' : 'left-0'}`}>
                                                            {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                                                const users = userIds as string[];
                                                                return (
                                                                    <button
                                                                        key={emoji}
                                                                        onClick={() => handleReaction(msg, emoji)}
                                                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm transition-colors ${users.includes(currentUser.id) ? 'bg-pink-900/40 border-pink-500 text-pink-200' : 'bg-stone-800 border-stone-700 text-stone-300'}`}
                                                                    >
                                                                        <span>{emoji}</span>
                                                                        <span>{users.length}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons (Reply/React) */}
                                                {!isMe && (
                                                    <div className={`transition-opacity flex items-center gap-1 ${activeMessageId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setReplyTo(msg); setActiveMessageId(null); }}
                                                            className="text-stone-500 hover:text-stone-300 p-1.5 bg-stone-800/50 rounded-full"
                                                            title="Responder"
                                                        >
                                                            <Reply size={16} />
                                                        </button>
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id); }}
                                                                className="text-stone-500 hover:text-stone-300 p-1.5 bg-stone-800/50 rounded-full"
                                                                title="Reagir"
                                                            >
                                                                <Smile size={16} />
                                                            </button>
                                                            {showReactionPicker === msg.id && (
                                                                <div className="absolute bottom-full mb-2 left-0 bg-stone-800 border border-stone-700 rounded-full p-1.5 shadow-2xl flex gap-2 z-20 animate-in fade-in zoom-in duration-200">
                                                                    {COMMON_EMOJIS.map(emoji => (
                                                                        <button
                                                                            key={emoji}
                                                                            onClick={(e) => { e.stopPropagation(); handleReaction(msg, emoji); setActiveMessageId(null); }}
                                                                            className="hover:scale-125 transition-transform text-lg"
                                                                        >
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Action Buttons for Me (Edit/React) */}
                                                {isMe && (
                                                    <div className={`transition-opacity flex items-center gap-1 order-first ${activeMessageId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                        {/* Edit Button moved here for consistency */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingMsgId(msg.id); setEditMsgText(msg.text); setActiveMessageId(null); }}
                                                            className="text-stone-500 hover:text-stone-300 p-1.5 bg-stone-800/50 rounded-full"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>

                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id); }}
                                                                className="text-stone-500 hover:text-stone-300 p-1.5 bg-stone-800/50 rounded-full"
                                                                title="Reagir"
                                                            >
                                                                <Smile size={14} />
                                                            </button>
                                                            {showReactionPicker === msg.id && (
                                                                <div className="absolute bottom-full mb-2 right-0 bg-stone-800 border border-stone-700 rounded-full p-1.5 shadow-2xl flex gap-2 z-20 animate-in fade-in zoom-in duration-200">
                                                                    {COMMON_EMOJIS.map(emoji => (
                                                                        <button
                                                                            key={emoji}
                                                                            onClick={(e) => { e.stopPropagation(); handleReaction(msg, emoji); setActiveMessageId(null); }}
                                                                            className="hover:scale-125 transition-transform text-lg"
                                                                        >
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
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
                        {/* Reply Preview */}
                        {replyTo && (
                            <div className="flex items-center justify-between bg-stone-800/80 border-l-4 border-pink-500 p-2 mb-2 rounded-lg animate-in slide-in-from-bottom-2 duration-200">
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-pink-500">Respondendo a {replyTo.sender_name}</p>
                                    <p className="text-xs text-stone-400 line-clamp-1">{replyTo.text}</p>
                                </div>
                                <button onClick={() => setReplyTo(null)} className="text-stone-500 hover:text-white p-1">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        {isRecording ? (
                            <div className="flex items-center justify-between bg-stone-800 border-pink-500 border rounded-full px-4 py-2">
                                <span className="text-pink-500 text-sm font-bold flex items-center gap-2 animate-pulse">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    Gravando... {formatTime(recordingTime)}
                                </span>
                                <button onClick={stopRecording} className="text-stone-300 hover:text-white bg-red-500 hover:bg-red-600 p-1.5 rounded-full transition-colors">
                                    <Square size={14} fill="currentColor" />
                                </button>
                            </div>
                        ) : audioBlob ? (
                            <div className="flex items-center gap-2 bg-stone-800 rounded-full pl-4 pr-1 py-1">
                                <span className="text-sm text-stone-300 flex-1">Áudio gravado ({formatTime(recordingTime)})</span>
                                <button onClick={cancelRecording} className="text-stone-400 hover:text-red-500 p-2 rounded-full transition-colors" title="Descartar">
                                    <Trash2 size={16} />
                                </button>
                                <button onClick={handleSendAudio} className="bg-pink-600 hover:bg-pink-500 text-white p-2 rounded-full transition-colors flex items-center justify-center w-8 h-8 flex-shrink-0" title="Enviar áudio">
                                    <Send size={14} className="ml-0.5" />
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Digite sua mensagem..."
                                    className="flex-1 bg-stone-800 border border-stone-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                                />
                                {newMessage.trim() ? (
                                    <button
                                        type="submit"
                                        className="bg-pink-600 hover:bg-pink-500 text-white p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10 flex-shrink-0"
                                    >
                                        <Send size={16} className="ml-0.5" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={startRecording}
                                        className="bg-stone-700 hover:bg-stone-600 text-white p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10 flex-shrink-0 border border-stone-600"
                                        title="Enviar áudio"
                                    >
                                        <Mic size={18} />
                                    </button>
                                )}
                            </form>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

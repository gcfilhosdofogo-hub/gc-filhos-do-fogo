import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { EventBanner } from '../../types';

interface BannerPopupProps {
    banner: EventBanner | null;
}

export const BannerPopup: React.FC<BannerPopupProps> = ({ banner }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (banner && banner.active) {
            const lastShown = localStorage.getItem(`banner_shown_${banner.id}`);
            // Show if it hasn't been shown in this "session" (or since it was last closed)
            if (!lastShown) {
                setIsVisible(true);
            }
        }
    }, [banner]);

    const handleClose = () => {
        if (banner) {
            localStorage.setItem(`banner_shown_${banner.id}`, 'true');
        }
        setIsVisible(false);
    };

    if (!isVisible || !banner) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header/Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all border border-white/10"
                    aria-label="Fechar"
                >
                    <X size={24} />
                </button>

                {/* Banner Content */}
                <div className="flex flex-col">
                    {banner.title && (
                        <div className="p-4 bg-stone-800/50 border-b border-stone-800">
                            <h2 className="text-xl font-bold text-white text-center">{banner.title}</h2>
                        </div>
                    )}
                    <div className="relative aspect-[16/9] md:aspect-[21/9] w-full">
                        <img
                            src={banner.image_url}
                            alt={banner.title || 'Banner de Evento'}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Footer Action (Optional) */}
                <div className="p-4 bg-stone-950/50 flex justify-center">
                    <button
                        onClick={handleClose}
                        className="px-8 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                    >
                        ESTOU CIENTE
                    </button>
                </div>
            </div>
        </div>
    );
};

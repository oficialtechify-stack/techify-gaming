import React, { useState } from 'react';
import { CompanyPlan, ProductReview } from '../../types/platform';
import { X, Star, MessageSquare, Plus, CheckCircle2, User, ThumbsUp } from 'lucide-react';

interface PlanReviewsModalProps {
  plan: CompanyPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onAddReview?: (planId: string, review: ProductReview) => void;
}

export const PlanReviewsModal: React.FC<PlanReviewsModalProps> = ({
  plan,
  isOpen,
  onClose,
  onAddReview
}) => {
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen || !plan) return null;

  const defaultReviews: ProductReview[] = plan.reviews && plan.reviews.length > 0 ? plan.reviews : [
    {
      id: 'rev-1',
      author: 'Lucas Mendes',
      rating: 5,
      comment: 'Excelente plano e suporte impecável. Aumentamos a conversão em mais de 40% na primeira semana!',
      date: '15/10/2024',
      verifiedBuyer: true
    },
    {
      id: 'rev-2',
      author: 'Carolina Silva',
      rating: 5,
      comment: 'Integração super rápida e checkout seguro. Recomendo muito para qualquer negócio digital.',
      date: '28/09/2024',
      verifiedBuyer: true
    }
  ];

  const handleCreateReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !comment.trim()) return;

    const newRev: ProductReview = {
      id: `rev-${Date.now()}`,
      author: author.trim(),
      rating,
      comment: comment.trim(),
      date: new Date().toLocaleDateString('pt-BR'),
      verifiedBuyer: true
    };

    if (onAddReview) {
      onAddReview(plan.id, newRev);
    }
    setAuthor('');
    setComment('');
    setShowAddForm(false);
  };

  const avgRating = (defaultReviews.reduce((acc, r) => acc + r.rating, 0) / defaultReviews.length).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-['Syne']">
                Avaliações do Produto
              </h3>
              <p className="text-xs text-white/50">{plan.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rating Overview */}
        <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-amber-400 font-['Syne']">{avgRating}</span>
            <div>
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <span className="text-[11px] text-white/50">Com base em {defaultReviews.length} avaliações</span>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Nova Avaliação
          </button>
        </div>

        {/* Add Review Form */}
        {showAddForm && (
          <form onSubmit={handleCreateReview} className="p-4 rounded-2xl bg-[#0b1322] border border-[#D9F22A]/30 mb-5 space-y-3 animate-in fade-in duration-200">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Adicionar Depoimento</h4>
            
            <div>
              <label className="block text-[11px] text-white/70 mb-1">Nome do Cliente</label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ex: Roberto Gomes"
                className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-white/70 mb-1">Nota (1 a 5 estrelas)</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 Estrelas - Excelente)</option>
                <option value={4}>⭐⭐⭐⭐ (4 Estrelas - Muito Bom)</option>
                <option value={3}>⭐⭐⭐ (3 Estrelas - Regular)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-white/70 mb-1">Comentário / Depoimento</label>
              <textarea
                required
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escreva a avaliação do cliente..."
                className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-white/60 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#D9F22A] text-[#060A15] font-black px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Salvar Depoimento
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        <div className="space-y-3">
          {defaultReviews.map((rev) => (
            <div key={rev.id} className="p-4 rounded-2xl bg-[#050811] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                    {rev.author.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{rev.author}</span>
                    {rev.verifiedBuyer && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Comprador Verificado
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
              </div>

              <p className="text-xs text-white/70 italic leading-relaxed">
                "{rev.comment}"
              </p>
              <div className="text-[10px] text-white/40 text-right">{rev.date}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

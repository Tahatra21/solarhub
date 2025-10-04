export const getStageBadgeColor = (stage: string): string => {
  const colors: Record<string, string> = {
    'Introduction': 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300',
    'Growth': 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300',
    'Maturity': 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300',
    'Decline': 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-800 border border-rose-300'
  };
  return colors[stage] || 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
};

export const getSegmentBadgeColor = (segmen: string): string => {
  const colors: Record<string, string> = {
    'Korporat': 'bg-soft-mauve/20 text-vibrant-purple dark:bg-soft-mauve/30 dark:text-pastel-lavender',
    'Distribusi': 'bg-cool-sky/20 text-vibrant-blue dark:bg-cool-sky/30 dark:text-pastel-blue',
    'Pelayanan Pelanggan': 'bg-vibrant-mint/20 text-vibrant-teal dark:bg-vibrant-mint/30 dark:text-dreamy-mint',
    'EP & Pembangkit': 'bg-warm-honey/20 text-warm-gold dark:bg-warm-honey/30 dark:text-warm-apricot',
    'Transmisi': 'bg-soft-rose/20 text-coral-medium dark:bg-soft-rose/30 dark:text-pastel-coral'
  };
  return colors[segmen] || 'bg-neutral-beige-light/20 text-muted-blue-gray dark:bg-muted-periwinkle/30 dark:text-neutral-cream-soft';
};
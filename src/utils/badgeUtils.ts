export const getStageBadgeColor = (stage: string) => {
  switch (stage?.toLowerCase()) {
    case 'development':
      return 'bg-cool-sky/20 text-vibrant-blue dark:bg-cool-sky/30 dark:text-pastel-blue';
    case 'testing':
      return 'bg-warm-honey/20 text-warm-gold dark:bg-warm-honey/30 dark:text-warm-apricot';
    case 'released':
      return 'bg-vibrant-mint/20 text-vibrant-teal dark:bg-vibrant-mint/30 dark:text-dreamy-mint';
    case 'deprecated':
      return 'bg-soft-rose/20 text-coral-medium dark:bg-soft-rose/30 dark:text-pastel-coral';
    default:
      return 'bg-neutral-beige-light/20 text-muted-blue-gray dark:bg-muted-periwinkle/30 dark:text-neutral-cream-soft';
  }
};

export const getSegmentBadgeColor = (segment: string) => {
  switch (segment?.toLowerCase()) {
    case 'consumer':
      return 'bg-soft-mauve/20 text-vibrant-purple dark:bg-soft-mauve/30 dark:text-pastel-lavender';
    case 'enterprise':
      return 'bg-pastel-blue/20 text-vibrant-indigo dark:bg-pastel-blue/30 dark:text-cool-sky';
    case 'government':
      return 'bg-dreamy-mint/20 text-vibrant-sage dark:bg-dreamy-mint/30 dark:text-soft-aqua';
    default:
      return 'bg-neutral-beige-light/20 text-muted-blue-gray dark:bg-muted-periwinkle/30 dark:text-neutral-cream-soft';
  }
};
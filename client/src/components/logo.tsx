
import { useTheme } from '@/contexts/theme-context';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const { theme } = useTheme();
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20'
  };

  const logoSrc = theme === 'light' 
    ? "/attached_assets/Logo_PretorAI_Light.png"
    : "/attached_assets/Logo_PretorAI.jpeg";

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <img 
        src={logoSrc}
        alt="Pretor AI Logo" 
        className="w-full h-full object-cover rounded-xl shadow-lg border border-primary/20"
        onError={(e) => {
          console.error('Error loading image:', e);
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) {
            fallback.classList.remove('hidden');
          }
        }}
      />
      <div className="hidden w-full h-full bg-gradient-to-br from-primary/20 via-primary to-primary/20 rounded-xl shadow-lg flex items-center justify-center border border-primary/20">
        <i className="fas fa-scale-balanced text-primary-foreground text-xl"></i>
      </div>
    </div>
  );
}

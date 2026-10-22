import { useNavigate } from 'react-router-dom';
import { IconHome } from '@tabler/icons-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h1 className="text-7xl font-bold text-[var(--cn-text-muted)] mb-2 font-mono">404</h1>
      <p className="text-lg text-[var(--cn-text-secondary)] mb-6">Page not found in local vault</p>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--cn-primary)] text-white rounded-lg hover:bg-[var(--cn-primary-hover)] text-sm font-medium transition-colors"
      >
        <IconHome size={16} />
        Go Home
      </button>
    </div>
  );
}

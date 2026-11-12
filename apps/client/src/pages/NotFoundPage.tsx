import { useNavigate } from 'react-router-dom';
import { IconHome } from '@tabler/icons-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h1 className="text-7xl font-bold text-[var(--cn-text-muted)] mb-2 font-mono">404</h1>
      <p className="text-lg text-[var(--cn-text-secondary)] mb-6">Page not found</p>
      <button
        onClick={() => navigate('/')}
        className="cn-btn cn-btn-md cn-btn-primary cn-btn-tactile px-4"
      >
        <IconHome size={16} />
        <span>Return Home</span>
      </button>
    </div>
  );
}

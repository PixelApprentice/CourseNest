import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { AppLayout } from './layouts/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AppLayout>
          <AppRouter />
        </AppLayout>
      </HashRouter>
    </QueryClientProvider>
  );
}

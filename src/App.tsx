import { Suspense, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { gadgets } from './gadgets';
import { LocaleProvider } from './i18n/LocaleContext';
import { useRoute } from './router';
import './App.css';

const App = () => {
  const { path, navigate } = useRoute();
  const [minimal, setMinimal] = useState(false);

  const gadgetId = path === '/' ? gadgets[0].id : path.slice(1);
  const activeGadget = gadgets.find((g) => g.id === gadgetId) ?? gadgets[0];
  const GadgetComponent = activeGadget.component;

  return (
    <LocaleProvider>
      <div className="flex h-screen p-4 gap-4">
        <Sidebar
          gadgets={gadgets}
          activeId={activeGadget.id}
          onSelect={(id) => navigate(`/${id}`)}
          minimal={minimal}
          onToggleMinimal={() => setMinimal((m) => !m)}
        />
        <div
          className="flex-1 border border-white/10 rounded-xl p-6 overflow-auto"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <Suspense>{GadgetComponent && <GadgetComponent />}</Suspense>
        </div>
      </div>
    </LocaleProvider>
  );
};

export default App;

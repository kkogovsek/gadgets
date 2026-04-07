import { Suspense, useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Card } from './components/ui/card';
import { gadgets } from './gadgets';
import { LocaleProvider } from './i18n/LocaleContext';
import { useRoute } from './router';
import './App.css';

const App = () => {
  const { path, navigate } = useRoute();
  const [minimal, setMinimal] = useState(false);

  const homeId = gadgets[0].id;
  const gadgetId = path === '/' ? homeId : path.slice(1);
  const activeGadget = gadgets.find((g) => g.id === gadgetId) ?? gadgets[0];
  const GadgetComponent = activeGadget.component;

  useEffect(() => {
    const theme = activeGadget.theme;
    document.body.className = theme ? `theme-${theme}` : '';
    return () => {
      document.body.className = '';
    };
  }, [activeGadget.theme]);

  useEffect(() => {
    document.title = activeGadget.name;
  }, [activeGadget.name]);

  return (
    <LocaleProvider>
      <div className="flex h-screen p-4 gap-4">
        <Sidebar
          gadgets={gadgets}
          activeId={activeGadget.id}
          onSelect={(id) => navigate(id === homeId ? '/' : `/${id}`)}
          minimal={minimal}
          onToggleMinimal={() => setMinimal((m) => !m)}
        />
        <Card
          rounded="xl"
          padding="xl"
          className="flex-1 overflow-auto main-panel"
        >
          <Suspense>{GadgetComponent && <GadgetComponent />}</Suspense>
        </Card>
      </div>
    </LocaleProvider>
  );
};

export default App;

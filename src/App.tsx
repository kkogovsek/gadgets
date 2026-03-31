import { Suspense, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { gadgets } from './gadgets';
import { PrivacyPolicy } from './gadgets/PrivacyPolicy';
import './App.css';

const App = () => {
  const [activeId, setActiveId] = useState(gadgets[0].id);
  const [minimal, setMinimal] = useState(false);

  const activeGadget = gadgets.find((g) => g.id === activeId);
  const GadgetComponent =
    activeId === 'privacy-policy' ? PrivacyPolicy : activeGadget?.component;

  return (
    <div className="flex h-screen p-4 gap-4">
      <Sidebar
        gadgets={gadgets}
        activeId={activeId}
        onSelect={setActiveId}
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
  );
};

export default App;

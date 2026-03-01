import React from 'react';
import { createRoot } from 'react-dom/client';
import MiniWidget from './components/MiniWidget';

const root = createRoot(document.getElementById('root')!);
root.render(<MiniWidget />);

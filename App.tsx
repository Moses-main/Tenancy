import React from 'react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './src/pages/Home.tsx';
import Issuer from './src/pages/Issuer.tsx';
import Investor from './src/pages/Investor.tsx';
import NotFound from './src/pages/NotFound.tsx';

const App: React.FC = () => {
  return (
    <Theme appearance="dark" radius="medium" scaling="100%">
      <Router>
        <div className="font-sans antialiased text-foreground bg-background selection:bg-primary/30">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/issuer" element={<Issuer />} />
            <Route path="/investor" element={<Investor />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ToastContainer
            position="bottom-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </div>
      </Router>
    </Theme>
  );
}

export default App;
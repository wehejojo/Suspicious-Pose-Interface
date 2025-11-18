import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import Home from './pages/Home';
import LatestViolation from './pages/LatestViolation';
import Violations from './pages/Violations';
import Reports from './pages/Reports';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/latest" element={<LatestViolation />} />
          <Route path="/violations" element={<Violations />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

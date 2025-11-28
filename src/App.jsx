import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import NotFound from './pages/NotFound';

import Login from './pages/auth/Login';
import Home from './pages/home/Home';
import Dashboard from './pages/dashboard/Dashboard';
import Charts from './pages/charts/Charts';
import Feed from './pages/feed/Feed';
import Settings from './pages/settings/Settings'

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

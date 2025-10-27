import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { MintPage } from "./pages/MintPage";
import { BurnPage } from "./pages/BurnPage";
import CallFunctionPage from "./pages/CallFunctionPage";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mint" element={<MintPage />} />
        <Route path="/burn" element={<BurnPage />} />
        <Route path="/call-function" element={<CallFunctionPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

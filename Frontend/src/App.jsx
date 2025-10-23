import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import Navbar from "./element/Navbar.jsx";
import About from "./component/About.jsx";
import Home from "./component/Home.jsx";
import DatasetManagement from "./component/Upload.jsx";


function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/data" element={<DatasetManagement />} />
      </Routes>


    </BrowserRouter>
  );
}

export default App;

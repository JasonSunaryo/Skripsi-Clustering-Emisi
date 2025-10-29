function Navbar() {
    return (
      <nav className="bg-gray-800 text-white p-4 flex justify-between items-center shadow h-20">
      <div className="text-lg font-bold">GMM Clustering</div>
      <div className="space-x-4">
        <a href="/" className="hover:text-gray-300">Home</a>
        <a href="/about" className="hover:text-gray-300">About</a>
        <a href="/data" className="hover:text-gray-300">Upload Dataset</a>
      </div>
    </nav>
    );
  }
  
  export default Navbar;
  
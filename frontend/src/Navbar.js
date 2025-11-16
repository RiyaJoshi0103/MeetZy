import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Video, Users, Clock, Download } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleHostMeeting = () => {
    if (!isLoggedIn) {
      alert("Please login first to host a meeting.");
      navigate("/auth");
    } else {
      navigate("/hostmeeting");
    }
    setIsMobileMenuOpen(false);
  };

  const handleJoinMeeting = () => {
    navigate("/join");
    setIsMobileMenuOpen(false);
  };

  const handleHistory = () => {
    navigate("/history");
    setIsMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    navigate("/");
    setIsMobileMenuOpen(false);
  };

  const handleSignIn = () => {
    navigate("/auth");
    setIsMobileMenuOpen(false);
  };

  const linkClasses = `
    flex items-center space-x-2 font-medium transition-all duration-300 rounded-lg 
    hover:scale-[1.02] px-3 py-1 text-base font-semibold
    ${
      isScrolled
        ? "text-white hover:text-white hover:bg-blue-700/50"
        : "text-white/90 hover:text-white hover:bg-blue-700/50"
    }
  `;

  const mobileLinkClasses = `
    flex items-center space-x-3 w-full text-left px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-base
    hover:scale-[1.01] hover:shadow-lg
    text-white hover:bg-blue-700/50
  `;

  return (
    <>
      <nav
        className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300 ease-in-out
        h-24
        ${
          isScrolled
            ? "bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-800 shadow-xl"
            : "bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 shadow-2xl"
        }
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo - Far Left */}
            <div
              onClick={handleLogoClick}
              className="flex items-center space-x-2 cursor-pointer group flex-shrink-0">
              <div
                className={`
                w-7 h-7 rounded-lg flex items-center justify-center
                transition-all duration-500
                bg-white text-indigo-700 shadow-md
                group-hover:scale-110 group-hover:rotate-6
              `}>
                <Video className="w-4 h-4" />
              </div>
              <span
                className={`
                text-xl font-extrabold tracking-tight transition-colors duration-300
                text-white
                group-hover:scale-[1.02]
              `}>
                Meetzy
              </span>
            </div>

            {/* Centered Navigation Links */}
            <div className="hidden lg:flex items-center justify-center flex-1 mx-8">
              <div className="flex items-center space-x-1">
                <button onClick={handleJoinMeeting} className={linkClasses}>
                  <Users className="w-4 h-4" />
                  <span>Join a Meeting</span>
                </button>

                <button onClick={handleHostMeeting} className={linkClasses}>
                  <Video className="w-4 h-4" />
                  <span>Host a Meeting</span>
                </button>

                {isLoggedIn && (
                  <button onClick={handleHistory} className={linkClasses}>
                    <Clock className="w-4 h-4" />
                    <span>History</span>
                  </button>
                )}

                <a
                  href="https://zoom.us/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClasses}>
                  <Download className="w-4 h-4" />
                  <span>Download App</span>
                </a>
              </div>
            </div>

            {/* Sign In Button - Far Right - PURE BLACK */}
            <div className="hidden lg:block flex-shrink-0">
              <button
                onClick={handleSignIn}
                className={`
                  px-4 py-1.5 rounded-full font-bold transition-all duration-300 text-base
                  transform hover:scale-105 hover:shadow-xl
                  bg-black text-white border-2 border-black
                  hover:bg-gray-900 hover:border-gray-900
                `}>
                {isLoggedIn ? "Dashboard" : "Sign In"}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`
                lg:hidden p-1 rounded-lg transition-all duration-300
                text-white hover:bg-blue-700/50
              `}>
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`
          lg:hidden absolute top-full left-0 right-0
          transition-all duration-300 ease-in-out
          ${
            isMobileMenuOpen
              ? "max-h-[400px] opacity-100 visible"
              : "max-h-0 opacity-0 invisible"
          }
          bg-gradient-to-b from-indigo-700 via-purple-700 to-blue-800 backdrop-blur-md
        `}>
          <div className="px-4 py-2 space-y-1">
            <button onClick={handleJoinMeeting} className={mobileLinkClasses}>
              <Users className="w-4 h-4" />
              <span>Join a Meeting</span>
            </button>

            <button onClick={handleHostMeeting} className={mobileLinkClasses}>
              <Video className="w-4 h-4" />
              <span>Host a Meeting</span>
            </button>

            {isLoggedIn && (
              <button onClick={handleHistory} className={mobileLinkClasses}>
                <Clock className="w-4 h-4" />
                <span>History</span>
              </button>
            )}

            <a
              href="https://zoom.us/download"
              target="_blank"
              rel="noopener noreferrer"
              className={mobileLinkClasses}>
              <Download className="w-4 h-4" />
              <span>Download App</span>
            </a>

            {/* Mobile Sign In Button - PURE BLACK */}
            <button
              onClick={handleSignIn}
              className={`
                w-full flex items-center justify-center px-4 py-3 rounded-xl font-bold transition-all duration-300 text-base
                transform hover:scale-[1.01] hover:shadow-xl mt-2
                bg-black text-white border-2 border-black
                hover:bg-gray-900 hover:border-gray-900
              `}>
              {isLoggedIn ? "Go to Dashboard" : "Sign In"}
            </button>
          </div>
        </div>
      </nav>

      {/* Reduced spacer height to match new navbar height */}
      <div className="h-12"></div>
    </>
  );
};

export default Navbar;

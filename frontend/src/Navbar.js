import React from "react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem("token");

  const colors = {
    primary: "#E67E22",
    secondary: "#D35400",
    textLight: "#FFFFFF",
    textDark: "#2C3E50",
    background: "#FDF2E9",
    border: "#E67E22",
  };

  const handleHostMeeting = () => {
    if (!isLoggedIn) {
      alert("Please login first to host a meeting.");
      navigate("/auth");
    } else {
      navigate("/hostmeeting");
    }
  };

  const handleJoinMeeting = () => {
    navigate("/aljk23");
  };

  const handleHistory = () => {
    navigate("/history");
  };

  return (
    <>
      <style>{`
        nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          height: 70px;
          background-color: ${colors.primary};
          position: sticky;
          top: 0;
          z-index: 100;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .logo {
          font-weight: 700;
          font-size: 1.8rem;
          color: ${colors.textLight};
          cursor: pointer;
          transition: transform 0.2s;
        }

        .logo:hover {
          transform: scale(1.03);
        }

        ul.nav-links {
          list-style: none;
          display: flex;
          gap: 2rem;
          align-items: center;
          margin: 0;
          padding: 0;
        }

        ul.nav-links li a {
          text-decoration: none;
          color: ${colors.textLight};
          font-weight: 600;
          font-size: 1.05rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        ul.nav-links li a:hover {
          color: ${colors.textDark};
        }

        .sign-in-btn {
          padding: 10px 20px;
          border: 2px solid ${colors.textLight};
          border-radius: 6px;
          color: ${colors.textLight};
          font-weight: 600;
          cursor: pointer;
          background: transparent;
          transition: all 0.3s ease;
          font-size: 1rem;
        }

        .sign-in-btn:hover {
          background-color: ${colors.textLight};
          color: ${colors.primary};
        }
      `}</style>

      <nav>
        <div className="logo" onClick={() => navigate("/")}>
          Meetzy
        </div>

        <ul className="nav-links">
          <li>
            <a onClick={handleJoinMeeting}>Join a Meeting</a>
          </li>
          <li>
            <a onClick={handleHostMeeting}>Host a Meeting</a>
          </li>
          <li>
            <a onClick={handleHistory}>History</a>
          </li>
          <li>
            <a
              href="https://zoom.us/download"
              target="_blank"
              rel="noopener noreferrer">
              Download App
            </a>
          </li>
        </ul>

        <button className="sign-in-btn" onClick={() => navigate("/auth")}>
          Sign In
        </button>
      </nav>
    </>
  );
};

export default Navbar;

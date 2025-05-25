import React from "react";
import { Link } from "react-router-dom"; // Import Link for routing

const Footer = () => {
  const colors = {
    primary: "#E67E22",
    secondary: "#D35400",
    textLight: "#FFFFFF",
    textDark: "#2C3E50",
    background: "#FDF2E9",
  };

  return (
    <>
      <style>{`
        .footer {
          background-color: ${colors.primary};
          color: ${colors.textLight};
          padding: 3rem 2rem 2rem;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          width: 100%;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          text-align: left;
        }

        .footer-column h3 {
          font-size: 1.2rem;
          margin-bottom: 1.5rem;
          position: relative;
          padding-bottom: 0.5rem;
        }

        .footer-column h3::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 40px;
          height: 2px;
          background: ${colors.textLight};
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-links li {
          margin-bottom: 0.8rem;
        }

        .footer-links a,
        .footer-links .nav-link {
          color: ${colors.textLight};
          text-decoration: none;
          transition: all 0.3s ease;
          display: inline-block;
        }

        .footer-links a:hover,
        .footer-links .nav-link:hover {
          color: ${colors.textDark};
          transform: translateX(5px);
        }

        .social-links {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .social-links a {
          color: ${colors.textLight};
          font-size: 1.5rem;
          transition: all 0.3s ease;
        }

        .social-links a:hover {
          color: ${colors.textDark};
          transform: translateY(-3px);
        }

        .footer-bottom {
          text-align: center;
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.2);
        }

        .footer-bottom p {
          margin: 0;
          font-size: 0.9rem;
        }

        .footer-bottom a {
          color: ${colors.textLight};
          text-decoration: underline;
          transition: all 0.3s ease;
        }

        .footer-bottom a:hover {
          color: ${colors.textDark};
        }
      `}</style>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-column">
            <h3>Product</h3>
            <ul className="footer-links">
              <li>
                <Link className="nav-link" to="/features">
                  Features
                </Link>
              </li>
              <li>
                <Link className="nav-link" to="/download">
                  Download
                </Link>
              </li>
              <li>
                <Link className="nav-link" to="/integrations">
                  Integrations
                </Link>
              </li>
              <li>
                <Link className="nav-link" to="/pricing">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Resources</h3>
            <ul className="footer-links">
              <li>
                <Link className="nav-link" to="/blog">
                  Blog
                </Link>
              </li>
              <li>
                <Link className="nav-link" to="/webinars">
                  Webinars
                </Link>
              </li>
              <li>
                <Link className="nav-link" to="/tutorials">
                  Tutorials
                </Link>
              </li>
              <li>
                <Link className="nav-link" to="/support">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Company</h3>
            <ul className="footer-links">
              <li>
                <Link className="nav-link" to="/about">
                  About Us
                </Link>
              </li>
              <li>
                <Link className="nav-link" to="/careers">
                  Careers
                </Link>
              </li>
              <li>
                <Link className="nav-link" to="/press">
                  Press
                </Link>
              </li>
              <li>
                <Link className="nav-link" to="/contact">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Connect</h3>
            <div className="social-links">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer">
                <i className="fab fa-facebook"></i>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer">
                <i className="fab fa-twitter"></i>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer">
                <i className="fab fa-linkedin"></i>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer">
                <i className="fab fa-instagram"></i>
              </a>
            </div>
            <p style={{ marginTop: "1.5rem" }}>
              Email us:{" "}
              <a href="mailto:support@meetzy.com">support@meetzy.com</a>
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} Meetzy. All rights reserved. |
            <Link className="nav-link" to="/privacy">
              {" "}
              Privacy Policy
            </Link>{" "}
            |
            <Link className="nav-link" to="/terms">
              {" "}
              Terms of Service
            </Link>{" "}
            |
            <Link className="nav-link" to="/cookies">
              {" "}
              Cookie Policy
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
};

export default Footer;

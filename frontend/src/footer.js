import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Linkedin, Instagram, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-800 text-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Product Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold relative pb-3 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-10 after:h-0.5 after:bg-white">
              Product
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/features"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link
                  to="/download"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Download
                </Link>
              </li>
              <li>
                <Link
                  to="/integrations"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Integrations
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold relative pb-3 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-10 after:h-0.5 after:bg-white">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/blog"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  to="/webinars"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Webinars
                </Link>
              </li>
              <li>
                <Link
                  to="/tutorials"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Tutorials
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold relative pb-3 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-10 after:h-0.5 after:bg-white">
              Company
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/careers"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  to="/press"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Press
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-white/80 hover:text-white transition-all duration-300 hover:translate-x-1 block text-sm">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold relative pb-3 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-10 after:h-0.5 after:bg-white">
              Connect
            </h3>

            {/* Social Links */}
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-110">
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-110">
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-110">
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-110">
                <Instagram className="w-4 h-4" />
              </a>
            </div>

            {/* Email Contact */}
            <div className="flex items-center space-x-2 mt-4">
              <Mail className="w-4 h-4 text-white/80" />
              <a
                href="mailto:support@meetzy.com"
                className="text-white/80 hover:text-white transition-colors duration-300 text-sm">
                support@meetzy.com
              </a>
            </div>

            {/* Newsletter Signup - Black Button */}
            <button className="w-full mt-4 px-4 py-2.5 bg-black text-white rounded-full font-semibold text-sm transition-all duration-300 hover:bg-gray-900 hover:scale-105 border-2 border-black">
              Subscribe to Newsletter
            </button>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-white/20 mt-8 lg:mt-12 pt-6 lg:pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            {/* Copyright */}
            <p className="text-white/70 text-sm">
              © {new Date().getFullYear()} Meetzy. All rights reserved.
            </p>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
              <Link
                to="/privacy"
                className="text-white/70 hover:text-white transition-colors duration-300 text-sm">
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-white/70 hover:text-white transition-colors duration-300 text-sm">
                Terms of Service
              </Link>
              <Link
                to="/cookies"
                className="text-white/70 hover:text-white transition-colors duration-300 text-sm">
                Cookie Policy
              </Link>
            </div>

            {/* Additional Black Button */}
            <button className="px-6 py-2 bg-black text-white rounded-full font-semibold text-sm transition-all duration-300 hover:bg-gray-900 hover:scale-105 border-2 border-black">
              Get Help
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

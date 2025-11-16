import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Video,
  Users,
  Calendar,
  Zap,
  ArrowRight,
  Shield,
  Clock,
  Star,
} from "lucide-react";

// Import Navbar and Footer components
import Navbar from "../Navbar";
import Footer from "../footer";

export default function LandingPage() {
  const router = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Use Navbar component */}
      <Navbar />

      {/* Hero Section */}
      <div className="pt-16 lg:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight">
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Connect
                  </span>{" "}
                  with your loved Ones
                </h1>
                <p className="text-xl lg:text-2xl text-gray-600 font-medium">
                  Cover the distance with{" "}
                  <span className="font-bold text-indigo-600">Meetzy</span>
                </p>
              </div>

              <p className="text-lg text-gray-500 max-w-lg">
                High-quality video meetings, messaging, and collaboration in one
                easy-to-use platform. Stay connected with crystal-clear audio
                and video.
              </p>

              {/* Get Started Button - Black */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => router("/auth")}
                  className="group px-8 py-4 bg-black text-white rounded-full font-bold text-lg transition-all duration-300 hover:bg-gray-900 hover:scale-105 hover:shadow-2xl border-2 border-black flex items-center justify-center space-x-2">
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </button>

                <button
                  onClick={() => router("/join")}
                  className="px-8 py-4 bg-transparent text-gray-700 rounded-full font-bold text-lg transition-all duration-300 hover:bg-white hover:scale-105 hover:shadow-xl border-2 border-gray-300">
                  Join a Meeting
                </button>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-6 pt-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Video className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    HD Video
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    Group Calls
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-pink-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    Schedule
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    Fast
                  </span>
                </div>
              </div>
            </div>

            {/* Right Content - Image */}
            <div className="relative">
              <div className="relative z-10">
                <img
                  src="/mobile.png"
                  alt="Meetzy App"
                  className="w-full max-w-md mx-auto lg:max-w-lg transform hover:scale-105 transition-transform duration-500"
                />
              </div>
              {/* Background Decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-3xl blur-3xl opacity-50 -z-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Why Choose Meetzy?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience the difference with our feature-rich platform designed
              for seamless communication
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Secure & Private
              </h3>
              <p className="text-gray-600">
                End-to-end encryption ensures your conversations stay private
                and secure from unwanted access.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                24/7 Available
              </h3>
              <p className="text-gray-600">
                Our platform is always available whenever you need to connect
                with your team or loved ones.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Easy to Use
              </h3>
              <p className="text-gray-600">
                Intuitive interface that anyone can master in minutes. No
                technical expertise required.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-500/70 via-purple-500/70 to-pink-500/70 py-10 lg:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Ready to Start Your Meeting?
          </h2>
          <p className="text-base lg:text-lg text-white/90 mb-6 max-w-2xl mx-auto">
            Join millions of users who trust Meetzy for their video
            communication needs.
          </p>
          <button
            onClick={() => router("/auth")}
            className="px-6 py-3 bg-black text-white rounded-full font-bold text-base transition-all duration-300 hover:bg-gray-900 hover:scale-105 hover:shadow-xl border-2 border-black inline-flex items-center space-x-2 mx-auto">
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Use Footer component */}
      <Footer />
    </div>
  );
}

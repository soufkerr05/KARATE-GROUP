import React, { useState } from 'react';

export default function GymMembershipForm({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl relative overflow-hidden flex flex-col font-sans">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors z-10 p-1"
          aria-label="Close form"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center pt-10 pb-6 px-6 border-b border-gray-100">
          <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">
            Fill out the form for a
          </p>
          <h2 
            className="text-3xl sm:text-4xl font-extrabold text-navy-900 text-[#0a192f] uppercase tracking-tight"
            style={{ fontFamily: "'Oswald', 'Inter', sans-serif" }}
          >
            Free All Access Pass
          </h2>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[85vh]">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            
            {/* Name Row: 2-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff] focus:bg-white transition-colors"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff] focus:bg-white transition-colors"
                required
              />
            </div>

            {/* Email Row: Single column */}
            <div>
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff] focus:bg-white transition-colors"
                required
              />
            </div>

            {/* Phone & Location Row: 2-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff] focus:bg-white transition-colors"
                required
              />
              <select
                defaultValue=""
                className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff] focus:bg-white transition-colors text-gray-600 appearance-none"
                required
              >
                <option value="" disabled>Select Home Club</option>
                <option value="downtown">Downtown Gym</option>
                <option value="uptown">Uptown Fitness</option>
                <option value="westside">Westside Iron</option>
              </select>
            </div>

            {/* Date Picker Row */}
            <div>
              {/* A clever trick: use type="text" to show placeholder, swap to "date" on focus */}
              <input
                type="text"
                placeholder="Date of Birth (mm/dd/yyyy)"
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => (e.target.type = e.target.value ? "date" : "text")}
                className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff] focus:bg-white transition-colors text-gray-600"
                required
              />
            </div>

            {/* Custom Checkboxes */}
            <div className="space-y-4 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" className="mt-1 min-w-[1.25rem] w-5 h-5 border-2 border-gray-300 rounded text-[#007bff] focus:ring-[#007bff] cursor-pointer" required />
                <div className="text-xs text-gray-600 leading-relaxed">
                  <span className="text-red-500 font-bold uppercase tracking-wider mr-1">* Required</span>
                  Yes, I agree to receive recurring automated promotional and personalized marketing text messages (e.g. reminders) from this gym at the cell number used when signing up. Consent is not a condition of any purchase.
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" className="mt-1 min-w-[1.25rem] w-5 h-5 border-2 border-gray-300 rounded text-[#007bff] focus:ring-[#007bff] cursor-pointer" required />
                <div className="text-xs text-gray-600 leading-relaxed">
                  <span className="text-red-500 font-bold uppercase tracking-wider mr-1">* Required</span>
                  I confirm that I am a local resident and at least 18 years of age, or 12 years of age with a parent/guardian.
                </div>
              </label>
            </div>

            {/* reCAPTCHA Placeholder Mimic */}
            <div className="pt-2">
              <div className="flex items-center justify-between border border-gray-300 bg-gray-50 p-2 sm:p-3 w-full sm:w-72 rounded-sm shadow-sm">
                <div className="flex items-center gap-3 pl-1">
                  <input type="checkbox" className="w-6 h-6 border-2 border-gray-400 rounded-sm bg-white text-blue-600 focus:ring-0 cursor-pointer" />
                  <span className="text-sm text-gray-800 font-medium">I'm not a robot</span>
                </div>
                <div className="flex flex-col items-center justify-center pr-1">
                  <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="w-8 h-8 opacity-90" />
                  <span className="text-[10px] text-gray-500 mt-0.5">reCAPTCHA</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-5 pb-2">
              <button
                type="submit"
                className="w-full bg-[#007bff] hover:brightness-110 text-white font-extrabold text-lg py-4 rounded-md transition-all duration-200 uppercase tracking-widest shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                style={{ fontFamily: "'Oswald', 'Inter', sans-serif" }}
              >
                Join Now!
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}